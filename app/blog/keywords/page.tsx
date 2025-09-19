'use client'

import React, { useState, useEffect, memo, useMemo, useCallback } from 'react'
import { Plus, Trash2, Search, Calendar, TrendingUp, AlertCircle, RefreshCw, Download, Eye, EyeOff, Globe, CheckCircle, Play } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'

interface BlogKeyword {
  id: number
  keyword: string
  addedDate: string
  isActive: boolean
  mainTabExposed: boolean
  blogTabRank: number | null
  lastTracked: string | null
}

interface BlogProject {
  id: number
  blogName: string
  blogUrl: string
  keywordCount: number
}

// Memoized keyword row component for better performance
const BlogKeywordRow = memo(({ 
  keyword, 
  onToggleActive, 
  onRemove,
  getRankClass 
}: {
  keyword: BlogKeyword
  onToggleActive: (id: number) => void
  onRemove: (id: number) => void
  getRankClass: (rank: number | null) => string
}) => {
  return (
    <tr className={!keyword.isActive ? 'opacity-50' : ''}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <button
            onClick={() => onToggleActive(keyword.id)}
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
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {keyword.mainTabExposed ? (
          <CheckCircle size={18} className="text-green-500 inline" />
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={getRankClass(keyword.blogTabRank)}>
          {keyword.blogTabRank ? `${keyword.blogTabRank}위` : '-'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {keyword.lastTracked ? 
          new Date(keyword.lastTracked).toLocaleDateString() : 
          '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button 
          className="text-red-600 hover:text-red-900"
          onClick={() => onRemove(keyword.id)}
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.keyword.id === nextProps.keyword.id &&
    prevProps.keyword.isActive === nextProps.keyword.isActive &&
    prevProps.keyword.mainTabExposed === nextProps.keyword.mainTabExposed &&
    prevProps.keyword.blogTabRank === nextProps.keyword.blogTabRank &&
    prevProps.keyword.lastTracked === nextProps.keyword.lastTracked
  )
})

BlogKeywordRow.displayName = 'BlogKeywordRow'

export default function BlogKeywordManagement() {
  const [keywords, setKeywords] = useState<BlogKeyword[]>([])
  const [blogProject, setBlogProject] = useState<BlogProject | null>(null)
  const [loading, setLoading] = useState(true)  // 초기값을 true로 변경
  const [isTracking, setIsTracking] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [newKeywords, setNewKeywords] = useState('')
  const [newBlog, setNewBlog] = useState({ name: '', url: '' })
  const [error, setError] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    fetchBlogProject()
  }, [])

  const fetchBlogProject = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/blog-keywords/my-blog', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.blog) {
          setBlogProject(data.blog)
          await fetchKeywords()  // await 추가
        }
      }
    } catch (error) {
      console.error('Failed to fetch blog project:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchKeywords = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/blog-keywords/list', {
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

  const handleRegisterBlog = async () => {
    if (!newBlog.name.trim() || !newBlog.url.trim()) {
      setError('블로그 이름과 URL을 입력해주세요.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/blog-keywords/register-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newBlog)
      })

      if (response.ok) {
        const data = await response.json()
        setBlogProject(data.blog)
        setShowRegisterModal(false)
        setNewBlog({ name: '', url: '' })
        await fetchKeywords()  // await 추가
      } else {
        const data = await response.json()
        setError(data.error || '블로그 등록에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to register blog:', error)
      setError('블로그 등록 중 오류가 발생했습니다.')
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

    if (keywordList.length > 50) {
      setError('최대 50개까지만 등록할 수 있습니다.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/blog-keywords/add', {
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
        if (blogProject) {
          setBlogProject({
            ...blogProject,
            keywordCount: blogProject.keywordCount + keywordList.length
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

  // Use useCallback to memoize event handlers
  const handleToggleKeyword = useCallback(async (keywordId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/blog-keywords/${keywordId}/toggle`, {
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
  }, [keywords])

  const handleRemoveKeyword = useCallback(async (keywordId: number) => {
    if (!confirm('이 키워드를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/blog-keywords/${keywordId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchKeywords()
        
        // Update keyword count
        if (blogProject) {
          setBlogProject({
            ...blogProject,
            keywordCount: Math.max(0, blogProject.keywordCount - 1)
          })
        }
      }
    } catch (error) {
      console.error('Failed to remove keyword:', error)
    }
  }, [blogProject])

  const handleTrackAll = async () => {
    try {
      setIsTracking(true)
      const response = await fetch('/api/blog-keywords/track-all', {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        // Lambda가 백그라운드에서 처리 중임을 알림
        if (data.executionType === 'lambda') {
          const keywordCount = data.keywordCount || 0
          const estimatedTime = data.estimatedProcessingTime || '약 1-2분'

          alert(`Lambda 추적이 시작되었습니다.\n\n${keywordCount}개 키워드 처리 중...\n예상 소요 시간: ${estimatedTime}`)

          // Lambda 처리 상태를 주기적으로 확인
          const jobId = data.jobId
          if (jobId) {
            const checkInterval = setInterval(async () => {
              try {
                const statusResponse = await fetch(`/api/tracking/status/${jobId}`, {
                  credentials: 'include'
                })

                if (statusResponse.ok) {
                  const status = await statusResponse.json()

                  if (status.status === 'completed') {
                    clearInterval(checkInterval)
                    setIsTracking(false)

                    // 완료 알림
                    alert(`Lambda 추적이 완료되었습니다!\n\n성공: ${status.results?.successCount || 0}개\n실패: ${status.results?.failedCount || 0}개`)

                    // 키워드 목록 새로고침
                    await fetchKeywords()
                  } else if (status.status === 'failed') {
                    clearInterval(checkInterval)
                    setIsTracking(false)
                    alert(`추적 실패: ${status.error?.message || '알 수 없는 오류'}`)
                  }
                  // processing 상태일 때는 계속 대기
                }
              } catch (error) {
                console.error('Status check error:', error)
              }
            }, 5000) // 5초마다 상태 확인

            // 최대 3분 후에는 자동으로 중단
            setTimeout(() => {
              clearInterval(checkInterval)
              setIsTracking(false)
              fetchKeywords() // 최종적으로 한 번 새로고침
            }, 180000)
          }
        } else {
          // 로컬 실행 완료
          alert(`순위 추적 완료!\n\n성공: ${data.successCount || 0}개\n실패: ${data.failCount || 0}개`)
          await fetchKeywords()
          setIsTracking(false)
        }
      } else {
        alert(data.error || '순위 추적 시작에 실패했습니다.')
        setIsTracking(false)
      }
    } catch (error) {
      console.error('Failed to track all:', error)
      alert('순위 추적 중 오류가 발생했습니다.')
      setIsTracking(false)
    }
  }

  const getRankClass = (rank: number | null): string => {
    if (!rank) return 'text-gray-400'
    if (rank <= 5) return 'text-green-600 font-bold'
    if (rank <= 10) return 'text-blue-600'
    if (rank <= 20) return 'text-yellow-600'
    return 'text-gray-600'
  }

  // Memoize filtered keywords to prevent unnecessary recalculations
  const filteredKeywords = useMemo(() => {
    return keywords.filter(k => {
      if (!showInactive && !k.isActive) return false
      if (searchTerm) {
        return k.keyword.toLowerCase().includes(searchTerm.toLowerCase())
      }
      return true
    })
  }, [keywords, showInactive, searchTerm])

  const exportToCSV = () => {
    const csvContent = [
      ['키워드', '통합검색', '블로그탭', '활성화', '마지막 추적'],
      ...filteredKeywords.map(k => [
        k.keyword,
        k.mainTabExposed ? '노출' : '미노출',
        k.blogTabRank || '-',
        k.isActive ? 'O' : 'X',
        k.lastTracked ? new Date(k.lastTracked).toLocaleDateString() : '-'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `blog-keywords-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // 로딩 중일 때 로딩 화면 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-20 p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">블로그 정보를 확인하는 중...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 블로그가 등록되지 않은 경우 등록 화면 표시
  if (!blogProject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-20 p-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <Globe className="mx-auto text-orange-500 mb-4" size={64} />
              <h2 className="text-2xl font-bold mb-2">블로그 등록이 필요합니다</h2>
              <p className="text-gray-600">
                키워드 관리를 시작하기 전에 먼저 블로그를 등록해주세요.
              </p>
            </div>
            
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  블로그 이름
                </label>
                <input
                  type="text"
                  value={newBlog.name}
                  onChange={(e) => setNewBlog({ ...newBlog, name: e.target.value })}
                  placeholder="예: 우리학원 공식 블로그"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  블로그 URL
                </label>
                <input
                  type="url"
                  value={newBlog.url}
                  onChange={(e) => setNewBlog({ ...newBlog, url: e.target.value })}
                  placeholder="https://blog.naver.com/your-blog"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
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
                onClick={handleRegisterBlog}
                disabled={loading || !newBlog.name.trim() || !newBlog.url.trim()}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? '등록 중...' : '블로그 등록하기'}
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
              블로그 키워드 관리
            </h1>
            {blogProject && (
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Globe size={16} />
                  {blogProject.blogName}
                </span>
                <span className="text-gray-400">|</span>
                <a 
                  href={blogProject.blogUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {blogProject.blogUrl}
                </a>
                <span className="text-gray-400">|</span>
                <span>등록 키워드: {blogProject.keywordCount}개</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 flex items-center gap-2"
              onClick={handleTrackAll}
              disabled={isTracking || keywords.filter(k => k.isActive).length === 0}
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
                  className="rounded text-orange-600"
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
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
                />
              </div>
              
              <button 
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-2"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">통합검색</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">블로그탭</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마지막 추적</th>
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
                      <strong>{keyword.keyword}</strong>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={keyword.mainTabExposed ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                        {keyword.mainTabExposed ? '노출' : '미노출'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getRankClass(keyword.blogTabRank)}>
                        {keyword.blogTabRank ? `${keyword.blogTabRank}위` : '-'}
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

        {/* 추적 중 오버레이 */}
        {isTracking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mb-4"></div>
                <h3 className="text-xl font-bold mb-2">블로그 순위 추적 중...</h3>
                <p className="text-gray-600">잠시만 기다려주세요.</p>
                <p className="text-sm text-gray-500 mt-2">키워드 개수에 따라 1-2분 소요될 수 있습니다.</p>
              </div>
            </div>
          </div>
        )}

        {/* 키워드 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">블로그 키워드 추가</h2>
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400"
                />
                <p className="text-sm text-gray-500 mt-1">최대 50개까지 등록 가능합니다.</p>
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
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
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