import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { placeName, placeId, category } = body

    if (!placeName) {
      return NextResponse.json(
        { error: '플레이스명이 필요합니다' },
        { status: 400 }
      )
    }

    // Get user's Naver Ads credentials
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdsCustomerId: true,
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // Check both new and old field names for credentials
    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      // If no API credentials, provide default suggestions
      return NextResponse.json({
        keywords: generateDefaultKeywords(placeName, category),
        avgBidAmount: 100,
        source: 'default'
      })
    }

    try {
      // Initialize Naver Ads API
      const naverApi = new NaverAdsAPI({
        accessKey,
        secretKey,
        customerId
      })

      // Get related keywords from Naver API
      const relatedKeywords = await naverApi.getRelatedKeywords(placeName)
      
      // Generate additional keywords based on place name
      const generatedKeywords = generateDefaultKeywords(placeName, category)
      
      // Combine and deduplicate keywords
      const allKeywords = [...relatedKeywords, ...generatedKeywords]
      const uniqueKeywords = Array.from(
        new Map(allKeywords.map(k => [k.keyword, k])).values()
      )

      // Calculate average bid amount
      const avgBid = relatedKeywords.length > 0
        ? Math.round(relatedKeywords.reduce((sum, k) => sum + k.bidAmt, 0) / relatedKeywords.length)
        : 100

      return NextResponse.json({
        keywords: uniqueKeywords.slice(0, 20), // Limit to top 20
        avgBidAmount: avgBid,
        source: 'naver_api'
      })
    } catch (apiError) {
      console.error('Naver API failed, using defaults:', apiError)
      
      // Fallback to default keywords if API fails
      return NextResponse.json({
        keywords: generateDefaultKeywords(placeName, category),
        avgBidAmount: 100,
        source: 'default'
      })
    }
  } catch (error: any) {
    console.error('Failed to get keyword suggestions:', error)
    return NextResponse.json(
      { error: '키워드 추천을 가져오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// Helper function to generate default keywords
function generateDefaultKeywords(placeName: string, category?: string): any[] {
  const keywords = []
  
  // Extract base name without common suffixes
  const baseName = placeName
    .replace(/학원$/g, '')
    .replace(/교습소$/g, '')
    .replace(/센터$/g, '')
    .replace(/교육$/g, '')
    .trim()

  // Common education-related keywords
  const educationKeywords = [
    '학원', '영어학원', '수학학원', '과외', '교습소',
    '초등학원', '중등학원', '고등학원', '입시학원'
  ]

  // Location-based keywords
  const locations = ['가능동', '녹양동', '의정부', '의경부영어학원', '의정부학원']
  
  // Generate combinations
  keywords.push({
    keyword: placeName,
    bidAmt: 100,
    competition: 'MEDIUM',
    monthlySearchVolume: 100
  })

  keywords.push({
    keyword: baseName,
    bidAmt: 90,
    competition: 'MEDIUM',
    monthlySearchVolume: 80
  })

  // Add education keywords
  educationKeywords.forEach(edu => {
    if (!placeName.includes(edu)) {
      keywords.push({
        keyword: `${baseName} ${edu}`,
        bidAmt: 80,
        competition: 'MEDIUM',
        monthlySearchVolume: 50
      })
    }
  })

  // Add location-based keywords
  locations.forEach(loc => {
    keywords.push({
      keyword: `${loc} ${baseName}`,
      bidAmt: 70,
      competition: 'LOW',
      monthlySearchVolume: 30
    })
    
    if (category) {
      keywords.push({
        keyword: `${loc} ${category}`,
        bidAmt: 70,
        competition: 'LOW',
        monthlySearchVolume: 20
      })
    }
  })

  // Add category-specific keywords
  if (category) {
    keywords.push({
      keyword: category,
      bidAmt: 85,
      competition: 'HIGH',
      monthlySearchVolume: 150
    })
    
    keywords.push({
      keyword: `${baseName} ${category}`,
      bidAmt: 75,
      competition: 'MEDIUM',
      monthlySearchVolume: 40
    })
  }

  return keywords.slice(0, 15) // Return top 15
}