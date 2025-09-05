import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

// POST: 여러 캠페인 일괄 삭제
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignIds } = await request.json()
    
    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return NextResponse.json(
        { error: '삭제할 캠페인을 선택해주세요' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true,
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdsCustomerId: true
      }
    })

    // Support both field name patterns
    const accessKey = user?.naverAdsAccessKey || user?.naverAdApiKey
    const secretKey = user?.naverAdsSecretKey || user?.naverAdSecret
    const customerId = user?.naverAdsCustomerId || user?.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { 
          error: 'API credentials not configured',
          requiresSetup: true
        },
        { status: 400 }
      )
    }
    
    const naverAds = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Delete campaigns one by one
    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[]
    }
    
    for (const campaignId of campaignIds) {
      try {
        await naverAds.deleteCampaign(campaignId)
        results.success.push(campaignId)
      } catch (error: any) {
        console.error(`Failed to delete campaign ${campaignId}:`, error)
        results.failed.push({
          id: campaignId,
          error: error.message || 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `${results.success.length}개 캠페인 삭제 완료${
        results.failed.length > 0 ? `, ${results.failed.length}개 실패` : ''
      }`
    })
  } catch (error: any) {
    console.error('Failed to delete campaigns:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete campaigns',
        details: error.message 
      },
      { status: 500 }
    )
  }
}