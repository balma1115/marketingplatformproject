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
      
      // keywordId가 문자열인지 숫자인지 확인
      const keyword = await prisma.smartPlaceKeyword.findFirst({
        where: {
          id: keywordIdParam, // 문자열 ID 직접 사용
          userId: parseInt(userId)
        },
        include: {
          smartPlace: true
        }
      })
      
      if (!keyword) {
        return NextResponse.json({ error: '키워드를 찾을 수 없습니다.' }, { status: 404 })
      }
      
      // 최근 30일 데이터 조회 (null 값도 포함) - 한국 시간 기준
      const kstNow = getKSTDate()
      const thirtyDaysAgo = new Date(kstNow)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      console.log(`Trend API - KST Now: ${getKSTDateString(kstNow)}`)
      console.log(`Trend API - 30 days ago: ${getKSTDateString(thirtyDaysAgo)}`)
      
      // SmartPlaceRanking 사용 - 모든 기록 포함 (null 값도)
      const rankings = await prisma.smartPlaceRanking.findMany({
        where: {
          keywordId: keywordIdParam, // 문자열 ID 직접 사용
          checkDate: {
            gte: thirtyDaysAgo
          }
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
      const top10Map = new Map<string, Map<string, number>>() // placeKey -> date -> rank
      const placeInfo = new Map<string, { name: string, id?: string }>() // placeKey -> info
      
      filteredRankings.forEach(r => {
        if (r.topTenPlaces) {
          try {
            const topPlaces = typeof r.topTenPlaces === 'string' 
              ? JSON.parse(r.topTenPlaces) 
              : r.topTenPlaces
            const dateStr = getKSTDateString(r.checkDate) // KST로 변환
            
            if (Array.isArray(topPlaces)) {
              topPlaces.forEach((place: any) => {
                // placeId가 없으면 placeName을 키로 사용
                const placeKey = place.placeId || place.placeName
                
                if (!placeKey) return // 키가 없으면 스킵
                
                if (!top10Map.has(placeKey)) {
                  top10Map.set(placeKey, new Map())
                }
                top10Map.get(placeKey)!.set(dateStr, place.rank)
                placeInfo.set(placeKey, { 
                  name: place.placeName, 
                  id: place.placeId 
                })
              })
            }
          } catch (e) {
            console.error('Failed to parse topTenPlaces:', e)
          }
        }
      })
      
      // 상위 10개 업체 데이터 포맷팅
      const top10Trends = Array.from(top10Map.entries()).map(([placeKey, dateRankMap]) => {
        const trendData = Array.from(dateRankMap.entries()).map(([date, rank]) => ({
          date,
          rank
        })).sort((a, b) => a.date.localeCompare(b.date))
        
        const info = placeInfo.get(placeKey)
        const actualPlaceId = info?.id || placeKey
        
        return {
          placeId: actualPlaceId,
          placeName: info?.name || placeKey,
          isMyPlace: actualPlaceId === keyword.smartPlace.placeId || 
                     info?.name === keyword.smartPlace.placeName,
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
      
      // 통계 데이터 계산 (null 값 제외)
      const organicData = trendData.filter(d => d.organicRank !== null)
      const adData = trendData.filter(d => d.adRank !== null)
      
      const stats = {
        averageOrganic: organicData.length > 0 
          ? organicData.reduce((sum, d) => sum + d.organicRank!, 0) / organicData.length 
          : null,
        averageAd: adData.length > 0 
          ? adData.reduce((sum, d) => sum + d.adRank!, 0) / adData.length 
          : null,
        bestOrganic: organicData.length > 0 
          ? Math.min(...organicData.map(d => d.organicRank!)) 
          : null,
        bestAd: adData.length > 0 
          ? Math.min(...adData.map(d => d.adRank!)) 
          : null,
        totalDataPoints: trendData.length
      }
      
      return NextResponse.json({ 
        keyword: keyword.keyword,
        placeInfo: {
          placeName: keyword.smartPlace.placeName,
          placeId: keyword.smartPlace.placeId
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