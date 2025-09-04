import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { getKSTDate, getKSTDateString } from '@/lib/utils/timezone'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // 사용자의 스마트플레이스 프로젝트 찾기
      const project = await prisma.trackingProject.findFirst({
        where: {
          userId: userId
        }
      })
      
      if (!project) {
        return NextResponse.json({ error: '스마트플레이스를 먼저 등록해주세요.' }, { status: 404 })
      }
      
      // 활성 키워드 조회
      const keywords = await prisma.trackingKeyword.findMany({
        where: {
          projectId: project.id,
          isActive: true
        }
      })
      
      // 최근 30일 순위 데이터 조회 (null 제외) - 한국 시간 기준
      const kstNow = getKSTDate()
      const thirtyDaysAgo = new Date(kstNow)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      console.log(`Monthly Data - KST Now: ${getKSTDateString(kstNow)}`)
      console.log(`Monthly Data - 30 days ago: ${getKSTDateString(thirtyDaysAgo)}`)
      
      const rankings = await prisma.trackingRanking.findMany({
        where: {
          keywordId: {
            in: keywords.map(k => k.id)
          },
          checkDate: {
            gte: thirtyDaysAgo
          },
          OR: [
            { organicRank: { not: null } },
            { adRank: { not: null } }
          ]
        },
        include: {
          keyword: true
        },
        orderBy: {
          checkDate: 'desc'
        }
      })
      
      // Get snapshots for the same period
      const snapshots = await prisma.trackingSnapshot.findMany({
        where: {
          projectId: project.id,
          checkDate: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: {
          checkDate: 'desc'
        }
      })
      
      // Create snapshot map by date
      const snapshotMap = new Map<string, any>()
      snapshots.forEach(snapshot => {
        const dateStr = new Date(snapshot.checkDate).toISOString().split('T')[0]
        if (!snapshotMap.has(dateStr) || snapshot.createdAt > snapshotMap.get(dateStr).createdAt) {
          snapshotMap.set(dateStr, snapshot)
        }
      })
      
      // 날짜별로 그룹화하고 중복 제거 (같은 날짜-키워드 조합에서 최신 것만 유지)
      const dailyDataMap = new Map<string, any>()
      const dateSet = new Set<string>()
      
      rankings.forEach(ranking => {
        const dateStr = new Date(ranking.checkDate).toISOString().split('T')[0]
        const key = `${dateStr}_${ranking.keywordId}`
        dateSet.add(dateStr)
        
        // 같은 날짜-키워드 조합에서 더 최신 데이터만 유지
        if (!dailyDataMap.has(key) || 
            ranking.createdAt > dailyDataMap.get(key).createdAt) {
          dailyDataMap.set(key, {
            date: dateStr,
            keyword: ranking.keyword.keyword,
            keywordId: ranking.keywordId,
            organicRank: ranking.organicRank,
            adRank: ranking.adRank,
            topTenPlaces: ranking.topTenPlaces,
            createdAt: ranking.createdAt
          })
        }
      })
      
      // 날짜별로 데이터 정리
      const dates = Array.from(dateSet).sort((a, b) => b.localeCompare(a))
      const monthlyData = dates.map(date => {
        const dayData = Array.from(dailyDataMap.values())
          .filter(d => d.date === date)
          .map(d => ({
            keyword: d.keyword,
            keywordId: d.keywordId,
            organicRank: d.organicRank,
            adRank: d.adRank,
            topTenPlaces: d.topTenPlaces ? JSON.parse(d.topTenPlaces) : null
          }))
        
        // Get snapshot for this date
        const snapshot = snapshotMap.get(date)
        
        return {
          date,
          rankings: dayData,
          snapshot: snapshot ? {
            placeName: snapshot.placeName,
            category: snapshot.category,
            directions: snapshot.directions,
            introduction: snapshot.introduction,
            representativeKeywords: snapshot.representativeKeywords ? 
              JSON.parse(snapshot.representativeKeywords) : [],
            businessHours: snapshot.businessHours,
            phone: snapshot.phone,
            address: snapshot.address
          } : null,
          summary: {
            averageOrganic: dayData.filter(d => d.organicRank).reduce((sum, d) => sum + d.organicRank, 0) / 
                           dayData.filter(d => d.organicRank).length || null,
            averageAd: dayData.filter(d => d.adRank).reduce((sum, d) => sum + d.adRank, 0) / 
                      dayData.filter(d => d.adRank).length || null,
            totalTracked: dayData.length
          }
        }
      })
      
      // 최신 스냅샷 정보
      const latestSnapshot = await prisma.trackingSnapshot.findFirst({
        where: {
          projectId: project.id
        },
        orderBy: {
          checkDate: 'desc'
        }
      })
      
      return NextResponse.json({ 
        project: {
          placeName: project.placeName,
          placeId: project.placeId,
          lastUpdated: project.lastUpdated
        },
        placeInfo: latestSnapshot ? {
          placeName: latestSnapshot.placeName,
          category: latestSnapshot.category,
          directions: latestSnapshot.directions,
          introduction: latestSnapshot.introduction,
          representativeKeywords: latestSnapshot.representativeKeywords ? 
            JSON.parse(latestSnapshot.representativeKeywords) : [],
          businessHours: latestSnapshot.businessHours,
          phone: latestSnapshot.phone,
          address: latestSnapshot.address
        } : null,
        monthlyData,
        summary: {
          totalDays: dates.length,
          totalKeywords: keywords.length,
          totalDataPoints: dailyDataMap.size
        }
      })
    } catch (error) {
      console.error('Failed to fetch monthly data:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}