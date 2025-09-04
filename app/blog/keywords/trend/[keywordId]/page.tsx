'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, TrendingUp, Calendar, Info } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Header from '@/components/layout/Header'

interface TrendData {
  date: string
  rank: number | null
  mainTabExposed: boolean
}

interface KeywordInfo {
  keyword: string
  currentRank: number | null
  bestRank: number | null
  avgRank: number | null
  totalExposures: number
}

function TrendContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const keywordId = params.keywordId as string
  const userId = searchParams.get('userId')
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [keywordInfo, setKeywordInfo] = useState<KeywordInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (keywordId) {
      fetchTrendData()
    }
  }, [keywordId, userId])

  const fetchTrendData = async () => {
    try {
      const url = `/api/blog-keywords/${keywordId}/trend${userId ? `?userId=${userId}` : ''}`
      const response = await fetch(url, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch trend data')
      }
      
      const data = await response.json()
      
      // Process trend data
      const processedData = data.trends?.map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('ko-KR', { 
          month: 'numeric', 
          day: 'numeric' 
        }),
        rank: item.rank,
        mainTabExposed: item.mainTabExposed || false
      })) || []
      
      setTrendData(processedData)
      
      // Set keyword info
      if (data.keyword) {
        setKeywordInfo({
          keyword: data.keyword.keyword,
          currentRank: data.stats?.currentRank || null,
          bestRank: data.stats?.bestRank || null,
          avgRank: data.stats?.avgRank || null,
          totalExposures: data.stats?.totalExposures || 0
        })
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch trend data:', error)
      setLoading(false)
    }
  }

  const goBack = () => {
    if (userId) {
      router.push(`/dashboard/admin/tracking/${userId}/blog`)
    } else {
      router.push('/blog/keywords')
    }
  }

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
          <div className="flex items-center mb-4">
            <button
              onClick={goBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              뒤로가기
            </button>
            <TrendingUp className="w-6 h-6 mr-2 text-blue-500" />
            <h1 className="text-2xl font-bold">블로그 순위 추세 분석</h1>
          </div>
          {keywordInfo && (
            <div className="text-lg text-gray-700">
              <span className="font-semibold">{keywordInfo.keyword}</span>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        {keywordInfo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-500 mb-1">현재 순위</p>
              <p className="text-2xl font-bold text-gray-900">
                {keywordInfo.currentRank ? `${keywordInfo.currentRank}위` : '-'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-500 mb-1">최고 순위</p>
              <p className="text-2xl font-bold text-green-600">
                {keywordInfo.bestRank ? `${keywordInfo.bestRank}위` : '-'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-500 mb-1">평균 순위</p>
              <p className="text-2xl font-bold text-blue-600">
                {keywordInfo.avgRank ? `${keywordInfo.avgRank.toFixed(1)}위` : '-'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-500 mb-1">통합검색 노출</p>
              <p className="text-2xl font-bold text-purple-600">
                {keywordInfo.totalExposures}회
              </p>
            </div>
          </div>
        )}

        {/* Trend Chart */}
        {trendData.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-gray-500" />
              순위 변화 추이
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  reversed
                  domain={[1, 30]}
                  ticks={[1, 5, 10, 15, 20, 25, 30]}
                  tick={{ fontSize: 12 }}
                  label={{ value: '순위', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-3 border rounded shadow">
                          <p className="font-semibold">{data.date}</p>
                          <p className="text-sm">
                            블로그탭: {data.rank ? `${data.rank}위` : '순위 없음'}
                          </p>
                          <p className="text-sm">
                            통합검색: {data.mainTabExposed ? '노출' : '미노출'}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="rank" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  name="블로그탭 순위"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg">추세 데이터가 없습니다.</p>
            <p className="text-gray-500 text-sm mt-2">최소 2일 이상의 데이터가 필요합니다.</p>
          </div>
        )}

        {/* Main Tab Exposure Timeline */}
        {trendData.some(d => d.mainTabExposed) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">통합검색 노출 현황</h2>
            <div className="space-y-2">
              {trendData.filter(d => d.mainTabExposed).map((data, index) => (
                <div key={index} className="flex items-center p-3 bg-green-50 rounded">
                  <Calendar className="w-4 h-4 mr-2 text-green-600" />
                  <span className="text-sm">
                    {data.date} - 통합검색 노출 (블로그탭 {data.rank ? `${data.rank}위` : '순위 없음'})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TrendPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <TrendContent />
    </Suspense>
  )
}