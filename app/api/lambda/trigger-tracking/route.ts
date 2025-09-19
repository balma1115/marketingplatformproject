import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

// SQS Client 초기화
const sqsClient = new SQSClient({
  region: 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const SMARTPLACE_QUEUE_URL = process.env.SMARTPLACE_QUEUE_URL!
const BLOG_QUEUE_URL = process.env.BLOG_QUEUE_URL!

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const { type, keywords } = await request.json()

      console.log(`Lambda tracking triggered for user ${userId}, type: ${type}`)

      if (type === 'smartplace') {
        // 스마트플레이스 키워드 가져오기
        const smartPlaceKeywords = await prisma.smartPlaceKeyword.findMany({
          where: {
            userId,
            isActive: true,
            id: keywords ? { in: keywords } : undefined
          },
          include: {
            smartPlace: true
          }
        })

        // 각 키워드를 SQS에 전송
        for (const keyword of smartPlaceKeywords) {
          const message = {
            type: 'SMARTPLACE_TRACKING',
            keywordId: keyword.id,
            keyword: keyword.keyword,
            userId: keyword.userId,
            placeId: keyword.smartPlace.placeId,
            placeName: keyword.smartPlace.placeName,
          }

          await sqsClient.send(new SendMessageCommand({
            QueueUrl: SMARTPLACE_QUEUE_URL,
            MessageBody: JSON.stringify(message),
          }))
        }

        return NextResponse.json({
          success: true,
          message: `${smartPlaceKeywords.length}개의 스마트플레이스 키워드가 Lambda로 전송되었습니다.`,
          count: smartPlaceKeywords.length
        })
      }

      if (type === 'blog') {
        // 블로그 키워드 가져오기
        const blogKeywords = await prisma.blogTrackingKeyword.findMany({
          where: {
            project: {
              userId
            },
            isActive: true,
            id: keywords ? { in: keywords } : undefined
          },
          include: {
            project: true
          }
        })

        // 각 키워드를 SQS에 전송
        for (const keyword of blogKeywords) {
          const message = {
            type: 'BLOG_TRACKING',
            keywordId: keyword.id,
            keyword: keyword.keyword,
            blogUrl: keyword.project.blogUrl,
            userId: keyword.project.userId,
            projectId: keyword.projectId,
          }

          await sqsClient.send(new SendMessageCommand({
            QueueUrl: BLOG_QUEUE_URL,
            MessageBody: JSON.stringify(message),
          }))
        }

        return NextResponse.json({
          success: true,
          message: `${blogKeywords.length}개의 블로그 키워드가 Lambda로 전송되었습니다.`,
          count: blogKeywords.length
        })
      }

      return NextResponse.json({
        success: false,
        error: 'Invalid tracking type'
      }, { status: 400 })

    } catch (error) {
      console.error('Lambda tracking error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to trigger Lambda tracking'
      }, { status: 500 })
    }
  })
}