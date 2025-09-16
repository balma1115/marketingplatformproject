import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { trackingManager } from '@/lib/services/tracking-manager'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId, userInfo) => {
    try {
      // 관리자 권한 확인
      if (!userInfo || userInfo.role !== 'admin') {
        // DB에서 다시 확인
        const user = await prisma.user.findUnique({
          where: { id: userId }
        })
        
        if (!user || user.role !== 'admin') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
      }

      const { searchParams } = new URL(req.url)
      const view = searchParams.get('view') || 'jobs' // jobs, logs, stats
      
      if (view === 'logs') {
        // 로그 조회
        const level = searchParams.get('level') as any
        const category = searchParams.get('category') as any
        const limit = parseInt(searchParams.get('limit') || '100')
        
        const logs = trackingManager.getLogs({ level, category, limit })
        return NextResponse.json({ logs })
      } 
      
      if (view === 'stats') {
        // 통계 조회
        const stats = trackingManager.getStats()
        return NextResponse.json({ stats })
      }
      
      // 기본: 작업 목록 조회
      const jobs = trackingManager.getAllJobs()
      const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'running')
      
      // SSE로 상태 업데이트 이벤트 발생
      const { trackingEventManager } = await import('@/lib/services/event-manager')
      trackingEventManager.emitStatusUpdate({
        jobs: jobs.slice(0, 50),
        activeJobs,
        stats: trackingManager.getStats()
      })
      
      const response = NextResponse.json({
        jobs: jobs.slice(0, 50), // 최근 50개만
        activeJobs,
        stats: trackingManager.getStats()
      })
      
      // 캐싱 헤더 추가 - 5초간 캐시
      response.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10')
      
      return response
    } catch (error) {
      console.error('Failed to fetch tracking status:', error)
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      trackingManager.addLog('error', 'api', 'Failed to fetch tracking status', { 
        error: errorMessage,
        userId: userId,
        url: req.url
      })
      
      return NextResponse.json({ 
        error: 'Internal server error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }, { status: 500 })
    }
  })
}

// 추적 상태 업데이트 함수는 trackingManager를 직접 사용하도록 마이그레이션됨
// 필요시 trackingManager를 직접 import하여 사용하세요