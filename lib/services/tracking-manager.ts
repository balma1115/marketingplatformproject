// 추적 작업 관리 시스템
import { trackingEventManager } from './event-manager';

export interface TrackingJob {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: 'smartplace' | 'blog'
  status: 'queued' | 'running' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  progress: {
    current: number
    total: number
    currentKeyword?: string
  }
  results?: {
    successCount: number
    failedCount: number
    details?: any[]
  }
  error?: {
    message: string
    stack?: string
    timestamp: Date
  }
}

export interface SystemLog {
  id: string
  level: 'info' | 'warning' | 'error' | 'debug'
  category: 'tracking' | 'api' | 'database' | 'scraper'
  message: string
  details?: any
  userId?: string
  timestamp: Date
}

class TrackingManager {
  private jobs: Map<string, TrackingJob> = new Map()
  private logs: SystemLog[] = []
  private maxLogs = 1000 // 최대 로그 개수

  // 작업 추가
  addJob(job: Omit<TrackingJob, 'id'>): string {
    // 동일한 사용자의 동일한 타입 실행 중인 작업이 있는지 확인
    const existingActiveJob = this.getActiveJobForUser(job.userId, job.type)
    if (existingActiveJob) {
      this.addLog('warning', 'tracking', 
        `중복 추적 요청 무시됨: ${job.userName} - ${job.type} (기존 작업: ${existingActiveJob.id})`, 
        { existingJobId: existingActiveJob.id, userId: job.userId },
        job.userId
      )
      return existingActiveJob.id // 기존 작업 ID 반환
    }
    
    const id = `${job.userId}-${job.type}-${Date.now()}`
    const fullJob: TrackingJob = {
      ...job,
      id,
      progress: job.progress || { current: 0, total: 0 }
    }
    this.jobs.set(id, fullJob)
    
    this.addLog('info', 'tracking', `추적 작업 시작: ${job.userName} - ${job.type}`, {
      jobId: id,
      userId: job.userId
    }, job.userId)
    
    // SSE 이벤트 발생
    console.log('[TrackingManager] Emitting job_update event:', { jobId: id, action: 'added' })
    trackingEventManager.emitJobUpdate({
      job: {
        id: fullJob.id,
        userId: fullJob.userId,
        userName: fullJob.userName,
        userEmail: fullJob.userEmail,
        type: fullJob.type,
        status: fullJob.status,
        startedAt: fullJob.startedAt?.toISOString(),
        completedAt: fullJob.completedAt?.toISOString(),
        progress: fullJob.progress,
        results: fullJob.results,
        error: fullJob.error
      },
      action: 'added'
    })
    
    return id
  }
  
  // 사용자의 활성 작업 찾기
  getActiveJobForUser(userId: string, type: 'smartplace' | 'blog'): TrackingJob | undefined {
    return Array.from(this.jobs.values()).find(
      job => job.userId === userId && 
             job.type === type && 
             (job.status === 'queued' || job.status === 'running')
    )
  }
  
  // 모든 활성 작업 취소
  cancelAllActiveJobs(): void {
    const activeJobs = this.getActiveJobs()
    for (const job of activeJobs) {
      this.updateJob(job.id, {
        status: 'failed',
        error: {
          message: '새로운 추적 시작으로 인해 취소됨',
          timestamp: new Date()
        }
      })
      this.addLog('warning', 'tracking', 
        `작업 취소됨: ${job.userName} - ${job.type}`,
        { jobId: job.id },
        job.userId
      )
    }
  }

  // 작업 업데이트
  updateJob(id: string, updates: Partial<TrackingJob>) {
    const job = this.jobs.get(id)
    if (job) {
      Object.assign(job, updates)
      
      if (updates.status === 'completed') {
        job.completedAt = new Date()
        this.addLog('info', 'tracking', `추적 완료: ${job.userName} - ${job.type}`, {
          jobId: id,
          results: updates.results
        }, job.userId)
      } else if (updates.status === 'failed') {
        job.completedAt = new Date()
        this.addLog('error', 'tracking', `추적 실패: ${job.userName} - ${job.type}`, {
          jobId: id,
          error: updates.error
        }, job.userId)
      }
      
      // SSE 이벤트 발생
      console.log('[TrackingManager] Emitting job_update event:', { jobId: id, action: 'updated', status: job.status })
      trackingEventManager.emitJobUpdate({
        job: {
          id: job.id,
          userId: job.userId,
          userName: job.userName,
          userEmail: job.userEmail,
          type: job.type,
          status: job.status,
          startedAt: job.startedAt?.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          progress: job.progress,
          results: job.results,
          error: job.error
        },
        action: 'updated'
      })
    }
  }

