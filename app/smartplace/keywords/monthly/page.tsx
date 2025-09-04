'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Info, Tag } from 'lucide-react'
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

  useEffect(() => {
    fetchMonthlyData()
  }, [])

  const fetchMonthlyData = async () => {
    try {
      const response = await fetch('/api/smartplace-keywords/monthly-data')
      const data = await response.json()
      
      if (data.project) {
        setProjectInfo(data.project)
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
            <h1 className="text-2xl font-bold">월간 데이터</h1>
          </div>
          {projectInfo && (
            <div className="text-gray-600">
              <span className="font-semibold">{projectInfo.placeName}</span> | 
              <span className="ml-2">Place ID: {projectInfo.placeId}</span>
            </div>
          )}
        </div>

        {/* Monthly Data Tables */}
        <div className="space-y-6">
        {monthlyData.map((dayData) => (
          <div key={dayData.date} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Date Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                <span className="font-semibold text-lg">{dayData.date}</span>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {/* SmartPlace Info */}
              {dayData.snapshot && (
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    스마트플레이스 정보
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="mb-2">
                        <span className="font-medium text-gray-700">업체명:</span>
                        <span className="ml-2 text-gray-900">{dayData.snapshot.placeName}</span>
                      </div>
                      {dayData.snapshot.category && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">업종:</span>
                          <span className="ml-2 text-gray-900">{dayData.snapshot.category}</span>
                        </div>
                      )}
                      {dayData.snapshot.phone && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">전화:</span>
                          <span className="ml-2 text-gray-900">{dayData.snapshot.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      {dayData.snapshot.address && (
                        <div className="mb-2 flex items-start">
                          <MapPin className="w-4 h-4 mr-1 mt-0.5 text-gray-700 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-gray-700">주소:</span>
                            <span className="ml-2 text-gray-900">{dayData.snapshot.address}</span>
                          </div>
                        </div>
                      )}
                      {dayData.snapshot.directions && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">찾아오는길:</span>
                          <span className="ml-2 text-gray-900">{dayData.snapshot.directions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {dayData.snapshot.introduction && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="font-medium text-gray-700">소개글:</span>
                      <p className="mt-1 text-gray-900 text-sm leading-relaxed">
                        {dayData.snapshot.introduction}
                      </p>
                    </div>
                  )}
                  
                  {dayData.snapshot.representativeKeywords && dayData.snapshot.representativeKeywords.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center mb-2">
                        <Tag className="w-4 h-4 mr-1 text-gray-700" />
                        <span className="font-medium text-gray-700">대표 키워드:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dayData.snapshot.representativeKeywords.map((keyword: string, idx: number) => (
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
          </div>
        ))}
        
        {monthlyData.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">아직 추적된 데이터가 없습니다.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}