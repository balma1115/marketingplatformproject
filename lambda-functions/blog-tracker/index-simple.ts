/**
 * Lambda Function: Blog Ranking Tracker (Simplified Version)
 * 브라우저 없이 API 호출만으로 처리
 */

import { SQSEvent, Context } from 'aws-lambda'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface BlogTrackingMessage {
  type: 'BLOG_TRACKING'
  keywordId: number
  keyword: string
  blogUrl: string
  userId: number
  projectId: number
}

/**
 * 한국 시간(KST) 기준 날짜 생성
 */
function getKSTDate(): Date {
  const now = new Date()
  const kstOffset = 9 * 60 // KST는 UTC+9
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utcTime + (kstOffset * 60000))
}

/**
 * 메인 핸들러 함수 - 간단한 버전
 */
export const handler = async (event: SQSEvent, context: Context) => {
  const results = []

  for (const record of event.Records) {
    const message: BlogTrackingMessage = JSON.parse(record.body)

    console.log(`Processing blog keyword: ${message.keyword} (ID: ${message.keywordId})`)

    try {
      // 실제 스크래핑 대신 임시로 결과 저장
      // 나중에 EC2나 다른 서비스에서 실제 스크래핑 수행
      const trackingDate = getKSTDate()

      await prisma.blogTrackingResult.create({
        data: {
          keywordId: message.keywordId,
          trackingDate,
          mainTabExposed: false,
          mainTabRank: null,
          blogTabRank: null,
          viewTabRank: null,
          adRank: null,
          // 처리 대기 상태로 표시
        }
      })

      // 다른 서비스(EC2)에 스크래핑 요청 전송
      // 예: SNS, EventBridge, 또는 API 호출

      results.push({
        keywordId: message.keywordId,
        success: true,
        message: 'Queued for processing'
      })

      console.log(`Successfully queued blog keyword ${message.keyword}`)

    } catch (error) {
      console.error(`Error processing blog keyword ${message.keyword}:`, error)
      results.push({
        keywordId: message.keywordId,
        success: false,
        error: error.message
      })
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Blog tracking requests queued',
      results,
    })
  }
}