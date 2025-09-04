'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/navigation/Header'
import { ArrowLeft, TrendingUp, BarChart, Hash, ExternalLink } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { ko } from 'date-fns/locale'

interface BlogKeyword {
  id: string
  keyword: string
  isActive: boolean
  rank: number | null
  found: boolean
  url: string | null
  title: string | null
  totalResults: number
  lastChecked: string | null
  createdAt: string
}

interface UserInfo {
  id: string
  email: string
  name: string
  blog: {
    blogName: string
    blogUrl: string
  }
}

export default function AgencyBlogPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [keywords, setKeywords] = useState<BlogKeyword[]>([])
  const [loading, setLoading] = useState(false)

  // 사용자 정보 및 키워드 로드
  const fetchData = async () => {
    setLoading(true)
    try {
      // 사용자 정보 조회
      const userResponse = await fetch(`/api/admin/tracking/${userId}`)
      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch user info')
      }
      const userData = await userResponse.json()
      
      setUserInfo({
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.name,
        blog: userData.blog
      })

      // 키워드 목록 조회 (기존 API 활용)
      const keywordsResponse = await fetch(`/api/blog-keywords/list?userId=${userId}`)
      if (!keywordsResponse.ok) throw new Error('Failed to fetch keywords')
      const keywordsData = await keywordsResponse.json()
      
      setKeywords(keywordsData.keywords || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return formatInTimeZone(new Date(dateString), 'Asia/Seoul', 'MM/dd HH:mm', { locale: ko })
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="text-center py-12">로딩중...</div>
        </div>
      </div>
    )
  }

  // 활성 키워드만 필터링
  const activeKeywords = keywords.filter(k => k.isActive)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/agency/tracking')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {userInfo.blog.blogName}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {userInfo.name} ({userInfo.email})
              </p>
              <a
                href={userInfo.blog.blogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center"
              >
                {userInfo.blog.blogUrl}
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
            
            <div className="flex items-center space-x-2">
              <Hash className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                활성 키워드: {activeKeywords.length}개
              </span>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">전체 키워드</div>
            <div className="text-2xl font-bold text-gray-900">{keywords.length}개</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">상위 5위 이내</div>
            <div className="text-2xl font-bold text-green-600">
              {activeKeywords.filter(k => k.found && k.rank && k.rank <= 5).length}개
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">상위 10위 이내</div>
            <div className="text-2xl font-bold text-yellow-600">
              {activeKeywords.filter(k => k.found && k.rank && k.rank <= 10).length}개
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 mb-1">순위권 외</div>
            <div className="text-2xl font-bold text-gray-600">
              {activeKeywords.filter(k => !k.found).length}개
            </div>
          </div>
        </div>

        {/* 키워드 목록 (읽기 전용) */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-700">블로그 순위 현황</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">키워드</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">블로그 순위</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">검색된 포스트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">검색 결과</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">마지막 체크</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeKeywords.map((keyword) => (
                <tr key={keyword.id}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{keyword.keyword}</div>
                  </td>
                  <td className="px-4 py-3">
                    {keyword.found && keyword.rank ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        keyword.rank <= 5 ? 'bg-green-100 text-green-800' :
                        keyword.rank <= 10 ? 'bg-yellow-100 text-yellow-800' :
                        keyword.rank <= 20 ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {keyword.rank}위
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">순위권 외</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {keyword.title ? (
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 truncate max-w-xs" title={keyword.title}>
                          {keyword.title}
                        </div>
                        {keyword.url && (
                          <a
                            href={keyword.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center mt-1"
                          >
                            포스트 보기
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{keyword.totalResults}개</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{formatDate(keyword.lastChecked)}</span>
                  </td>
                </tr>
              ))}
              {activeKeywords.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    활성화된 키워드가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}