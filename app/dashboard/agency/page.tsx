'use client'

import { useAuth } from '@/contexts/AuthContext'
import { mockDashboardData } from '@/lib/mockData'
import { 
  Building, 
  GraduationCap, 
  Target, 
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

export default function AgencyDashboard() {
  const { user } = useAuth()
  const data = mockDashboardData.agency

  const stats = [
    {
      label: '관리 지사',
      value: data.managedBranches.toLocaleString(),
      change: '+2',
      trend: 'up',
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: '관리 학원',
      value: data.managedAcademies.toLocaleString(),
      change: '+5',
      trend: 'up',
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: '활성 캠페인',
      value: data.activeCampaigns.toLocaleString(),
      change: '-1',
      trend: 'down',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: '총 매출',
      value: `₩${(data.totalRevenue / 1000000).toFixed(0)}M`,
      change: '+15%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const recentClients = [
    { name: 'ABC영어학원', type: '학원', status: '활성', revenue: 3000000 },
    { name: '강남교육지사', type: '지사', status: '활성', revenue: 12000000 },
    { name: 'XYZ수학학원', type: '학원', status: '활성', revenue: 2500000 },
    { name: '서초학습센터', type: '학원', status: '신규', revenue: 0 },
    { name: '송파교육지사', type: '지사', status: '활성', revenue: 8000000 }
  ]

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">대행사 대시보드</h1>
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
                <div className="flex items-center space-x-1">
                  {stat.trend === 'up' ? (
                    <ArrowUp size={16} className="text-green-500" />
                  ) : (
                    <ArrowDown size={16} className="text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">월간 성과</h2>
            <button className="text-sm text-accent-blue hover:underline">상세보기</button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                ₩{(data.monthlyPerformance.revenue / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-gray-600 mt-1">이번 달 매출</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                +{data.monthlyPerformance.newClients}
              </p>
              <p className="text-sm text-gray-600 mt-1">신규 고객</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {data.monthlyPerformance.churnRate}%
              </p>
              <p className="text-sm text-gray-600 mt-1">이탈률</p>
            </div>
          </div>

          {/* Client List */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">최근 고객</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="pb-3">고객명</th>
                    <th className="pb-3">유형</th>
                    <th className="pb-3">상태</th>
                    <th className="pb-3 text-right">매출</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentClients.map((client, index) => (
                    <tr key={index} className="border-t border-gray-100">
                      <td className="py-3 font-medium text-gray-900">{client.name}</td>
                      <td className="py-3 text-gray-600">{client.type}</td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          client.status === '활성' ? 'bg-green-100 text-green-700' :
                          client.status === '신규' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-900">
                        ₩{(client.revenue / 1000000).toFixed(1)}M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions & Insights */}
        <div className="space-y-6">
          {/* Campaign Performance */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">캠페인 성과</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">블로그 캠페인</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }} />
                  </div>
                  <span className="text-xs text-gray-500">75%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">SNS 마케팅</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }} />
                  </div>
                  <span className="text-xs text-gray-500">60%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">검색 광고</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }} />
                  </div>
                  <span className="text-xs text-gray-500">85%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">빠른 작업</h2>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between">
                <span>새 캠페인 생성</span>
                <Target size={16} className="text-gray-400" />
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between">
                <span>리포트 생성</span>
                <BarChart3 size={16} className="text-gray-400" />
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between">
                <span>고객 추가</span>
                <Users size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}