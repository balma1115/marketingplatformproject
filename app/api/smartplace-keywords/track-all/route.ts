import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

// Mock function to simulate smartplace ranking check
// In production, this would use actual Naver API or web scraping
async function checkSmartplaceRanking(placeId: string, keyword: string) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Generate mock ranking data
  return {
    rank: Math.random() > 0.3 ? Math.floor(Math.random() * 20) + 1 : null,
    overallRank: Math.random() > 0.4 ? Math.floor(Math.random() * 50) + 1 : null,
    rankingType: Math.random() > 0.7 ? 'ad' : 'organic'
  }
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // 사용자의 스마트플레이스 프로젝트 찾기
      const place = await prisma.trackingProject.findFirst({
        where: {
          userId: userId
        }
      })

      if (!place) {
        return NextResponse.json({ error: '먼저 스마트플레이스를 등록해주세요.' }, { status: 404 })
      }

      // 활성화된 키워드만 가져오기
      const keywords = await prisma.trackingKeyword.findMany({
        where: {
          projectId: place.id,
          isActive: true
        }
      })

      if (keywords.length === 0) {
        return NextResponse.json({ error: '추적할 키워드가 없습니다.' }, { status: 400 })
      }

      // 추적 세션 생성
      const session = await prisma.trackingSession.create({
        data: {
          userId: userId,
          projectId: place.id,
          totalKeywords: keywords.length,
          completedKeywords: 0,
          status: 'in_progress'
        }
      })

      // 각 키워드에 대해 순위 추적
      let successCount = 0
      let failCount = 0
      const checkDate = new Date()

      for (const keyword of keywords) {
        try {
          // 실제 순위 체크 (현재는 모의 데이터)
          const rankings = await checkSmartplaceRanking(place.placeId, keyword.keyword)
          
          // 순위 결과 저장
          await prisma.trackingRanking.create({
            data: {
              keywordId: keyword.id,
              rank: rankings.rank,
              overallRank: rankings.overallRank,
              checkDate: checkDate,
              rankingType: rankings.rankingType
            }
          })
          
          successCount++
          
          // 세션 진행 상황 업데이트
          await prisma.trackingSession.update({
            where: {
              id: session.id
            },
            data: {
              completedKeywords: successCount
            }
          })
        } catch (error) {
          console.error(`Failed to track keyword ${keyword.keyword}:`, error)
          failCount++
        }
      }

      // 세션 완료 처리
      await prisma.trackingSession.update({
        where: {
          id: session.id
        },
        data: {
          status: 'completed',
          completedKeywords: successCount
        }
      })

      // 마지막 업데이트 시간 갱신
      await prisma.trackingProject.update({
        where: {
          id: place.id
        },
        data: {
          lastUpdated: checkDate
        }
      })

      return NextResponse.json({
        success: true,
        message: `순위 추적 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
        sessionId: session.id,
        totalKeywords: keywords.length,
        successCount,
        failCount,
        checkDate
      })
    } catch (error) {
      console.error('Failed to track smartplace keywords:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}