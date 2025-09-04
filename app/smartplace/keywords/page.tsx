'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Search, MapPin, TrendingUp, AlertCircle, RefreshCw, Download, Eye, EyeOff, Play, Calendar, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'

interface SmartplaceKeyword {
  id: number
  keyword: string
  addedDate: string
  isActive: boolean
  organicRank: number | null
  adRank: number | null
  lastTracked: string | null
}

interface TrendData {
  date: string
  organicRank: number | null
  adRank: number | null
}

interface SmartplaceProject {
  id: number
  placeName: string
  placeId: string
  keywordCount: number
  isActive: boolean
  lastUpdated: string | null
}

export default function SmartplaceKeywordManagement() {
  const router = useRouter()
  const [keywords, setKeywords] = useState<SmartplaceKeyword[]>([])
  const [smartplaceProject, setSmartplaceProject] = useState<SmartplaceProject | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [newKeywords, setNewKeywords] = useState('')
  const [newPlace, setNewPlace] = useState({ placeName: '', placeId: '', placeUrl: '' })
  const [inputMethod, setInputMethod] = useState<'manual' | 'url'>('url')
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [showTrendModal, setShowTrendModal] = useState(false)
  const [selectedKeyword, setSelectedKeyword] = useState<SmartplaceKeyword | null>(null)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [top10Trends, setTop10Trends] = useState<any[]>([])
  const [trendStats, setTrendStats] = useState<any>(null)
  const [showMonthlyData, setShowMonthlyData] = useState(false)
  const [monthlyData, setMonthlyData] = useState<any>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [trackingProgress, setTrackingProgress] = useState({
    current: 0,
    total: 0,
    currentKeyword: '',
    status: ''
  })

  useEffect(() => {
    fetchSmartplaceProject()
  }, [])

  const fetchSmartplaceProject = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/smartplace-keywords/my-place', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.place) {
          setSmartplaceProject(data.place)
          fetchKeywords()
        }
      }
    } catch (error) {
      console.error('Failed to fetch smartplace project:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchKeywords = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/smartplace-keywords/list', {
        credentials: 'include',
        cache: 'no-store' // 캐시 무시하고 항상 최신 데이터 가져오기
      })

      if (response.ok) {
        const data = await response.json()
        setKeywords(data.keywords)
      }
    } catch (error) {
      console.error('Failed to fetch keywords:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterPlace = async () => {
    // URL 방식일 경우
    if (inputMethod === 'url') {
      if (!newPlace.placeUrl.trim()) {
        setError('스마트플레이스 URL을 입력해주세요.')
        return
      }
    } else {
      // 수동 입력 방식
      if (!newPlace.placeName.trim() || !newPlace.placeId.trim()) {
        setError('장소 이름과 Place ID를 입력해주세요.')
        return
      }

      // Place ID 형식 검증 (숫자만 허용)
      if (!/^\d+$/.test(newPlace.placeId)) {
        setError('Place ID는 숫자만 입력 가능합니다.')
        return
      }
    }

    try {
      setLoading(true)
      setError(null)
      
      const payload = inputMethod === 'url' 
        ? { placeUrl: newPlace.placeUrl }
        : { placeName: newPlace.placeName, placeId: newPlace.placeId }
      
      const response = await fetch('/api/smartplace-keywords/register-place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        setSmartplaceProject(data.place)
        setShowRegisterModal(false)
        setNewPlace({ placeName: '', placeId: '' })
        fetchKeywords()
      } else {
        const data = await response.json()
        setError(data.error || '스마트플레이스 등록에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to register place:', error)
      setError('스마트플레이스 등록 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddKeywords = async () => {
    const keywordList = newKeywords.split('\n').filter(k => k.trim())
    if (keywordList.length === 0) {
      setError('키워드를 입력해주세요.')
      return
    }

    if (keywordList.length > 30) {
      setError('최대 30개까지만 등록할 수 있습니다.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/smartplace-keywords/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          keywords: keywordList 
        })
      })

      if (response.ok) {
        await fetchKeywords()
        setShowAddModal(false)
        setNewKeywords('')
        
        // Update keyword count
        if (smartplaceProject) {
          setSmartplaceProject({
            ...smartplaceProject,
            keywordCount: smartplaceProject.keywordCount + keywordList.length
          })
        }
      } else {
        const data = await response.json()
        setError(data.error || '키워드 추가에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to add keywords:', error)
      setError('키워드 추가 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleKeyword = async (keywordId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/smartplace-keywords/${keywordId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        await fetchKeywords()
      }
    } catch (error) {
      console.error('Failed to toggle keyword:', error)
    }
  }

  const handleRemoveKeyword = async (keywordId: number) => {
    if (!confirm('이 키워드를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/smartplace-keywords/${keywordId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchKeywords()
        
        // Update keyword count
        if (smartplaceProject) {
          setSmartplaceProject({
            ...smartplaceProject,
            keywordCount: Math.max(0, smartplaceProject.keywordCount - 1)
          })
        }
      }
    } catch (error) {
      console.error('Failed to remove keyword:', error)
    }
  }

  const handleTrackAll = async () => {
    try {
      setIsTracking(true)
      
      // 활성화된 키워드 수 확인
      const activeKeywords = keywords.filter(k => k.isActive)
      setTrackingProgress({
        current: 0,
        total: activeKeywords.length,
        currentKeyword: '추적 준비 중...',
        status: 'preparing'
      })

      const response = await fetch('/api/smartplace-keywords/track-all', {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('추적 요청 실패')
      }

      // SSE 스트림 읽기
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (reader) {
        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'progress') {
                  setTrackingProgress({
                    current: data.current || 0,
                    total: data.total || activeKeywords.length,
                    currentKeyword: data.keyword || '',
                    status: data.status || 'tracking'
                  })
                } else if (data.type === 'complete') {
                  setTrackingProgress({
                    current: data.totalKeywords || activeKeywords.length,
                    total: data.totalKeywords || activeKeywords.length,
                    currentKeyword: '',
                    status: 'complete'
                  })
                  // 키워드 목록 새로고침 - 1초 후에 실행하여 데이터베이스 쓰기 완료 보장
                  setTimeout(async () => {
                    await fetchKeywords()
                    // 오버레이 닫기
                    setTimeout(() => setIsTracking(false), 1000)
                  }, 1000)
                } else if (data.type === 'error') {
                  setTrackingProgress(prev => ({ 
                    ...prev, 
                    status: 'error',
                    currentKeyword: data.message || '오류 발생'
                  }))
                  setTimeout(() => setIsTracking(false), 3000)
                }
              } catch (e) {
                console.error('SSE 메시지 파싱 에러:', e)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to track all:', error)
      setTrackingProgress(prev => ({ 
        ...prev, 
        status: 'error',
        currentKeyword: '추적 중 오류가 발생했습니다.'
      }))
      setTimeout(() => setIsTracking(false), 3000)
    }
  }
  
  const fetchTrendData = async (keywordId: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/smartplace-keywords/${keywordId}/trend`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setTrendData(data.trendData || [])
        setTop10Trends(data.top10Trends || [])
        setTrendStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to fetch trend data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchMonthlyData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/smartplace-keywords/monthly-data', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setMonthlyData(data)
        setShowMonthlyData(true)
      }
    } catch (error) {
      console.error('Failed to fetch monthly data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleShowTrend = (keyword: SmartplaceKeyword) => {
    setSelectedKeyword(keyword)
    fetchTrendData(keyword.id)
    setShowTrendModal(true)
  }

  const getRankClass = (rank: number | null): string => {
    if (!rank) return 'text-gray-400'
    if (rank <= 5) return 'text-green-600 font-bold'
    if (rank <= 10) return 'text-blue-600'
    if (rank <= 20) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const filteredKeywords = keywords.filter(k => {
    if (!showInactive && !k.isActive) return false
    if (searchTerm) {
      return k.keyword.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  const exportToCSV = () => {
    const csvContent = [
      ['키워드', '오가닉순위', '광고순위', '활성화', '마지막 추적'],
      ...filteredKeywords.map(k => [
        k.keyword,
        k.organicRank || '-',
        k.adRank || '-',
        k.isActive ? 'O' : 'X',
        k.lastTracked ? new Date(k.lastTracked).toLocaleDateString() : '-'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `smartplace-keywords-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // 스마트플레이스가 등록되지 않은 경우 등록 화면 표시
  if (!smartplaceProject && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-20 p-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <MapPin className="mx-auto text-purple-500 mb-4" size={64} />
              <h2 className="text-2xl font-bold mb-2">스마트플레이스 등록이 필요합니다</h2>
              <p className="text-gray-600">
                키워드 관리를 시작하기 전에 먼저 스마트플레이스를 등록해주세요.
              </p>
            </div>
            
            <div className="max-w-md mx-auto">
              {/* 입력 방법 선택 탭 */}
              <div className="mb-6 flex border-b">
                <button
                  className={`px-4 py-2 font-medium ${inputMethod === 'url' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}`}
                  onClick={() => setInputMethod('url')}
                >
                  URL로 등록
                </button>
                <button
                  className={`px-4 py-2 font-medium ${inputMethod === 'manual' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}`}
                  onClick={() => setInputMethod('manual')}
                >
                  직접 입력
                </button>
              </div>
              
              {inputMethod === 'url' ? (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    스마트플레이스 URL
                  </label>
                  <input
                    type="text"
                    value={newPlace.placeUrl}
                    onChange={(e) => setNewPlace({ ...newPlace, placeUrl: e.target.value })}
                    placeholder="예: https://place.naver.com/restaurant/1632045"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    네이버 스마트플레이스 페이지 URL을 입력하시면 자동으로 정보를 추출합니다
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      장소 이름
                    </label>
                    <input
                      type="text"
                      value={newPlace.placeName}
                      onChange={(e) => setNewPlace({ ...newPlace, placeName: e.target.value })}
                      placeholder="예: 우리학원"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Place ID
                    </label>
                    <input
                      type="text"
                      value={newPlace.placeId}
                      onChange={(e) => setNewPlace({ ...newPlace, placeId: e.target.value })}
                      placeholder="예: 1234567890"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      네이버 스마트플레이스의 고유 ID를 입력하세요 (숫자만 입력)
                    </p>
                  </div>
                </>
              )}
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                </div>
              )}
              
              <button
                onClick={handleRegisterPlace}
                disabled={loading || (inputMethod === 'url' ? !newPlace.placeUrl.trim() : (!newPlace.placeName.trim() || !newPlace.placeId.trim()))}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? '등록 중...' : '스마트플레이스 등록하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-20 p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp size={24} />
              스마트플레이스 키워드 관리
            </h1>
            {smartplaceProject && (
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin size={16} />
                  {smartplaceProject.placeName}
                </span>
                <span className="text-gray-400">|</span>
                <span>Place ID: {smartplaceProject.placeId}</span>
                <span className="text-gray-400">|</span>
                <span>등록 키워드: {smartplaceProject.keywordCount}개</span>
                {smartplaceProject.lastUpdated && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span>마지막 업데이트: {new Date(smartplaceProject.lastUpdated).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-2"
              onClick={() => router.push('/smartplace/keywords/monthly')}
              disabled={loading}
            >
              <Calendar size={18} />
              월간 데이터
            </button>
            <button 
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-2"
              onClick={handleTrackAll}
              disabled={isTracking || loading}
            >
              <Play size={18} />
              {isTracking ? '추적 중...' : '전체 추적'}
            </button>
            <button 
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2"
              onClick={fetchKeywords}
            >
              <RefreshCw size={18} />
              새로고침
            </button>
            <button 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              onClick={exportToCSV}
            >
              <Download size={18} />
              CSV 내보내기
            </button>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white p-4 rounded-lg shadow border mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <span className="text-sm">비활성 키워드 포함</span>
              </label>
              <span className="text-sm text-gray-500">
                활성: {keywords.filter(k => k.isActive).length}개 / 
                전체: {keywords.length}개
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="키워드 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                />
              </div>
              
              <button 
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={18} />
                키워드 추가
              </button>
            </div>
          </div>
        </div>

        {/* 키워드 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">키워드</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">오가닉순위</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">광고순위</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마지막 추적</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">추세</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : filteredKeywords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : '등록된 키워드가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredKeywords.map((keyword) => (
                  <tr key={keyword.id} className={!keyword.isActive ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => handleToggleKeyword(keyword.id, keyword.isActive)}
                          className="mr-2"
                        >
                          {keyword.isActive ? (
                            <Eye size={16} className="text-green-600" />
                          ) : (
                            <EyeOff size={16} className="text-gray-400" />
                          )}
                        </button>
                        <strong>{keyword.keyword}</strong>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getRankClass(keyword.organicRank)}>
                        {keyword.organicRank ? `${keyword.organicRank}위` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getRankClass(keyword.adRank)}>
                        {keyword.adRank ? `${keyword.adRank}위` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {keyword.lastTracked ? 
                        new Date(keyword.lastTracked).toLocaleDateString() : 
                        '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/smartplace/keywords/trend/${keyword.id}`)}
                        className="text-purple-600 hover:text-purple-900"
                        title="추세 보기"
                      >
                        📈
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleRemoveKeyword(keyword.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 키워드 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">스마트플레이스 키워드 추가</h2>
                <button onClick={() => setShowAddModal(false)}>✕</button>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  키워드 입력 (한 줄에 하나씩)
                </label>
                <textarea
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder={'키워드1\n키워드2\n키워드3\n...\n\n각 키워드를 한 줄씩 입력하세요'}
                  rows={10}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-400"
                />
                <p className="text-sm text-gray-500 mt-1">최대 30개까지 등록 가능합니다.</p>
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewKeywords('')
                    setError(null)
                  }}
                >
                  취소
                </button>
                <button 
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  onClick={handleAddKeywords}
                  disabled={loading || !newKeywords.trim()}
                >
                  {loading ? '추가 중...' : '키워드 추가'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 추세 모달 */}
        {showTrendModal && selectedKeyword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">키워드 추세: {selectedKeyword.keyword}</h2>
                <button onClick={() => setShowTrendModal(false)}>✕</button>
              </div>
              
              <div className="mb-6">
                {trendData.length > 0 ? (
                  <div className="space-y-4">
                    {/* 오가닉/광고 순위 꺾은선 그래프 추가 */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">📊 순위 추세 그래프</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(value) => {
                                const date = new Date(value)
                                return `${date.getMonth()+1}/${date.getDate()}`
                              }}
                            />
                            <YAxis 
                              reversed={true}
                              domain={[1, 30]}
                              ticks={[1, 5, 10, 15, 20, 25, 30]}
                            />
                            <Tooltip 
                              labelFormatter={(value) => new Date(value).toLocaleDateString()}
                              formatter={(value: any) => value ? `${value}위` : '-'}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="organicRank" 
                              name="오가닉 순위" 
                              stroke="#10b981"
                              strokeWidth={3}
                              dot={{ r: 5, fill: '#10b981' }}
                              connectNulls={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="adRank" 
                              name="광고 순위" 
                              stroke="#3b82f6"
                              strokeWidth={3}
                              dot={{ r: 5, fill: '#3b82f6' }}
                              connectNulls={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-green-700 mb-2">오가닉 순위 추세</h3>
                        <div className="h-48 flex items-end justify-around">
                          {trendData.map((data, index) => (
                            <div key={index} className="flex flex-col items-center">
                              <span className="text-xs font-bold text-green-700">
                                {data.organicRank || '-'}
                              </span>
                              <div 
                                className="w-8 bg-green-500 rounded-t"
                                style={{ 
                                  height: data.organicRank 
                                    ? `${Math.max(10, 180 - (data.organicRank * 3))}px` 
                                    : '2px'
                                }}
                              />
                              <span className="text-xs text-gray-500 mt-1">
                                {new Date(data.date).getDate()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-700 mb-2">광고 순위 추세</h3>
                        <div className="h-48 flex items-end justify-around">
                          {trendData.map((data, index) => (
                            <div key={index} className="flex flex-col items-center">
                              <span className="text-xs font-bold text-blue-700">
                                {data.adRank || '-'}
                              </span>
                              <div 
                                className="w-8 bg-blue-500 rounded-t"
                                style={{ 
                                  height: data.adRank 
                                    ? `${Math.max(10, 180 - (data.adRank * 3))}px` 
                                    : '2px'
                                }}
                              />
                              <span className="text-xs text-gray-500 mt-1">
                                {new Date(data.date).getDate()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* 상위 10개 업체 순위 추이 */}
                    {top10Trends && top10Trends.length > 0 && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-4">🏆 상위 10개 업체 순위 변화</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="date" 
                                type="category" 
                                allowDuplicatedCategory={false}
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(value) => {
                                  const date = new Date(value)
                                  return `${date.getMonth()+1}/${date.getDate()}`
                                }}
                              />
                              <YAxis 
                                reversed={true} 
                                domain={[1, 10]}
                                ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                              />
                              <Tooltip 
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                formatter={(value: any) => `${value}위`}
                              />
                              <Legend />
                              {top10Trends.slice(0, 5).map((place, index) => (
                                <Line 
                                  key={place.placeId}
                                  type="monotone" 
                                  data={place.trendData}
                                  dataKey="rank"
                                  name={place.isMyPlace ? `⭐ ${place.placeName}` : place.placeName}
                                  stroke={place.isMyPlace ? '#dc2626' : ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]}
                                  strokeWidth={place.isMyPlace ? 3 : 2}
                                  dot={{ r: place.isMyPlace ? 5 : 3 }}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          * 최대 상위 5개 업체만 표시 (내 업체는 ⭐표시)
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2">상세 데이터</h4>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left">날짜</th>
                              <th className="px-4 py-2 text-left">오가닉순위</th>
                              <th className="px-4 py-2 text-left">광고순위</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trendData.map((data, index) => (
                              <tr key={index} className="border-b">
                                <td className="px-4 py-2">
                                  {new Date(data.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-2">
                                  <span className={getRankClass(data.organicRank)}>
                                    {data.organicRank || '-'}위
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={getRankClass(data.adRank)}>
                                    {data.adRank || '-'}위
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    {loading ? '데이터를 불러오는 중...' : '추세 데이터가 없습니다.'}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button 
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  onClick={() => setShowTrendModal(false)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 월간 데이터 모달 */}
        {showMonthlyData && monthlyData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  월간 데이터: {monthlyData.project?.placeName}
                </h2>
                <button onClick={() => setShowMonthlyData(false)}>✕</button>
              </div>
              
              <div className="space-y-6">
                {monthlyData.monthlyData?.length > 0 ? (
                  monthlyData.monthlyData.map((dayData: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-lg">
                          {dayData.date}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {dayData.summary?.totalTracked || 0}개 키워드 추적
                        </span>
                      </div>
                      
                      {dayData.summary && (
                        <div className="bg-blue-50 p-3 rounded mb-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium">평균 오가닉 순위:</span> {dayData.summary.averageOrganic?.toFixed(1) || '-'}위
                            </div>
                            <div>
                              <span className="font-medium">평균 광고 순위:</span> {dayData.summary.averageAd?.toFixed(1) || '-'}위
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left">키워드</th>
                              <th className="px-4 py-2 text-left">오가닉순위</th>
                              <th className="px-4 py-2 text-left">광고순위</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayData.rankings?.map((kr: any, idx: number) => (
                              <tr key={idx} className="border-b">
                                <td className="px-4 py-2 font-medium">{kr.keyword}</td>
                                <td className="px-4 py-2">
                                  <span className={getRankClass(kr.organicRank)}>
                                    {kr.organicRank || '-'}위
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={getRankClass(kr.adRank)}>
                                    {kr.adRank || '-'}위
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    {loading ? '데이터를 불러오는 중...' : '월간 데이터가 없습니다.'}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6 sticky bottom-0 bg-white pt-4 border-t">
                <button 
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  onClick={() => setShowMonthlyData(false)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 추적 진행 상태 오버레이 */}
        {isTracking && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <div className="flex flex-col items-center">
                {trackingProgress.status === 'error' ? (
                  <XCircle className="text-red-500 mb-4" size={48} />
                ) : trackingProgress.status === 'complete' ? (
                  <CheckCircle className="text-green-500 mb-4" size={48} />
                ) : (
                  <Loader2 className="animate-spin text-purple-600 mb-4" size={48} />
                )}
                
                <h3 className="text-xl font-bold mb-4">
                  {trackingProgress.status === 'error' ? '추적 실패' : 
                   trackingProgress.status === 'complete' ? '추적 완료!' :
                   '스마트플레이스 순위 추적 중...'}
                </h3>
                
                {trackingProgress.total > 0 && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          trackingProgress.status === 'error' ? 'bg-red-500' :
                          trackingProgress.status === 'complete' ? 'bg-green-500' :
                          'bg-purple-600'
                        }`}
                        style={{ width: `${(trackingProgress.current / trackingProgress.total) * 100}%` }}
                      />
                    </div>
                    
                    <div className="text-center mb-2">
                      <span className="text-2xl font-bold text-purple-600">
                        {trackingProgress.current} / {trackingProgress.total}
                      </span>
                      <span className="text-gray-600 ml-2">키워드</span>
                    </div>
                  </>
                )}
                
                {trackingProgress.currentKeyword && trackingProgress.status !== 'complete' && trackingProgress.status !== 'error' && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">현재 추적 중:</p>
                    <p className="font-medium text-gray-900">{trackingProgress.currentKeyword}</p>
                  </div>
                )}
                
                {trackingProgress.status === 'preparing' && (
                  <p className="text-sm text-gray-500 mt-4">
                    추적 엔진을 초기화하고 있습니다...
                  </p>
                )}
                
                {trackingProgress.status === 'complete' && (
                  <p className="text-sm text-green-600 mt-4">
                    모든 키워드 추적이 완료되었습니다!
                  </p>
                )}
                
                {trackingProgress.status === 'error' && (
                  <p className="text-sm text-red-600 mt-4">
                    추적 중 오류가 발생했습니다. 다시 시도해주세요.
                  </p>
                )}
                
                <div className="mt-6 text-xs text-gray-400 text-center">
                  각 키워드당 약 10-30초가 소요됩니다
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}