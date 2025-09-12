import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // userId를 숫자로 변환 (문자열로 전달될 수 있음)
      const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
      
      console.log('[Monthly Data API] User ID:', userId, 'Type:', typeof userId, 'Numeric:', numericUserId);
      
      // 사용자의 스마트플레이스 프로젝트 찾기
      const project = await prisma.smartPlace.findFirst({
        where: {
          userId: numericUserId
        }
      })
      
      if (!project) {
        console.log('[Monthly Data API] No SmartPlace found for user:', numericUserId);
        return NextResponse.json({ error: '스마트플레이스를 먼저 등록해주세요.' }, { status: 404 })
      }
      
      console.log('[Monthly Data API] Found SmartPlace:', project.id, project.placeName);
      
      // 활성 키워드 조회
      const keywords = await prisma.smartPlaceKeyword.findMany({
        where: {
          smartPlaceId: project.id,
          isActive: true
        }
      })
      
      console.log('[Monthly Data API] Keywords found:', keywords.length);
      
      if (keywords.length === 0) {
        return NextResponse.json({ 
          project: {
            placeName: project.placeName,
            placeId: project.placeId,
            lastUpdated: project.createdAt
          },
          monthlyData: [],
          summary: {
            totalDays: 0,
            totalKeywords: 0,
            totalDataPoints: 0
          }
        })
      }
      
      // 모든 순위 데이터 조회 (날짜 제한 없이)
      const rankings = await prisma.smartPlaceRanking.findMany({
        where: {
          keywordId: {
            in: keywords.map(k => k.id)
          }
        },
        orderBy: {
          checkDate: 'desc'
        }
      })
      
      console.log('[Monthly Data API] Rankings found:', rankings.length);
      
      // 키워드 정보 매핑
      const keywordMap = new Map(keywords.map(k => [k.id, k.keyword]))
      
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
            keyword: keywordMap.get(ranking.keywordId) || 'Unknown',
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
      console.log('[Monthly Data API] Unique dates found:', dates.length);
      
      const monthlyData = dates.map(date => {
        const dayData = Array.from(dailyDataMap.values())
          .filter(d => d.date === date)
          .map(d => {
            // Handle malformed topTenPlaces data
            let topTenPlaces = null;
            if (d.topTenPlaces) {
              try {
                // Check if it's the malformed "[object Object]" format
                if (typeof d.topTenPlaces === 'string' && d.topTenPlaces.includes('[object Object]')) {
                  // Data is corrupted, set to null
                  topTenPlaces = null;
                } else if (d.topTenPlaces.length > 0) {
                  // Try to parse valid JSON
                  topTenPlaces = JSON.parse(d.topTenPlaces);
                }
              } catch (e) {
                // If parsing fails, set to null
                topTenPlaces = null;
              }
            }
            
            return {
              keyword: d.keyword,
              keywordId: d.keywordId,
              organicRank: d.organicRank,
              adRank: d.adRank,
              topTenPlaces
            };
          })
        
        return {
          date,
          rankings: dayData,
          snapshot: null, // SmartPlace는 snapshot이 없음
          summary: {
            averageOrganic: dayData.filter(d => d.organicRank).reduce((sum, d) => sum + d.organicRank, 0) / 
                           dayData.filter(d => d.organicRank).length || null,
            averageAd: dayData.filter(d => d.adRank).reduce((sum, d) => sum + d.adRank, 0) / 
                      dayData.filter(d => d.adRank).length || null,
            totalTracked: dayData.length
          }
        }
      })
      
      const responseData = {
        project: {
          placeName: project.placeName,
          placeId: project.placeId,
          lastUpdated: project.createdAt
        },
        placeInfo: {
          placeName: project.placeName,
          category: project.category,
          phone: project.phone,
          address: project.address,
          rating: project.rating,
          reviewCount: project.reviewCount
        },
        monthlyData,
        summary: {
          totalDays: dates.length,
          totalKeywords: keywords.length,
          totalDataPoints: dailyDataMap.size
        }
      };
      
      console.log('[Monthly Data API] Sending response with', monthlyData.length, 'days of data');
      
      return NextResponse.json(responseData)
    } catch (error) {
      console.error('[Monthly Data API] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}