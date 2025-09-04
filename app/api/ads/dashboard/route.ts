import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URL 파라미터에서 날짜 범위 가져오기
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // 사용자의 Naver Ads API 키 가져오기
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true
      }
    })

    // API 키가 설정되어 있는지 확인
    if (!user?.naverAdApiKey || !user?.naverAdSecret || !user?.naverAdCustomerId) {
      return NextResponse.json(
        { 
          error: 'API credentials not configured',
          requiresSetup: true,
          message: '네이버 광고 API 키를 먼저 설정해주세요.'
        },
        { status: 400 }
      )
    }

    // 사용자의 API 키로 NaverAdsAPI 인스턴스 생성
    const naverAds = new NaverAdsAPI({
      accessKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    // 캠페인 목록 가져오기
    const campaigns = await naverAds.getCampaigns()
    
    console.log(`User: ${auth.userId} (Customer ID: ${user.naverAdCustomerId})`)
    console.log(`Fetching stats for ${campaigns.length} campaigns from ${dateFrom || 'default'} to ${dateTo || 'default'}`)
    
    // 각 캠페인에 대한 통계 가져오기 (날짜 범위 적용)
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          const stats = await naverAds.getCampaignStats(
            campaign.nccCampaignId,
            dateFrom || undefined,
            dateTo || undefined
          )
          
          return {
            ...campaign,
            stats,
            // 캠페인 유형 한글 변환
            campaignTypeLabel: 
              campaign.campaignTp === 'WEB_SITE' ? '파워링크' :
              campaign.campaignTp === 'POWER_CONTENTS' ? '파워콘텐츠' :
              campaign.campaignTp === 'PLACE' ? '플레이스' :
              campaign.campaignTp === 'SHOPPING' ? '쇼핑' :
              campaign.campaignTp === 'BRAND_SEARCH' ? '브랜드검색' :
              campaign.campaignTp
          }
        } catch (error) {
          console.error(`Failed to get stats for campaign ${campaign.nccCampaignId}:`, error)
          return {
            ...campaign,
            stats: {
              impCnt: 0,
              clkCnt: 0,
              salesAmt: 0,
              ctr: 0,
              cpc: 0,
              avgRnk: 0
            },
            campaignTypeLabel: 
              campaign.campaignTp === 'WEB_SITE' ? '파워링크' :
              campaign.campaignTp === 'POWER_CONTENTS' ? '파워콘텐츠' :
              campaign.campaignTp === 'PLACE' ? '플레이스' :
              campaign.campaignTp === 'SHOPPING' ? '쇼핑' :
              campaign.campaignTp === 'BRAND_SEARCH' ? '브랜드검색' :
              campaign.campaignTp
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        campaigns: campaignsWithStats,
        dateRange: {
          from: dateFrom,
          to: dateTo
        }
      }
    })
  } catch (error) {
    console.error('Failed to fetch ads dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ads dashboard data' },
      { status: 500 }
    )
  }
}