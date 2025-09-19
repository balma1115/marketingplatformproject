import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { LambdaTrackerClient } from '@/lib/services/lambda-tracker-client'
import { trackingManager } from '@/lib/services/tracking-manager'

const lambdaClient = new LambdaTrackerClient()

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {

    // Lambda 사용 가능 여부 확인
    if (!lambdaClient.isAvailable()) {
      return NextResponse.json({
        error: 'Lambda 추적 시스템이 구성되지 않았습니다. SQS 큐 URL을 확인해주세요.'
      }, { status: 503 })
    }

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
      type: 'smartplace',
      status: 'queued',
      startedAt: new Date(),
      progress: { current: 0, total: 0 }
    })

    try {
      // 작업 상태를 running으로 업데이트
      trackingManager.updateJob(jobId, { status: 'running' })

      // 사용자의 스마트플레이스 찾기
      const smartPlace = await prisma.smartPlace.findFirst({
        where: { userId },
        select: {
          id: true,
          placeId: true,
          placeName: true,
          keywords: {
            where: { isActive: true },
            select: {
              id: true,
              keyword: true
            }
          }
        }
      })

      if (!smartPlace) {
        trackingManager.updateJob(jobId, {
          status: 'failed',
          error: { message: '스마트플레이스 미등록', timestamp: new Date() }
        })
        return NextResponse.json({ error: '먼저 스마트플레이스를 등록해주세요.' }, { status: 404 })
      }

      if (smartPlace.keywords.length === 0) {
        trackingManager.updateJob(jobId, {
          status: 'failed',
          error: { message: '추적할 키워드 없음', timestamp: new Date() }
        })
        return NextResponse.json({ error: '추적할 키워드가 없습니다.' }, { status: 400 })
      }

      // Lambda로 전송할 메시지 준비
      const messages = smartPlace.keywords.map(keyword => ({
        keywordId: keyword.id,
        keyword: keyword.keyword,
        placeId: smartPlace.placeId,
        placeName: smartPlace.placeName,
        userId
      }))

      // 작업 진행률 초기화
      trackingManager.updateProgress(jobId, 0, messages.length)

      // Lambda SQS 큐로 메시지 전송
      console.log(`Sending ${messages.length} smartplace keywords to Lambda SQS queue`)
      await lambdaClient.trackSmartPlaceKeywords(messages)

      // 예상 처리 시간 계산
      const estimatedTime = lambdaClient.estimateProcessingTime(messages.length)

      // 작업 상태를 processing으로 업데이트 (Lambda에서 처리 중)
      trackingManager.updateJob(jobId, {
        status: 'processing',
        progress: {
          current: 0,
          total: messages.length
        }
      })

      // 키워드들의 lastChecked 시간 업데이트
      await prisma.smartPlaceKeyword.updateMany({
        where: {
          id: {
            in: smartPlace.keywords.map(k => k.id)
          }
        },
        data: {
          lastChecked: new Date()
        }
      })

      return NextResponse.json({
        message: 'Lambda 추적 작업이 큐에 전송되었습니다.',
        keywordCount: messages.length,
        estimatedProcessingTime: `약 ${Math.ceil(estimatedTime / 60)}분`,
        jobId,
        trackingType: 'lambda',
        note: 'Lambda 함수가 백그라운드에서 처리 중입니다. 잠시 후 결과를 확인해주세요.'
      })

    } catch (error) {
      console.error('Lambda tracking error:', error)

      trackingManager.updateJob(jobId, {
        status: 'failed',
        error: {
          message: error instanceof Error ? error.message : '알 수 없는 오류',
          timestamp: new Date()
        }
      })

      return NextResponse.json(
        { error: 'Lambda 추적 중 오류가 발생했습니다.', details: error },
        { status: 500 }
      )
    }
  })
}