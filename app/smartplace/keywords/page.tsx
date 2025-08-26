'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Search, MapPin, TrendingUp, AlertCircle, RefreshCw, Download, Eye, EyeOff, Play, Calendar } from 'lucide-react'
import Header from '@/components/layout/Header'

interface SmartplaceKeyword {
  id: number
  keyword: string
  addedDate: string
  isActive: boolean
  rank: number | null
  overallRank: number | null
  lastTracked: string | null
  rankingType: string
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
  const [keywords, setKeywords] = useState<SmartplaceKeyword[]>([])
  const [smartplaceProject, setSmartplaceProject] = useState<SmartplaceProject | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [newKeywords, setNewKeywords] = useState('')
  const [newPlace, setNewPlace] = useState({ placeName: '', placeId: '' })
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

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
        credentials: 'include'
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
    if (!newPlace.placeName.trim() || !newPlace.placeId.trim()) {
      setError('장소 이름과 Place ID를 입력해주세요.')
      return
    }

    // Place ID 형식 검증 (숫자만 허용)
    if (!/^\d+$/.test(newPlace.placeId)) {
      setError('Place ID는 숫자만 입력 가능합니다.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/smartplace-keywords/register-place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newPlace)
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
      setLoading(true)
      const response = await fetch('/api/smartplace-keywords/track-all', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        alert('순위 추적이 시작되었습니다.')
        await fetchKeywords()
      }
    } catch (error) {
      console.error('Failed to track all:', error)
    } finally {
      setLoading(false)
    }
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
      ['키워드', '현재순위', '전체순위', '순위유형', '활성화', '마지막 추적'],
      ...filteredKeywords.map(k => [
        k.keyword,
        k.rank || '-',
        k.overallRank || '-',
        k.rankingType,
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
                disabled={loading || !newPlace.placeName.trim() || !newPlace.placeId.trim()}
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
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-2"
              onClick={handleTrackAll}
              disabled={loading}
            >
              <Play size={18} />
              전체 추적
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">현재순위</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">전체순위</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">순위유형</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마지막 추적</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : filteredKeywords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : '등록된 키워드가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredKeywords.map((keyword) => (
                  <tr key={keyword.id} className={!keyword.isActive ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <strong>{keyword.keyword}</strong>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getRankClass(keyword.rank)}>
                        {keyword.rank ? `${keyword.rank}위` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getRankClass(keyword.overallRank)}>
                        {keyword.overallRank ? `${keyword.overallRank}위` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        keyword.rankingType === 'organic' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {keyword.rankingType === 'organic' ? '자연' : '광고'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleKeyword(keyword.id, keyword.isActive)}
                        className={`px-2 py-1 rounded text-xs ${
                          keyword.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {keyword.isActive ? (
                          <span className="flex items-center gap-1">
                            <Eye size={14} /> 활성
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <EyeOff size={14} /> 비활성
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {keyword.lastTracked ? 
                        new Date(keyword.lastTracked).toLocaleDateString() : 
                        '-'}
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
      </div>
    </div>
  )
}