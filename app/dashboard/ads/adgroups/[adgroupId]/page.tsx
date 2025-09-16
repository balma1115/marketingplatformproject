'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, Search, Calendar, ChevronDown, RefreshCw, Settings, Save, X } from 'lucide-react'
import Header from '@/components/navigation/Header'
import { fetchWithCache, fetchStatsWithCache, CacheKeys } from '@/lib/utils/cache-manager'
import cacheManager from '@/lib/utils/cache-manager'
import NegativeKeywordsTab from '@/components/ads/NegativeKeywordsTab'
import AdsTab from '@/components/ads/AdsTab'
import AdExtensionsTab from '@/components/ads/AdExtensionsTab'
import WarningModal from '@/components/ui/WarningModal'

interface Keyword {
  nccKeywordId: string
  keyword: string
  bidAmt: number
  effectiveBidAmt?: number
  groupBidAmt?: number
  useGroupBidAmt: boolean
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

interface AdGroup {
  nccAdgroupId: string
  nccCampaignId: string
  name: string
  bidAmt?: number
  dailyBudget?: number
  useDailyBudget?: boolean
  campaignTp?: string
  status: string
  stats?: {
    impCnt: number
    clkCnt: number
    ctr: number
    cpc: number
    salesAmt: number
  }
}

interface Ad {
  nccAdId: string
  name?: string
  ad: {
    headline: string
    description: string
  }
  status: string
  stats?: {
    impCnt: number
    clkCnt: number
    ctr: number
    cpc: number
    salesAmt: number
  }
}

export default function AdGroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const adgroupId = params?.adgroupId as string
  const campaignType = searchParams.get('campaignType') || 'WEB_SITE'

  const [activeTab, setActiveTab] = useState<'keywords' | 'negative' | 'ads' | 'extensions'>('keywords')
  const [loading, setLoading] = useState(true)
  const [forceRefresh, setForceRefresh] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  
  // 날짜 필터 - 최근 30일 기본값
  const [dateRange, setDateRange] = useState(() => {
    // 최근 30일로 설정 (2025-08-10 ~ 2025-09-08)
    return {
      from: '2025-08-10',
      to: '2025-09-08'
    }
  })

  const [adGroup, setAdGroup] = useState<AdGroup | null>(null)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [extendedSearchData, setExtendedSearchData] = useState<any>(null)
  
