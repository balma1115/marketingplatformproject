'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Search, TrendingUp, AlertCircle, Globe, BookOpen, CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'

interface UnifiedKeyword {
  keyword: string
  smartplace: {
    id: number
    projectName: string
    projectId: string
    addedDate: string
    currentRank: number | null
    adRank: number | null
    lastTracked: string
  } | null
  blog: {
    id: number
    projectName: string
    projectId: string
    addedDate: string
    mainTabExposed: boolean
    mainTabRank: number | null
    blogTabRank: number | null
    lastTracked: string
  } | null
}

interface Stats {
  totalKeywords: number
  smartplaceOnly: number
  blogOnly: number
  both: number
}

const fetchUnifiedKeywords = async () => {
  const response = await fetch('/api/focus-keywords/unified', {
    credentials: 'include'
  })
  if (!response.ok) {
    throw new Error('Failed to fetch keywords')
  }
  return response.json()
}

export default function FocusKeywordManagement() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addTarget, setAddTarget] = useState<'smartplace' | 'blog' | null>(null)
  const [newKeywords, setNewKeywords] = useState('')
  const [filter, setFilter] = useState<'all' | 'smartplace' | 'blog' | 'both'>('all')
  const [error, setError] = useState<string | null>(null)

  // React Query로 데이터 fetching 및 캐싱
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['unifiedKeywords'],
    queryFn: fetchUnifiedKeywords,
    staleTime: 5 * 60 * 1000, // 5분간 fresh
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
  })

  const keywords = data?.keywords || []
  const stats = data?.stats || {
    totalKeywords: 0,
    smartplaceOnly: 0,
    blogOnly: 0,
    both: 0
  }

  // 키워드 추가 mutation
  const addKeywordsMutation = useMutation({
    mutationFn: async ({ target, keywords }: { target: 'smartplace' | 'blog', keywords: string[] }) => {
      const endpoint = target === 'smartplace' 
        ? '/api/focus-keywords/add-to-smartplace'
        : '/api/focus-keywords/add-to-blog'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ keywords })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '키워드 추가에 실패했습니다.')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedKeywords'] })
      setShowAddModal(false)
      setNewKeywords('')
      setAddTarget(null)
      setError(null)
    },
    onError: (error: Error) => {
      setError(error.message)
    }
  })

  const handleAddKeywords = async () => {
    if (!addTarget || !newKeywords.trim()) return

    const keywordList = newKeywords.split('\n').filter(k => k.trim())
    if (keywordList.length === 0) return

    addKeywordsMutation.mutate({ target: addTarget, keywords: keywordList })
  }

  // 키워드 제거 mutation
  const removeKeywordMutation = useMutation({
    mutationFn: async ({ source, keywordId }: { source: 'smartplace' | 'blog', keywordId: number }) => {
      const response = await fetch(`/api/focus-keywords/${source}/${keywordId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to remove keyword')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedKeywords'] })
    }
  })

  const handleRemoveKeyword = async (source: 'smartplace' | 'blog', keywordId: number) => {
    if (!confirm('이 키워드를 제거하시겠습니까?')) return
    removeKeywordMutation.mutate({ source, keywordId })
  }

  const getRankClass = (rank: number | null): string => {
    if (!rank) return ''
    if (rank <= 5) return 'text-green-600'
    if (rank <= 10) return 'text-blue-600'
    if (rank <= 20) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const filteredKeywords = keywords.filter(k => {
    if (filter === 'smartplace' && !k.smartplace) return false
    if (filter === 'blog' && !k.blog) return false
    if (filter === 'both' && (!k.smartplace || !k.blog)) return false
    
    if (searchTerm) {
      return k.keyword.toLowerCase().includes(searchTerm.toLowerCase())
    }
    
    return true
  })

  const exportToCSV = () => {
    const csvContent = [
      ['키워드', '스마트플레이스 오가닉', '스마트플레이스 광고', '블로그 통합검색', '블로그탭'],
      ...filteredKeywords.map(k => [
        k.keyword,
        k.smartplace?.currentRank || '-',
        k.smartplace?.adRank || '-',
        k.blog?.mainTabRank || '-',
        k.blog?.blogTabRank || '-'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `focus-keywords-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-20 p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp size={24} />
            중점키워드 통합 관리
          </h1>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2"
              onClick={() => refetch()}
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

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600">전체 키워드</h3>
                <p className="text-2xl font-bold">{stats.totalKeywords}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Globe className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600">스마트플레이스</h3>
                <p className="text-2xl font-bold">{stats.smartplaceOnly}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BookOpen className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600">블로그</h3>
                <p className="text-2xl font-bold">{stats.blogOnly}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="text-green-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-600">중복 등록</h3>
                <p className="text-2xl font-bold">{stats.both}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white p-4 rounded-lg shadow border mb-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button 
                className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setFilter('all')}
              >
                전체 ({stats.totalKeywords})
              </button>
              <button 
                className={`px-4 py-2 rounded flex items-center gap-2 ${filter === 'smartplace' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setFilter('smartplace')}
              >
                <Globe size={16} />
                스마트플레이스만
              </button>
              <button 
                className={`px-4 py-2 rounded flex items-center gap-2 ${filter === 'blog' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setFilter('blog')}
              >
                <BookOpen size={16} />
                블로그만
              </button>
              <button 
                className={`px-4 py-2 rounded flex items-center gap-2 ${filter === 'both' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setFilter('both')}
              >
                <CheckCircle size={16} />
                중복 등록
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="키워드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 키워드 추가 버튼 */}
        <div className="flex gap-2 mb-6">
          <button 
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
            onClick={() => {
              setAddTarget('smartplace')
              setShowAddModal(true)
            }}
          >
            <Plus size={18} />
            스마트플레이스 키워드 추가
          </button>
          <button 
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-2"
            onClick={() => {
              setAddTarget('blog')
              setShowAddModal(true)
            }}
          >
            <Plus size={18} />
            블로그 키워드 추가
          </button>
        </div>

        {/* 키워드 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">키워드</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">스마트플레이스</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">블로그</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : filteredKeywords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    등록된 키워드가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredKeywords.map((keyword, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <strong>{keyword.keyword}</strong>
                    </td>
                    <td className="px-6 py-4">
                      {keyword.smartplace ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${getRankClass(keyword.smartplace.currentRank)}`}>
                            오가닉: {keyword.smartplace.currentRank || '-'}위
                          </span>
                          {keyword.smartplace.adRank && (
                            <span className="text-sm text-orange-600">
                              광고: {keyword.smartplace.adRank}위
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">미등록</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {keyword.blog ? (
                        <div className="flex gap-2">
                          <span className={`inline-block px-2 py-1 text-xs rounded ${keyword.blog.mainTabExposed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            통합 {keyword.blog.mainTabExposed ? (keyword.blog.mainTabRank ? `${keyword.blog.mainTabRank}위` : '노출') : '미노출'}
                          </span>
                          <span className={`inline-block px-2 py-1 text-xs rounded ${getRankClass(keyword.blog.blogTabRank)} bg-gray-100`}>
                            블로그탭 {keyword.blog.blogTabRank ? `${keyword.blog.blogTabRank}위` : '미노출'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">미등록</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {keyword.smartplace?.addedDate || keyword.blog?.addedDate ? 
                        new Date(keyword.smartplace?.addedDate || keyword.blog?.addedDate || '').toLocaleDateString() :
                        '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {keyword.smartplace && (
                          <button 
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleRemoveKeyword('smartplace', keyword.smartplace!.id)}
                            title="스마트플레이스에서 제거"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                        {keyword.blog && (
                          <button 
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleRemoveKeyword('blog', keyword.blog!.id)}
                            title="블로그에서 제거"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
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
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {addTarget === 'smartplace' ? (
                    <>
                      <Globe size={20} />
                      스마트플레이스 키워드 추가
                    </>
                  ) : (
                    <>
                      <BookOpen size={20} />
                      블로그 키워드 추가
                    </>
                  )}
                </h2>
                <button onClick={() => setShowAddModal(false)}>
                  <XCircle size={24} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-2">
                  <AlertCircle size={18} />
                  {error}
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {addTarget === 'smartplace' 
                    ? '최대 30개까지 등록 가능합니다.'
                    : '최대 50개까지 등록 가능합니다.'}
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  onClick={() => setShowAddModal(false)}
                >
                  취소
                </button>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={handleAddKeywords}
                  disabled={addKeywordsMutation.isPending || !newKeywords.trim()}
                >
                  {addKeywordsMutation.isPending ? '추가 중...' : '키워드 추가'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}