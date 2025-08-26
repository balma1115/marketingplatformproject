'use client'

import { useAuth } from '@/contexts/AuthContext'
import { mockDashboardData } from '@/lib/mockData'
import Header from '@/components/layout/Header'
import { 
  GraduationCap, 
  Users, 
  DollarSign, 
  TrendingUp,
  Award,
  BarChart3,
  ArrowUp
} from 'lucide-react'

export default function BranchDashboard() {
  const { user } = useAuth()
  const data = mockDashboardData.branch

  const stats = [
    {
      label: '관리 학원',
      value: data.managedAcademies.toLocaleString(),
      change: '+2',
      icon: GraduationCap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: '총 학생 수',
      value: data.totalStudents.toLocaleString(),
      change: '+35',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: '월 매출',
      value: `₩${(data.monthlyRevenue / 1000000).toFixed(0)}M`,
      change: '+12%',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: '성과 점수',
      value: `${data.performanceScore}점`,
      change: '+5',
      icon: Award,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">지사 대시보드</h1>
          <p className="text-gray-600 mt-1">{user?.academyName} 운영 현황</p>
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
                  <span className="text-sm font-medium text-green-600 flex items-center">
                    <ArrowUp size={14} className="mr-1" />
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Academies */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">우수 학원</h2>
            <button className="text-sm text-accent-blue hover:underline">전체보기</button>
          </div>

          <div className="space-y-4">
            {data.topAcademies.map((academy, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{academy.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">학생 {academy.students}명</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {index + 1}위
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-500">매출</span>
                      <span className="text-xs font-medium">₩{(academy.revenue / 1000000).toFixed(1)}M</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-accent-blue h-2 rounded-full"
                        style={{ width: `${(academy.revenue / data.monthlyRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Chart Placeholder */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">월별 성과 추이</h3>
            <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
              <BarChart3 size={32} className="text-gray-300" />
            </div>
          </div>
        </div>

        {/* Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Academy Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">학원 분포</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">영어학원</span>
                <span className="text-sm font-medium">3개</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">수학학원</span>
                <span className="text-sm font-medium">2개</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">국어학원</span>
                <span className="text-sm font-medium">2개</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">종합학원</span>
                <span className="text-sm font-medium">1개</span>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">최근 활동</h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">ABC영어학원 신규 캠페인 시작</p>
                  <p className="text-xs text-gray-500 mt-1">2시간 전</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">XYZ수학학원 블로그 최적화 완료</p>
                  <p className="text-xs text-gray-500 mt-1">5시간 전</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">월간 리포트 생성</p>
                  <p className="text-xs text-gray-500 mt-1">어제</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">빠른 작업</h2>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                학원 추가
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                성과 리포트
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                캠페인 관리
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}