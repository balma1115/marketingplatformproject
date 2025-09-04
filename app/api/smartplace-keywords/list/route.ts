import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { getKSTToday, isSameKSTDay, getKSTDateString } from '@/lib/utils/timezone'

export async function GET(req: NextRequest) {
  // URL에서 userId 파라미터 가져오기 (관리자가 특정 사용자의 키워드를 조회할 때)
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')
  
  return withAuth(req, async (request, userId) => {
    try {
      // userId 파라미터가 있으면 해당 사용자의 데이터 조회, 없으면 현재 사용자의 데이터 조회
      const queryUserId = targetUserId ? parseInt(targetUserId) : parseInt(userId)
      
      // 스마트플레이스 먼저 조회
      const smartPlace = await prisma.smartPlace.findFirst({
        where: {
          userId: queryUserId
        }
      })
      
      if (!smartPlace) {
        return NextResponse.json({ keywords: [] })
      }
      
      // 스마트플레이스 키워드 조회
      const keywords = await prisma.smartPlaceKeyword.findMany({
        where: {
          smartPlaceId: smartPlace.id
        },
        include: {
          rankings: {
            where: {
              OR: [
                { organicRank: { not: null } },
                { adRank: { not: null } }
              ]
            },
            orderBy: {
              checkDate: 'desc'
            },
            take: 1
          }
        }
      })

      // 오늘 날짜 (한국 시간 기준)
      const today = getKSTToday()
      const todayEnd = new Date(today)
      todayEnd.setDate(todayEnd.getDate() + 1)
      todayEnd.setMilliseconds(-1) // 23:59:59.999
      
      console.log(`List API - KST Today: ${getKSTDateString(today)}`)
      
      // 데이터 포맷팅
      const formattedKeywords = keywords.map(k => {
        const lastRanking = k.rankings[0]
        let organicRank = null
        let adRank = null
        let totalResults = 0
        let lastTracked = null
        
        // 최신 순위가 오늘 것인지 확인 (한국 시간 기준)
        if (lastRanking && lastRanking.checkDate) {
          const checkDate = new Date(lastRanking.checkDate)
          
          // 한국 시간 기준으로 오늘 날짜인지 확인
          if (isSameKSTDay(checkDate, today)) {
            organicRank = lastRanking.organicRank
            adRank = lastRanking.adRank
            totalResults = lastRanking.totalResults || 0
            lastTracked = lastRanking.checkDate
            console.log(`Keyword ${k.keyword}: Today's data found - Organic: ${organicRank}, Ad: ${adRank}`)
          } else {
            // 오늘이 아니면 마지막 추적 날짜만 표시
            lastTracked = lastRanking.checkDate
            console.log(`Keyword ${k.keyword}: Not today's data (${getKSTDateString(checkDate)})`)
          }
        }
        
        return {
          id: k.id,
          keyword: k.keyword,
          isActive: k.isActive,
          organicRank: organicRank,
          adRank: adRank,
          totalResults: totalResults,
          lastChecked: lastTracked,
          createdAt: k.createdAt
        }
      })

      const response = NextResponse.json({ keywords: formattedKeywords })
      
      // 더 짧은 캐시로 변경하여 빠른 업데이트 반영
      response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
      response.headers.set('Content-Type', 'application/json; charset=utf-8')
      
      return response
    } catch (error) {
      console.error('Failed to fetch smartplace keywords:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}