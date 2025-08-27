'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, Calendar, Award, Target } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Header from '@/components/layout/Header'

interface TrendData {
  date: string
  organicRank: number | null
  adRank: number | null
}

interface CompetitorTrend {
  placeId: string
  placeName: string
  isMyPlace: boolean
  trendData: Array<{
    date: string
    rank: number
  }>
}

export default function KeywordTrendPage({ 
  params 
}: { 
  params: Promise<{ keywordId: string }> 
}) {
  const router = useRouter()
  const { keywordId } = use(params)
  const [keyword, setKeyword] = useState('')
  const [placeInfo, setPlaceInfo] = useState<any>(null)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [competitorTrends, setCompetitorTrends] = useState<CompetitorTrend[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([])

  useEffect(() => {
    fetchTrendData()
  }, [keywordId])

  const fetchTrendData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/smartplace-keywords/${keywordId}/trend`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setKeyword(data.keyword)
        setPlaceInfo(data.placeInfo)
        setTrendData(data.trendData)
        setCompetitorTrends(data.top10Trends || [])
        setStats(data.stats)
        
        // 초기에 모든 업체를 선택 (최대 10개)
        const initialSelected = data.top10Trends?.slice(0, 10).map((t: CompetitorTrend) => t.placeId) || []
        setSelectedCompetitors(initialSelected)
      }
    } catch (error) {
      console.error('Failed to fetch trend data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 꺾은선 그래프용 데이터 준비
  const prepareChartData = () => {
    const dateMap = new Map<string, any>()
    
    // 모든 날짜 수집
    competitorTrends.forEach(competitor => {
      if (selectedCompetitors.includes(competitor.placeId)) {
        competitor.trendData.forEach(({ date, rank }) => {
          const dateStr = new Date(date).toLocaleDateString()
          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, { date: dateStr })
          }
          
          // 업체명을 키로 사용
          const key = competitor.isMyPlace ? `🏆 ${competitor.placeName}` : competitor.placeName
          dateMap.get(dateStr)[key] = rank
        })
      }
    })
    
    return Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }

  const chartData = prepareChartData()
  
  // 선 색상 배열 (10개 + 여유분)
  const lineColors = [
    '#8b5cf6', // 보라색 (내 업체)
    '#3b82f6', // 파란색
    '#10b981', // 초록색
    '#f59e0b', // 주황색
    '#ef4444', // 빨간색
    '#6b7280', // 회색
    '#ec4899', // 분홍색
    '#14b8a6', // 청록색
    '#f97316', // 진한 주황
    '#84cc16', // 라임색
    '#a855f7', // 진한 보라
    '#06b6d4', // 청록색2
    '#dc2626', // 진한 빨강
    '#059669', // 진한 초록
    '#7c3aed'  // 보라색2
  ]

  const handleCompetitorToggle = (placeId: string) => {
    setSelectedCompetitors(prev => {
      if (prev.includes(placeId)) {
        return prev.filter(id => id !== placeId)
      } else if (prev.length < 10) {
        return [...prev, placeId]
      }
      return prev
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-20 p-6 max-w-7xl mx-auto">
          <div className="text-center">데이터를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-20 p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            키워드 목록으로
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="text-purple-600" />
                "{keyword}" 순위 추세
              </h1>
              {placeInfo && (
                <p className="text-gray-600 mt-2">
                  {placeInfo.placeName} (ID: {placeInfo.placeId})
                </p>
              )}
            </div>
            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">평균 오가닉 순위</p>
                  <p className="text-xl font-bold text-blue-600">
                    {stats.averageOrganic ? `${Math.round(stats.averageOrganic)}위` : '-'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">최고 오가닉 순위</p>
                  <p className="text-xl font-bold text-green-600">
                    {stats.bestOrganic ? `${stats.bestOrganic}위` : '-'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 상위 10개 업체 추이 차트 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="text-purple-600" />
            상위 업체 순위 추이 (최대 10개 선택)
          </h2>

          {/* 업체 선택 체크박스 */}
          <div className="mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {competitorTrends.map((competitor, idx) => (
              <label 
                key={competitor.placeId}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                  selectedCompetitors.includes(competitor.placeId) 
                    ? 'bg-purple-50 border border-purple-300' 
                    : 'bg-gray-50 border border-gray-200'
                } ${selectedCompetitors.length >= 10 && !selectedCompetitors.includes(competitor.placeId) ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedCompetitors.includes(competitor.placeId)}
                  onChange={() => handleCompetitorToggle(competitor.placeId)}
                  disabled={selectedCompetitors.length >= 10 && !selectedCompetitors.includes(competitor.placeId)}
                  className="rounded text-purple-600"
                />
                <span className={`text-sm truncate ${competitor.isMyPlace ? 'font-bold' : ''}`}>
                  {competitor.isMyPlace && '🏆 '}
                  {competitor.placeName}
                </span>
              </label>
            ))}
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  reversed={true}
                  domain={[1, 30]}
                  ticks={[1, 5, 10, 15, 20, 25, 30]}
                  label={{ value: '순위', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: any) => `${value}위`}
                  labelFormatter={(label) => `날짜: ${label}`}
                />
                <Legend />
                
                {/* 선택된 업체들의 라인 렌더링 */}
                {competitorTrends.filter(c => selectedCompetitors.includes(c.placeId)).map((competitor, idx) => {
                  const key = competitor.isMyPlace ? `🏆 ${competitor.placeName}` : competitor.placeName
                  return (
                    <Line 
                      key={competitor.placeId}
                      type="monotone"
                      dataKey={key}
                      stroke={competitor.isMyPlace ? lineColors[0] : lineColors[idx + 1]}
                      strokeWidth={competitor.isMyPlace ? 3 : 2}
                      dot={{ r: competitor.isMyPlace ? 5 : 3 }}
                      activeDot={{ r: 8 }}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-gray-500">
              추세 데이터가 없습니다. 추적을 실행해주세요.
            </div>
          )}
        </div>

        {/* 내 업체 순위 추이 (오가닉/광고 분리) */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="text-purple-600" />
            내 업체 순위 추이 (오가닉 vs 광고)
          </h2>
          
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={trendData.map(d => ({
                  date: new Date(d.date).toLocaleDateString(),
                  organicRank: d.organicRank,
                  adRank: d.adRank
                }))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  reversed={true}
                  domain={[1, 30]}
                  ticks={[1, 5, 10, 15, 20, 25, 30]}
                  label={{ value: '순위', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value: any) => value ? `${value}위` : '순위권 밖'}
                  labelFormatter={(label) => `날짜: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="organicRank" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="오가닉 순위"
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="adRank" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="광고 순위"
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-gray-500">
              추세 데이터가 없습니다. 추적을 실행해주세요.
            </div>
          )}
        </div>

        {/* 데이터 요약 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>데이터 기간:</strong> 최근 30일 | 
            <strong className="ml-2">총 데이터 포인트:</strong> {stats?.totalDataPoints || 0}개
          </p>
        </div>
      </div>
    </div>
  )
}