'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Calendar, Globe, Info, Tag } from 'lucide-react'
import Header from '@/components/layout/Header'

interface MonthlyData {
  date: string
  keywords: Array<{
    keyword: string
    rank: number | null
    mainTabExposed: boolean
    found: boolean
    title: string | null
    url: string | null
  }>
}

function MonthlyDataContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [projectInfo, setProjectInfo] = useState<any>(null)

  useEffect(() => {
    fetchMonthlyData()
  }, [userId])

  const fetchMonthlyData = async () => {
    try {
      const url = userId 
        ? `/api/blog-keywords/monthly-data?userId=${userId}`
        : '/api/blog-keywords/monthly-data'
      
      const response = await fetch(url, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.project) {
        setProjectInfo(data.project)
      }
      
      // Process monthly data
      const processedData: MonthlyData[] = data.monthlyData?.map((dayData: any) => ({
        date: new Date(dayData.date).toLocaleDateString('ko-KR'),
        keywords: dayData.rankings.map((r: any) => ({
          keyword: r.keyword,
          rank: r.rank,
          mainTabExposed: r.mainTabExposed || false,
          found: r.found || false,
          title: r.title,
          url: r.url
        }))
      })) || []
      
      setMonthlyData(processedData)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch monthly data:', error)
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
            <h1 className="text-2xl font-bold">블로그 월간 데이터</h1>
          </div>
          {projectInfo && (
            <div className="text-gray-600">
              <span className="font-semibold">{projectInfo.blogName}</span> | 
              <span className="ml-2">URL: {projectInfo.blogUrl}</span>
            </div>
          )}
        </div>

        {/* Monthly Data Tables */}
        {monthlyData.length > 0 ? (
          <div className="space-y-6">
            {monthlyData.map((data, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                  <h2 className="text-lg font-semibold">{data.date}</h2>
                  <span className="ml-4 text-sm text-gray-500">
                    총 {data.keywords.length}개 키워드
                  </span>
                </div>

                {data.keywords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">키워드</th>
                          <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">통합검색</th>
                          <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">블로그탭</th>
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">검색된 포스트</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.keywords.map((keyword, kIndex) => (
                          <tr key={kIndex} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3">
                              <div className="flex items-center">
                                <Tag className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="font-medium">{keyword.keyword}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={keyword.mainTabExposed ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                                {keyword.mainTabExposed ? '노출' : '미노출'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {keyword.rank ? (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  keyword.rank <= 5 ? 'bg-green-100 text-green-800' :
                                  keyword.rank <= 10 ? 'bg-yellow-100 text-yellow-800' :
                                  keyword.rank <= 20 ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {keyword.rank}위
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {keyword.title ? (
                                <div className="text-sm">
                                  <div className="text-gray-700 truncate max-w-xs" title={keyword.title}>
                                    {keyword.title}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    해당 날짜에 추적된 데이터가 없습니다.
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg">아직 월간 데이터가 없습니다.</p>
            <p className="text-gray-500 text-sm mt-2">블로그 순위 추적을 실행하면 데이터가 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MonthlyDataPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <MonthlyDataContent />
    </Suspense>
  )
}