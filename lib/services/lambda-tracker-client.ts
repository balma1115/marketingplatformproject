import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs'

// SQS 클라이언트 초기화
const sqs = new SQSClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  } : undefined // EC2 인스턴스 프로파일 사용 시 undefined
})

interface TrackingRequest {
  userId: number
  trackingType: 'blog' | 'smartplace'
}

interface BlogKeywordMessage {
  keywordId: number
  keyword: string
  projectId: number
  blogUrl: string
  blogName: string
  userId: number
}

interface SmartPlaceKeywordMessage {
  keywordId: number
  keyword: string
  placeId: string
  placeName: string
  userId: number
}

export class LambdaTrackerClient {
  private blogQueueUrl: string
  private smartPlaceQueueUrl: string
  private isConfigured: boolean

  constructor() {
    this.blogQueueUrl = process.env.BLOG_QUEUE_URL || ''
    this.smartPlaceQueueUrl = process.env.SMARTPLACE_QUEUE_URL || ''

    // AWS 자격 증명 확인
    const hasAwsCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    const hasQueues = !!(this.blogQueueUrl || this.smartPlaceQueueUrl)

    this.isConfigured = hasAwsCredentials && hasQueues

    if (!this.isConfigured) {
      console.warn('Lambda tracking not configured:', {
        hasAwsCredentials,
        hasQueues,
        blogQueueUrl: !!this.blogQueueUrl,
        smartPlaceQueueUrl: !!this.smartPlaceQueueUrl
      })
    }
  }

  /**
   * 블로그 키워드 추적 요청을 SQS로 전송
   */
  async trackBlogKeywords(keywords: BlogKeywordMessage[]): Promise<void> {
    if (!this.blogQueueUrl) {
      throw new Error('Blog queue URL not configured')
    }

    // 배치로 나누기 (SQS는 한 번에 최대 10개 메시지)
    const batches: BlogKeywordMessage[][] = []
    for (let i = 0; i < keywords.length; i += 10) {
      batches.push(keywords.slice(i, i + 10))
    }

    // 각 배치 전송
    for (const batch of batches) {
      const entries = batch.map((keyword, index) => ({
        Id: `${Date.now()}-${index}`,
        MessageBody: JSON.stringify({
          ...keyword,
          timestamp: new Date().toISOString(),
          type: 'BLOG_TRACKING'
        })
      }))

      await sqs.send(new SendMessageBatchCommand({
        QueueUrl: this.blogQueueUrl,
        Entries: entries
      }))
    }

    console.log(`Sent ${keywords.length} blog tracking jobs to SQS`)
  }

  /**
   * 스마트플레이스 키워드 추적 요청을 SQS로 전송
   */
  async trackSmartPlaceKeywords(keywords: SmartPlaceKeywordMessage[]): Promise<void> {
    if (!this.smartPlaceQueueUrl) {
      throw new Error('SmartPlace queue URL not configured')
    }

    // 배치로 나누기
    const batches: SmartPlaceKeywordMessage[][] = []
    for (let i = 0; i < keywords.length; i += 10) {
      batches.push(keywords.slice(i, i + 10))
    }

    // 각 배치 전송
    for (const batch of batches) {
      const entries = batch.map((keyword, index) => ({
        Id: `${Date.now()}-${index}`,
        MessageBody: JSON.stringify({
          ...keyword,
          timestamp: new Date().toISOString(),
          type: 'SMARTPLACE_TRACKING'
        })
      }))

      await sqs.send(new SendMessageBatchCommand({
        QueueUrl: this.smartPlaceQueueUrl,
        Entries: entries
      }))
    }

    console.log(`Sent ${keywords.length} smartplace tracking jobs to SQS`)
  }

  /**
   * Lambda 추적 사용 가능 여부 확인
   */
  isAvailable(): boolean {
    return this.isConfigured
  }

  /**
   * 추적 지연 시간 예측 (키워드 수 기반)
   */
  estimateProcessingTime(keywordCount: number): number {
    // 평균적으로 키워드당 8-10초 소요
    const secondsPerKeyword = 9
    const concurrentWorkers = 10 // Lambda 동시 실행 수

    return Math.ceil((keywordCount * secondsPerKeyword) / concurrentWorkers)
  }
}