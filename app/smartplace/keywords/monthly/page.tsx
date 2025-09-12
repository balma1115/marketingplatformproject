'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Info, Tag, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react'
import Header from '@/components/layout/Header'

interface MonthlyData {
  date: string
  keywords: Array<{
    keyword: string
    organicRank: number | null
    adRank: number | null
  }>
  snapshot?: {
    placeName: string
    category: string | null
    directions: string | null
    introduction: string | null
    representativeKeywords: string[] | null
    phone: string | null
    address: string | null
  }
}

export default function MonthlyDataPage() {
  const router = useRouter()
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [projectInfo, setProjectInfo] = useState<any>(null)
  const [placeInfo, setPlaceInfo] = useState<any>(null)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [selectedDateRange, setSelectedDateRange] = useState<'7' | '14' | '30'>('30')

  useEffect(() => {
    fetchMonthlyData()
  }, [])

  const fetchMonthlyData = async () => {
    try {
      const response = await fetch('/api/smartplace-keywords/monthly-data')
      const data = await response.json()
      
      if (data.project) {
        setProjectInfo(data.project)
        
        // 미래엔영어수학 벌원학원의 실제 정보 (하드코딩)
        if (data.project.placeName === '미래엔영어수학 벌원학원') {
          setPlaceInfo({
            placeName: '미래엔영어수학 벌원학원',
            category: '학원,교습소',
            directions: '상동역 2번출구에서 도보 5분',
            introduction: '미래엔영어수학 벌원학원은 체계적인 커리큘럼과 개인별 맞춤 교육으로 학생들의 실력 향상을 도모하는 전문 학원입니다. 영어와 수학 전문 강사진이 학생 개개인의 수준에 맞춘 1:1 맞춤형 수업을 제공합니다.',
            representativeKeywords: ['벌원학원', '탄벌동학원', '탄벌동영어학원', '탄벌동수학학원', '역동학원']
          })
        } else {
          // 다른 업체의 경우 기본 정보만 표시
          setPlaceInfo({
            placeName: data.project.placeName,
            category: data.placeInfo?.category,
            directions: null,
            introduction: null,
            representativeKeywords: []
          })
        }
      }
      
      // Process monthly data
      const processedData: MonthlyData[] = data.monthlyData?.map((dayData: any) => ({
        date: new Date(dayData.date).toLocaleDateString('ko-KR'),
        keywords: dayData.rankings.map((r: any) => ({
          keyword: r.keyword,
          organicRank: r.organicRank,
          adRank: r.adRank
        })),
        snapshot: dayData.snapshot
      })) || []
      
      setMonthlyData(processedData)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch monthly data:', error)
      setLoading(false)
    }
  }

  const goBack = () => {
    router.push('/smartplace/keywords')
  }

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDates(newExpanded)
  }

  const expandAll = () => {
    setExpandedDates(new Set(monthlyData.map(d => d.date)))
  }

  const collapseAll = () => {
    setExpandedDates(new Set())
  }

  // Filter data based on selected date range
  const filteredData = monthlyData.slice(0, parseInt(selectedDateRange))

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-20 p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={goBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                뒤로가기
              </button>
              <h1 className="text-2xl font-bold">월간 데이터</h1>
            </div>
            
            {/* 날짜 범위 선택 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">기간:</label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value as '7' | '14' | '30')}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7">최근 7일</option>
                  <option value="14">최근 14일</option>
                  <option value="30">최근 30일</option>
                </select>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={expandAll}
                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                >
                  전체 펼치기
                </button>
                <button
                  onClick={collapseAll}
                  className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                >
                  전체 접기
                </button>
              </div>
            </div>
          </div>
          
          {projectInfo && (
            <div className="text-gray-600">
              <span className="font-semibold">{projectInfo.placeName}</span> | 
              <span className="ml-2">Place ID: {projectInfo.placeId}</span>
              {monthlyData.length > 0 && (
                <span className="ml-4 text-sm">
                  총 {monthlyData.length}일 데이터 (표시: {filteredData.length}일)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Monthly Data Tables */}
        <div className="space-y-4">
        {filteredData.map((dayData) => (
          <div key={dayData.date} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Date Header - Clickable */}
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all"
              onClick={() => toggleDate(dayData.date)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span className="font-semibold text-lg">{dayData.date}</span>
                  <span className="ml-4 text-sm text-blue-100">
                    {dayData.keywords.length}개 키워드
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {/* 평균 순위 표시 */}
                  <div className="flex items-center gap-3 text-sm">
                    {dayData.keywords.filter(k => k.organicRank).length > 0 && (
                      <span className="flex items-center">
                        <span className="mr-1">오가닉 평균:</span>
                        <span className="font-bold">
                          {(dayData.keywords.filter(k => k.organicRank).reduce((sum, k) => sum + (k.organicRank || 0), 0) / 
                            dayData.keywords.filter(k => k.organicRank).length).toFixed(1)}위
                        </span>
                      </span>
                    )}
                    {dayData.keywords.filter(k => k.adRank).length > 0 && (
                      <span className="flex items-center">
                        <span className="mr-1">광고 평균:</span>
                        <span className="font-bold">
                          {(dayData.keywords.filter(k => k.adRank).reduce((sum, k) => sum + (k.adRank || 0), 0) / 
                            dayData.keywords.filter(k => k.adRank).length).toFixed(1)}위
                        </span>
                      </span>
                    )}
                  </div>
                  {expandedDates.has(dayData.date) ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Content - Collapsible */}
            {expandedDates.has(dayData.date) && (
              <div className="p-6">
              {/* My SmartPlace Info */}
              {placeInfo && (
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    스마트플레이스 정보
                  </h3>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">업체명:</span>
                      <span className="ml-2 text-gray-900">{placeInfo.placeName}</span>
                    </div>
                    
                    {placeInfo.category && (
                      <div>
                        <span className="font-medium text-gray-700">카테고리:</span>
                        <span className="ml-2 text-gray-900">{placeInfo.category}</span>
                      </div>
                    )}
                    
                    {placeInfo.directions && (
                      <div>
                        <span className="font-medium text-gray-700">찾아오는길:</span>
                        <span className="ml-2 text-gray-900">{placeInfo.directions}</span>
                      </div>
                    )}
                    
                    {placeInfo.introduction && (
                      <div>
                        <span className="font-medium text-gray-700">소개글:</span>
                        <p className="mt-1 text-gray-900 leading-relaxed">
                          {placeInfo.introduction}
                        </p>
                      </div>
                    )}
                    
                    {placeInfo.representativeKeywords && placeInfo.representativeKeywords.length > 0 && (
                      <div>
                        <div className="flex items-center mb-2">
                          <Tag className="w-4 h-4 mr-1 text-gray-700" />
                          <span className="font-medium text-gray-700">대표 키워드:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {placeInfo.representativeKeywords.map((keyword: string, idx: number) => (
                            <span 
                              key={idx}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Keywords Ranking Table */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">키워드 순위</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          키워드
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          오가닉 순위
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          광고 순위
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dayData.keywords.map((keyword, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {keyword.keyword}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            {keyword.organicRank ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {keyword.organicRank}위
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            {keyword.adRank ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {keyword.adRank}위
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )}
          </div>
        ))}
        
        {filteredData.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">아직 추적된 데이터가 없습니다.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}