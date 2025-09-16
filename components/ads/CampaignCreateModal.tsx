'use client'

import { useState } from 'react'
import { X, Info, HelpCircle } from 'lucide-react'

interface CampaignCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const CAMPAIGN_TYPES = [
  {
    value: 'WEB_SITE',
    label: '파워링크',
    icon: '🔗',
    description: '검색 결과 상단에 웹사이트를 노출하여 방문자를 유도합니다',
    recommended: true
  },
  {
    value: 'SHOPPING',
    label: '쇼핑검색',
    icon: '🛍️',
    description: '쇼핑 검색 결과에 상품을 노출하여 구매를 유도합니다'
  },
  {
    value: 'POWER_CONTENTS',
    label: '파워컨텐츠',
    icon: '📱',
    description: '네이버 서비스 지면에 배너 형태로 광고를 노출합니다'
  },
  {
    value: 'PLACE',
    label: '플레이스',
    icon: '📍',
    description: '지역 검색 시 업체 정보를 상위에 노출합니다'
  },
  {
    value: 'BRAND_SEARCH',
    label: '브랜드검색',
    icon: '🏢',
    description: '브랜드 검색 시 공식 사이트를 최상단에 노출합니다'
  }
]

const BUDGET_PRESETS = [
  { value: 10000, label: '1만원' },
  { value: 30000, label: '3만원' },
  { value: 50000, label: '5만원' },
  { value: 100000, label: '10만원' },
  { value: 300000, label: '30만원' }
]

export default function CampaignCreateModal({ isOpen, onClose, onSuccess }: CampaignCreateModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    campaignTp: 'WEB_SITE',
    dailyBudget: 30000,
    useDailyBudget: true,
    deliveryMethod: 'STANDARD',
    trackingMode: 'TRACKING_DISABLED'
  })

  if (!isOpen) return null

  const handleSubmit = async () => {
    // 유효성 검사
    if (!formData.name.trim()) {
      setError('캠페인 이름을 입력해주세요')
      return
    }

    if (!formData.campaignTp) {
      setError('캠페인 유형을 선택해주세요')
      return
    }

    if (formData.useDailyBudget && formData.dailyBudget < 1000) {
      setError('일일 예산은 최소 1,000원 이상이어야 합니다')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/ads/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '캠페인 생성에 실패했습니다')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || '캠페인 생성 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">새 캠페인 만들기</h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 1 ? '캠페인 유형을 선택하세요' : '캠페인 정보를 입력하세요'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            <>
              {/* Step 1: 캠페인 유형 선택 */}
              <div className="space-y-3">
                {CAMPAIGN_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setFormData({ ...formData, campaignTp: type.value })
                      setStep(2)
                    }}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:border-blue-500 hover:shadow-md ${
                      formData.campaignTp === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{type.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{type.label}</h3>
                          {type.recommended && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              추천
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Step 2: 캠페인 상세 정보 */}
              <div className="space-y-6">
                {/* 캠페인 유형 표시 */}
                <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {CAMPAIGN_TYPES.find(t => t.value === formData.campaignTp)?.icon}
                    </span>
                    <div>
                      <p className="text-sm text-gray-600">선택한 캠페인 유형</p>
                      <p className="font-semibold">
                        {CAMPAIGN_TYPES.find(t => t.value === formData.campaignTp)?.label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    변경
                  </button>
                </div>

                {/* 캠페인 이름 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    캠페인 이름
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="예: 2025년 1월 신규고객 캠페인"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    캠페인을 구분할 수 있는 이름을 입력하세요 ({formData.name.length}/50)
                  </p>
                </div>

                {/* 일일 예산 */}
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">일일 예산</span>
                      <div className="group relative">
                        <HelpCircle size={14} className="text-gray-400 cursor-help" />
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                          하루 동안 사용할 최대 광고비입니다. 실제 비용은 클릭수에 따라 달라질 수 있습니다.
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.useDailyBudget}
                        onChange={(e) => setFormData({ ...formData, useDailyBudget: e.target.checked })}
                        className="rounded"
                      />
                      예산 제한 사용
                    </label>
                  </label>
                  
                  {formData.useDailyBudget && (
                    <>
                      <div className="flex gap-2 mb-3">
                        {BUDGET_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => setFormData({ ...formData, dailyBudget: preset.value })}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                              formData.dailyBudget === preset.value
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.dailyBudget}
                          onChange={(e) => setFormData({ ...formData, dailyBudget: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1000"
                          step="1000"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        최소 1,000원 이상 설정 가능합니다
                      </p>
                    </>
                  )}
                </div>

                {/* 광고 전달 방법 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    광고 노출 방식
                    <div className="group relative">
                      <HelpCircle size={14} className="text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                        표준: 하루 동안 고르게 노출<br />
                        빠른 노출: 예산 소진까지 빠르게 노출
                      </div>
                    </div>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, deliveryMethod: 'STANDARD' })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.deliveryMethod === 'STANDARD'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium">표준 노출</p>
                      <p className="text-xs text-gray-600 mt-1">하루 동안 균등하게</p>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, deliveryMethod: 'ACCELERATED' })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.deliveryMethod === 'ACCELERATED'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium">빠른 노출</p>
                      <p className="text-xs text-gray-600 mt-1">가능한 빨리</p>
                    </button>
                  </div>
                </div>

                {/* 안내 메시지 */}
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <div className="flex gap-3">
                    <Info className="text-amber-600 shrink-0" size={20} />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 mb-1">캠페인 생성 안내</p>
                      <ul className="text-amber-700 space-y-1">
                        <li>• 캠페인 생성 후 광고그룹과 키워드를 추가해야 광고가 노출됩니다</li>
                        <li>• 일일 예산은 언제든지 수정할 수 있습니다</li>
                        <li>• 광고 승인까지 최대 24시간이 소요될 수 있습니다</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              이전
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
            {step === 2 && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                {loading ? '생성 중...' : '캠페인 생성'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}