'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axiosClient from '@/lib/axios-client'
import Header from '@/components/navigation/Header'
import CampaignEditModal from '@/components/ads/CampaignEditModal'
import WarningModal from '@/components/ui/WarningModal'
import { Plus, ChevronLeft, Play, Pause, Edit2, Trash2, Eye, TrendingUp, MousePointer, DollarSign, Calendar, AlertCircle } from 'lucide-react'

interface PageProps {
  params: Promise<{ campaignId: string }>
}

interface Campaign {
  nccCampaignId: string
  name: string
  campaignTp: string
  status: string
  dailyBudget: number
  useDailyBudget: boolean
  totalChargeCost: number
  expectCost: number
  regTm: string
  editTm: string
}

interface AdGroup {
  nccAdgroupId: string
  name: string
  status: string
  bidAmt: number
  dailyBudget: number
  pcChannelKey?: string
  mobileChannelKey?: string
  expectCost: number
  stats?: {
    impCnt: number
    clkCnt: number
    salesAmt: number
    ctr: number
    cpc: number
  }
}

export default function CampaignDetailPage({ params }: PageProps) {
  const { campaignId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get date range from query params or use default
  const getInitialDateRange = () => {
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    
    if (dateFrom && dateTo) {
      return { from: dateFrom, to: dateTo }
    }
    
    // Default to last 7 days
    return {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    }
  }
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [adGroups, setAdGroups] = useState<AdGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(getInitialDateRange())
  const [showEditModal, setShowEditModal] = useState(false)
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean
    message: string
  }>({ isOpen: false, message: '' })
  
  // Available data range (90 days: 2025-06-11 ~ 2025-09-08)
  const availableDateRange = {
    min: '2025-06-11',
    max: '2025-09-08'
  }

  useEffect(() => {
    fetchCampaignData()
  }, [campaignId, dateRange])
  
  // Date change handler with validation
  const handleDateChange = (type: 'from' | 'to', value: string) => {
    const fromDate = type === 'from' ? new Date(value) : new Date(dateRange.from)
    const toDate = type === 'to' ? new Date(value) : new Date(dateRange.to)
    
    // Check database date range
    if (value < availableDateRange.min || value > availableDateRange.max) {
      setWarningModal({
        isOpen: true,
        message: `선택 가능한 날짜 범위는 ${availableDateRange.min} ~ ${availableDateRange.max} 입니다.\n현재 데이터베이스에는 약 90일간의 데이터가 존재합니다.`
      })
      return
    }
    
    // Check if start date is after end date
    if (fromDate > toDate) {
      setWarningModal({
        isOpen: true,
        message: '시작 날짜는 종료 날짜보다 이전이어야 합니다.'
      })
      return
    }
    
    // Check if date range exceeds 90 days
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 90) {
      setWarningModal({
        isOpen: true,
        message: '날짜 범위는 최대 90일까지만 선택 가능합니다.'
      })
      return
    }
    
    // Update date range if valid
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }))
  }

  const fetchCampaignData = async () => {
    try {
      setLoading(true)
      
      console.log('Fetching data with date range:', dateRange.from, 'to', dateRange.to)
      
      // Clear existing ad groups data before fetching new data
      setAdGroups([])
      
      // Fetch campaign details
      const campaignRes = await axiosClient.get(`/api/ads/campaigns/${campaignId}`)
      setCampaign(campaignRes.data)
      
      // Fetch ad groups with stats - add cache buster to force fresh data
      const adGroupsRes = await axiosClient.get(`/api/ads/campaigns/${campaignId}/adgroups`, {
        params: {
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
          _t: Date.now() // Cache buster to ensure fresh data
        }
      })
      console.log('Ad groups response:', adGroupsRes.data)
      console.log('First ad group stats:', adGroupsRes.data[0]?.stats)
      
      // Force state update with new data
      setAdGroups(prev => {
        console.log('Previous ad groups stats:', prev[0]?.stats)
        console.log('New ad groups stats:', adGroupsRes.data[0]?.stats)
        return [...adGroupsRes.data]
      })
    } catch (error) {
      console.error('Failed to fetch campaign data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCampaignStatus = async () => {
    try {
      const newStatus = campaign?.status === 'ELIGIBLE' ? 'PAUSED' : 'ELIGIBLE'
      await axiosClient.put(`/api/ads/campaigns`, {
        campaignId: campaign?.nccCampaignId,
        userLock: newStatus === 'PAUSED'
      })
      await fetchCampaignData()
    } catch (error) {
      console.error('Failed to toggle campaign status:', error)
    }
  }

  const toggleAdGroupStatus = async (adGroupId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ELIGIBLE' ? 'PAUSED' : 'ELIGIBLE'
      await axiosClient.put(`/api/ads/adgroups`, {
        adGroupId,
        userLock: newStatus === 'PAUSED'
      })
      await fetchCampaignData()
    } catch (error) {
      console.error('Failed to toggle ad group status:', error)
    }
  }

  const deleteAdGroup = async (adGroupId: string) => {
    if (!confirm('정말로 이 광고그룹을 삭제하시겠습니까?')) return
    
    try {
      await axiosClient.delete(`/api/ads/adgroups?adGroupId=${adGroupId}`)
      await fetchCampaignData()
    } catch (error) {
      console.error('Failed to delete ad group:', error)
    }
  }

  const getCampaignTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'WEB_SITE': '파워링크',
      'POWER_CONTENTS': '파워콘텐츠',
      'PLACE': '플레이스',
      'SHOPPING': '쇼핑검색',
      'BRAND_SEARCH': '브랜드검색'
    }
    return types[type] || type
  }

  const getStatusBadge = (status: string) => {
    return status === 'ELIGIBLE' ? (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
        <Play className="w-3 h-3 mr-1" />
        운영중
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
        <Pause className="w-3 h-3 mr-1" />
        일시정지
      </span>
    )
  }

  const calculateTotals = () => {
    return adGroups.reduce((acc, group) => ({
      impressions: acc.impressions + (group.stats?.impCnt || 0),
      clicks: acc.clicks + (group.stats?.clkCnt || 0),
      cost: acc.cost + (group.stats?.salesAmt || 0),
      budget: acc.budget + group.dailyBudget
    }), { impressions: 0, clicks: 0, cost: 0, budget: 0 })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="p-6 max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const totals = calculateTotals()
  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100).toFixed(2) : '0.00'
  const avgCpc = totals.clicks > 0 ? Math.round(totals.cost / totals.clicks) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/ads')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            캠페인 목록으로
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{campaign?.name}</h1>
                {getStatusBadge(campaign?.status || '')}
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  {getCampaignTypeLabel(campaign?.campaignTp || '')}
                </span>
              </div>
              <p className="text-gray-600 mt-1">캠페인 ID: {campaignId}</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={toggleCampaignStatus}
                className={`px-4 py-2 rounded flex items-center gap-2 ${
                  campaign?.status === 'ELIGIBLE'
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {campaign?.status === 'ELIGIBLE' ? (
                  <>
                    <Pause className="w-4 h-4" />
                    일시정지
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    운영 재개
                  </>
                )}
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                캠페인 수정
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            
            {/* Quick select buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const today = new Date()
                  const yesterday = new Date(today)
                  yesterday.setDate(yesterday.getDate() - 1)
                  setDateRange({
                    from: yesterday.toISOString().split('T')[0],
                    to: yesterday.toISOString().split('T')[0]
                  })
                }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                어제
              </button>
              <button
                onClick={() => {
                  const today = new Date()
                  const weekAgo = new Date(today)
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  setDateRange({
                    from: weekAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0]
                  })
                }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                7일
              </button>
              <button
                onClick={() => {
                  const today = new Date()
                  const monthAgo = new Date(today)
                  monthAgo.setDate(monthAgo.getDate() - 30)
                  setDateRange({
                    from: monthAgo.toISOString().split('T')[0],
                    to: today.toISOString().split('T')[0]
                  })
                }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                30일
              </button>
            </div>
            
            <div className="border-l pl-4 flex items-center gap-2">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateChange('from', e.target.value)}
                min={availableDateRange.min}
                max={availableDateRange.max}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <span className="text-gray-500">~</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateChange('to', e.target.value)}
                min={availableDateRange.min}
                max={availableDateRange.max}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            {loading && (
              <div className="ml-auto">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          
          {/* Show current date range */}
          <div className="mt-2 text-sm text-gray-600">
            현재 조회 기간: {dateRange.from} ~ {dateRange.to}
          </div>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center text-gray-600 mb-2">
              <DollarSign className="w-5 h-5 mr-2" />
              <span className="text-sm">일일예산</span>
            </div>
            <p className="text-2xl font-bold">{campaign?.dailyBudget.toLocaleString()}원</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center text-gray-600 mb-2">
              <Eye className="w-5 h-5 mr-2" />
              <span className="text-sm">노출수</span>
            </div>
            <p className="text-2xl font-bold">{totals.impressions.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center text-gray-600 mb-2">
              <MousePointer className="w-5 h-5 mr-2" />
              <span className="text-sm">클릭수</span>
            </div>
            <p className="text-2xl font-bold">{totals.clicks.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center text-gray-600 mb-2">
              <TrendingUp className="w-5 h-5 mr-2" />
              <span className="text-sm">클릭률</span>
            </div>
            <p className="text-2xl font-bold">{avgCtr}%</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center text-gray-600 mb-2">
              <DollarSign className="w-5 h-5 mr-2" />
              <span className="text-sm">총비용</span>
            </div>
            <p className="text-2xl font-bold">{totals.cost.toLocaleString()}원</p>
          </div>
        </div>

        {/* Ad Groups */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">광고그룹 목록</h2>
            <button
              onClick={() => router.push(`/dashboard/ads/campaigns/${campaignId}/create-adgroup`)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              광고그룹 추가
            </button>
          </div>
          
          {adGroups.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">광고그룹이 없습니다</p>
              <button
                onClick={() => router.push(`/dashboard/ads/campaigns/${campaignId}/create-adgroup`)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                첫 광고그룹 만들기
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      광고그룹명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      입찰가
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      일일예산
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      노출수
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      클릭수
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      클릭률
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      비용
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {adGroups.map((group) => (
                    <tr key={`${group.nccAdgroupId}-${dateRange.from}-${dateRange.to}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/dashboard/ads/adgroups/${group.nccAdgroupId}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {group.name}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(group.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {group.bidAmt.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 text-right">
                        {group.dailyBudget.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(group.stats?.impCnt || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(group.stats?.clkCnt || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {group.stats?.ctr?.toFixed(2) || '0.00'}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(group.stats?.salesAmt || 0).toLocaleString()}원
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleAdGroupStatus(group.nccAdgroupId, group.status)}
                            className="text-gray-600 hover:text-gray-900"
                            title={group.status === 'ELIGIBLE' ? '일시정지' : '운영 재개'}
                          >
                            {group.status === 'ELIGIBLE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/ads/adgroups/${group.nccAdgroupId}/edit`)}
                            className="text-gray-600 hover:text-gray-900"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteAdGroup(group.nccAdgroupId)}
                            className="text-red-600 hover:text-red-800"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td className="px-6 py-3 font-semibold">합계</td>
                    <td className="px-6 py-3"></td>
                    <td className="px-6 py-3"></td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {totals.budget.toLocaleString()}원
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {totals.impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {totals.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {avgCtr}%
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">
                      {totals.cost.toLocaleString()}원
                    </td>
                    <td className="px-6 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Campaign Edit Modal */}
      {showEditModal && campaign && (
        <CampaignEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchCampaignData()
          }}
          campaign={campaign}
        />
      )}
      
      {/* Warning Modal */}
      <WarningModal
        isOpen={warningModal.isOpen}
        onClose={() => setWarningModal({ isOpen: false, message: '' })}
        message={warningModal.message}
      />
    </div>
  )
}