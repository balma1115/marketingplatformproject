import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function GET(
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

    // 광고그룹 목록 가져오기
    const adGroups = await naverAds.getAdGroups(campaignId)

    // 각 광고그룹의 키워드 가져오기
    const adGroupsWithKeywords = await Promise.all(
      adGroups.map(async (adGroup) => {
        try {
          const keywords = await naverAds.getKeywords(adGroup.nccAdgroupId)
          return {
            ...adGroup,
            keywords,
            keywordCount: keywords.length
          }
        } catch (error) {
          console.error(`Failed to get keywords for ad group ${adGroup.nccAdgroupId}:`, error)
          return {
            ...adGroup,
            keywords: [],
            keywordCount: 0
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: adGroupsWithKeywords
    })
  } catch (error) {
    console.error('Failed to fetch ad groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ad groups' },
      { status: 500 }
    )
  }
}