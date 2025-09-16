/**
 * 추적 서비스 팩토리
 * 환경에 따라 적절한 추적 서비스를 선택합니다.
 */

import { env } from '@/lib/utils/environment'
import { prisma } from '@/lib/db'

interface TrackingService {
  track(keywords: any[]): Promise<any>
  getStatus(): Promise<any>
}

/**
 * 로컬 추적 서비스
 * 로컬 환경에서 직접 Playwright를 사용하여 추적합니다.
 */
class LocalTracker implements TrackingService {
  async track(keywords: any[]) {
    const { ImprovedScraperV3 } = await import('@/lib/services/improved-scraper-v3')
    const scraper = new ImprovedScraperV3()

    const PQueue = (await import('p-queue')).default
    const queue = new PQueue({ concurrency: 3 })

    const results = await Promise.all(
      keywords.map(kw =>
        queue.add(async () => {
          try {
            const result = await scraper.trackSmartPlaceKeyword(kw)
            return { success: true, keywordId: kw.id, result }
          } catch (error) {
            console.error(`Failed to track keyword ${kw.keyword}:`, error)
            return { success: false, keywordId: kw.id, error: error.message }
          }
        })
      )
    )

    return {
      mode: 'local',
      totalKeywords: keywords.length,
      results
    }
  }

  async getStatus() {
    return {
      mode: 'local',
      status: 'ready'
    }
  }
}

/**
 * Lambda 추적 서비스
 * AWS Lambda를 사용하여 추적합니다.
 */
class LambdaTracker implements TrackingService {
  async track(keywords: any[]) {
    const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs')
    const sqs = new SQSClient({ region: env.awsRegion })

    const messages = []
    for (const keyword of keywords) {
      try {
        await sqs.send(new SendMessageCommand({
          QueueUrl: env.sqsQueueUrl,
          MessageBody: JSON.stringify({
            type: 'SMARTPLACE_TRACKING',
            keywordId: keyword.id,
            keyword: keyword.keyword,
            userId: keyword.userId,
            placeId: keyword.smartPlace?.placeId,
            placeName: keyword.smartPlace?.placeName
          })
        }))
        messages.push({ keywordId: keyword.id, status: 'queued' })
      } catch (error) {
        console.error(`Failed to queue keyword ${keyword.keyword}:`, error)
        messages.push({ keywordId: keyword.id, status: 'failed', error: error.message })
      }
    }

    return {
      mode: 'lambda',
      totalKeywords: keywords.length,
      messages
    }
  }

  async getStatus() {
    // Lambda 상태 확인 로직
    return {
      mode: 'lambda',
      status: 'ready',
      queueUrl: env.sqsQueueUrl
    }
  }
}

/**
 * Mock 추적 서비스 (테스트용)
 */
class MockTracker implements TrackingService {
  async track(keywords: any[]) {
    console.log(`[MOCK] Tracking ${keywords.length} keywords`)

    const results = keywords.map(kw => ({
      keywordId: kw.id,
      keyword: kw.keyword,
      organicRank: Math.floor(Math.random() * 20) + 1,
      adRank: Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : null,
      status: 'success'
    }))

    return {
      mode: 'mock',
      totalKeywords: keywords.length,
      results
    }
  }

  async getStatus() {
    return {
      mode: 'mock',
      status: 'ready'
    }
  }
}

/**
 * 추적 서비스 팩토리 함수
 * 환경 설정에 따라 적절한 추적 서비스를 반환합니다.
 */
export function getTrackingService(): TrackingService {
  // Mock 모드 확인
  if (env.useMockScraper) {
    console.log('Using Mock Tracker')
    return new MockTracker()
  }

  // Lambda 추적 사용 여부 확인
  if (env.useLambdaTracking) {
    console.log('Using Lambda Tracker')
    return new LambdaTracker()
  }

  // 기본값: 로컬 추적
  console.log('Using Local Tracker')
  return new LocalTracker()
}

/**
 * 스마트플레이스 키워드 추적 함수
 */
export async function trackSmartPlaceKeywords(userId?: number) {
  const tracker = getTrackingService()

  // 추적할 키워드 조회
  const whereClause: any = { isActive: true }
  if (userId) {
    whereClause.userId = userId
  }

  const keywords = await prisma.smartPlaceKeyword.findMany({
    where: whereClause,
    include: {
      smartPlace: true
    }
  })

  if (keywords.length === 0) {
    return {
      success: true,
      message: '추적할 키워드가 없습니다.',
      totalKeywords: 0
    }
  }

  // 환경별 디버그 로그
  if (env.debugMode) {
    console.log(`추적 모드: ${env.trackingMode}`)
    console.log(`추적할 키워드 수: ${keywords.length}`)
    console.log(`Lambda 사용: ${env.useLambdaTracking}`)
  }

  // 추적 실행
  const result = await tracker.track(keywords)

  return {
    success: true,
    ...result
  }
}

/**
 * 블로그 키워드 추적 함수
 */
export async function trackBlogKeywords(userId?: number) {
  // 블로그는 항상 로컬에서 실행 (Lambda 미지원)
  const { NaverBlogScraperV2 } = await import('@/lib/services/naver-blog-scraper-v2')
  const scraper = new NaverBlogScraperV2()

  const whereClause: any = { isActive: true }
  if (userId) {
    whereClause.project = { userId }
  }

  const keywords = await prisma.blogTrackingKeyword.findMany({
    where: whereClause,
    include: {
      project: true
    }
  })

  if (keywords.length === 0) {
    return {
      success: true,
      message: '추적할 블로그 키워드가 없습니다.',
      totalKeywords: 0
    }
  }

  const PQueue = (await import('p-queue')).default
  const queue = new PQueue({ concurrency: 3 })

  const results = await Promise.all(
    keywords.map(kw =>
      queue.add(async () => {
        try {
          const result = await scraper.trackKeyword(kw.project.blogUrl, kw.keyword)

          // 결과 저장
          await prisma.blogTrackingResult.create({
            data: {
              keywordId: kw.id,
              trackingDate: new Date(),
              ...result
            }
          })

          return { success: true, keywordId: kw.id, result }
        } catch (error) {
          console.error(`Failed to track blog keyword ${kw.keyword}:`, error)
          return { success: false, keywordId: kw.id, error: error.message }
        }
      })
    )
  )

  return {
    success: true,
    mode: 'local',
    totalKeywords: keywords.length,
    results
  }
}

/**
 * 추적 서비스 상태 확인
 */
export async function getTrackingStatus() {
  const tracker = getTrackingService()
  const status = await tracker.getStatus()

  return {
    ...status,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      APP_ENV: process.env.APP_ENV,
      trackingMode: env.trackingMode,
      useLambda: env.useLambdaTracking
    }
  }
}