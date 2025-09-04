'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/navigation/Header'
import { Search, RefreshCw, Globe, Hash, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { ko } from 'date-fns/locale'

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
}

export default function AgencyTrackingDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<TrackingUser[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 데이터 로드
  const fetchTrackingData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/tracking?page=${currentPage}&limit=20`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch tracking data')
      }
      
      const data = await response.json()
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Error fetching tracking data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrackingData()
  }, [currentPage])

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">순위 추적 현황</h1>
          <p className="text-sm text-gray-600 mt-2">할당된 지사 및 학원의 순위 추적 현황을 확인합니다</p>
        </div>

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

            <div className="text-sm text-gray-600">
              총 {filteredUsers.length}개 계정
            </div>
          </div>
        </div>

        {/* 계정 목록 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">순번</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">계정</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">구분</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">스마트플레이스</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">블로그</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">광고</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">최종 업데이트</th>
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
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      user.role === 'branch' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'branch' ? '지사' : '학원'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.smartplace.registered ? (
                      <button
                        onClick={() => router.push(`/dashboard/agency/tracking/${user.id}/smartplace`)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <div className="flex items-center space-x-1">
                          <Globe className="w-4 h-4" />
                          <span>{user.smartplace.placeName || '보기'}</span>
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
                        onClick={() => router.push(`/dashboard/agency/tracking/${user.id}/blog`)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <div className="flex items-center space-x-1">
                          <Hash className="w-4 h-4" />
                          <span>{user.blog.blogName || '보기'}</span>
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
                    <span className="text-sm text-gray-400">추후 구현</span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            표시 중: {filteredUsers.length}개
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
    </div>
  )
}