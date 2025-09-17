import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

// GET: 키워드 목록 조회
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const adgroupId = searchParams.get('adgroupId')

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true
      }
    })

    if (!user?.naverAdApiKey || !user?.naverAdSecret || !user?.naverAdCustomerId) {
      return NextResponse.json(
        { 
          error: 'API credentials not configured',
          requiresSetup: true
        },
        { status: 400 }
      )
    }

    const naverAds = new NaverAdsAPI({
      apiKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    const keywords = await naverAds.getKeywords(adgroupId || undefined)
    
    return NextResponse.json({
      success: true,
      data: keywords
    })
  } catch (error) {
    console.error('Failed to fetch keywords:', error)
    return NextResponse.json(
      { error: 'Failed to fetch keywords' },
      { status: 500 }
    )
  }
}

// POST: 키워드 생성
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true
      }
    })

    if (!user?.naverAdApiKey || !user?.naverAdSecret || !user?.naverAdCustomerId) {
      return NextResponse.json(
        { 
          error: 'API credentials not configured',
          requiresSetup: true
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { keywords } = body
    
    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      )
    }
    
    const naverAds = new NaverAdsAPI({
      apiKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    const result = await naverAds.createKeywords(keywords)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Failed to create keywords:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create keywords',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    )
  }
}

// PUT: 키워드 수정 (일괄 입찰가 수정)
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true
      }
    })

    if (!user?.naverAdApiKey || !user?.naverAdSecret || !user?.naverAdCustomerId) {
      return NextResponse.json(
        { 
          error: 'API credentials not configured',
          requiresSetup: true
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { keywordId, updates, bulk } = body
    
    const naverAds = new NaverAdsAPI({
      apiKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    let result: any = null
    if (bulk && updates) {
      // 일괄 수정
      result = await naverAds.bulkUpdateKeywordBids(updates)
    } else if (keywordId && updates) {
      // 개별 수정
      result = await naverAds.updateKeyword(keywordId, updates)
    } else {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Failed to update keywords:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update keywords',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    )
  }
}

// DELETE: 키워드 삭제
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true
      }
    })

    if (!user?.naverAdApiKey || !user?.naverAdSecret || !user?.naverAdCustomerId) {
      return NextResponse.json(
        { 
          error: 'API credentials not configured',
          requiresSetup: true
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { keywordIds } = body
    
    if (!keywordIds || !Array.isArray(keywordIds)) {
      return NextResponse.json(
        { error: 'Keyword IDs array is required' },
        { status: 400 }
      )
    }
    
    const naverAds = new NaverAdsAPI({
      apiKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    const result = await naverAds.deleteKeywords(keywordIds)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Failed to delete keywords:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete keywords',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    )
  }
}