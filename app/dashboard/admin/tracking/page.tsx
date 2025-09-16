'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, TrendingUp, Globe, Hash, Calendar, ChevronLeft, ChevronRight, Play, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { ko } from 'date-fns/locale'
import TrackingMonitorPolling from './components/TrackingMonitorPolling'

interface TrackingUser {
  id: string
  email: string
  name: string
  role: string
  smartplace: {
    registered: boolean
    placeName?: string
    placeId?: string
    activeKeywords: number
    lastUpdate?: string
  }
  blog: {
    registered: boolean
    blogName?: string
    blogUrl?: string
    activeKeywords: number
    lastUpdate?: string
  }
  ads: {
    registered: boolean
    customerId?: string
    hasCredentials: boolean
    lastUpdate?: string
  }
}

interface QueueStatus {
  smartplace: {
    active: number
    waiting: number
    completed: number
    failed: number
  }
  blog: {
    active: number
    waiting: number
    completed: number
    failed: number
  }
}

interface TrackingStatus {
  id: string
  userId: string
  type: 'smartplace' | 'blog'
  status: 'queued' | 'running' | 'completed' | 'failed'
  timestamp: string
  userName?: string
  message?: string
  progress?: {
    current: number
    total: number
  }
}

export default function AdminTrackingDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<TrackingUser[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null)
  const [trackingInProgress, setTrackingInProgress] = useState<string | null>(null)
  const [trackingStatuses, setTrackingStatuses] = useState<TrackingStatus[]>([])
  const [showTrackingPanel, setShowTrackingPanel] = useState(true)
  const [lastDataHash, setLastDataHash] = useState<string>('')

  // 데이터 로드 (캐싱 적용)
  const fetchTrackingData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/tracking?page=${currentPage}&limit=20`, {
        next: { revalidate: 5 } // Next.js 캐시: 5초
      })
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch tracking data')
      }
      
      const data = await response.json()
      
      // 데이터 해시 비교하여 변경사항이 있을 때만 업데이트
      const newDataHash = JSON.stringify({
        users: data.users,
        queueStatus: data.queueStatus
      })
      
      if (newDataHash !== lastDataHash) {
        setUsers(data.users)
        setTotalPages(data.pagination.totalPages)
        setQueueStatus(data.queueStatus)
        setSchedulerStatus(data.schedulerStatus)
        setLastDataHash(newDataHash)
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 추적 상태 로드 (캐싱 적용)
  const fetchTrackingStatuses = async () => {
    try {
      const response = await fetch('/api/admin/tracking/status', {
        cache: 'no-store' // 실시간 상태는 캐싱하지 않음
      })
      if (response.ok) {
        const data = await response.json()
        setTrackingStatuses(data.statuses || [])
      }
    } catch (error) {
      console.error('Error fetching tracking statuses:', error)
    }
  }

  useEffect(() => {
    fetchTrackingData()
  }, [currentPage])

  // 초기 로드 시에만 추적 상태 가져오기 (SSE로 대체됨)
  useEffect(() => {
    fetchTrackingStatuses()
  }, [])

  // 전체 추적 실행
  const handleRunAllTracking = async () => {
    if (!confirm('모든 계정의 순위 추적을 시작하시겠습니까?')) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/tracking', {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to start tracking')
      
      const data = await response.json()
      alert(`${data.jobsCount}개의 추적 작업이 큐에 추가되었습니다.`)
      
      // 데이터 즉시 새로고침
      await fetchTrackingData()
      await fetchTrackingStatuses()
    } catch (error) {
      console.error('Error starting tracking:', error)
      alert('추적 시작에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 개별 추적 실행
  const handleIndividualTracking = async (userId: string, type: 'smartplace' | 'blog' | 'ads' | 'all') => {
    setTrackingInProgress(userId)
    try {
      const response = await fetch(`/api/admin/tracking/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      
      if (!response.ok) throw new Error('Failed to start tracking')
      
      const data = await response.json()
      alert(`추적 작업이 큐에 추가되었습니다.`)
      
      // 데이터 즉시 새로고침
      await fetchTrackingData()
      await fetchTrackingStatuses()
    } catch (error) {
      console.error('Error starting individual tracking:', error)
      alert('추적 시작에 실패했습니다.')
    } finally {
      setTrackingInProgress(null)
    }
  }

  // 검색 필터링
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 날짜 포맷
  const formatDate = (dateString?: string) => {
    if (!dateString) return '추적 없음'
    return formatInTimeZone(new Date(dateString), 'Asia/Seoul', 'MM/dd HH:mm', { locale: ko })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">순위 추적 관리</h1>
            <p className="text-sm text-gray-600 mt-2">모든 계정의 순위 추적을 관리합니다</p>
          </div>
          <button
            onClick={() => {
              fetchTrackingData()
              fetchTrackingStatuses()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
        </div>

        {/* 추적 모니터링 시스템 */}
        <div className="mb-6">
          <TrackingMonitorPolling />
        </div>

        {/* 실시간 추적 상태 패널 (기존 코드 유지, 숨김) */}
        {false && showTrackingPanel && trackingStatuses.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg mb-6 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">실시간 추적 상태</h3>
              <button
                onClick={() => setShowTrackingPanel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {trackingStatuses.map((status) => (
                <div key={status.id} className="flex items-center justify-between bg-white rounded p-2">
                  <div className="flex items-center space-x-3">
                    {status.status === 'queued' && <Clock className="w-4 h-4 text-yellow-500" />}
                    {status.status === 'running' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                    {status.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {status.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                    <div>
                      <span className="text-sm font-medium">{status.userName || `User ${status.userId}`}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {status.type === 'smartplace' ? '스마트플레이스' : '블로그'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {status.progress && (
                      <span className="text-xs text-gray-600">
                        {status.progress.current}/{status.progress.total}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatDate(status.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* 액션 바 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="계정 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={fetchTrackingData}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={handleRunAllTracking}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>전체 추적 실행</span>
            </button>
          </div>
        </div>

        {/* 계정 목록 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">순번</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">계정</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">스마트플레이스</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">블로그</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">광고</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">최종 업데이트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user, index) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {(currentPage - 1) * 20 + index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {user.smartplace.registered ? (
                      <button
                        onClick={() => router.push(`/dashboard/admin/tracking/${user.id}/smartplace`)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <div className="flex items-center space-x-1">
                          <Globe className="w-4 h-4" />
                          <span>{user.smartplace.placeName || '조회'}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          키워드: {user.smartplace.activeKeywords}개
                        </div>
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">미등록</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.blog.registered ? (
                      <button
                        onClick={() => router.push(`/dashboard/admin/tracking/${user.id}/blog`)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <div className="flex items-center space-x-1">
                          <Hash className="w-4 h-4" />
                          <span>{user.blog.blogName || '조회'}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          키워드: {user.blog.activeKeywords}개
                        </div>
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">미등록</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.ads.registered ? (
                      user.ads.hasCredentials ? (
                        <div className="text-sm">
                          <div className="font-medium text-blue-600">
                            ID: {user.ads.customerId}
                          </div>
                          {user.ads.lastUpdate && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(user.ads.lastUpdate)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-yellow-600">API키 미등록</span>
                      )
                    ) : (
                      <span className="text-sm text-gray-400">계정 없음</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      {user.smartplace.lastUpdate && (
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Globe className="w-3 h-3" />
                          <span>{formatDate(user.smartplace.lastUpdate)}</span>
                        </div>
                      )}
                      {user.blog.lastUpdate && (
                        <div className="flex items-center space-x-1 text-gray-600 mt-1">
                          <Hash className="w-3 h-3" />
                          <span>{formatDate(user.blog.lastUpdate)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleIndividualTracking(user.id, 'all')}
                      disabled={trackingInProgress === user.id}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {trackingInProgress === user.id ? '추적중...' : '재추적'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            총 {filteredUsers.length}개 계정
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
  )
}