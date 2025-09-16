'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Activity, Wifi, WifiOff } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { ko } from 'date-fns/locale'

interface TrackingJob {
  id: string
  userId: string
  userName: string
  userEmail: string
  type: 'smartplace' | 'blog'
  status: 'queued' | 'running' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
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
    timestamp: string
  }
}

interface SystemLog {
  id: string
  level: 'info' | 'warning' | 'error' | 'debug'
  category: 'tracking' | 'api' | 'database' | 'scraper'
  message: string
  details?: any
  userId?: string
  timestamp: string
}

interface Stats {
  total: number
  queued: number
  running: number
  completed: number
  failed: number
  errorRate: string
  last24h: {
    total: number
    completed: number
    failed: number
  }
}

export default function TrackingMonitorPolling() {
  const [jobs, setJobs] = useState<TrackingJob[]>([])
  const [activeJobs, setActiveJobs] = useState<TrackingJob[]>([])
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeTab, setActiveTab] = useState<'jobs' | 'logs'>('jobs')
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning'>('all')
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())
  const [isPolling, setIsPolling] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [pollingInterval, setPollingInterval] = useState(15000) // 15 seconds default
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch tracking data
  const fetchTrackingData = async () => {
    try {
      const response = await fetch('/api/admin/tracking/status?view=jobs')
      if (response.ok) {
        const data = await response.json()
        
        // Update jobs with animation for changes
        const newJobs = data.jobs || []
        const newActiveJobs = data.activeJobs || []
        
        // Detect changes for visual feedback
        const hasChanges = JSON.stringify(jobs) !== JSON.stringify(newJobs)
        
        setJobs(newJobs)
        setActiveJobs(newActiveJobs)
        setStats(data.stats)
        setLastUpdate(new Date())
        
        // Adjust polling rate based on activity
        if (newActiveJobs.length > 0) {
          // More frequent updates when tracking is active
          setPollingInterval(5000) // 5 seconds when active
        } else {
          // Less frequent when idle
          setPollingInterval(15000) // 15 seconds when idle
        }
        
        // Visual feedback for updates
        if (hasChanges) {
          console.log('[Polling] Data updated:', {
            jobs: newJobs.length,
            active: newActiveJobs.length,
            timestamp: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('[Polling] Failed to fetch tracking data:', error)
    }
  }

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/tracking/status?view=logs&limit=100')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('[Polling] Failed to fetch logs:', error)
    }
  }

  // Start polling
  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    
    setIsPolling(true)
    
    // Initial fetch
    fetchTrackingData()
    if (activeTab === 'logs') {
      fetchLogs()
    }
    
    // Set up polling interval
    pollingRef.current = setInterval(() => {
      fetchTrackingData()
      if (activeTab === 'logs') {
        fetchLogs()
      }
    }, pollingInterval)
  }

  // Stop polling
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setIsPolling(false)
  }

  // Toggle polling
  const togglePolling = () => {
    if (isPolling) {
      stopPolling()
    } else {
      startPolling()
    }
  }

  // Manual refresh
  const manualRefresh = async () => {
    await fetchTrackingData()
    if (activeTab === 'logs') {
      await fetchLogs()
    }
  }

  // Start tracking
  const startTracking = async () => {
    try {
      const response = await fetch('/api/admin/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'all' })
      })
      
      if (response.ok) {
        console.log('[Tracking] Started successfully')
        // Immediately fetch updated data
        await fetchTrackingData()
        // Switch to more frequent polling when tracking starts
        setPollingInterval(5000)
      } else {
        console.error('[Tracking] Failed to start:', response.statusText)
      }
    } catch (error) {
      console.error('[Tracking] Error starting:', error)
    }
  }

  useEffect(() => {
    startPolling()
    
    return () => {
      stopPolling()
    }
  }, [pollingInterval, activeTab])

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return formatInTimeZone(new Date(dateString), 'Asia/Seoul', 'HH:mm:ss', { locale: ko })
  }

  const toggleJobExpand = (jobId: string) => {
    const newExpanded = new Set(expandedJobs)
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId)
    } else {
      newExpanded.add(jobId)
    }
    setExpandedJobs(newExpanded)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true
    return log.level === logFilter
  })

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">실시간 추적 모니터링</h2>
        <div className="flex items-center space-x-4">
          {/* Polling Status */}
          <div className="flex items-center space-x-2">
            <button
              onClick={togglePolling}
              className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                isPolling ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isPolling ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm">
                {isPolling ? `실시간 (${pollingInterval/1000}초)` : '일시정지'}
              </span>
            </button>
            <span className="text-xs text-gray-500">
              마지막 업데이트: {formatDate(lastUpdate.toISOString())}
            </span>
          </div>
          
          {/* Action Buttons */}
          <button
            onClick={startTracking}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Activity className="w-4 h-4" />
            <span>추적 시작</span>
          </button>
          
          <button
            onClick={manualRefresh}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">전체</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-xs text-yellow-600">대기중</div>
            <div className="text-2xl font-bold text-yellow-700">{stats.queued}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600">실행중</div>
            <div className="text-2xl font-bold text-blue-700">{stats.running}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600">완료</div>
            <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-xs text-red-600">실패</div>
            <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-purple-600">에러율</div>
            <div className="text-2xl font-bold text-purple-700">{stats.errorRate}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-4 border-b">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'jobs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          작업 목록 ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'logs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          시스템 로그 ({logs.length})
        </button>
      </div>

      {/* Jobs List */}
      {activeTab === 'jobs' && (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {/* Active Jobs - Highlighted */}
          {activeJobs.map(job => (
            <div 
              key={job.id} 
              className="border-2 border-blue-300 bg-blue-50 rounded-lg p-3 shadow-sm animate-pulse-subtle"
            >
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleJobExpand(job.id)}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <span className="font-medium">{job.userName}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({job.type === 'smartplace' ? '스마트플레이스' : '블로그'})
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {job.progress && job.status === 'running' && (
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(job.progress.current / job.progress.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {job.progress.current}/{job.progress.total}
                      </span>
                      {job.progress.currentKeyword && (
                        <span className="text-xs text-blue-600 font-medium">
                          {job.progress.currentKeyword}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-gray-500">{formatDate(job.startedAt)}</span>
                  {expandedJobs.has(job.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
              
              {expandedJobs.has(job.id) && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  {job.progress?.currentKeyword && (
                    <p className="text-sm text-gray-600">
                      현재 처리중: <span className="font-medium text-blue-600">{job.progress.currentKeyword}</span>
                    </p>
                  )}
                  {job.error && (
                    <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                      {job.error.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Completed/Failed Jobs */}
          {jobs.filter(j => j.status === 'completed' || j.status === 'failed').map(job => (
            <div key={job.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleJobExpand(job.id)}
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <span className="font-medium">{job.userName}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      ({job.type === 'smartplace' ? '스마트플레이스' : '블로그'})
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {job.results && (
                    <span className="text-sm text-gray-600">
                      성공: {job.results.successCount}, 실패: {job.results.failedCount}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{formatDate(job.completedAt)}</span>
                  {expandedJobs.has(job.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
              
              {expandedJobs.has(job.id) && (
                <div className="mt-3 pt-3 border-t">
                  {job.error && (
                    <div className="p-2 bg-red-100 rounded text-sm text-red-700">
                      {job.error.message}
                    </div>
                  )}
                  {job.results?.details && (
                    <div className="mt-2 text-sm text-gray-600">
                      <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(job.results.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* System Logs */}
      {activeTab === 'logs' && (
        <div>
          {/* Log Filters */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setLogFilter('all')}
              className={`px-3 py-1 rounded text-sm ${
                logFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setLogFilter('error')}
              className={`px-3 py-1 rounded text-sm ${
                logFilter === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              에러
            </button>
            <button
              onClick={() => setLogFilter('warning')}
              className={`px-3 py-1 rounded text-sm ${
                logFilter === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              경고
            </button>
          </div>

          {/* Log List */}
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                {getLogIcon(log.level)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{formatDate(log.timestamp)}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{log.category}</span>
                    {log.userId && (
                      <span className="text-xs text-gray-500">User: {log.userId}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 mt-1">{log.message}</p>
                  {log.details && (
                    <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-1 rounded overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

<style jsx>{`
  @keyframes pulse-subtle {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.9;
    }
  }
  
  .animate-pulse-subtle {
    animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`}</style>