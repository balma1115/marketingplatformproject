import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    // 인증 확인
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = params
    const { enabled } = await request.json()

    // 사용자의 Naver Ads API 키 가져오기
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
        { error: 'API credentials not configured' },
        { status: 400 }
      )
    }

    // NaverAdsAPI 인스턴스 생성
    const naverAds = new NaverAdsAPI({
      accessKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    // 캠페인 상태 업데이트
    const updatedCampaign = await naverAds.updateCampaign(campaignId, {
      status: enabled ? 'ENABLED' : 'PAUSED'
    })

    return NextResponse.json({
      success: true,
      data: updatedCampaign
    })
  } catch (error) {
    console.error('Failed to toggle campaign:', error)
    return NextResponse.json(
      { error: 'Failed to toggle campaign status' },
      { status: 500 }
    )
  }
}