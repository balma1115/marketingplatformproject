import { NextRequest, NextResponse } from 'next/server'
import { trackingEventManager } from '@/lib/services/event-manager'
import { trackingManager } from '@/lib/services/tracking-manager'

export async function POST(req: NextRequest) {
  try {
    // Test event emission
    const testJob = {
      id: `test-${Date.now()}`,
      userId: '1',
      userName: 'Test User',
      userEmail: 'test@example.com',
      type: 'smartplace' as const,
      status: 'running' as const,
      startedAt: new Date().toISOString(),
      progress: {
        current: 5,
        total: 10,
        currentKeyword: '테스트 키워드'
      }
    }
    
    console.log('[TEST] Emitting test job_update event')
    
    // Emit through EventManager
    trackingEventManager.emitJobUpdate({
      job: testJob,
      action: 'test'
    })
    
    // Check listener count
    const listenerCount = {
      status_update: trackingEventManager.listenerCount('status_update'),
      job_update: trackingEventManager.listenerCount('job_update'),
      log_update: trackingEventManager.listenerCount('log_update')
    }
    
    console.log('[TEST] Current listener counts:', listenerCount)
    
    return NextResponse.json({
      success: true,
      message: 'Test event emitted',
      listenerCount,
      testJob
    })
  } catch (error) {
    console.error('[TEST] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to emit test event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}