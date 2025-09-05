'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/navigation/Header'
import CampaignCreateModal from '@/components/ads/CampaignCreateModal'
import CampaignEditModal from '@/components/ads/CampaignEditModal'
import { fetchWithCache, fetchStatsWithCache, CacheKeys } from '@/lib/utils/cache-manager'
import cacheManager from '@/lib/utils/cache-manager'
import { 
  Calendar,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Power,
  Eye,
  MousePointer,
  Percent,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react'

interface CampaignStats {
  impCnt: number
  clkCnt: number
  salesAmt: number
  ctr: number
  cpc: number
  avgRnk: number
}

interface Campaign {
  nccCampaignId: string
  name: string
  campaignTp: string
  campaignTypeLabel: string
  status: string
  dailyBudget: number
  useDailyBudget: boolean
  deliveryMethod: string
  stats: CampaignStats
}

interface AdGroup {
  nccAdgroupId: string
  nccCampaignId: string
  name: string
  status: string
  bidAmt?: number
  dailyBudget?: number
  useDailyBudget?: boolean
  keywordCount: number
  keywords: any[]
  stats?: {
    impCnt: number
    clkCnt: number
    ctr: number
    cpc: number
    salesAmt: number
  }
}

interface AdCreative {
  nccAdId: string
  nccAdgroupId: string
  name?: string
  ad: {
    headline: string
    description: string
    pc?: {
      final: string
      display?: string
    }
    mobile?: {
      final: string
      display?: string
    }
  }
  status: string
  inspectStatus: string
  stats?: {
    impCnt: number
    clkCnt: number
    ctr: number
    cpc: number
    salesAmt: number
  }
}

interface DashboardData {
  campaigns: Campaign[]
  dateRange: {
    from: string | null
    to: string | null
  }
}

export default function AdsDashboard() {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [adGroups, setAdGroups] = useState<AdGroup[]>([])
  const [loadingAdGroups, setLoadingAdGroups] = useState(false)
  const [togglingCampaigns, setTogglingCampaigns] = useState<Set<string>>(new Set())
  const [selectedAdGroup, setSelectedAdGroup] = useState<AdGroup | null>(null)
  const [adCreatives, setAdCreatives] = useState<AdCreative[]>([])
  const [loadingAds, setLoadingAds] = useState(false)
  const [forceRefresh, setForceRefresh] = useState(false)
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set())
  const [deletingCampaigns, setDeletingCampaigns] = useState(false)
  
  // Date range state - default to last 7 days
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    checkAuthAndFetchData()
  }, [dateRange.from, dateRange.to])

  // 수동 새로고침 함수
  const handleRefresh = useCallback(() => {
    setForceRefresh(true)
    cacheManager.clear() // 전체 캐시 초기화
    checkAuthAndFetchData()
    setTimeout(() => setForceRefresh(false), 1000)
  }, [])

  const checkAuthAndFetchData = async () => {
    try {
      const authRes = await fetch('/api/auth/me')
      if (!authRes.ok) {
        router.push('/login')
        return
      }
      
      const userData = await authRes.json()
      
      if (userData.user.role !== 'academy' && userData.user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      // 캐시를 사용한 대시보드 데이터 가져오기
      const data = await fetchStatsWithCache(
        CacheKeys.campaigns(),
        dateRange.from,
        dateRange.to,
        async () => {
          const res = await fetch(`/api/ads/dashboard?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`)
          if (!res.ok) {
            const errorData = await res.json()
            throw new Error(errorData.error || 'Failed to fetch dashboard data')
          }
          return await res.json()
        },
        { forceRefresh }
      )
      
      if (data.requiresSetup) {
        setError('네이버 광고 API 설정이 필요합니다.')
        alert('네이버 광고 API 키를 먼저 설정해주세요. 마이페이지로 이동합니다.')
        router.push('/mypage?tab=api')
        return
      }
      
      if (data.error) {
        throw new Error(data.error || 'Failed to fetch dashboard data')
      }

      setCampaigns(data.data?.campaigns || [])
    } catch (err: any) {
      console.error('Error fetching dashboard:', err)
      setError(err.message || '광고 데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCampaign = async (campaignId: string, currentStatus: string) => {
    try {
      setTogglingCampaigns(prev => new Set(prev).add(campaignId))
      
      const res = await fetch(`/api/ads/campaigns/${campaignId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: currentStatus === 'PAUSED' })
      })
      
      if (!res.ok) throw new Error('Failed to toggle campaign')
      
      // 캠페인 캐시 무효화 후 새로고침
      cacheManager.invalidateCampaign(campaignId)
      await checkAuthAndFetchData()
    } catch (error) {
      console.error('Error toggling campaign:', error)
      alert('캠페인 상태 변경에 실패했습니다.')
    } finally {
      setTogglingCampaigns(prev => {
        const next = new Set(prev)
        next.delete(campaignId)
        return next
      })
    }
  }

  const loadAdGroups = async (campaignId: string) => {
    try {
      setLoadingAdGroups(true)
      setSelectedAdGroup(null)  // Clear selected ad group when loading new ones
      setAdCreatives([])  // Clear ads when loading new ad groups
      
      // 광고그룹 데이터 캐싱
      const data = await fetchStatsWithCache(
        CacheKeys.adGroups(campaignId),
        dateRange.from,
        dateRange.to,
        async () => {
          const res = await fetch(`/api/ads/campaigns/${campaignId}/adgroups?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`)
          if (!res.ok) throw new Error('Failed to fetch ad groups')
          return await res.json()
        },
        { forceRefresh }
      )
      
      console.log('Ad groups response:', data)
      setAdGroups(Array.isArray(data) ? data : (data.data || []))
    } catch (error) {
      console.error('Error fetching ad groups:', error)
      alert('광고그룹을 불러오는데 실패했습니다.')
    } finally {
      setLoadingAdGroups(false)
    }
  }

  const loadAdCreatives = async (adgroupId: string) => {
    try {
      setLoadingAds(true)
      const res = await fetch(`/api/ads/adgroups/${adgroupId}/ads?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`)
      
      if (!res.ok) throw new Error('Failed to fetch ads')
      
      const data = await res.json()
      console.log('Ads response:', data)
      setAdCreatives(Array.isArray(data) ? data : (data.data || []))
    } catch (error) {
      console.error('Error fetching ads:', error)
      alert('광고 소재를 불러오는데 실패했습니다.')
    } finally {
      setLoadingAds(false)
    }
  }

  const handleAdGroupClick = (adGroup: AdGroup) => {
    setSelectedAdGroup(adGroup)
    loadAdCreatives(adGroup.nccAdgroupId)
  }

  const handleCampaignClick = async (campaign: Campaign) => {
    if (selectedCampaign?.nccCampaignId === campaign.nccCampaignId) {
      // If clicking the same campaign, collapse it
      setSelectedCampaign(null)
      setAdGroups([])
    } else {
      // Load new campaign's ad groups
      setSelectedCampaign(campaign)
      await loadAdGroups(campaign.nccCampaignId)
    }
  }

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setShowEditModal(true)
  }

  const handleDeleteCampaigns = async () => {
    if (selectedCampaignIds.size === 0) {
      alert('삭제할 캠페인을 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedCampaignIds.size}개 캠페인을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    setDeletingCampaigns(true)
    try {
      const res = await fetch('/api/ads/campaigns/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignIds: Array.from(selectedCampaignIds) })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '캠페인 삭제에 실패했습니다.')
      }
      
      const result = await res.json()
      alert(result.message)
      
      // Clear selection and refresh
      setSelectedCampaignIds(new Set())
      cacheManager.clear()
      await checkAuthAndFetchData()
    } catch (error: any) {
      console.error('Error deleting campaigns:', error)
      alert(error.message || '캠페인 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingCampaigns(false)
    }
  }

  const toggleCampaignSelection = (campaignId: string) => {
    const newSelection = new Set(selectedCampaignIds)
    if (newSelection.has(campaignId)) {
      newSelection.delete(campaignId)
    } else {
      newSelection.add(campaignId)
    }
    setSelectedCampaignIds(newSelection)
  }

  const toggleAllCampaignSelection = () => {
    if (selectedCampaignIds.size === campaigns.length) {
      setSelectedCampaignIds(new Set())
    } else {
      setSelectedCampaignIds(new Set(campaigns.map(c => c.nccCampaignId)))
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ELIGIBLE':
      case 'ENABLED':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">운영중</span>
      case 'PAUSED':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">일시정지</span>
      case 'DELETED':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">삭제됨</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">광고 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={checkAuthAndFetchData} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header with back button */}
        {selectedCampaign && (
          <button
            onClick={() => {
              setSelectedCampaign(null)
              setAdGroups([])
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            캠페인 목록으로 돌아가기
          </button>
        )}

        {/* Page Title */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedCampaign ? `${selectedCampaign.name} - 광고그룹` : '네이버 광고 현황'}
            </h1>
            <p className="text-gray-600 mt-1">
              {selectedCampaign 
                ? '광고그룹과 키워드를 관리하고 성과를 확인하세요'
                : '캠페인별 성과를 한눈에 확인하고 관리하세요'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!selectedCampaign && (
              <>
                {selectedCampaignIds.size > 0 && (
                  <button
                    onClick={handleDeleteCampaigns}
                    disabled={deletingCampaigns}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300"
                  >
                    <Trash2 size={16} />
                    {deletingCampaigns ? '삭제 중...' : `${selectedCampaignIds.size}개 삭제`}
                  </button>
                )}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Plus size={16} />
                  캠페인 생성
                </button>
              </>
            )}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
              disabled={forceRefresh}
            >
              <RefreshCw size={16} className={forceRefresh ? 'animate-spin' : ''} />
              {forceRefresh ? '새로고침 중...' : '새로고침'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        {!selectedCampaign ? (
          <>
            {/* Date Range Filter */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex items-center gap-4">
                <Calendar size={20} className="text-gray-600" />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="px-3 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">~</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="px-3 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const today = new Date()
                    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                    setDateRange({
                      from: lastWeek.toISOString().split('T')[0],
                      to: today.toISOString().split('T')[0]
                    })
                  }}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  최근 7일
                </button>
                <button
                  onClick={() => {
                    const today = new Date()
                    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                    setDateRange({
                      from: lastMonth.toISOString().split('T')[0],
                      to: today.toISOString().split('T')[0]
                    })
                  }}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  최근 30일
                </button>
              </div>
            </div>

            {/* Stats Notice */}
            {campaigns.every(c => c.stats?.impCnt === 0 && c.stats?.clkCnt === 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-amber-900">통계 데이터 안내</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      선택한 기간에 캠페인 실행 데이터가 없습니다. 
                      캠페인이 실행 중이면 다른 날짜 범위를 선택해보세요.
                      새로운 캠페인의 경우 실행 후 데이터가 표시됩니다.
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      네이버 광고 통계는 실시간으로 업데이트되지만, 1-2시간의 지연이 있을 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="w-12 py-3 px-4">
                        <input 
                          type="checkbox" 
                          className="rounded"
                          checked={selectedCampaignIds.size === campaigns.length && campaigns.length > 0}
                          onChange={toggleAllCampaignSelection}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">ON/OFF</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">상태</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">캠페인 이름</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">캠페인 유형</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">노출수</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">클릭수</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">클릭률</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">평균클릭비용</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">총비용</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">하루예산</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-8 text-gray-500">
                          캠페인이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((campaign) => (
                        <tr key={campaign.nccCampaignId} className="hover:bg-gray-50">
                          {/* Checkbox */}
                          <td className="py-3 px-4">
                            <input 
                              type="checkbox" 
                              className="rounded"
                              checked={selectedCampaignIds.has(campaign.nccCampaignId)}
                              onChange={() => toggleCampaignSelection(campaign.nccCampaignId)}
                            />
                          </td>
                          
                          {/* ON/OFF Toggle */}
                          <td className="py-3 px-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCampaign(campaign.nccCampaignId, campaign.status)
                              }}
                              disabled={togglingCampaigns.has(campaign.nccCampaignId)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                campaign.status === 'ELIGIBLE' || campaign.status === 'ENABLED'
                                  ? 'bg-blue-500' 
                                  : 'bg-gray-300'
                              } ${togglingCampaigns.has(campaign.nccCampaignId) ? 'opacity-50' : ''}`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  campaign.status === 'ELIGIBLE' || campaign.status === 'ENABLED'
                                    ? 'translate-x-6' 
                                    : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </td>
                          
                          {/* Status */}
                          <td className="py-3 px-4">
                            {getStatusBadge(campaign.status)}
                          </td>
                          
                          {/* Campaign Name - Clickable */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCampaignClick(campaign)}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                              >
                                {campaign.name}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditCampaign(campaign)
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                title="캠페인 수정"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          </td>
                          
                          {/* Campaign Type */}
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">
                              {campaign.campaignTypeLabel}
                            </span>
                          </td>
                          
                          {/* Impressions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Eye size={14} className="text-gray-400" />
                              <span>{formatNumber(campaign.stats?.impCnt || 0)}</span>
                            </div>
                          </td>
                          
                          {/* Clicks */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <MousePointer size={14} className="text-gray-400" />
                              <span>{formatNumber(campaign.stats?.clkCnt || 0)}</span>
                            </div>
                          </td>
                          
                          {/* CTR */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Percent size={14} className="text-gray-400" />
                              <span>{(campaign.stats?.ctr || 0).toFixed(2)}%</span>
                            </div>
                          </td>
                          
                          {/* Average CPC */}
                          <td className="py-3 px-4 text-right">
                            <span>₩{Math.round(campaign.stats?.cpc || 0).toLocaleString()}</span>
                          </td>
                          
                          {/* Total Cost */}
                          <td className="py-3 px-4 text-right font-medium">
                            <span className="text-blue-600">
                              ₩{Math.round(campaign.stats?.salesAmt || 0).toLocaleString()}
                            </span>
                          </td>
                          
                          {/* Daily Budget */}
                          <td className="py-3 px-4 text-right">
                            <span>₩{campaign.dailyBudget?.toLocaleString() || '0'}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 통계 섹션 - 캠페인 목록일 때만 표시 */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">📊 통계</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* 노출수 합계 */}
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">총 노출수</p>
                  <p className="text-xl font-bold text-blue-600">
                    {campaigns.reduce((sum, c) => sum + (c.stats?.impCnt || 0), 0).toLocaleString()}
                  </p>
                </div>
                
                {/* 클릭수 합계 */}
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">총 클릭수</p>
                  <p className="text-xl font-bold text-green-600">
                    {campaigns.reduce((sum, c) => sum + (c.stats?.clkCnt || 0), 0).toLocaleString()}
                  </p>
                </div>
                
                {/* 총비용 합계 */}
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">총 비용</p>
                  <p className="text-xl font-bold text-red-600">
                    ₩{campaigns.reduce((sum, c) => sum + (c.stats?.salesAmt || 0), 0).toLocaleString()}
                  </p>
                </div>
                
                {/* 일일예산 합계 */}
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">일일예산 합계</p>
                  <p className="text-xl font-bold text-purple-600">
                    ₩{campaigns.reduce((sum, c) => sum + (c.dailyBudget || 0), 0).toLocaleString()}
                  </p>
                </div>
                
                {/* 평균 클릭률 (재계산) */}
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">평균 클릭률</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {(() => {
                      const totalImpressions = campaigns.reduce((sum, c) => sum + (c.stats?.impCnt || 0), 0);
                      const totalClicks = campaigns.reduce((sum, c) => sum + (c.stats?.clkCnt || 0), 0);
                      return totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
                    })()}%
                  </p>
                </div>
                
                {/* 평균 클릭비용 (재계산) */}
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">평균 클릭비용</p>
                  <p className="text-xl font-bold text-indigo-600">
                    ₩{(() => {
                      const totalCost = campaigns.reduce((sum, c) => sum + (c.stats?.salesAmt || 0), 0);
                      const totalClicks = campaigns.reduce((sum, c) => sum + (c.stats?.clkCnt || 0), 0);
                      return totalClicks > 0 ? Math.round(totalCost / totalClicks).toLocaleString() : '0';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Ad Groups View */
          <>
            {/* Date Range Filter for Ad Groups */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex items-center gap-4">
                <Calendar size={20} className="text-gray-600" />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="px-3 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">~</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="px-3 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const today = new Date()
                    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                    setDateRange({
                      from: lastWeek.toISOString().split('T')[0],
                      to: today.toISOString().split('T')[0]
                    })
                  }}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  최근 7일
                </button>
                <button
                  onClick={() => {
                    const today = new Date()
                    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                    setDateRange({
                      from: lastMonth.toISOString().split('T')[0],
                      to: today.toISOString().split('T')[0]
                    })
                  }}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  최근 30일
                </button>
              </div>
            </div>

            {/* 광고그룹 추가 버튼 */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">광고그룹 목록</h2>
              <button
                onClick={() => {
                  // TODO: 광고그룹 추가 모달 또는 페이지로 이동
                  alert('광고그룹 추가 기능은 준비 중입니다.')
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} />
                광고그룹 추가
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow">
              {loadingAdGroups ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">광고그룹을 불러오는 중...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="w-12 py-3 px-4">
                          <input type="checkbox" className="rounded" onChange={() => {}} />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">ON/OFF</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">상태</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">광고그룹 이름</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">노출수</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">클릭수</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">클릭률(%)</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">평균클릭비용(VAT포함,원)</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">총비용(VAT포함,원)</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">하루예산</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {adGroups.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-8 text-gray-500">
                            광고그룹이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        adGroups.map((adGroup) => (
                          <tr key={adGroup.nccAdgroupId} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <input type="checkbox" className="rounded" onChange={() => {}} />
                            </td>
                            <td className="py-3 px-4">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer"
                                  checked={adGroup.status === 'ELIGIBLE' || adGroup.status === 'ENABLED'}
                                  onChange={() => {
                                    // TODO: Toggle ad group status
                                    console.log('Toggle ad group:', adGroup.nccAdgroupId)
                                  }}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(adGroup.status)}</td>
                            <td className="py-3 px-4">
                              <button 
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                                onClick={() => router.push(`/dashboard/ads/adgroups/${adGroup.nccAdgroupId}?campaignId=${selectedCampaign.nccCampaignId}&campaignType=${selectedCampaign.campaignTp}`)}
                              >
                                {adGroup.name}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {adGroup.stats?.impCnt?.toLocaleString() || '0'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {adGroup.stats?.clkCnt?.toLocaleString() || '0'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {(adGroup.stats?.ctr || 0).toFixed(2)}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              ₩{Math.round(adGroup.stats?.cpc || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center font-medium text-blue-600">
                              ₩{Math.round(adGroup.stats?.salesAmt || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {adGroup.dailyBudget 
                                ? `₩${adGroup.dailyBudget.toLocaleString()}` 
                                : '무제한'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Ad Creatives Section */}
            {selectedAdGroup && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    광고 소재 - {selectedAdGroup.name}
                  </h2>
                  <button
                    onClick={() => {
                      alert('광고 소재 추가 기능은 준비 중입니다.')
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    소재 추가
                  </button>
                </div>
                
                <div className="bg-white rounded-lg shadow">
                  {loadingAds ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">광고 소재를 불러오는 중...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="w-12 py-3 px-4">
                              <input type="checkbox" className="rounded" onChange={() => {}} />
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">ON/OFF</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">상태</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">소재 제목</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">설명</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-700">노출수</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-700">클릭수</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-700">클릭률(%)</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-700">평균클릭비용(원)</th>
                            <th className="text-center py-3 px-4 font-medium text-gray-700">총비용(원)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {adCreatives.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="text-center py-8 text-gray-500">
                                광고 소재가 없습니다.
                              </td>
                            </tr>
                          ) : (
                            adCreatives.map((ad) => (
                              <tr key={ad.nccAdId} className="hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <input type="checkbox" className="rounded" onChange={() => {}} />
                                </td>
                                <td className="py-3 px-4">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer"
                                      checked={ad.status === 'ELIGIBLE' || ad.status === 'ENABLED'}
                                      onChange={() => {
                                        console.log('Toggle ad:', ad.nccAdId)
                                      }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                  </label>
                                </td>
                                <td className="py-3 px-4">{getStatusBadge(ad.status)}</td>
                                <td className="py-3 px-4">
                                  <div className="font-medium text-gray-900">
                                    {ad.ad?.headline || '제목 없음'}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-sm text-gray-600 truncate max-w-xs" title={ad.ad?.description}>
                                    {ad.ad?.description || '설명 없음'}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {ad.stats?.impCnt?.toLocaleString() || '0'}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {ad.stats?.clkCnt?.toLocaleString() || '0'}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {(ad.stats?.ctr || 0).toFixed(2)}%
                                </td>
                                <td className="py-3 px-4 text-center">
                                  ₩{Math.round(ad.stats?.cpc || 0).toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  ₩{Math.round(ad.stats?.salesAmt || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Campaign Create Modal */}
      <CampaignCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          handleRefresh() // Refresh the campaign list after creation
        }}
      />
      
      {/* Campaign Edit Modal */}
      <CampaignEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingCampaign(null)
        }}
        onSuccess={() => {
          setShowEditModal(false)
          setEditingCampaign(null)
          handleRefresh() // Refresh the campaign list after edit
        }}
        campaign={editingCampaign}
      />
    </div>
  )
}