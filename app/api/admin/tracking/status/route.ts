import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { trackingManager } from '@/lib/services/tracking-manager'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    // 관리자 권한 확인을 위해 DB에서 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
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
      
      return NextResponse.json({
        jobs: jobs.slice(0, 50), // 최근 50개만
        activeJobs,
        stats: trackingManager.getStats()
      })
    } catch (error) {
      console.error('Failed to fetch tracking status:', error)
      trackingManager.addLog('error', 'api', 'Failed to fetch tracking status', { error: error.message })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

// 추적 상태 업데이트 함수 (다른 API에서 사용)
export function updateTrackingStatus(
  userId: string,
  type: 'smartplace' | 'blog',
  status: 'queued' | 'running' | 'completed' | 'failed',
  data?: any
) {
  // 이 함수는 trackingManager를 사용하도록 마이그레이션됨
  // 하위 호환성을 위해 유지
}