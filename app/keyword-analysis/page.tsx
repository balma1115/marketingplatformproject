'use client'

import { useState } from 'react'
import { Search, TrendingUp, Users, BarChart3, Filter, ChevronDown, Loader2, Info } from 'lucide-react'
import Header from '@/components/layout/Header'

interface KeywordStats {
  monthlyPcQcCnt: number
  monthlyMobileQcCnt: number
  monthlyAvePcClkCnt: number
  monthlyAveMobileClkCnt: number
  monthlyAvePcCtr: number
  monthlyAveMobileCtr: number
  plAvgDepth: number
  compIdx: string
}

interface RelatedKeyword {
  keyword: string
  monthlySearchVolume: number
  groups?: string[]
  monthlyPcQcCnt?: number
  monthlyMobileQcCnt?: number
  compIdx?: string
  isAutocomplete?: boolean
}

interface TopBlogPost {
  title: string
  link: string
  description: string
  bloggername: string
  bloggerlink: string
  postdate: string
  rank?: number
}

interface AnalysisResult {
  keyword: string
  stats: KeywordStats
  relatedKeywords: string[]
  relatedKeywordsDetail: RelatedKeyword[]
  keywordGroups: { [key: string]: RelatedKeyword[] }
  tokenCombinations: string[]
  topBlogPosts: TopBlogPost[]
}

