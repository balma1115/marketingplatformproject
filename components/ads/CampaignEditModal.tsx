'use client'

import { useState, useEffect } from 'react'
import { X, Info, Calendar } from 'lucide-react'

interface CampaignEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  campaign: any
}

const BUDGET_PRESETS = [
  { value: 10000, label: '1만원' },
  { value: 30000, label: '3만원' },
  { value: 50000, label: '5만원' },
  { value: 100000, label: '10만원' },
  { value: 300000, label: '30만원' }
]

export default function CampaignEditModal({ isOpen, onClose, onSuccess, campaign }: CampaignEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    dailyBudget: 30000,
    useDailyBudget: true,
    deliveryMethod: 'STANDARD',
    usePeriod: false,
    periodStartDate: '',
    periodEndDate: ''
  })

  useEffect(() => {
    if (campaign && isOpen) {
      // 날짜 필드명 확인 및 변환 (periodStartDt/periodEndDt 또는 periodStartDate/periodEndDate)
      let startDate = '';
      let endDate = '';
      
      if (campaign.periodStartDt) {
        startDate = new Date(campaign.periodStartDt).toISOString().split('T')[0];
      } else if (campaign.periodStartDate) {
        startDate = new Date(campaign.periodStartDate).toISOString().split('T')[0];
      }
      
      if (campaign.periodEndDt) {
        endDate = new Date(campaign.periodEndDt).toISOString().split('T')[0];
      } else if (campaign.periodEndDate) {
        endDate = new Date(campaign.periodEndDate).toISOString().split('T')[0];
      }
      
      setFormData({
        name: campaign.name || '',
        dailyBudget: campaign.dailyBudget || 30000,
        useDailyBudget: campaign.useDailyBudget !== false,
        deliveryMethod: campaign.deliveryMethod || 'STANDARD',
        usePeriod: campaign.usePeriod || false,
        periodStartDate: startDate,
        periodEndDate: endDate
      })
    }
  }, [campaign, isOpen])

  if (!isOpen || !campaign) return null

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('캠페인 이름을 입력해주세요')
      return
    }

    if (formData.useDailyBudget && formData.dailyBudget < 1000) {
      setError('일일 예산은 최소 1,000원 이상이어야 합니다')
      return
    }

    if (formData.usePeriod && (!formData.periodStartDate || !formData.periodEndDate)) {
      setError('광고 기간을 설정해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/ads/campaigns/${campaign.nccCampaignId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '캠페인 수정에 실패했습니다')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || '캠페인 수정 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const getCampaignTypeLabel = (type: string) => {
    switch(type) {
      case 'WEB_SITE': return '파워링크'
      case 'SHOPPING': return '쇼핑검색'
      case 'POWER_CONTENTS': return '파워컨텐츠'
      case 'PLACE': return '플레이스'
      case 'BRAND_SEARCH': return '브랜드검색'
      default: return type
    }
  }

  const getCampaignIcon = (type: string) => {
    switch(type) {
      case 'WEB_SITE': return '🔗'
      case 'SHOPPING': return '🛍️'
      case 'POWER_CONTENTS': return '📱'
      case 'PLACE': return '📍'
      case 'BRAND_SEARCH': return '🏢'
      default: return '📊'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">캠페인 수정</h2>
            <p className="text-sm text-gray-600 mt-1">
              캠페인 정보를 수정하세요
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
          <div className="space-y-6">
            {/* 캠페인 유형 표시 */}
            <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getCampaignIcon(campaign.campaignTp)}</span>
                <div>
                  <p className="text-sm text-gray-600">캠페인 유형</p>
                  <p className="font-semibold">{getCampaignTypeLabel(campaign.campaignTp)}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                ID: {campaign.nccCampaignId}
              </div>
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

            {/* 광고 기간 설정 */}
            <div>
              <label className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">광고 노출 기간</span>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.usePeriod}
                    onChange={(e) => setFormData({ ...formData, usePeriod: e.target.checked })}
                    className="rounded"
                  />
                  기간 설정
                </label>
              </label>
              
              {formData.usePeriod && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">시작일</label>
                    <input
                      type="date"
                      value={formData.periodStartDate}
                      onChange={(e) => setFormData({ ...formData, periodStartDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">종료일</label>
                    <input
                      type="date"
                      value={formData.periodEndDate}
                      onChange={(e) => setFormData({ ...formData, periodEndDate: e.target.value })}
                      min={formData.periodStartDate}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 안내 메시지 */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex gap-3">
                <Info className="text-amber-600 shrink-0" size={20} />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 mb-1">캠페인 수정 안내</p>
                  <ul className="text-amber-700 space-y-1">
                    <li>• 캠페인 유형은 수정할 수 없습니다</li>
                    <li>• 수정사항은 즉시 적용됩니다</li>
                    <li>• 진행 중인 광고에도 영향을 미칠 수 있습니다</li>
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
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end items-center gap-2 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            )}
            {loading ? '수정 중...' : '수정 완료'}
          </button>
        </div>
      </div>
    </div>
  )
}