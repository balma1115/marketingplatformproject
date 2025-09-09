import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

// GET: 키워드 통계 조회
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keywordIds = searchParams.get('keywordIds')?.split(',').filter(Boolean)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!keywordIds || keywordIds.length === 0) {
      return NextResponse.json(
        { error: 'Keyword IDs are required' },
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

    // Support both old and new field names
    const apiKey = user?.naverAdsAccessKey || user?.naverAdApiKey
    const secretKey = user?.naverAdsSecretKey || user?.naverAdSecret
    const customerId = user?.naverAdsCustomerId || user?.naverAdCustomerId

    if (!apiKey || !secretKey || !customerId) {
      return NextResponse.json(
        { 
          error: 'API credentials not configured',
          requiresSetup: true
        },
        { status: 400 }
      )
    }

    const naverAds = new NaverAdsAPI({
      apiKey,
      secretKey,
      customerId
    })

    // Use the new method that properly handles TSV reports
    const keywordStats = await naverAds.getMultipleKeywordStats(
      keywordIds,
      dateFrom || undefined,
      dateTo || undefined
    )

    // Transform the data for frontend consumption
    const statsArray = Object.entries(keywordStats).map(([keywordId, stats]) => ({
      keywordId,
      impressions: stats.impCnt,
      clicks: stats.clkCnt,
      cost: stats.salesAmt,
      ctr: stats.ctr,
      cpc: stats.cpc,
      avgRank: stats.avgRnk
    }))

    return NextResponse.json({
      success: true,
      data: statsArray,
      dateRange: {
        from: dateFrom,
        to: dateTo
      }
    })
  } catch (error: any) {
    console.error('Failed to fetch keyword stats:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch keyword stats',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// POST: 키워드 통계 일괄 조회 (더 많은 옵션 지원)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keywordIds, dateFrom, dateTo, groupBy } = body

    if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
      return NextResponse.json(
        { error: 'Keyword IDs array is required' },
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

    // Support both old and new field names
    const apiKey = user?.naverAdsAccessKey || user?.naverAdApiKey
    const secretKey = user?.naverAdsSecretKey || user?.naverAdSecret
    const customerId = user?.naverAdsCustomerId || user?.naverAdCustomerId

    if (!apiKey || !secretKey || !customerId) {
      return NextResponse.json(
        { 
          error: 'API credentials not configured',
          requiresSetup: true
        },
        { status: 400 }
      )
    }

    const naverAds = new NaverAdsAPI({
      apiKey,
      secretKey,
      customerId
    })

    // Get keyword stats using the improved TSV-based method
    const keywordStats = await naverAds.getMultipleKeywordStats(
      keywordIds,
      dateFrom,
      dateTo
    )

    // Get keyword details to include names
    const keywords = await naverAds.getKeywords()
    const keywordMap = new Map(
      keywords
        .filter(k => keywordIds.includes(k.nccKeywordId))
        .map(k => [k.nccKeywordId, k])
    )

    // Transform and enrich the data
    const enrichedStats = Object.entries(keywordStats).map(([keywordId, stats]) => {
      const keyword = keywordMap.get(keywordId)
      return {
        keywordId,
        keyword: keyword?.keyword || 'Unknown',
        bidAmt: keyword?.bidAmt || 0,
        status: keyword?.status || 'UNKNOWN',
        impressions: stats.impCnt,
        clicks: stats.clkCnt,
        cost: stats.salesAmt,
        ctr: parseFloat(stats.ctr.toFixed(2)),
        cpc: Math.round(stats.cpc),
        avgRank: stats.avgRnk,
        qualityIndex: keyword?.qualityIndex || 0
      }
    })

    // Sort by cost (highest first) by default
    enrichedStats.sort((a, b) => b.cost - a.cost)

    // Calculate totals
    const totals = enrichedStats.reduce((acc, stat) => ({
      impressions: acc.impressions + stat.impressions,
      clicks: acc.clicks + stat.clicks,
      cost: acc.cost + stat.cost,
      keywords: acc.keywords + 1
    }), {
      impressions: 0,
      clicks: 0,
      cost: 0,
      keywords: 0
    })

    // Calculate average CTR and CPC from totals
    const avgCtr = totals.impressions > 0 
      ? parseFloat(((totals.clicks / totals.impressions) * 100).toFixed(2))
      : 0
    const avgCpc = totals.clicks > 0 
      ? Math.round(totals.cost / totals.clicks)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        keywords: enrichedStats,
        summary: {
          ...totals,
          avgCtr,
          avgCpc
        },
        dateRange: {
          from: dateFrom,
          to: dateTo
        }
      }
    })
  } catch (error: any) {
    console.error('Failed to fetch keyword stats:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch keyword stats',
        details: error.message 
      },
      { status: 500 }
    )
  }
}