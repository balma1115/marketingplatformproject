'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/navigation/Header'
import { ChevronDown, Info, Search, Plus, X } from 'lucide-react'
import axiosClient from '@/lib/axios-client'

interface Place {
  id: string
  placeId: string
  placeName: string
  address?: string
  phoneNumber?: string
}

interface Campaign {
  nccCampaignId: string
  name: string
  campaignTp: string
  status: string
  dailyBudget: number
}

interface KeywordSuggestion {
  keyword: string
  monthlySearchVolume?: number
  competition?: string
}

type AdGroupType = 'PLACE_SEARCH' | 'LOCAL_BUSINESS'

export default function CreateAdGroupPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params?.campaignId as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [adGroupType, setAdGroupType] = useState<AdGroupType | null>(null)
  const [adGroupName, setAdGroupName] = useState('')
  const [dailyBudget, setDailyBudget] = useState('3000')
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([])
  const [naverPlaces, setNaverPlaces] = useState<Place[]>([])
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [searchPlaceQuery, setSearchPlaceQuery] = useState('')
  const [placeTab, setPlaceTab] = useState<'naver' | 'custom'>('naver')
  const [loadingNaverPlaces, setLoadingNaverPlaces] = useState(false)
  
  // 플레이스 검색 관련
  const [suggestedKeywords, setSuggestedKeywords] = useState<KeywordSuggestion[]>([])
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([])
  const [loadingKeywords, setLoadingKeywords] = useState(false)
  
  // 고급 옵션
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [baseBidAmount, setBaseBidAmount] = useState('50')
  const [avgCompetitorBid, setAvgCompetitorBid] = useState<number | null>(null)
  const [enabledMedia, setEnabledMedia] = useState({
    all: true,
    contentNetwork: false
  })
  const [contentNetworkBidAmount, setContentNetworkBidAmount] = useState('50')
  const [pcBidWeight, setPcBidWeight] = useState('100')
  const [mobileBidWeight, setMobileBidWeight] = useState('100')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCampaignData()
    fetchAvailablePlaces()
  }, [campaignId])

  const fetchCampaignData = async () => {
    try {
      const response = await axiosClient.get(`/api/ads/campaigns/${campaignId}`)
      setCampaign(response.data)
    } catch (error) {
      console.error('Failed to fetch campaign:', error)
      setError('캠페인 정보를 불러오는데 실패했습니다')
    }
  }

  const fetchAvailablePlaces = async () => {
    try {
      const response = await axiosClient.get('/api/ads/places')
      setAvailablePlaces(response.data)
    } catch (error) {
      console.error('Failed to fetch places:', error)
    }
  }

  const fetchNaverPlaces = async () => {
    setLoadingNaverPlaces(true)
    try {
      const response = await axiosClient.get('/api/ads/places/naver')
      console.log('Naver places response:', response.data)
      
      // Use 'places' field which contains all combined places
      if (response.data.places && response.data.places.length > 0) {
        setNaverPlaces(response.data.places)
        console.log('Set Naver places:', response.data.places)
      } else if (response.data.registered && response.data.registered.length > 0) {
        // Fallback to registered field if places is empty
        setNaverPlaces(response.data.registered)
        console.log('Set registered places:', response.data.registered)
      } else {
        console.log('No Naver places found in response')
        setNaverPlaces([])
      }
    } catch (error) {
      console.error('Failed to fetch Naver places:', error)
      setNaverPlaces([])
    } finally {
      setLoadingNaverPlaces(false)
    }
  }

  const fetchKeywordSuggestions = async () => {
    if (!selectedPlace) return
    
    setLoadingKeywords(true)
    try {
      const response = await axiosClient.post('/api/ads/keywords/suggestions', {
        placeName: selectedPlace.placeName,
        placeId: selectedPlace.placeId
      })
      setSuggestedKeywords(response.data.keywords || [])
      
      // 평균 입찰가 정보도 가져오기
      if (response.data.avgBidAmount) {
        setAvgCompetitorBid(response.data.avgBidAmount)
      }
    } catch (error) {
      console.error('Failed to fetch keyword suggestions:', error)
    } finally {
      setLoadingKeywords(false)
    }
  }

  useEffect(() => {
    if (selectedPlace && adGroupType === 'PLACE_SEARCH') {
      fetchKeywordSuggestions()
    }
  }, [selectedPlace, adGroupType])

  // Fetch Naver places when modal opens
  useEffect(() => {
    if (showPlaceModal && placeTab === 'naver' && naverPlaces.length === 0) {
      fetchNaverPlaces()
    }
  }, [showPlaceModal, placeTab])

  const handleExcludeKeyword = (keyword: string) => {
    setExcludedKeywords([...excludedKeywords, keyword])
    setSuggestedKeywords(suggestedKeywords.filter(k => k.keyword !== keyword))
  }

  const handleRemoveExcludedKeyword = (keyword: string) => {
    setExcludedKeywords(excludedKeywords.filter(k => k !== keyword))
  }

  // Filter places based on search query
  const filteredPlaces = availablePlaces.filter(place =>
    place.placeName.toLowerCase().includes(searchPlaceQuery.toLowerCase())
  )

  const filteredNaverPlaces = naverPlaces.filter(place =>
    place.placeName.toLowerCase().includes(searchPlaceQuery.toLowerCase())
  )

  const handleCreateAdGroup = async () => {
    if (!adGroupName || !selectedPlace || !adGroupType) {
      setError('필수 입력 항목을 모두 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const requestData = {
        campaignId,
        adGroupName,
        adGroupType,
        placeId: selectedPlace.placeId,
        placeName: selectedPlace.placeName,
        businessChannelId: selectedPlace.id, // 네이버 비즈니스 채널 ID
        dailyBudget: parseInt(dailyBudget),
        baseBidAmount: parseInt(baseBidAmount),
        excludedKeywords,
        contentNetworkBidAmount: enabledMedia.contentNetwork ? parseInt(contentNetworkBidAmount) : null,
        pcBidWeight: parseInt(pcBidWeight),
        mobileBidWeight: parseInt(mobileBidWeight)
      }

      const response = await axiosClient.post('/api/ads/adgroups', requestData)
      
      if (response.data.success) {
        router.push(`/dashboard/ads/campaigns/${campaignId}`)
      }
    } catch (error: any) {
      console.error('Failed to create ad group:', error)
      setError(error.response?.data?.error || '광고그룹 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">새 광고그룹 생성</h1>
          {campaign && (
            <p className="mt-2 text-sm text-gray-600">
              캠페인: {campaign.name}
            </p>
          )}
        </div>

        {/* 기존 광고그룹 설정 불러오기 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p>광고 그룹은 광고의 운영과 효과 분석, 입찰을 진행하는 단위입니다.</p>
              <p>광고 그룹을 기준으로 누구에게(타겟팅) 무엇을 보여 줄 것인지(소재)를 확인한 다음 광고 그룹을 생성하세요.</p>
            </div>
          </div>
        </div>

        {/* 그룹 유형 선택 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">그룹 유형</h2>
          <p className="text-sm text-gray-600 mb-4">
            광고 그룹 유형을 선택하세요. 선택한 유형은 광고 그룹 생성 후 변경할 수 없습니다.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setAdGroupType('PLACE_SEARCH')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                adGroupType === 'PLACE_SEARCH' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium mb-2">플레이스검색</div>
              <div className="text-sm text-gray-600">
                스마트 플레이스를 가진 광고주가 네이버 통합검색 등의 검색면에 이용하여 업체를 클릭당 입찰가(CPC) 방식으로 광고하려 할 때 선택할 수 있는 유형입니다.
              </div>
            </button>
            <button
              onClick={() => setAdGroupType('LOCAL_BUSINESS')}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                adGroupType === 'LOCAL_BUSINESS' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium mb-2">지역소상공인광고</div>
              <div className="text-sm text-gray-600">
                스마트 플레이스를 가진 광고주가 네이버 콘텐츠 서비스 등의 지면을 이용하여 업체를 노출당 고정가(CPM) 방식으로 광고하려 할 때 선택할 수 있는 유형입니다.
              </div>
            </button>
          </div>
        </div>

        {/* 광고그룹 설정 */}
        {adGroupType && (
          <>
            {/* 광고그룹 이름 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                광고그룹 이름
              </label>
              <input
                type="text"
                value={adGroupName}
                onChange={(e) => setAdGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="예: 테스트플레이스 20250905_광고그룹#1"
                maxLength={30}
              />
              <p className="mt-1 text-xs text-gray-500">{adGroupName.length}/30</p>
            </div>

            {/* 업체 정보 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                업체 정보
                <Info className="inline-block w-4 h-4 ml-1 text-gray-400" />
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  {selectedPlace ? (
                    <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                      {selectedPlace.placeName}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPlaceModal(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-left hover:bg-gray-50"
                    >
                      업체를 선택하세요
                    </button>
                  )}
                </div>
                {selectedPlace && (
                  <button
                    onClick={() => setSelectedPlace(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    변경
                  </button>
                )}
              </div>
              {adGroupType === 'LOCAL_BUSINESS' && (
                <p className="mt-2 text-sm text-gray-500">
                  업체 정보 기준: 근처 최대 5개 동 단위 지역이 자동으로 추가됩니다.
                </p>
              )}
            </div>

            {/* 플레이스검색 - 예상 노출 키워드 */}
            {adGroupType === 'PLACE_SEARCH' && selectedPlace && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  선택업체 예상 노출 키워드
                  <Info className="inline-block w-4 h-4 ml-1 text-gray-400" />
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 mb-2">예상 노출 키워드</h4>
                    {loadingKeywords ? (
                      <div className="text-sm text-gray-500">키워드를 불러오는 중...</div>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {suggestedKeywords.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{item.keyword}</span>
                            <button
                              onClick={() => handleExcludeKeyword(item.keyword)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              노출제외
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 mb-2">선택된 노출 제외 키워드</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {excludedKeywords.map((keyword, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="text-sm">{keyword}</span>
                          <button
                            onClick={() => handleRemoveExcludedKeyword(keyword)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 하루예산 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                하루예산
                <Info className="inline-block w-4 h-4 ml-1 text-gray-400" />
              </label>
              <p className="text-sm text-gray-600 mb-3">
                하루 동안 이 광고그룹에서 지불할 의사가 있는 최대 비용을 설정합니다.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="3000"
                  step="100"
                />
                <span className="text-sm text-gray-600">원</span>
                <span className="text-xs text-gray-500 ml-2">
                  {adGroupType === 'PLACE_SEARCH' 
                    ? '10원에서 30,000원까지 입력 가능(10원 단위 입력)' 
                    : '50원에서 100,000원까지 입력 가능(10원 단위 입력)'}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">하루예산을 입력하세요.</p>
            </div>

            {/* 고급 옵션 */}
            {adGroupType === 'PLACE_SEARCH' && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="text-sm font-medium text-gray-700">고급 옵션</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
                </button>
                
                {showAdvancedOptions && (
                  <div className="mt-4 space-y-4">
                    {/* 기본 입찰가 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        기본 입찰가
                        <Info className="inline-block w-4 h-4 ml-1 text-gray-400" />
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={baseBidAmount}
                          onChange={(e) => setBaseBidAmount(e.target.value)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          min="50"
                          step="10"
                        />
                        <span className="text-sm text-gray-600">원</span>
                        <span className="text-xs text-gray-500 ml-2">
                          50원에서 5,000원까지 입력 가능(10원 단위 입력)
                        </span>
                      </div>
                      {avgCompetitorBid && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-600">
                            같은 지역 동종 업종 광고들의 평균 광고 노출 입찰가 참고하기
                          </p>
                          <p className="text-sm font-medium mt-1">
                            • 업종: {selectedPlace?.placeName}
                          </p>
                          <p className="text-sm font-medium">
                            • 지역: 경기도 화성 부시
                          </p>
                          <p className="text-sm font-medium">
                            • 평균 광고 노출 입찰가: {avgCompetitorBid}원
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 매체 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        매체
                        <Info className="inline-block w-4 h-4 ml-1 text-gray-400" />
                      </label>
                      <p className="text-sm text-gray-600 mb-3">
                        광고 노출할 매체를 선택하세요.
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={enabledMedia.all}
                            onChange={() => setEnabledMedia({ all: true, contentNetwork: false })}
                            className="mr-2"
                          />
                          <span className="text-sm">모든 매체</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={!enabledMedia.all}
                            onChange={() => setEnabledMedia({ all: false, contentNetwork: true })}
                            className="mr-2"
                          />
                          <span className="text-sm">노출 매체 유형 선택</span>
                        </label>
                      </div>
                    </div>

                    {/* 추천 및 콘텐츠 지면 전용 입찰가 */}
                    {enabledMedia.contentNetwork && (
                      <div>
                        <label className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={true}
                            readOnly
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            추천 및 콘텐츠 지면
                            <Info className="inline-block w-4 h-4 ml-1 text-gray-400" />
                          </span>
                        </label>
                        <p className="text-sm text-gray-600 mb-2">
                          추천 및 콘텐츠 지면 전용 입찰가를 설정하세요.
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">설정 완료</span>
                          <input
                            type="number"
                            value={contentNetworkBidAmount}
                            onChange={(e) => setContentNetworkBidAmount(e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            min="50"
                            step="10"
                          />
                          <span className="text-sm text-gray-600">원</span>
                          <span className="text-xs text-gray-500">
                            50원에서 5,000원까지 입력 가능(10원 단위 입력)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* PC/모바일 입찰가중치 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PC/모바일 입찰가중치
                        <Info className="inline-block w-4 h-4 ml-1 text-gray-400" />
                      </label>
                      <p className="text-sm text-gray-600 mb-3">
                        PC와 모바일 영역에 적용할 입찰가중치를 설정하세요.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm w-20">• PC 입찰가중치:</span>
                          <input
                            type="number"
                            value={pcBidWeight}
                            onChange={(e) => setPcBidWeight(e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            min="50"
                            max="200"
                          />
                          <span className="text-sm">%</span>
                          <span className="text-xs text-gray-500">기본 가중치 적용</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm w-20">• 모바일 입찰가중치:</span>
                          <input
                            type="number"
                            value={mobileBidWeight}
                            onChange={(e) => setMobileBidWeight(e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            min="50"
                            max="200"
                          />
                          <span className="text-sm">%</span>
                          <span className="text-xs text-gray-500">기본 가중치 적용</span>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                        <p className="text-xs text-yellow-800">
                          <Info className="inline-block w-3 h-3 mr-1" />
                          PC/모바일 입찰가중치는 기본 입찰가, 파워링크 캠페인과 파워콘텐츠 캠페인의 키워드 입찰가에 적용됩니다.
                          플레이스 캠페인의 콘텐츠 매체 전용 입찰가에는 적용되지 않습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleCreateAdGroup}
            disabled={loading || !adGroupType || !adGroupName || !selectedPlace}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '생성 중...' : '저장 후 닫기'}
          </button>
        </div>
      </div>

      {/* 플레이스 선택 모달 */}
      {showPlaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">업체 선택</h2>
                <button
                  onClick={() => setShowPlaceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* 탭 선택 */}
              <div className="mt-4 flex gap-2 mb-4">
                <button
                  onClick={() => setPlaceTab('naver')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    placeTab === 'naver' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  네이버 등록 업체
                </button>
                <button
                  onClick={() => setPlaceTab('custom')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    placeTab === 'custom' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  직접 등록 업체
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchPlaceQuery}
                  onChange={(e) => setSearchPlaceQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="업체명으로 검색"
                />
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {placeTab === 'naver' ? (
                // 네이버 등록 업체 탭
                loadingNaverPlaces ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">네이버 업체 정보를 불러오는 중...</p>
                  </div>
                ) : filteredNaverPlaces.length > 0 ? (
                  <div className="space-y-2">
                    {filteredNaverPlaces.map((place) => (
                      <button
                        key={place.id}
                        onClick={() => {
                          setSelectedPlace(place)
                          setShowPlaceModal(false)
                        }}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{place.placeName}</div>
                          {place.isRegistered && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              등록됨
                            </span>
                          )}
                          {place.status === 'PURCHASABLE' && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              구매 가능
                            </span>
                          )}
                        </div>
                        {place.address && (
                          <div className="text-sm text-gray-600 mt-1">{place.address}</div>
                        )}
                        {place.phoneNumber && (
                          <div className="text-sm text-gray-500 mt-1">{place.phoneNumber}</div>
                        )}
                        {place.category && (
                          <div className="text-xs text-gray-500 mt-1">카테고리: {place.category}</div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">등록된 네이버 업체가 없습니다.</p>
                    <button
                      onClick={() => window.open('https://manage.searchad.naver.com/customers/channels', '_blank')}
                      className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      네이버 광고 관리 시스템에서 업체 등록하기
                    </button>
                  </div>
                )
              ) : (
                // 직접 등록 업체 탭
                filteredPlaces.length > 0 ? (
                  <div className="space-y-2">
                    {filteredPlaces.map((place) => (
                      <button
                        key={place.id}
                        onClick={() => {
                          setSelectedPlace(place)
                          setShowPlaceModal(false)
                        }}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium">{place.placeName}</div>
                        {place.address && (
                          <div className="text-sm text-gray-600 mt-1">{place.address}</div>
                        )}
                        {place.phoneNumber && (
                          <div className="text-sm text-gray-500 mt-1">{place.phoneNumber}</div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">직접 등록한 업체가 없습니다.</p>
                    <button
                      onClick={() => router.push('/dashboard/ads/places/new')}
                      className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      새 업체 등록하기
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}