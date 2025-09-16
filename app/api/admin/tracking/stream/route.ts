import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { trackingEventManager } from '@/lib/services/event-manager'
import { trackingManager } from '@/lib/services/tracking-manager'

// Next.js App Router에서 SSE를 위한 필수 설정
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  console.log('[SSE] Connection attempt received')
  
  // 인증 확인
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value || cookieStore.get('token')?.value
  
  if (!token) {
    console.log('[SSE] No auth token found')
    // 개발 환경에서는 테스트용으로 허용
    if (process.env.NODE_ENV === 'development') {
      console.log('[SSE] Development mode - allowing connection')
    } else {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let userId = '1'
  let userRole = 'admin'
  
  if (token) {
    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production') as any
      console.log('[SSE] Authenticated user:', decoded.userId, 'Role:', decoded.role)
      userId = decoded.userId?.toString() || '1'
      userRole = decoded.role || 'admin'
      
      // 관리자 권한 확인 (대소문자 구분 없이)
      if (userRole?.toLowerCase() !== 'admin') {
        console.log('[SSE] Non-admin user denied:', userRole)
        return new Response('Forbidden', { status: 403 })
      }
    } catch (error) {
      console.log('[SSE] Token verification failed:', error)
      if (process.env.NODE_ENV !== 'development') {
        return new Response('Unauthorized', { status: 401 })
      }
    }
  }
  
  console.log('[SSE] Creating event stream for admin user')

  // SSE 응답 스트림 생성
  const encoder = new TextEncoder()
  
  // 이벤트 핸들러를 밖에 정의
  const handleStatusUpdate = (data: any) => {
    console.log('[SSE Handler] Status update:', data)
  }

  const handleJobUpdate = (data: any) => {
    console.log('[SSE Handler] Job update:', data)
  }

  const handleLogUpdate = (data: any) => {
    console.log('[SSE Handler] Log update:', data)
  }
  
  const stream = new ReadableStream({
    async start(controller) {
      console.log('[SSE] Stream start function called')
      
      // 초기 연결 메시지
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`))
      console.log('[SSE] Initial connection message sent')

      // 이벤트 핸들러 재정의 (controller 접근 가능)
      const statusHandler = (data: any) => {
        try {
          console.log('[SSE] Sending status_update:', data)
          const message = `data: ${JSON.stringify({
            type: 'status_update',
            ...data,
            timestamp: new Date().toISOString()
          })}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          console.error('[SSE] Error sending status message:', error)
        }
      }

      const jobHandler = (data: any) => {
        try {
          console.log('[SSE] Sending job_update:', data)
          const message = `data: ${JSON.stringify({
            type: 'job_update',
            ...data,
            timestamp: new Date().toISOString()
          })}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          console.error('[SSE] Error sending job message:', error)
        }
      }

      const logHandler = (data: any) => {
        try {
          console.log('[SSE] Sending log_update:', data)
          const message = `data: ${JSON.stringify({
            type: 'log_update',
            ...data,
            timestamp: new Date().toISOString()
          })}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          console.error('[SSE] Error sending log message:', error)
        }
      }

      // 이벤트 리스너 등록
      console.log('[SSE] Registering event listeners...')
      trackingEventManager.on('status_update', statusHandler)
      trackingEventManager.on('job_update', jobHandler)
      trackingEventManager.on('log_update', logHandler)
      
      // 리스너 카운트 확인
      await new Promise(resolve => setTimeout(resolve, 100))
      console.log('[SSE] Listeners registered. Count:', {
        status_update: trackingEventManager.listenerCount('status_update'),
        job_update: trackingEventManager.listenerCount('job_update'),
        log_update: trackingEventManager.listenerCount('log_update')
      })

      // 버퍼된 이벤트 먼저 플러시
      console.log('[SSE] Flushing buffered events...')
      trackingEventManager.flushBuffer((event) => {
        try {
          console.log('[SSE] Sending buffered event:', event.type)
          const message = `data: ${JSON.stringify({
            ...event.data,
            type: event.type,
            buffered: true
          })}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          console.error('[SSE] Error sending buffered event:', error)
        }
      })
      
      // 현재 상태 즉시 전송
      const currentJobs = trackingManager.getAllJobs()
      if (currentJobs.length > 0) {
        console.log('[SSE] Sending current jobs:', currentJobs.length)
        const message = `data: ${JSON.stringify({
          type: 'initial_state',
          jobs: currentJobs.slice(0, 10),
          timestamp: new Date().toISOString()
        })}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // 하트비트 (30초마다 ping)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`))
        } catch (error) {
          // 연결이 끊어진 경우
          clearInterval(heartbeat)
        }
      }, 30000)

      // 클라이언트 연결 종료 시 정리
      req.signal.addEventListener('abort', () => {
        console.log('[SSE] Client disconnected, cleaning up...')
        trackingEventManager.off('status_update', statusHandler)
        trackingEventManager.off('job_update', jobHandler)
        trackingEventManager.off('log_update', logHandler)
        clearInterval(heartbeat)
        controller.close()
      })
    }
  })

  // SSE 응답 헤더 설정
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성화
    },
  })
}