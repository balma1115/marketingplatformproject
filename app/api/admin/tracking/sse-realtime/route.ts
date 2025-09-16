import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { trackingEventManager } from '@/lib/services/event-manager'
import { trackingManager } from '@/lib/services/tracking-manager'

// Required for SSE in Next.js App Router
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  console.log('[SSE-REALTIME] Connection request received')
  
  // Auth check
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value || cookieStore.get('token')?.value
  
  let userId = '1'
  let userRole = 'admin'
  
  if (token) {
    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production') as any
      userId = decoded.userId?.toString() || '1'
      userRole = decoded.role || 'admin'
      
      if (userRole?.toLowerCase() !== 'admin' && process.env.NODE_ENV !== 'development') {
        return new Response('Forbidden', { status: 403 })
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'development') {
        return new Response('Unauthorized', { status: 401 })
      }
    }
  } else if (process.env.NODE_ENV !== 'development') {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()

  // Create a TransformStream for SSE
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Send SSE message helper
  const sendEvent = async (data: any) => {
    try {
      const message = `data: ${JSON.stringify(data)}\n\n`
      await writer.write(encoder.encode(message))
    } catch (error) {
      console.error('[SSE-REALTIME] Error sending event:', error)
    }
  }

  // Send heartbeat comment helper
  const sendHeartbeat = async () => {
    try {
      const comment = `: heartbeat ${new Date().toISOString()}\n\n`
      await writer.write(encoder.encode(comment))
    } catch (error) {
      // Connection closed
      return false
    }
    return true
  }

  // Start async processing
  const processStream = async () => {
    console.log('[SSE-REALTIME] Starting stream processing')
    
    // Send initial connection message
    await sendEvent({
      type: 'connected',
      timestamp: new Date().toISOString(),
      message: 'Real-time tracking updates active'
    })

    // Event handlers
    const handlers = {
      status_update: async (data: any) => {
        console.log('[SSE-REALTIME] Status update:', data.jobId || 'batch')
        await sendEvent({
          type: 'status_update',
          ...data,
          timestamp: new Date().toISOString()
        })
      },
      job_update: async (data: any) => {
        console.log('[SSE-REALTIME] Job update:', data.jobId || data.job?.id)
        await sendEvent({
          type: 'job_update',
          ...data,
          timestamp: new Date().toISOString()
        })
      },
      log_update: async (data: any) => {
        console.log('[SSE-REALTIME] Log update')
        await sendEvent({
          type: 'log_update',
          ...data,
          timestamp: new Date().toISOString()
        })
      }
    }

    // Register event listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      trackingEventManager.on(event, handler)
    })

    console.log('[SSE-REALTIME] Event listeners registered:', {
      status_update: trackingEventManager.listenerCount('status_update'),
      job_update: trackingEventManager.listenerCount('job_update'),
      log_update: trackingEventManager.listenerCount('log_update')
    })

    // Flush buffered events
    trackingEventManager.flushBuffer(async (event) => {
      await sendEvent({
        ...event.data,
        type: event.type,
        buffered: true,
        timestamp: event.timestamp
      })
    })

    // Send current state
    const currentJobs = trackingManager.getAllJobs()
    if (currentJobs.length > 0) {
      await sendEvent({
        type: 'initial_state',
        jobs: currentJobs.slice(0, 10),
        totalJobs: currentJobs.length,
        timestamp: new Date().toISOString()
      })
    }

    // Heartbeat interval
    const heartbeatInterval = setInterval(async () => {
      const alive = await sendHeartbeat()
      if (!alive) {
        clearInterval(heartbeatInterval)
      }
    }, 30000)

    // Handle abort signal
    req.signal.addEventListener('abort', () => {
      console.log('[SSE-REALTIME] Client disconnected')
      clearInterval(heartbeatInterval)
      
      // Remove event listeners
      Object.entries(handlers).forEach(([event, handler]) => {
        trackingEventManager.off(event, handler)
      })
      
      writer.close().catch(() => {})
    })
  }

  // Start processing in background
  processStream()

  // Return SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}