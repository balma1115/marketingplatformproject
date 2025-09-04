import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

// PUT: 개별 캠페인 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
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

    const result = await naverAds.updateCampaign(params.campaignId, body)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Failed to update campaign:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update campaign',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    )
  }
}

// DELETE: 캠페인 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
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
    
    const naverAds = new NaverAdsAPI({
      apiKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    const result = await naverAds.deleteCampaign(params.campaignId)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Failed to delete campaign:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete campaign',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    )
  }
}