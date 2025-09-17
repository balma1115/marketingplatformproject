import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { ImprovedNaverScraperV4, EnhancedBrowserManager } from '@/lib/services/improved-scraper-v4'
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
        const place = await prisma.smartPlace.findUnique({
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
        const keywords = await prisma.smartPlaceKeyword.findMany({
          where: {
            smartPlaceId: place.id,
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

      // 추적 세션 생성 (TrackingSession 테이블은 그대로 사용)
      const session = await prisma.trackingSession.create({
        data: {
          userId: userId,
          projectId: null, // SmartPlace는 projectId가 없으므로 null
          totalKeywords: keywords.length,
          completedKeywords: 0,
          status: 'in_progress'
        }
      })

      // V4 스크래퍼 사용 - 브라우저 재사용 및 컨텍스트 풀링
      const scraper = new ImprovedNaverScraperV4()
      console.log('Using Improved V4 scraper (with browser reuse and context pooling)')
      const playwrightCrawler = new PlaywrightCrawlerService()
      
      // 한국 시간(KST) 기준으로 날짜 설정 - 스냅샷과 랭킹에서 동일하게 사용
      const checkDate = getKSTDate()
      console.log(`Tracking Start - KST Check Date: ${getKSTDateString(checkDate)}`)
      
      // 업체 상세 정보 수집
      let placeDetail = null
      try {
        // PlaywrightCrawlerService는 placeId를 직접 받습니다
        placeDetail = await playwrightCrawler.getPlaceDetails(place.placeId)
        
        // SmartPlace 업데이트 (스냅샷 대신)
        await prisma.smartPlace.update({
          where: { id: place.id },
          data: {
            lastUpdated: checkDate,
            address: placeDetail.address || place.address,
            phone: placeDetail.phone || place.phone,
            category: placeDetail.category || place.category
          }
        })
        console.log(`Snapshot saved with KST date: ${getKSTDateString(checkDate)}`)
      } catch (error) {
        console.error('Failed to get place details:', error)
      }
      
      // 각 키워드에 대해 순위 추적
      let successCount = 0
      let failCount = 0
      let completedCount = 0
      const startOfToday = getKSTToday() // KST 자정
      const endOfToday = new Date(startOfToday)
      endOfToday.setDate(endOfToday.getDate() + 1)
      endOfToday.setMilliseconds(-1) // 23:59:59.999
      
      console.log(`KST Check Date: ${getKSTDateString(checkDate)}`)
      
      // 오늘 날짜의 기존 추적 데이터 삭제
      console.log(`Deleting existing tracking data for today...`)
      for (const keyword of keywords) {
        await prisma.smartPlaceRanking.deleteMany({
          where: {
            keywordId: keyword.id,
            checkDate: {
              gte: startOfToday,
              lte: endOfToday
            }
          }
        })
      }
      
      console.log(`Starting to track ${keywords.length} keywords with V4 concurrent processing`)
      
      // V4 스크래퍼의 진정한 동시 처리
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
        keyword: '브라우저 컨텍스트 풀 초기화 중...' 
      })
      
      // 실시간 진행 상황 추적을 위한 Promise 배열
      const trackingPromises = keywordData.map(({ keyword, keywordId }, index) => {
        return (async () => {
          // 추적 시작 알림
          send({ 
            type: 'progress', 
            status: 'tracking_start',
            current: completedCount, 
            total: keywords.length, 
            keyword: keyword,
            message: `${keyword} 추적 시작...`,
            index: index + 1
          })
          
          try {
            // Queue를 통해 추적 (자동으로 대기 및 실행)
            const result = await scraper.trackRanking(keyword, {
              placeId: place.placeId,
              placeName: place.placeName
            })
            
            // 결과 저장
            const keywordObj = keywords.find(k => k.keyword === keyword)
            if (keywordObj) {
              await prisma.smartPlaceRanking.create({
                data: {
                  keywordId: keywordObj.id,
                  organicRank: result.organicRank,
                  adRank: result.adRank,
                  checkDate: checkDate,
                  totalResults: result.topTenPlaces?.length || 0,
                  topTenPlaces: result.topTenPlaces || []
                }
              })
              
              successCount++
              completedCount++
              
              console.log(`Saved ranking for ${keyword}: organic=${result.organicRank}, ad=${result.adRank}`)
              
              send({ 
                type: 'progress', 
                status: 'tracking_complete',
                current: completedCount, 
                total: keywords.length, 
                keyword: keyword,
                message: `${keyword} 추적 완료 (오가닉: ${result.organicRank || '-'}, 광고: ${result.adRank || '-'})`,
                result: {
                  organicRank: result.organicRank,
                  adRank: result.adRank,
                  found: result.found
                }
              })
              
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
          } catch (error) {
            console.error(`Failed to track ${keyword}:`, error)
            const keywordObj = keywords.find(k => k.keyword === keyword)
            if (keywordObj) {
              // 실패해도 null 값으로 저장
              try {
                await prisma.smartPlaceRanking.create({
                  data: {
                    keywordId: keywordObj.id,
                    organicRank: null,
                    adRank: null,
                    checkDate: checkDate,
                    totalResults: 0,
                    topTenPlaces: []
                  }
                })
              } catch (saveError) {
                console.error(`Failed to save null ranking for ${keyword}:`, saveError)
              }
            }
            
            failCount++
            completedCount++
            
            send({ 
              type: 'warning', 
              current: completedCount, 
              total: keywords.length, 
              keyword: keyword,
              message: `${keyword} 추적 실패`,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        })()
      })
      
      // 모든 추적 완료 대기
      await Promise.all(trackingPromises)

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
        await prisma.smartPlace.update({
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