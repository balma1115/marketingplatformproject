'use client'

import { useAuth } from '@/contexts/AuthContext'
import { mockDashboardData } from '@/lib/mockData'
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity,
  AlertCircle,
  CheckCircle,
  Building,
  Server
} from 'lucide-react'

export default function AdminDashboard() {
  const { user } = useAuth()
  const data = mockDashboardData.admin

  const stats = [
    {
      label: '전체 사용자',
      value: data.totalUsers.toLocaleString(),
      change: '+12.5%',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: '활성 사용자',
      value: data.activeUsers.toLocaleString(),
      change: '+8.3%',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: '총 매출',
      value: `₩${(data.totalRevenue / 1000000).toFixed(0)}M`,
      change: `+${data.monthlyGrowth}%`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: '대행사 요청',
      value: data.agencyRequests.toLocaleString(),
      change: '대기 중',
      icon: Building,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const systemStatus = [
    { name: 'API 서버', status: data.systemHealth.apiStatus, icon: Server },
    { name: '데이터베이스', status: data.systemHealth.dbStatus, icon: Server },
    { name: '캐시 서버', status: data.systemHealth.cacheStatus, icon: Server }
  ]

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
        <p className="text-gray-600 mt-1">시스템 전체 현황을 확인하고 관리합니다</p>
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
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Usage */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">API 사용량</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">오늘</span>
                <span className="text-sm font-medium">{data.apiUsage.today.toLocaleString()} / {(data.apiUsage.limit / 30).toFixed(0).toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-accent-blue h-2 rounded-full"
                  style={{ width: `${(data.apiUsage.today / (data.apiUsage.limit / 30)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">이번 달</span>
                <span className="text-sm font-medium">{data.apiUsage.thisMonth.toLocaleString()} / {data.apiUsage.limit.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(data.apiUsage.thisMonth / data.apiUsage.limit) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">최근 활동</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">새 대행사 가입 요청</span>
                <span className="text-accent-blue font-medium">5분 전</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">API 사용량 80% 도달</span>
                <span className="text-orange-500 font-medium">1시간 전</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">시스템 백업 완료</span>
                <span className="text-green-500 font-medium">3시간 전</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">시스템 상태</h2>
          <div className="space-y-3">
            {systemStatus.map((system, index) => {
              const Icon = system.icon
              const isOperational = system.status === 'operational'
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon size={20} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{system.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isOperational ? (
                      <>
                        <CheckCircle size={16} className="text-green-500" />
                        <span className="text-xs text-green-600 font-medium">정상</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} className="text-red-500" />
                        <span className="text-xs text-red-600 font-medium">점검 중</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">빠른 작업</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                시스템 백업 실행
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                캐시 초기화
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                로그 확인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}