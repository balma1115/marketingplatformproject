import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { getKSTDate, getKSTDateString } from '@/lib/utils/timezone'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  return withAuth(req, async (request, userId) => {
    try {
      const { keywordId: keywordIdParam } = await params
      const keywordId = parseInt(keywordIdParam)
      
      // 키워드 확인
      const keyword = await prisma.trackingKeyword.findFirst({
        where: {
          id: keywordId,
          project: {
            userId: userId
          }
        },
        include: {
          project: true
        }
      })
      
      if (!keyword) {
        return NextResponse.json({ error: '키워드를 찾을 수 없습니다.' }, { status: 404 })
      }
      
      // 최근 30일 데이터 조회 (null 제외) - 한국 시간 기준
      const kstNow = getKSTDate()
      const thirtyDaysAgo = new Date(kstNow)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      console.log(`Trend API - KST Now: ${getKSTDateString(kstNow)}`)
      console.log(`Trend API - 30 days ago: ${getKSTDateString(thirtyDaysAgo)}`)
      
      const rankings = await prisma.trackingRanking.findMany({
        where: {
          keywordId: keywordId,
          checkDate: {
            gte: thirtyDaysAgo
          },
          OR: [
            { organicRank: { not: null } },
            { adRank: { not: null } }
          ]
        },
        orderBy: {
          checkDate: 'asc'
        }
      })
      
      // 날짜별로 중복 제거 (같은 날짜에서 최신 것만 유지) - 한국 시간 기준
      const uniqueRankings = new Map<string, any>()
      rankings.forEach(r => {
        const dateStr = getKSTDateString(r.checkDate) // KST로 변환
        if (!uniqueRankings.has(dateStr) || r.createdAt > uniqueRankings.get(dateStr).createdAt) {
          uniqueRankings.set(dateStr, r)
        }
        console.log(`Ranking date: ${dateStr}, Organic: ${r.organicRank}, Ad: ${r.adRank}`)
      })
      
      const filteredRankings = Array.from(uniqueRankings.values()).sort((a, b) => 
        a.checkDate.getTime() - b.checkDate.getTime()
      )
      
      // 상위 10개 업체 추적 데이터 분석
      const top10Map = new Map<string, Map<string, number>>() // placeId -> date -> rank
      const placeNames = new Map<string, string>() // placeId -> placeName
      
      filteredRankings.forEach(r => {
        if (r.topTenPlaces) {
          try {
            const topPlaces = JSON.parse(r.topTenPlaces)
            const dateStr = getKSTDateString(r.checkDate) // KST로 변환
            
            topPlaces.forEach((place: any) => {
              if (!top10Map.has(place.placeId)) {
                top10Map.set(place.placeId, new Map())
              }
              top10Map.get(place.placeId)!.set(dateStr, place.rank)
              placeNames.set(place.placeId, place.placeName)
            })
          } catch (e) {
            console.error('Failed to parse topTenPlaces:', e)
          }
        }
      })
      
      // 상위 10개 업체 데이터 포맷팅
      const top10Trends = Array.from(top10Map.entries()).map(([placeId, dateRankMap]) => {
        const trendData = Array.from(dateRankMap.entries()).map(([date, rank]) => ({
          date,
          rank
        })).sort((a, b) => a.date.localeCompare(b.date))
        
        return {
          placeId,
          placeName: placeNames.get(placeId) || 'Unknown',
          isMyPlace: placeId === keyword.project.placeId,
          trendData
        }
      })
      
      // 내 업체를 맨 앞으로 정렬
      top10Trends.sort((a, b) => {
        if (a.isMyPlace) return -1
        if (b.isMyPlace) return 1
        return 0
      })
      
      // 기본 추세 데이터
      const trendData = filteredRankings.map(r => ({
        date: r.checkDate,
        organicRank: r.organicRank,
        adRank: r.adRank
      }))
      
      // 통계 데이터 계산
      const stats = {
        averageOrganic: trendData.filter(d => d.organicRank).reduce((sum, d) => sum + d.organicRank!, 0) / 
                       trendData.filter(d => d.organicRank).length || null,
        averageAd: trendData.filter(d => d.adRank).reduce((sum, d) => sum + d.adRank!, 0) / 
                  trendData.filter(d => d.adRank).length || null,
        bestOrganic: Math.min(...trendData.filter(d => d.organicRank).map(d => d.organicRank!)) || null,
        bestAd: Math.min(...trendData.filter(d => d.adRank).map(d => d.adRank!)) || null,
        totalDataPoints: trendData.length
      }
      
      return NextResponse.json({ 
        keyword: keyword.keyword,
        placeInfo: {
          placeName: keyword.project.placeName,
          placeId: keyword.project.placeId
        },
        trendData,
        top10Trends,
        stats
      })
    } catch (error) {
      console.error('Failed to fetch trend data:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}