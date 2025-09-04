'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Search, TrendingUp, BarChart, Calendar, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface SmartPlaceKeyword {
  id: string
  keyword: string
  isActive: boolean
  organicRank: number | null
  adRank: number | null
  totalResults: number
  lastChecked: string | null
  createdAt: string
}

interface UserInfo {
  id: string
  email: string
  name: string
  smartPlace: {
    placeName: string
    placeId: string
  }
}

export default function AdminSmartPlacePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [keywords, setKeywords] = useState<SmartPlaceKeyword[]>([])
  const [loading, setLoading] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // 사용자 정보 및 키워드 로드
  const fetchData = async () => {
    setLoading(true)
    try {
      // 사용자 정보 조회
      const userResponse = await fetch(`/api/admin/tracking/${userId}`, {
        credentials: 'include'
      })
      if (!userResponse.ok) {
        console.error('Failed to fetch user info:', userResponse.status)
        throw new Error('Failed to fetch user info')
      }
      const userData = await userResponse.json()
      
      setUserInfo({
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.name,
        smartPlace: userData.smartplace
      })

      // 키워드 목록 조회 (기존 API 활용)
      const keywordsResponse = await fetch(`/api/smartplace-keywords/list?userId=${userId}`, {
        credentials: 'include'
      })
      if (!keywordsResponse.ok) throw new Error('Failed to fetch keywords')
      const keywordsData = await keywordsResponse.json()
      
      setKeywords(keywordsData.keywords || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  // 키워드 추가
  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return

    try {
      const response = await fetch('/api/smartplace-keywords/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          keyword: newKeyword,
          userId
        })
      })

      if (!response.ok) throw new Error('Failed to add keyword')
      
      setNewKeyword('')
      setShowAddForm(false)
      fetchData()
    } catch (error) {
      console.error('Error adding keyword:', error)
      alert('키워드 추가에 실패했습니다.')
    }
  }

  // 키워드 토글
  const handleToggleKeyword = async (keywordId: string) => {
    try {
      const response = await fetch(`/api/smartplace-keywords/${keywordId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      })

      if (!response.ok) throw new Error('Failed to toggle keyword')
      fetchData()
    } catch (error) {
      console.error('Error toggling keyword:', error)
    }
  }

  // 키워드 삭제
  const handleDeleteKeyword = async (keywordId: string) => {
    if (!confirm('이 키워드를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/smartplace-keywords/${keywordId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      })

      if (!response.ok) throw new Error('Failed to delete keyword')
      fetchData()
    } catch (error) {
      console.error('Error deleting keyword:', error)
      alert('키워드 삭제에 실패했습니다.')
    }
  }

  // 추적 실행
  const handleTracking = async () => {
    setTracking(true)
    try {
      const response = await fetch(`/api/admin/tracking/${userId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'smartplace' })
      })

      if (!response.ok) throw new Error('Failed to start tracking')
      
      alert('추적이 시작되었습니다. 잠시 후 결과를 확인해주세요.')
      
      // 10초 후 데이터 새로고침
      setTimeout(() => fetchData(), 10000)
    } catch (error) {
      console.error('Error starting tracking:', error)
      alert('추적 시작에 실패했습니다.')
    } finally {
      setTracking(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return formatInTimeZone(new Date(dateString), 'Asia/Seoul', 'MM/dd HH:mm', { locale: ko })
  }

  if (!userInfo) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">로딩중...</div>
      </div>
    )
  }

  return (
    <div>
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/admin/tracking')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {userInfo.smartPlace.placeName}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {userInfo.name} ({userInfo.email})
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Place ID: {userInfo.smartPlace.placeId}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => router.push(`/smartplace/keywords/trend/${keywords[0]?.id}?userId=${userId}`)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                disabled={keywords.length === 0}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                추세 분석
              </button>
              
              <button
                onClick={() => router.push(`/smartplace/keywords/monthly?userId=${userId}`)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <BarChart className="w-4 h-4 inline mr-2" />
                월간 통계
              </button>
            </div>
          </div>
        </div>

        {/* 액션 바 */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                키워드 추가
              </button>
              
              <button
                onClick={handleTracking}
                disabled={tracking || keywords.filter(k => k.isActive).length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                <RefreshCw className={`w-4 h-4 inline mr-2 ${tracking ? 'animate-spin' : ''}`} />
                {tracking ? '추적중...' : '추적 실행'}
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              활성 키워드: {keywords.filter(k => k.isActive).length}개 / 
              전체: {keywords.length}개
            </div>
          </div>

          {/* 키워드 추가 폼 */}
          {showAddForm && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="추가할 키워드 입력"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddKeyword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  추가
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewKeyword('')
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 키워드 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">키워드</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">오가닉 순위</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">광고 순위</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">검색 결과</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">마지막 체크</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {keywords.map((keyword) => (
                <tr key={keyword.id} className={!keyword.isActive ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleKeyword(keyword.id)}
                      className={`p-1 rounded ${keyword.isActive ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {keyword.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{keyword.keyword}</div>
                  </td>
                  <td className="px-4 py-3">
                    {keyword.organicRank ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        keyword.organicRank <= 5 ? 'bg-green-100 text-green-800' :
                        keyword.organicRank <= 10 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {keyword.organicRank}위
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {keyword.adRank ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        광고 {keyword.adRank}위
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{keyword.totalResults}개</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{formatDate(keyword.lastChecked)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => router.push(`/smartplace/keywords/trend/${keyword.id}?userId=${userId}`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteKeyword(keyword.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </div>
  )
}