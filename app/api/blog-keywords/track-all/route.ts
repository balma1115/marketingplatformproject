import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { getNaverBlogScraperV2, closeNaverBlogScraperV2 } from '@/lib/services/naver-blog-scraper-v2'
import { trackingManager } from '@/lib/services/tracking-manager'
import { trackingEventManager } from '@/lib/services/event-manager'

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    let scraper = null
    
    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    })
    
    // TrackingManager에 작업 등록
    const jobId = trackingManager.addJob({
      userId: userId.toString(),
      userName: user?.name || 'Unknown',
      userEmail: user?.email || '',
      type: 'blog',
      status: 'queued',
      startedAt: new Date(),
      progress: { current: 0, total: 0 }
    })
    
    try {
      // 작업 상태를 running으로 업데이트
      trackingManager.updateJob(jobId, { status: 'running' })
      
      // 사용자의 블로그 프로젝트 찾기
      const blog = await prisma.blogTrackingProject.findFirst({
        where: {
          userId: userId
        }
      })

      if (!blog) {
        trackingManager.updateJob(jobId, {
          status: 'failed',
          error: { message: '블로그 미등록', timestamp: new Date() }
        })
        return NextResponse.json({ error: '먼저 블로그를 등록해주세요.' }, { status: 404 })
      }

      // 활성화된 키워드만 가져오기
      const keywords = await prisma.blogTrackingKeyword.findMany({
        where: {
          projectId: blog.id,
          isActive: true
        }
      })

      if (keywords.length === 0) {
        trackingManager.updateJob(jobId, {
          status: 'failed',
          error: { message: '추적할 키워드 없음', timestamp: new Date() }
        })
        return NextResponse.json({ error: '추적할 키워드가 없습니다.' }, { status: 400 })
      }
      
      // 작업 진행률 초기화
      trackingManager.updateProgress(jobId, 0, keywords.length)

      // Initialize Naver blog scraper V2
      console.log('Initializing Naver blog scraper V2...')
      scraper = await getNaverBlogScraperV2()

      // 각 키워드에 대해 순위 추적
      let successCount = 0
      let failCount = 0
      const trackingDate = new Date()
      const results = []

      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i]
        
        // 진행률 업데이트
        trackingManager.updateProgress(jobId, i + 1, keywords.length, keyword.keyword)
        
        try {
          // 실제 네이버 순위 체크
          console.log(`Checking ranking for keyword: ${keyword.keyword}`)
          const rankings = await scraper.checkBlogRanking(blog.blogUrl, keyword.keyword)
          
          if (rankings.error) {
            console.error(`Error for keyword ${keyword.keyword}:`, rankings.error)
            failCount++
            continue
          }
          
          // 순위 결과 저장 (메인탭은 노출 여부만, 블로그탭은 순위)
          const trackingResult = await prisma.blogTrackingResult.create({
            data: {
              keywordId: keyword.id,
              mainTabExposed: rankings.mainTabExposed,  // 메인탭 노출 여부 (Boolean)
              mainTabRank: null,  // 메인탭은 순위 추적하지 않음
              blogTabRank: rankings.blogTabRank,  // 블로그탭 1-30위 순위
              viewTabRank: null,  // VIEW 탭 사용 안함
              trackingDate: trackingDate,
              rankingType: 'organic'
            }
          })
          
          results.push({
            keyword: keyword.keyword,
            mainTabExposed: rankings.mainTabExposed,  // 노출 여부
            blogTabRank: rankings.blogTabRank  // 블로그탭 순위
          })
          
          console.log(`Successfully tracked ${keyword.keyword}:`, {
            mainTabExposed: rankings.mainTabExposed,
            blogTabRank: rankings.blogTabRank
          })
          
          successCount++
          
          // Add delay between searches to avoid being blocked
          if (keywords.indexOf(keyword) < keywords.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000))
          }
        } catch (error) {
          console.error(`Failed to track keyword ${keyword.keyword}:`, error)
          failCount++
        }
      }

      // 마지막 추적 시간 업데이트
      await prisma.blogTrackingProject.update({
        where: {
          id: blog.id
        },
        data: {
          lastTrackedAt: trackingDate
        }
      })

      // 작업 완료 처리
      trackingManager.updateJob(jobId, {
        status: 'completed',
        completedAt: new Date(),
        results: {
          successCount,
          failedCount: failCount,
          details: results
        }
      })

      return NextResponse.json({
        success: true,
        message: `순위 추적 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
        totalKeywords: keywords.length,
        successCount,
        failCount,
        trackingDate,
        results
      })
    } catch (error) {
      console.error('Failed to track blog keywords:', error)
      
      // 작업 실패 처리
      trackingManager.updateJob(jobId, {
        status: 'failed',
        completedAt: new Date(),
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date()
        }
      })
      
      return NextResponse.json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    } finally {
      // Clean up browser instance
      if (scraper) {
        try {
          await closeNaverBlogScraperV2()
        } catch (error) {
          console.error('Error closing scraper:', error)
        }
      }
    }
  })
}

// Set longer timeout for this route since scraping can take time
export const maxDuration = 60 // 60 seconds timeout