export default function KeywordAnalysisPage() {
  const [keyword, setKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [selectedFilter, setSelectedFilter] = useState('전체')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30

  const handleAnalyze = async () => {
    if (!keyword.trim()) return

    setIsLoading(true)
    setCurrentPage(1)
    setSelectedFilter('전체')
    
    try {
      const response = await fetch('/api/keyword-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ keyword: keyword.trim() })
      })

      const data = await response.json()
      
      // API returns data directly, not wrapped in { success, data }
      if (response.ok && data.keyword) {
        setAnalysisResult(data)
      } else {
        alert(data.error || '키워드 분석에 실패했습니다.')
      }
    } catch (error) {
      console.error('키워드 분석 오류:', error)
      alert('키워드 분석 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze()
    }
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ko-KR').format(num)
  }

  const getCompetitionColor = (comp: string): string => {
    switch (comp) {
      case '높음': return 'text-red-600 bg-red-100'
      case '중간': return 'text-yellow-600 bg-yellow-100'
      case '낮음': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // 페이지네이션 계산
  const filteredKeywords = analysisResult?.keywordGroups[selectedFilter] || []
  const totalPages = Math.ceil(filteredKeywords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentKeywords = filteredKeywords.slice(startIndex, endIndex)

  const handleKeywordClick = (keyword: string) => {
    setKeyword(keyword)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="pt-20 p-6 max-w-7xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp size={24} className="text-purple-600" />
            네이버 키워드 분석
          </h1>
          <p className="text-gray-600 mt-2">
            키워드의 검색량, 경쟁강도, 연관 키워드, 상위 블로그를 한 번에 분석하세요
          </p>
        </div>

        {/* 검색 섹션 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="분석할 키워드를 입력하세요 (예: 영어학원)"
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !keyword.trim()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>분석하기</>
              )}
            </button>
          </div>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-lg text-gray-700">키워드를 분석하고 있습니다...</p>
              <p className="text-gray-500 mt-2">잠시만 기다려주세요</p>
            </div>
          </div>
        )}

        {/* 분석 결과 */}
        {!isLoading && analysisResult && (
          <div className="space-y-6">
            {/* 키워드 통계 */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-purple-600" />
                "{analysisResult.keyword}" 검색 통계
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">월간 검색량 (PC+모바일)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(analysisResult.stats.monthlyPcQcCnt + analysisResult.stats.monthlyMobileQcCnt)}
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    PC: {formatNumber(analysisResult.stats.monthlyPcQcCnt)} | 
                    모바일: {formatNumber(analysisResult.stats.monthlyMobileQcCnt)}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">평균 클릭률</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((analysisResult.stats.monthlyAvePcCtr + analysisResult.stats.monthlyAveMobileCtr) / 2).toFixed(2)}%
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    PC: {analysisResult.stats.monthlyAvePcCtr.toFixed(2)}% | 
                    모바일: {analysisResult.stats.monthlyAveMobileCtr.toFixed(2)}%
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">경쟁 강도</p>
                  <div className="text-4xl font-bold">
                    <span className={`${analysisResult.stats.compIdx === '높음' ? 'text-red-600' : analysisResult.stats.compIdx === '중간' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {analysisResult.stats.compIdx}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium w-full justify-center ${getCompetitionColor(analysisResult.stats.compIdx)}`}>
                      광고 평균 노출 깊이: {analysisResult.stats.plAvgDepth}위
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${analysisResult.stats.compIdx === '높음' ? 'bg-red-500' : analysisResult.stats.compIdx === '중간' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                        <p className="text-xs text-gray-600">
                          {analysisResult.stats.compIdx === '높음' ? '경쟁이 치열함' : analysisResult.stats.compIdx === '중간' ? '보통 수준의 경쟁' : '경쟁이 적음'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 상위 블로그 포스트 */}
            {analysisResult.topBlogPosts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <Users size={20} className="text-purple-600" />
                  상위 블로그 포스트 ({analysisResult.topBlogPosts.length}개)
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          순위
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          제목
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          블로거
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          날짜
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analysisResult.topBlogPosts.map((post, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {idx + 1}위
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <a
                              href={post.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {post.title}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {post.bloggername}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {post.postdate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 연관 키워드 */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                  <Filter size={20} className="text-purple-600" />
                  연관 키워드 ({analysisResult.relatedKeywordsDetail.length}개)
                </h2>
                <select
                  value={selectedFilter}
                  onChange={(e) => {
                    setSelectedFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="전체">전체 ({analysisResult.keywordGroups['전체']?.length || 0}개)</option>
                  {analysisResult.tokenCombinations.map(token => (
                    <option key={token} value={token}>
                      {token} ({analysisResult.keywordGroups[token]?.length || 0}개)
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        키워드
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        월간 검색량
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PC / 모바일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        경쟁도
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        그룹
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentKeywords.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleKeywordClick(item.keyword)}
                            className="text-sm font-medium text-purple-600 hover:text-purple-900"
                          >
                            {item.keyword}
                          </button>
                          {item.isAutocomplete && (
                            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              자동완성
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {formatNumber(item.monthlySearchVolume)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.monthlyPcQcCnt !== undefined && item.monthlyMobileQcCnt !== undefined ? (
                            <span>
                              {formatNumber(item.monthlyPcQcCnt)} / {formatNumber(item.monthlyMobileQcCnt)}
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.compIdx ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompetitionColor(item.compIdx)}`}>
                              {item.compIdx}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.groups?.map((group, gIdx) => (
                              <span
                                key={gIdx}
                                className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                              >
                                {group}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    총 {filteredKeywords.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredKeywords.length)}개 표시
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    
                    {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 10) {
                        pageNum = i + 1
                      } else if (currentPage <= 5) {
                        pageNum = i + 1
                      } else if (currentPage > totalPages - 5) {
                        pageNum = totalPages - 9 + i
                      } else {
                        pageNum = currentPage - 5 + i
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm font-medium rounded-md ${
                            currentPage === pageNum
                              ? 'bg-purple-500 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !analysisResult && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              키워드 분석을 시작하세요
            </h3>
            <p className="text-gray-500 mb-1">
              검색하고 싶은 키워드를 입력하고 '분석하기' 버튼을 클릭하세요.
            </p>
            <p className="text-sm text-gray-400">
              네이버 검색광고 API를 통해 정확한 검색량과 경쟁도 데이터를 제공합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}