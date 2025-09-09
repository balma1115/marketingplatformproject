import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    console.log('Ads API called')
    
    // Next.js 15 requires awaiting params
    const params = await props.params
    const adgroupId = params.adgroupId
    console.log('AdGroup ID:', adgroupId)
    
    if (!adgroupId) {
      return NextResponse.json(
        { error: 'AdGroup ID is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const authHeader = request.headers.get('cookie')
    if (!authHeader || !authHeader.includes('token=')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from database - specifically look for nokyang user first
    let user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
    // If nokyang user not found, fall back to any user with credentials
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: 'academy' }
          ],
          AND: {
            OR: [
              {
                naverAdsAccessKey: { not: null },
                naverAdsSecretKey: { not: null },
                naverAdsCustomerId: { not: null }
              },
              {
                naverAdApiKey: { not: null },
                naverAdSecret: { not: null },
                naverAdCustomerId: { not: null }
              }
            ]
          }
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or no API credentials' },
        { status: 404 }
      )
    }

    // Use the appropriate API credentials
    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { error: 'Naver Ads API credentials not configured' },
        { status: 400 }
      )
    }

    // Initialize Naver Ads API
    const naverAdsApi = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Get ads for the ad group
    console.log('Fetching ads for ad group:', adgroupId)
    
    let ads
    try {
      ads = await naverAdsApi.getAds(adgroupId)
      console.log('Ads fetched successfully:', ads?.length || 0, 'ads')
      
      // Parse ad JSON if present
      ads = ads.map((ad: any) => {
        let parsedAd = {}
        
        // 전체 ad 객체 구조 확인을 위한 로깅
        console.log(`Ad ${ad.nccAdId} type:`, ad.type)
        
        // ad 필드가 JSON 문자열인 경우 파싱
        if (ad.ad) {
          if (typeof ad.ad === 'string') {
            try {
              parsedAd = JSON.parse(ad.ad)
            } catch (e) {
              console.error('Failed to parse ad JSON:', e, 'Raw ad:', ad.ad)
              parsedAd = {}
            }
          } else if (typeof ad.ad === 'object') {
            parsedAd = ad.ad
          }
        }
        
        let finalHeadline = null
        let finalDescription = null
        let allHeadlines: string[] = []
        let allDescriptions: string[] = []
        
        // RSA_AD (Responsive Search Ad) 타입인 경우 assets에서 headline과 description 추출
        if (ad.type === 'RSA_AD' && ad.assets && Array.isArray(ad.assets)) {
          // 모든 HEADLINE 타입의 assets 찾기
          const headlineAssets = ad.assets.filter((asset: any) => asset.linkType === 'HEADLINE')
          allHeadlines = headlineAssets
            .map((asset: any) => asset.assetData?.text)
            .filter((text: any) => text)
          
          if (allHeadlines.length > 0) {
            finalHeadline = allHeadlines[0] // 첫 번째 헤드라인을 대표로 사용
            console.log('Found headlines from RSA assets:', allHeadlines)
          }
          
          // 모든 DESCRIPTION 타입의 assets 찾기
          const descriptionAssets = ad.assets.filter((asset: any) => asset.linkType === 'DESCRIPTION')
          allDescriptions = descriptionAssets
            .map((asset: any) => asset.assetData?.text)
            .filter((text: any) => text)
          
          if (allDescriptions.length > 0) {
            finalDescription = allDescriptions[0] // 첫 번째 설명을 대표로 사용
            console.log('Found descriptions from RSA assets:', allDescriptions)
          }
        }
        // 일반 TEXT_45 광고인 경우 (기존 로직)
        else if (parsedAd && typeof parsedAd === 'object') {
          // headline과 description은 pc/mobile과 같은 레벨에 있음
          if ('headline' in parsedAd) {
            finalHeadline = parsedAd.headline
            allHeadlines = [parsedAd.headline]
            console.log('Found headline in parsedAd.headline:', finalHeadline)
          }
          if ('description' in parsedAd) {
            finalDescription = parsedAd.description
            allDescriptions = [parsedAd.description]
            console.log('Found description in parsedAd.description:', finalDescription)
          }
        }
        
        // 최상위 레벨에서 찾기 (fallback)
        if (!finalHeadline && ad.headline) {
          finalHeadline = ad.headline
          allHeadlines = [ad.headline]
          console.log('Found headline in ad.headline:', finalHeadline)
        }
        if (!finalDescription && ad.description) {
          finalDescription = ad.description
          allDescriptions = [ad.description]
          console.log('Found description in ad.description:', finalDescription)
        }
        
        console.log(`Ad ${ad.nccAdId} final extraction:`, {
          type: ad.type,
          headline: finalHeadline,
          description: finalDescription,
          allHeadlines: allHeadlines,
          allDescriptions: allDescriptions,
          hasAssets: ad.assets ? ad.assets.length : 0
        })
        
        return {
          ...ad,
          headline: finalHeadline,
          description: finalDescription,
          allHeadlines: allHeadlines,
          allDescriptions: allDescriptions,
          pc: parsedAd.pc || ad.pc,
          mobile: parsedAd.mobile || ad.mobile,
          pcUrl: parsedAd.pc?.final || ad.pcUrl || ad.pc?.url || ad.ad?.pc?.final,
          mobileUrl: parsedAd.mobile?.final || ad.mobileUrl || ad.mobile?.url || ad.ad?.mobile?.final,
          pcDisplayUrl: ad.pcDisplayUrl || ad.pc?.displayUrl || parsedAd.pc?.display || ad.ad?.pc?.display,
          mobileDisplayUrl: ad.mobileDisplayUrl || ad.mobile?.displayUrl || parsedAd.mobile?.display || ad.ad?.mobile?.display,
          parsedAd: parsedAd
        }
      })
    } catch (adError: any) {
      console.error('Error fetching ads:', {
        message: adError.message,
        status: adError.status,
        code: adError.response?.data?.code,
        title: adError.response?.data?.title
      })
      // Continue with empty array for now
      ads = []
    }
    
    // Get date range from query params for stats
    const url = new URL(request.url)
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    
    // If date range is provided, get stats for each ad
    if (ads && ads.length > 0 && dateFrom && dateTo) {
      // Get stat reports for all ads
      let statsMap = new Map()
      
      try {
        const adIds = ads.map((ad: any) => ad.nccAdId)
        const statReports = await naverAdsApi.getStatReports({
          reportTp: 'AD',
          dateRange: {
            since: dateFrom.replace(/-/g, ''),
            until: dateTo.replace(/-/g, '')
          },
          ids: adIds
        })
        
        // Create a map for easy lookup
        statReports.forEach((report: any) => {
          statsMap.set(report.id, report)
        })
      } catch (error) {
        console.error('Error fetching stat reports for ads:', error)
      }

      const adsWithStats = ads.map((ad: any) => {
        const stats = statsMap.get(ad.nccAdId) || {
          impCnt: 0,
          clkCnt: 0,
          ctr: 0,
          cpc: 0,
          salesAmt: 0
        }
        
        return {
          ...ad,
          stats: {
            impCnt: stats.impCnt || 0,
            clkCnt: stats.clkCnt || 0,
            ctr: stats.ctr || 0,
            cpc: stats.cpc || 0,
            salesAmt: stats.salesAmt || 0
          }
        }
      })
      
      return NextResponse.json(adsWithStats)
    }

    return NextResponse.json(ads || [])
    
  } catch (error: any) {
    console.error('Error fetching ads:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch ads',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    const params = await props.params
    const adgroupId = params.adgroupId
    const body = await request.json()
    
    // Get authenticated user
    const authHeader = request.headers.get('cookie')
    if (!authHeader || !authHeader.includes('token=')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: 'academy' }
          ],
          AND: {
            OR: [
              {
                naverAdsAccessKey: { not: null },
                naverAdsSecretKey: { not: null },
                naverAdsCustomerId: { not: null }
              },
              {
                naverAdApiKey: { not: null },
                naverAdSecret: { not: null },
                naverAdCustomerId: { not: null }
              }
            ]
          }
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or no API credentials' },
        { status: 404 }
      )
    }

    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { error: 'Naver Ads API credentials not configured' },
        { status: 400 }
      )
    }

    const naverAdsApi = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Create new ad
    const adData = {
      headline: body.headline,
      description: body.description,
      pc: {
        final: body.pcUrl
      },
      mobile: {
        final: body.mobileUrl || body.pcUrl
      }
    }
    
    const newAd = await naverAdsApi.createAd({
      nccAdgroupId: adgroupId,
      ad: JSON.stringify(adData),
      userLock: false,
      adType: 'TEXT_45'
    })
    
    return NextResponse.json({
      success: true,
      data: newAd
    })
    
  } catch (error: any) {
    console.error('Error creating ad:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create ad'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    const body = await request.json()
    
    if (!body.adId) {
      return NextResponse.json(
        { error: 'Ad ID is required' },
        { status: 400 }
      )
    }
    
    // Get authenticated user
    const authHeader = request.headers.get('cookie')
    if (!authHeader || !authHeader.includes('token=')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: 'academy' }
          ],
          AND: {
            OR: [
              {
                naverAdsAccessKey: { not: null },
                naverAdsSecretKey: { not: null },
                naverAdsCustomerId: { not: null }
              },
              {
                naverAdApiKey: { not: null },
                naverAdSecret: { not: null },
                naverAdCustomerId: { not: null }
              }
            ]
          }
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or no API credentials' },
        { status: 404 }
      )
    }

    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { error: 'Naver Ads API credentials not configured' },
        { status: 400 }
      )
    }

    const naverAdsApi = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Prepare update data
    const updateData: any = {}
    
    // Handle status toggle
    if (body.userLock !== undefined) {
      updateData.userLock = body.userLock
    }
    
    // Handle content updates - create ad JSON
    if (body.headline || body.description || body.pcUrl || body.mobileUrl) {
      const adData = {
        headline: body.headline,
        description: body.description,
        pc: body.pcUrl ? { final: body.pcUrl } : undefined,
        mobile: body.mobileUrl ? { final: body.mobileUrl } : undefined
      }
      updateData.ad = JSON.stringify(adData)
    }

    // Update ad
    const updatedAd = await naverAdsApi.updateAd(body.adId, updateData)
    
    return NextResponse.json({
      success: true,
      data: updatedAd
    })
    
  } catch (error: any) {
    console.error('Error updating ad:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update ad'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const adId = searchParams.get('adId')
    
    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 })
    }
    
    // Get authenticated user
    const authHeader = request.headers.get('cookie')
    if (!authHeader || !authHeader.includes('token=')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: 'academy' }
          ],
          AND: {
            OR: [
              {
                naverAdsAccessKey: { not: null },
                naverAdsSecretKey: { not: null },
                naverAdsCustomerId: { not: null }
              },
              {
                naverAdApiKey: { not: null },
                naverAdSecret: { not: null },
                naverAdCustomerId: { not: null }
              }
            ]
          }
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or no API credentials' },
        { status: 404 }
      )
    }

    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { error: 'Naver Ads API credentials not configured' },
        { status: 400 }
      )
    }

    const naverAdsApi = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Delete ad
    await naverAdsApi.deleteAd(adId)
    
    return NextResponse.json({
      success: true,
      message: '광고 소재가 삭제되었습니다.'
    })
    
  } catch (error: any) {
    console.error('Error deleting ad:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to delete ad'
      },
      { status: 500 }
    )
  }
}