  // 진행률 업데이트
  updateProgress(id: string, current: number, total: number, currentKeyword?: string) {
    const job = this.jobs.get(id)
    if (job) {
      job.progress = { current, total, currentKeyword }
      
      // SSE 이벤트 발생 (진행률 업데이트)
      trackingEventManager.emitJobUpdate({
        job: {
          id: job.id,
          userId: job.userId,
          userName: job.userName,
          userEmail: job.userEmail,
          type: job.type,
          status: job.status,
          startedAt: job.startedAt?.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          progress: job.progress,
          results: job.results,
          error: job.error
        },
        action: 'progress'
      })
    }
  }

  // 작업 조회
  getJob(id: string): TrackingJob | undefined {
    return this.jobs.get(id)
  }

  // 모든 작업 조회
  getAllJobs(): TrackingJob[] {
    return Array.from(this.jobs.values())
  }

  // 활성 작업 조회
  getActiveJobs(): TrackingJob[] {
    return Array.from(this.jobs.values()).filter(
      job => job.status === 'queued' || job.status === 'running'
    )
  }

  // 사용자별 작업 조회
  getUserJobs(userId: string): TrackingJob[] {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId)
  }

  // 로그 추가
  addLog(
    level: SystemLog['level'],
    category: SystemLog['category'],
    message: string,
    details?: any,
    userId?: string
  ) {
    const log: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      category,
      message,
      details,
      userId,
      timestamp: new Date()
    }
    
    this.logs.unshift(log)
    
    // 최대 로그 수 제한
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }
    
    // SSE 로그 이벤트 발생
    trackingEventManager.emitLogUpdate(level, message, details)
    
    // 콘솔에도 출력 (개발 환경)
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'error' ? console.error : 
                       level === 'warning' ? console.warn : 
                       console.log
      logMethod(`[${category.toUpperCase()}] ${message}`, details)
    }
  }

  // 로그 조회
  getLogs(filter?: {
    level?: SystemLog['level']
    category?: SystemLog['category']
    userId?: string
    limit?: number
  }): SystemLog[] {
    let filtered = [...this.logs]
    
    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level)
    }
    if (filter?.category) {
      filtered = filtered.filter(log => log.category === filter.category)
    }
    if (filter?.userId) {
      filtered = filtered.filter(log => log.userId === filter.userId)
    }
    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit)
    }
    
    return filtered
  }

  // 오래된 작업 정리
  cleanupOldJobs(hoursOld: number = 24) {
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000)
    
    for (const [id, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < cutoffTime) {
        this.jobs.delete(id)
      }
    }
  }

  // 통계 조회
  getStats() {
    const jobs = Array.from(this.jobs.values())
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    return {
      total: jobs.length,
      queued: jobs.filter(j => j.status === 'queued').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      last24h: {
        total: jobs.filter(j => j.startedAt && j.startedAt > last24h).length,
        completed: jobs.filter(j => j.status === 'completed' && j.completedAt && j.completedAt > last24h).length,
        failed: jobs.filter(j => j.status === 'failed' && j.completedAt && j.completedAt > last24h).length
      },
      errorRate: jobs.length > 0 ? 
        (jobs.filter(j => j.status === 'failed').length / jobs.length * 100).toFixed(1) + '%' : '0%'
    }
  }
}

// Next.js 개발 환경에서 HMR 시에도 상태 유지를 위한 global 저장
declare global {
  var trackingManagerInstance: TrackingManager | undefined
  var cleanupInterval: NodeJS.Timeout | undefined
}

// 싱글톤 인스턴스 (HMR에도 유지)
export const trackingManager = (() => {
  if (!global.trackingManagerInstance) {
    global.trackingManagerInstance = new TrackingManager()
  }
  return global.trackingManagerInstance
})()

// 정기적으로 오래된 작업 정리 (중복 실행 방지)
if (typeof window === 'undefined') {
  if (global.cleanupInterval) {
    clearInterval(global.cleanupInterval)
  }
  global.cleanupInterval = setInterval(() => {
    trackingManager.cleanupOldJobs(24)
  }, 60 * 60 * 1000) // 1시간마다
}