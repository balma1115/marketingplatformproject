'use client'

import { useState, useEffect } from 'react'

interface ApiUsage {
  id: number
  userId: number
  serviceType: string
  costInNyang: number | null
  createdAt: string
  user: {
    email: string
    name: string
  }
}

export default function AdminApiPage() {
  const [apiUsages, setApiUsages] = useState<ApiUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    month: 0
  })

  useEffect(() => {
    fetchApiUsages()
  }, [])

  const fetchApiUsages = async () => {
    try {
      const response = await fetch('/api/admin/api-usage')
      if (response.ok) {
        const data = await response.json()
        setApiUsages(data.usages || [])

        // Calculate stats
        const now = new Date()
        const todayStart = new Date(now.setHours(0, 0, 0, 0))
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        let total = 0, today = 0, month = 0
        data.usages?.forEach((usage: ApiUsage) => {
          const usageDate = new Date(usage.createdAt)
          const cost = usage.costInNyang || 0
          total += cost
          if (usageDate >= todayStart) today += cost
          if (usageDate >= monthStart) month += cost
        })

        setStats({ total, today, month })
      }
    } catch (error) {
      console.error('Failed to fetch API usages:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API 사용 관리</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">오늘 사용량</div>
          <div className="text-2xl font-bold text-gray-900">{stats.today.toLocaleString()} 냥</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">이번 달 사용량</div>
          <div className="text-2xl font-bold text-gray-900">{stats.month.toLocaleString()} 냥</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">전체 사용량</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()} 냥</div>
        </div>
      </div>

      {/* Usage Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                사용자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                서비스
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                사용량
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                사용일시
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {apiUsages.slice(0, 100).map((usage) => (
              <tr key={usage.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{usage.user?.name}</div>
                  <div className="text-sm text-gray-500">{usage.user?.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {usage.serviceType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {usage.costInNyang || 0} 냥
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(usage.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {apiUsages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            API 사용 기록이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}