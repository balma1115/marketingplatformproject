import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { trackingEventManager } from '@/lib/services/event-manager'
import { trackingManager } from '@/lib/services/tracking-manager'

// Next.js App Router에서 SSE를 위한 필수 설정
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  console.log('[SSE-FIXED] New connection attempt')
  
  // 인증 확인
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value || cookieStore.get('token')?.value
  
  if (!token) {
    console.log('[SSE-FIXED] No auth token found')
    if (process.env.NODE_ENV !== 'development') {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let userId = '1'
  let userRole = 'admin'
  
  if (token) {
    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production') as any
      console.log('[SSE-FIXED] Authenticated user:', decoded.userId, 'Role:', decoded.role)
      userId = decoded.userId?.toString() || '1'
      userRole = decoded.role || 'admin'
      
      if (userRole?.toLowerCase() !== 'admin') {
        console.log('[SSE-FIXED] Non-admin user denied:', userRole)
        return new Response('Forbidden', { status: 403 })
      }
    } catch (error) {
      console.log('[SSE-FIXED] Token verification failed:', error)
      if (process.env.NODE_ENV !== 'development') {
        return new Response('Unauthorized', { status: 401 })
      }
    }
  }
  
  console.log('[SSE-FIXED] Creating SSE stream for admin user')

  // 인코더
  const encoder = new TextEncoder()
  
  // Abort 시그널 처리를 위한 플래그
  let aborted = false
  
  // 이벤트 핸들러 정의
  const statusHandler = (data: any) => {
    if (!aborted) {
      console.log('[SSE-FIXED] Emitting status_update:', data.jobId || 'status')
    }
  }

  const jobHandler = (data: any) => {
    if (!aborted) {
      console.log('[SSE-FIXED] Emitting job_update:', data.jobId || data.job?.id || 'unknown')
    }
  }

  const logHandler = (data: any) => {
    if (!aborted) {
      console.log('[SSE-FIXED] Emitting log_update')
    }
  }
  
  // SSE 응답 스트림 생성
  const responseStream = new ReadableStream({
    async start(controller) {
      console.log('[SSE-FIXED] Stream started')
      
      // Helper function to send SSE message
      const sendMessage = (data: any) => {
        if (!aborted) {
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`
            controller.enqueue(encoder.encode(message))
          } catch (error) {
            console.error('[SSE-FIXED] Error sending message:', error)
          }
        }
      }
      
      // 초기 연결 메시지
      sendMessage({ 
        type: 'connected', 
        timestamp: new Date().toISOString(),
        message: 'SSE connection established'
      })
      
      // 이벤트 핸들러 재정의 (controller 접근 가능)
      const statusEventHandler = (data: any) => {
        statusHandler(data)
        sendMessage({
          type: 'status_update',
          ...data,
          timestamp: new Date().toISOString()
        })
      }

      const jobEventHandler = (data: any) => {
        jobHandler(data)
        sendMessage({
          type: 'job_update',
          ...data,
          timestamp: new Date().toISOString()
        })
      }

      const logEventHandler = (data: any) => {
        logHandler(data)
        sendMessage({
          type: 'log_update',
          ...data,
          timestamp: new Date().toISOString()
        })
      }

      // 이벤트 리스너 등록
      console.log('[SSE-FIXED] Registering event listeners...')
      trackingEventManager.on('status_update', statusEventHandler)
      trackingEventManager.on('job_update', jobEventHandler)
      trackingEventManager.on('log_update', logEventHandler)
      
      // 리스너 카운트 확인
      console.log('[SSE-FIXED] Listeners registered:', {
        status_update: trackingEventManager.listenerCount('status_update'),
        job_update: trackingEventManager.listenerCount('job_update'),
        log_update: trackingEventManager.listenerCount('log_update')
      })

      // 버퍼된 이벤트 플러시
      console.log('[SSE-FIXED] Flushing buffered events...')
      trackingEventManager.flushBuffer((event) => {
        sendMessage({
          ...event.data,
          type: event.type,
          buffered: true,
          timestamp: event.timestamp
        })
      })
      
      // 현재 상태 전송
      const currentJobs = trackingManager.getAllJobs()
      if (currentJobs.length > 0) {
        console.log('[SSE-FIXED] Sending current jobs:', currentJobs.length)
        sendMessage({
          type: 'initial_state',
          jobs: currentJobs.slice(0, 10),
          totalJobs: currentJobs.length,
          timestamp: new Date().toISOString()
        })
      }

      // 하트비트 (30초마다)
      const heartbeatInterval = setInterval(() => {
        if (!aborted) {
          try {
            // SSE comment for keepalive
            controller.enqueue(encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`))
          } catch (error) {
            console.log('[SSE-FIXED] Heartbeat error, cleaning up')
            clearInterval(heartbeatInterval)
          }
        }
      }, 30000)

      // 클라이언트 연결 종료 감지
      req.signal.addEventListener('abort', () => {
        console.log('[SSE-FIXED] Client disconnected, cleaning up...')
        aborted = true
        
        // 이벤트 리스너 제거
        trackingEventManager.off('status_update', statusEventHandler)
        trackingEventManager.off('job_update', jobEventHandler)
        trackingEventManager.off('log_update', logEventHandler)
        
        // 하트비트 정리
        clearInterval(heartbeatInterval)
        
        // 스트림 종료
        try {
          controller.close()
        } catch (error) {
          // Already closed
        }
      })
      
      // Keep stream alive
      console.log('[SSE-FIXED] SSE stream is active and waiting for events...')
    }
  })
  
  // SSE 응답 반환
  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성화
      'X-Content-Type-Options': 'nosniff',
    },
  })
}