import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

// GET: 광고그룹 목록 조회
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')

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

    const adGroups = await naverAds.getAdGroups(campaignId || undefined)
    
    return NextResponse.json({
      success: true,
      data: adGroups
    })
  } catch (error) {
    console.error('Failed to fetch ad groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ad groups' },
      { status: 500 }
    )
  }
}

// POST: 광고그룹 생성
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
    
    const naverAds = new NaverAdsAPI({
      apiKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    const adGroup = await naverAds.createAdGroup(body)
    
    return NextResponse.json({
      success: true,
      data: adGroup
    })
  } catch (error: any) {
    console.error('Failed to create ad group:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create ad group',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    )
  }
}

// PUT: 광고그룹 수정
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
    const { adGroupId, ...updateData } = body
    
    const naverAds = new NaverAdsAPI({
      apiKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    const result = await naverAds.updateAdGroup(adGroupId, updateData)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Failed to update ad group:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update ad group',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    )
  }
}

// DELETE: 광고그룹 삭제
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const adGroupId = searchParams.get('adGroupId')
    
    if (!adGroupId) {
      return NextResponse.json(
        { error: 'Ad group ID is required' },
        { status: 400 }
      )
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
    
    const naverAds = new NaverAdsAPI({
      apiKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    const result = await naverAds.deleteAdGroup(adGroupId)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Failed to delete ad group:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete ad group',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    )
  }
}