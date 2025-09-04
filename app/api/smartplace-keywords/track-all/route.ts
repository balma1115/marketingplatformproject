import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { ImprovedNaverScraperV3 } from '@/lib/services/improved-scraper-v3'
import { PlaywrightCrawlerService } from '@/lib/services/playwrightCrawler'
import { getKSTDate, getKSTToday, getKSTDateString } from '@/lib/utils/timezone'

// SSE 응답을 위한 헬퍼 함수
function createSSEStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
    }
  })

  const send = (data: any) => {
    console.log('Sending SSE message:', data)
    if (controller) {
      const message = `data: ${JSON.stringify(data)}\n\n`
      controller.enqueue(encoder.encode(message))
    } else {
      console.log('No controller available for SSE')
    }
  }

  const close = () => {
    if (controller) {
      controller.close()
    }
  }

  return { stream, send, close }
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    console.log('Starting SSE tracking for user:', userId)
    // SSE 스트림 생성
    const { stream, send, close } = createSSEStream()
    
    // 비동기 처리를 위한 Promise
    const processTracking = async () => {
      try {
        console.log('Process tracking started')
        // 사용자의 스마트플레이스 프로젝트 찾기
        const place = await prisma.trackingProject.findFirst({
          where: {
            userId: userId
          }
        })

        if (!place) {
          send({ type: 'error', message: '먼저 스마트플레이스를 등록해주세요.' })
          close()
          return
        }

        // 활성화된 키워드만 가져오기
        const keywords = await prisma.trackingKeyword.findMany({
          where: {
            projectId: place.id,
            isActive: true
          }
        })

        if (keywords.length === 0) {
          send({ type: 'error', message: '추적할 키워드가 없습니다.' })
          close()
          return
        }

        send({ 
          type: 'progress', 
          status: 'preparing',
          current: 0, 
          total: keywords.length, 
          keyword: '추적 엔진 초기화 중...' 
        })

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

      // 스크래퍼 초기화 (개선된 V3 스크래퍼 사용 - 페이지네이션 지원)
      // Always use real scraper - never use mock data
      const scraper = new ImprovedNaverScraperV3()
      console.log('Using Improved V3 scraper (with pagination)')
      const playwrightCrawler = new PlaywrightCrawlerService()
      
      // 한국 시간(KST) 기준으로 날짜 설정 - 스냅샷과 랭킹에서 동일하게 사용
      const checkDate = getKSTDate()
      console.log(`Tracking Start - KST Check Date: ${getKSTDateString(checkDate)}`)
      
      // 업체 상세 정보 수집
      let placeDetail = null
      try {
        // PlaywrightCrawlerService는 placeId를 직접 받습니다
        placeDetail = await playwrightCrawler.getPlaceDetails(place.placeId)
        
        // 스냅샷 저장 (KST 시간 사용)
        await prisma.trackingSnapshot.create({
          data: {
            sessionId: session.id,
            projectId: place.id,
            checkDate: checkDate, // KST 시간 사용
            placeName: placeDetail.name || place.placeName,
            category: placeDetail.category || null,
            directions: placeDetail.directions || null,
            introduction: placeDetail.introduction || null,
            representativeKeywords: placeDetail.representativeKeywords ? JSON.stringify(placeDetail.representativeKeywords) : null,
            businessHours: placeDetail.businessHours || null,
            phone: placeDetail.phone || null,
            address: placeDetail.address || null
          }
        })
        console.log(`Snapshot saved with KST date: ${getKSTDateString(checkDate)}`)
      } catch (error) {
        console.error('Failed to get place details:', error)
      }
      
      // 각 키워드에 대해 순위 추적
      let successCount = 0
      let failCount = 0
      const startOfToday = getKSTToday() // KST 자정
      const endOfToday = new Date(startOfToday)
      endOfToday.setDate(endOfToday.getDate() + 1)
      endOfToday.setMilliseconds(-1) // 23:59:59.999
      
      console.log(`KST Check Date: ${getKSTDateString(checkDate)}`)
      
      // 오늘 날짜의 기존 추적 데이터 삭제
      console.log(`Deleting existing tracking data for today...`)
      for (const keyword of keywords) {
        await prisma.trackingRanking.deleteMany({
          where: {
            keywordId: keyword.id,
            checkDate: {
              gte: startOfToday,
              lte: endOfToday
            }
          }
        })
      }
      
      console.log(`Starting to track ${keywords.length} keywords with queue-based processing`)
      
      // V3 스크래퍼의 queue 방식 사용
      if (scraper instanceof ImprovedNaverScraperV3) {
        // 키워드 준비
        const keywordData = keywords.map(k => ({ 
          keyword: k.keyword, 
          keywordId: k.id 
        }))
        
        // 진행 상황 업데이트
        send({ 
          type: 'progress', 
          status: 'tracking',
          current: 0, 
          total: keywords.length, 
          keyword: '큐 방식으로 키워드 추적 시작...' 
        })
        
        // Queue로 모든 키워드 동시 처리 (동시 3개씩)
        const results = await scraper.trackMultipleKeywords(keywordData, {
          placeId: place.placeId,
          placeName: place.placeName
        })
        
        // 결과 처리
        let processedCount = 0
        for (const keyword of keywords) {
          processedCount++
          const result = results.get(keyword.id)
          
          if (result) {
            try {
              // 순위 결과 저장 (모든 결과를 저장해야 마지막 추적 날짜가 표시됨)
              await prisma.trackingRanking.create({
                data: {
                  keywordId: keyword.id,
                  sessionId: session.id,
                  organicRank: result.organicRank,
                  adRank: result.adRank,
                  checkDate: checkDate,
                  topTenPlaces: result.topTenPlaces ? JSON.stringify(result.topTenPlaces) : null
                }
              })
              
              console.log(`Saved ranking for ${keyword.keyword}: organic=${result.organicRank}, ad=${result.adRank}`)
              successCount++
              
              send({ 
                type: 'progress', 
                status: 'tracking',
                current: processedCount, 
                total: keywords.length, 
                keyword: keyword.keyword,
                message: `${keyword.keyword} 추적 완료`
              })
            } catch (error) {
              console.error(`Failed to save ranking for ${keyword.keyword}:`, error)
              failCount++
              send({ 
                type: 'warning', 
                current: processedCount, 
                total: keywords.length, 
                keyword: keyword.keyword,
                message: `${keyword.keyword} 저장 실패`
              })
            }
          } else {
            // 실패해도 null 값으로 저장해야 마지막 추적 날짜가 표시됨
            try {
              await prisma.trackingRanking.create({
                data: {
                  keywordId: keyword.id,
                  sessionId: session.id,
                  organicRank: null,
                  adRank: null,
                  checkDate: checkDate,
                  topTenPlaces: null
                }
              })
            } catch (error) {
              console.error(`Failed to save null ranking for ${keyword.keyword}:`, error)
            }
            
            failCount++
            send({ 
              type: 'warning', 
              current: processedCount, 
              total: keywords.length, 
              keyword: keyword.keyword,
              message: `${keyword.keyword} 추적 실패`
            })
          }
          
          // 세션 진행 상황 업데이트
          await prisma.trackingSession.update({
            where: {
              id: session.id
            },
            data: {
              completedKeywords: successCount
            }
          })
        }
      } else {
        // 기존 방식 (Mock 스크래퍼용)
        for (let i = 0; i < keywords.length; i++) {
          const keyword = keywords[i]
          console.log(`Tracking keyword ${i+1}/${keywords.length}: ${keyword.keyword}`)
          
          send({ 
            type: 'progress', 
            status: 'tracking',
            current: i + 1, 
            total: keywords.length, 
            keyword: keyword.keyword 
          })
          
          try {
            const rankings = await scraper.trackRanking(keyword.keyword, {
              placeId: place.placeId,
              placeName: place.placeName
            })
            
            await prisma.trackingRanking.create({
              data: {
                keywordId: keyword.id,
                sessionId: session.id,
                organicRank: rankings.organicRank,
                adRank: rankings.adRank,
                checkDate: checkDate,
                topTenPlaces: rankings.topTenPlaces ? JSON.stringify(rankings.topTenPlaces) : null
              }
            })
            
            successCount++
            
            await prisma.trackingSession.update({
              where: {
                id: session.id
              },
              data: {
                completedKeywords: successCount
              }
            })
            
            send({ 
              type: 'progress', 
              status: 'tracking',
              current: i + 1, 
              total: keywords.length, 
              keyword: keyword.keyword,
              message: `${keyword.keyword} 추적 완료`
            })
          } catch (error) {
            console.error(`Failed to track keyword ${keyword.keyword}:`, error)
            failCount++
            
            send({ 
              type: 'warning', 
              current: i + 1, 
              total: keywords.length, 
              keyword: keyword.keyword,
              message: `${keyword.keyword} 추적 실패`
            })
          }
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

        // 완료 메시지 전송
        send({
          type: 'complete',
          status: 'complete',
          message: `순위 추적 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
          sessionId: session.id,
          totalKeywords: keywords.length,
          successCount,
          failCount,
          checkDate
        })
        
        // 스크래퍼 정리
        await scraper.close()
        
        close()
      } catch (error) {
        console.error('Failed to track smartplace keywords:', error)
        send({ 
          type: 'error', 
          message: '추적 중 오류가 발생했습니다.',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        close()
      }
    }
    
    // 백그라운드에서 추적 실행
    processTracking()
    
    // SSE 응답 반환
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성화
      }
    })
  })
}