  // 경고 모달 상태
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean
    message: string
  }>({ isOpen: false, message: '' })
  
  // 데이터베이스에 존재하는 날짜 범위 (2025년 6월 11일 ~ 9월 8일)
  const availableDateRange = {
    min: '2025-06-11',
    max: '2025-09-08'
  }
  
  // 설정 모달
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    bidAmt: 0,
    dailyBudget: 0,
    useDailyBudget: true
  })
  const [savingSettings, setSavingSettings] = useState(false)

  const fetchAdGroupData = useCallback(async () => {
    try {
      setLoading(true)
      
      // 광고그룹 정보 가져오기
      const adGroupData = await fetchStatsWithCache(
        CacheKeys.adGroup(adgroupId),
        dateRange.from,
        dateRange.to,
        async () => {
          const res = await fetch(`/api/ads/adgroups/${adgroupId}?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`)
          if (!res.ok) throw new Error('Failed to fetch ad group')
          return await res.json()
        },
        { forceRefresh: forceRefresh > 0 }
      )
      
      setAdGroup(adGroupData)
      
      // 설정 폼 초기화
      if (adGroupData) {
        setSettingsForm({
          bidAmt: adGroupData.bidAmt || 400,
          dailyBudget: adGroupData.dailyBudget || 10000,
          useDailyBudget: adGroupData.useDailyBudget !== false
        })
      }
      
      // 광고그룹의 광고와 키워드 가져오기
      if (activeTab === 'keywords') {
        const keywordsData = await fetchStatsWithCache(
          CacheKeys.keywords(adgroupId),
          dateRange.from,
          dateRange.to,
          async () => {
            const res = await fetch(`/api/ads/adgroups/${adgroupId}/keywords?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`)
            if (!res.ok) throw new Error('Failed to fetch keywords')
            return await res.json()
          },
          { forceRefresh: forceRefresh > 0 }
        )
        
        // 디버그: 받은 키워드 데이터 확인
        console.log('Keywords data received in page:', keywordsData)
        if (keywordsData && keywordsData.length > 0) {
          console.log('First keyword in page:', {
            keyword: keywordsData[0].keyword,
            bidAmt: keywordsData[0].bidAmt,
            effectiveBidAmt: keywordsData[0].effectiveBidAmt,
            stats: keywordsData[0].stats
          })
        }
        
        setKeywords(keywordsData || [])
        
        // 확장검색 결과 데이터 가져오기
        try {
          const extRes = await fetch(`/api/ads/adgroups/${adgroupId}/extended-search?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`)
          if (extRes.ok) {
            const extData = await extRes.json()
            setExtendedSearchData(extData)
          }
        } catch (error) {
          console.error('Failed to fetch extended search data:', error)
        }
      } else {
        const adsData = await fetchStatsWithCache(
          CacheKeys.ads(adgroupId),
          dateRange.from,
          dateRange.to,
          async () => {
            const res = await fetch(`/api/ads/adgroups/${adgroupId}/ads?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`)
            if (!res.ok) throw new Error('Failed to fetch ads')
            return await res.json()
          },
          { forceRefresh: forceRefresh > 0 }
        )
        setAds(adsData || [])
      }
    } catch (error) {
      console.error('Error fetching ad group data:', error)
    } finally {
      setLoading(false)
    }
  }, [adgroupId, activeTab, dateRange.from, dateRange.to, forceRefresh])

  useEffect(() => {
    if (adgroupId) {
      fetchAdGroupData()
    }
  }, [adgroupId, fetchAdGroupData])

  const handleRefresh = () => {
    setForceRefresh(prev => prev + 1)
    cacheManager.clearByPrefix(CacheKeys.adGroup(adgroupId))
  }
  
  // 날짜 변경 핸들러
  const handleDateChange = (type: 'from' | 'to', value: string) => {
    const newDate = new Date(value)
    const fromDate = type === 'from' ? new Date(value) : new Date(dateRange.from)
    const toDate = type === 'to' ? new Date(value) : new Date(dateRange.to)
    
    // 데이터베이스 날짜 범위 확인
    if (value < availableDateRange.min || value > availableDateRange.max) {
      setWarningModal({
        isOpen: true,
        message: `선택 가능한 날짜 범위는 ${availableDateRange.min} ~ ${availableDateRange.max} 입니다.\n현재 데이터베이스에는 약 90일간의 데이터가 존재합니다.`
      })
      return
    }
    
    // 시작일이 종료일보다 뒤인지 확인
    if (fromDate > toDate) {
      setWarningModal({
        isOpen: true,
        message: '시작 날짜는 종료 날짜보다 이전이어야 합니다.'
      })
      return
    }
    
    // 날짜 범위가 90일을 초과하는지 확인
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 90) {
      setWarningModal({
        isOpen: true,
        message: '날짜 범위는 최대 90일까지만 선택 가능합니다.'
      })
      return
    }
    
    // 유효한 날짜면 업데이트
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }))
  }

  const handleToggleAll = () => {
    const items = activeTab === 'keywords' ? keywords : ads
    if (selectedItems.length === items.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(items.map(item => 
        'nccKeywordId' in item ? item.nccKeywordId : item.nccAdId
      ))
    }
  }

  const handleToggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleToggleKeyword = async (keywordId: string) => {
    try {
      const res = await fetch(`/api/ads/keywords/${keywordId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) throw new Error('Failed to toggle keyword')
      
      // 캐시 무효화 및 새로고침
      cacheManager.clearByPrefix(CacheKeys.keywords(adgroupId))
      setForceRefresh(prev => prev + 1)
    } catch (error) {
      console.error('Error toggling keyword:', error)
      alert('키워드 상태 변경에 실패했습니다.')
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true)
      
      const res = await fetch(`/api/ads/adgroups/${adgroupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bidAmt: settingsForm.bidAmt,
          dailyBudget: settingsForm.dailyBudget,
          useDailyBudget: settingsForm.useDailyBudget
        })
      })
      
      if (!res.ok) throw new Error('Failed to update ad group')
      
      // 캐시 무효화 및 새로고침
      cacheManager.clearByPrefix(CacheKeys.adGroup(adgroupId))
      setForceRefresh(prev => prev + 1)
      setShowSettingsModal(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('설정 저장에 실패했습니다.')
    } finally {
      setSavingSettings(false)
    }
  }

  const filteredKeywords = keywords.filter(keyword =>
    keyword.keyword?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAds = ads.filter(ad =>
    ad.ad?.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ad.ad?.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            캠페인으로 돌아가기
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{adGroup?.name || '광고그룹'}</h1>
              <p className="text-gray-600 mt-1">
                광고그룹 ID: {adgroupId}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                광고그룹 설정
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                새로고침
              </button>
            </div>
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-600 text-sm">기본 입찰가</p>
            <p className="text-2xl font-bold">{adGroup?.bidAmt?.toLocaleString() || 0}원</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-600 text-sm">일일 예산</p>
            <p className="text-2xl font-bold">{adGroup?.dailyBudget?.toLocaleString() || 0}원</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-600 text-sm">총 노출수</p>
            <p className="text-2xl font-bold">{adGroup?.stats?.impCnt?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-600 text-sm">총 클릭수</p>
            <p className="text-2xl font-bold">{adGroup?.stats?.clkCnt?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-600 text-sm">총 비용</p>
            <p className="text-2xl font-bold">{adGroup?.stats?.salesAmt?.toLocaleString() || 0}원</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('keywords')}
                className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'keywords'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                키워드
              </button>
              <button
                onClick={() => setActiveTab('negative')}
                className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'negative'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                제외 검색어
              </button>
              <button
                onClick={() => setActiveTab('ads')}
                className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'ads'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                소재
              </button>
              <button
                onClick={() => setActiveTab('extensions')}
                className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'extensions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                확장 소재
              </button>
            </div>
          </div>

          {/* 필터 바 */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={activeTab === 'keywords' ? '키워드 검색...' : '광고 검색...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* 날짜 필터 */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateRange.from}
                  min={availableDateRange.min}
                  max={availableDateRange.max}
                  onChange={(e) => handleDateChange('from', e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500">~</span>
                <input
                  type="date"
                  value={dateRange.to}
                  min={availableDateRange.min}
                  max={availableDateRange.max}
                  onChange={(e) => handleDateChange('to', e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedItems.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedItems.length}개 선택됨
                </span>
              )}
              {activeTab !== 'negative' && (
                <button 
                  onClick={() => {
                    if (activeTab === 'keywords') {
                      alert('키워드 추가 기능 준비중입니다')
                    } else {
                      alert('광고 추가 기능 준비중입니다')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  {activeTab === 'keywords' ? '키워드 추가' : '광고 추가'}
                </button>
              )}
            </div>
          </div>

          {/* 확장검색 결과 섹션 - 필터 바 바로 아래 */}
          {activeTab === 'keywords' && extendedSearchData && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-blue-900">📊 확장검색 결과</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    파워링크 캠페인에서 키워드 매칭 없이 노출된 결과입니다
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-700">
                    <span className="font-semibold">노출수:</span> {extendedSearchData?.impressions?.toLocaleString() || 0}
                    <span className="ml-4 font-semibold">클릭수:</span> {extendedSearchData?.clicks?.toLocaleString() || 0}
                    <span className="ml-4 font-semibold">비용:</span> {extendedSearchData?.cost?.toLocaleString() || 0}원
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    <span className="font-semibold">CTR:</span> {extendedSearchData?.ctr?.toFixed(2) || 0}%
                    <span className="ml-4 font-semibold">CPC:</span> {extendedSearchData?.cpc?.toFixed(0) || 0}원
                  </div>
                </div>
              </div>
              {extendedSearchData?.devices && (
                <div className="mt-2 text-sm text-blue-700">
                  <span className="font-semibold">디바이스별:</span>
                  <span className="ml-2">모바일 {extendedSearchData.devices.M || 0}회</span>
                  <span className="ml-2">PC {extendedSearchData.devices.P || 0}회</span>
                </div>
              )}
            </div>
          )}

          {/* 컨텐츠 */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">로딩중...</div>
            ) : activeTab === 'negative' ? (
              <NegativeKeywordsTab adgroupId={adgroupId} />
            ) : activeTab === 'ads' ? (
              <AdsTab adgroupId={adgroupId} campaignType={campaignType} />
            ) : activeTab === 'extensions' ? (
              <AdExtensionsTab adgroupId={adgroupId} campaignType={campaignType} />
            ) : activeTab === 'keywords' ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === keywords.length && keywords.length > 0}
                        onChange={handleToggleAll}
                      />
                    </th>
                    <th className="py-3 px-4 text-center">ON/OFF</th>
                    <th className="py-3 px-4 text-center">상태</th>
                    <th className="py-3 px-4 text-left">키워드</th>
                    <th className="py-3 px-4 text-right">현재 입찰가<br/><span className="text-xs text-gray-500">(VAT미포함)</span></th>
                    <th className="py-3 px-4 text-center">품질지수</th>
                    <th className="py-3 px-4 text-right">노출수</th>
                    <th className="py-3 px-4 text-right">클릭수</th>
                    <th className="py-3 px-4 text-right">클릭률(%)</th>
                    <th className="py-3 px-4 text-center">노출현황보기</th>
                    <th className="py-3 px-4 text-right">평균클릭비용<br/><span className="text-xs text-gray-500">(VAT포함,원)</span></th>
                    <th className="py-3 px-4 text-right">총비용<br/><span className="text-xs text-gray-500">(VAT포함,원)</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-gray-500">
                        등록된 키워드가 없습니다
                      </td>
                    </tr>
                  ) : (
                    filteredKeywords.map((keyword) => (
                      <tr key={keyword.nccKeywordId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(keyword.nccKeywordId)}
                            onChange={() => handleToggleItem(keyword.nccKeywordId)}
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleKeyword(keyword.nccKeywordId)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              keyword.status === 'ELIGIBLE' 
                                ? 'bg-blue-600' 
                                : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                keyword.status === 'ELIGIBLE' 
                                  ? 'translate-x-6' 
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            keyword.inspectStatus === 'APPROVED' 
                              ? 'bg-green-100 text-green-800'
                              : keyword.inspectStatus === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : keyword.inspectStatus === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {keyword.inspectStatus === 'APPROVED' ? '승인' :
                             keyword.inspectStatus === 'PENDING' ? '검토중' :
                             keyword.inspectStatus === 'REJECTED' ? '거부' : '대기'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{keyword.keyword}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div>
                            <div className="font-medium">
                              {(keyword.effectiveBidAmt || keyword.bidAmt || 0).toLocaleString()}원
                            </div>
                            {keyword.useGroupBidAmt && (
                              <div className="text-xs text-gray-500">그룹 입찰가 사용</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {keyword.qualityIndex ? (
                              [...Array(7)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-4 ${
                                    i < keyword.qualityIndex 
                                      ? keyword.qualityIndex >= 6 ? 'bg-green-500' 
                                        : keyword.qualityIndex >= 4 ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                      : 'bg-gray-200'
                                  }`}
                                />
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </div>
                          {keyword.qualityIndex && (
                            <div className="text-xs text-gray-500 mt-1">{keyword.qualityIndex}/7</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {keyword.stats?.impCnt?.toLocaleString() || '0'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {keyword.stats?.clkCnt?.toLocaleString() || '0'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(keyword.stats?.ctr || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            onClick={() => alert('노출현황 보기 기능은 준비중입니다')}
                          >
                            보기
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {keyword.stats?.cpc ? 
                            `${Math.round(keyword.stats.cpc * 1.1).toLocaleString()}` : '0'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {keyword.stats?.salesAmt ? 
                            `${Math.round(keyword.stats.salesAmt * 1.1).toLocaleString()}` : '0'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : null}
          </div>
        </div>
      </div>

      {/* 설정 모달 */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">광고그룹 설정</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  기본 입찰가
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={settingsForm.bidAmt}
                    onChange={(e) => setSettingsForm(prev => ({ 
                      ...prev, 
                      bidAmt: parseInt(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    원
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  키워드별 개별 입찰가를 설정하지 않은 경우 이 값이 적용됩니다
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  일일 예산
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={settingsForm.dailyBudget}
                    onChange={(e) => setSettingsForm(prev => ({ 
                      ...prev, 
                      dailyBudget: parseInt(e.target.value) || 0 
                    }))}
                    disabled={!settingsForm.useDailyBudget}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    원
                  </span>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useDailyBudget"
                  checked={settingsForm.useDailyBudget}
                  onChange={(e) => setSettingsForm(prev => ({ 
                    ...prev, 
                    useDailyBudget: e.target.checked 
                  }))}
                  className="mr-2"
                />
                <label htmlFor="useDailyBudget" className="text-sm text-gray-700">
                  일일 예산 사용
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingSettings ? '저장중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 경고 모달 */}
      <WarningModal
        isOpen={warningModal.isOpen}
        onClose={() => setWarningModal({ isOpen: false, message: '' })}
        title="날짜 범위 오류"
        message={warningModal.message}
      />
    </div>
  )
}