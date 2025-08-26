'use client'

import { useAuth } from '@/contexts/AuthContext'
import { mockDashboardData } from '@/lib/mockData'
import Header from '@/components/layout/Header'
import { 
  Users, 
  TrendingUp, 
  FileText, 
  Star,
  MousePointer,
  Instagram,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Eye
} from 'lucide-react'

export default function AcademyDashboard() {
  const { user } = useAuth()
  const data = mockDashboardData.academy

  const stats = [
    {
      label: '전체 학생',
      value: data.totalStudents.toLocaleString(),
      change: `+${data.newStudents}`,
      subtext: '신규 등록',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: '블로그 순위',
      value: `${data.blogRanking}위`,
      change: '+0.8',
      subtext: '평균 순위',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: '스마트플레이스',
      value: `${data.smartplaceScore}점`,
      change: '+0.2',
      subtext: '평점',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: '인스타그램',
      value: data.instagramStats.followers.toLocaleString(),
      change: '+52',
      subtext: '팔로워',
      icon: Instagram,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    }
  ]

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">학원 대시보드</h1>
          <p className="text-gray-600 mt-1">{user?.academyName} 마케팅 현황</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={stat.color} size={24} />
                </div>
                <span className="text-sm font-medium text-green-600">
                  <ArrowUp size={14} className="inline mr-1" />
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ad Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">광고 성과</h2>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1">
              <option>최근 7일</option>
              <option>최근 30일</option>
              <option>최근 90일</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Eye className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {(data.adPerformance.impressions / 1000).toFixed(1)}K
              </p>
              <p className="text-xs text-gray-600 mt-1">노출수</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <MousePointer className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {data.adPerformance.clicks.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-1">클릭수</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {data.adPerformance.ctr}%
              </p>
              <p className="text-xs text-gray-600 mt-1">CTR</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                ₩{data.adPerformance.cpc}
              </p>
              <p className="text-xs text-gray-600 mt-1">CPC</p>
            </div>
          </div>

          {/* Blog Posts Performance */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">최근 블로그 성과</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">초등영어 학습법 총정리</p>
                  <p className="text-xs text-gray-500 mt-1">2일 전 발행</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">3.5위</p>
                  <p className="text-xs text-gray-500">평균 순위</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">겨울방학 특강 안내</p>
                  <p className="text-xs text-gray-500 mt-1">5일 전 발행</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-600">2.8위</p>
                  <p className="text-xs text-gray-500">평균 순위</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">우리 학원 합격 수기</p>
                  <p className="text-xs text-gray-500 mt-1">1주일 전 발행</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-purple-600">4.2위</p>
                  <p className="text-xs text-gray-500">평균 순위</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instagram & Quick Actions */}
        <div className="space-y-6">
          {/* Instagram Stats */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">인스타그램 성과</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">참여율</span>
                  <span className="text-sm font-medium">{data.instagramStats.engagement}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-pink-500 h-2 rounded-full"
                    style={{ width: `${data.instagramStats.engagement * 10}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-gray-900">
                    {(data.instagramStats.reach / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-gray-600 mt-1">도달</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-gray-900">
                    {data.instagramStats.followers.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">팔로워</p>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Limits */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">사용량</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-600">블로그 포스트</span>
                  <span className="text-xs font-medium">12/50</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: '24%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-600">키워드 분석</span>
                  <span className="text-xs font-medium">35/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: '35%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-600">썸네일 생성</span>
                  <span className="text-xs font-medium">8/30</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: '27%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">빠른 작업</h2>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                블로그 포스트 작성
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                인스타그램 콘텐츠 생성
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                키워드 분석
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                광고 캠페인 관리
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}