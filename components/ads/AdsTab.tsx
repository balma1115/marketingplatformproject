'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Play, 
  Pause, 
  Eye, 
  MousePointer,
  TrendingUp,
  Link,
  Copy,
  ExternalLink
} from 'lucide-react'
import axiosClient from '@/lib/axios-client'

interface Ad {
  nccAdId: string
  nccAdgroupId: string
  status: string
  inspectStatus: string
  statusReason?: string
  lockStatus?: string
  headline: string
  description: string
  pcUrl?: string
  mobileUrl?: string
  mobileFinalUrl?: string
  pcFinalUrl?: string
  pcDisplayUrl?: string
  mobileDisplayUrl?: string
  adType?: string
  stats?: {
    impCnt: number
    clkCnt: number
    ctr: number
    cpc: number
    salesAmt: number
  }
}

interface AdsTabProps {
  adgroupId: string
  campaignType?: string
}

export default function AdsTab({ adgroupId, campaignType }: AdsTabProps) {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    headline: '',
    description: '',
    pcUrl: '',
    mobileUrl: '',
    pcDisplayUrl: '',
    mobileDisplayUrl: ''
  })

  useEffect(() => {
    fetchAds()
  }, [adgroupId])

  const fetchAds = async () => {
    try {
      setLoading(true)
      const response = await axiosClient.get(`/api/ads/adgroups/${adgroupId}/ads`)
      console.log('Ads API Response:', response.data)
      
      const adsData = Array.isArray(response.data) ? response.data : response.data?.data || []
      console.log('Processed ads data:', adsData)
      
      // 각 광고의 headline과 description 확인
      adsData.forEach((ad: any) => {
        console.log(`Ad ${ad.nccAdId}:`, {
          headline: ad.headline,
          description: ad.description,
          parsedAd: ad.parsedAd,
          fullAd: ad
        })
      })
      
      setAds(adsData)
    } catch (error) {
      console.error('Failed to fetch ads:', error)
      setAds([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingAd) {
        await axiosClient.put(`/api/ads/adgroups/${adgroupId}/ads`, {
          adId: editingAd.nccAdId,
          ...formData
        })
      } else {
        await axiosClient.post(`/api/ads/adgroups/${adgroupId}/ads`, {
          nccAdgroupId: adgroupId,
          ...formData
        })
      }
      
      setShowCreateModal(false)
      setEditingAd(null)
      resetForm()
      fetchAds()
    } catch (error: any) {
      alert(error.response?.data?.error || '소재 저장에 실패했습니다.')
    }
  }

  const handleDelete = async (adId: string) => {
    if (!confirm('정말로 이 광고 소재를 삭제하시겠습니까?')) return
    
    try {
      await axiosClient.delete(`/api/ads/adgroups/${adgroupId}/ads?adId=${adId}`)
      fetchAds()
    } catch (error) {
      alert('소재 삭제에 실패했습니다.')
    }
  }

  const toggleAdStatus = async (ad: Ad) => {
    try {
      await axiosClient.put(`/api/ads/adgroups/${adgroupId}/ads`, {
        adId: ad.nccAdId,
        userLock: ad.status === 'ELIGIBLE'
      })
      fetchAds()
    } catch (error) {
      alert('상태 변경에 실패했습니다.')
    }
  }

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad)
    setFormData({
      headline: ad.headline,
      description: ad.description,
      pcUrl: ad.pcUrl || '',
      mobileUrl: ad.mobileUrl || '',
      pcDisplayUrl: ad.pcDisplayUrl || '',
      mobileDisplayUrl: ad.mobileDisplayUrl || ''
    })
    setShowCreateModal(true)
  }

  const resetForm = () => {
    setFormData({
      headline: '',
      description: '',
      pcUrl: '',
      mobileUrl: '',
      pcDisplayUrl: '',
      mobileDisplayUrl: ''
    })
  }

  const toggleSelection = (adId: string) => {
    const newSelection = new Set(selectedAds)
    if (newSelection.has(adId)) {
      newSelection.delete(adId)
    } else {
      newSelection.add(adId)
    }
    setSelectedAds(newSelection)
  }

  const toggleAllSelection = () => {
    if (selectedAds.size === ads.length) {
      setSelectedAds(new Set())
    } else {
      setSelectedAds(new Set(ads.map(ad => ad.nccAdId)))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ELIGIBLE':
      case 'ENABLED':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">운영중</span>
      case 'PAUSED':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">일시정지</span>
      case 'DELETED':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">삭제됨</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">광고 소재 ({ads.length})</h3>
        <button
          onClick={() => {
            setEditingAd(null)
            resetForm()
            setShowCreateModal(true)
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus size={16} />
          소재 추가
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 p-3">
                <input 
                  type="checkbox" 
                  checked={selectedAds.size === ads.length && ads.length > 0}
                  onChange={toggleAllSelection}
                />
              </th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">ON/OFF</th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">상태</th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">광고 소재</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">노출수</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">클릭수</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">클릭률(%)</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">평균클릭비용(VAT포함,원)</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">총비용(VAT포함,원)</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">특별관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ads.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-gray-500">
                  등록된 광고 소재가 없습니다.
                </td>
              </tr>
            ) : (
              ads.map((ad) => (
                <tr key={ad.nccAdId} className="hover:bg-gray-50">
                  <td className="p-3">
                    <input 
                      type="checkbox"
                      checked={selectedAds.has(ad.nccAdId)}
                      onChange={() => toggleSelection(ad.nccAdId)}
                    />
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleAdStatus(ad)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        ad.status === 'ELIGIBLE' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          ad.status === 'ELIGIBLE' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="p-3">
                    {getStatusBadge(ad.status)}
                  </td>
                  <td className="p-3">
                    <div className="space-y-2">
                      {/* 제목과 설명 */}
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        {/* 제목 섹션 */}
                        <div className="mb-3">
                          <div className="text-xs font-semibold text-gray-500 mb-2">
                            제목 {(ad as any).allHeadlines && (ad as any).allHeadlines.length > 1 ? `(${(ad as any).allHeadlines.length}개)` : ''}
                          </div>
                          <div className="space-y-1">
                            {(ad as any).allHeadlines && (ad as any).allHeadlines.length > 0 ? (
                              (ad as any).allHeadlines.map((headline: string, index: number) => (
                                <div key={index} className="font-medium text-blue-700">
                                  {headline}
                                </div>
                              ))
                            ) : (
                              <div className="font-medium text-blue-700">
                                {ad.headline || '제목 없음'}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 구분선 */}
                        <hr className="border-blue-200 my-3" />
                        
                        {/* 설명 섹션 */}
                        <div>
                          <div className="text-xs font-semibold text-gray-500 mb-2">
                            설명 {(ad as any).allDescriptions && (ad as any).allDescriptions.length > 1 ? `(${(ad as any).allDescriptions.length}개)` : ''}
                          </div>
                          <div className="space-y-2">
                            {(ad as any).allDescriptions && (ad as any).allDescriptions.length > 0 ? (
                              (ad as any).allDescriptions.map((description: string, index: number) => (
                                <div key={index} className="text-sm text-gray-700">
                                  {description}
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-gray-700">
                                {ad.description || '설명 없음'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* 추가 정보 */}
                      <div className="text-xs text-gray-600 space-y-1 pl-2">
                        {/* PC URL */}
                        {(ad.pcUrl || (ad as any).pc?.final) && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">• 표시 URL:</span>
                            <span>{ad.pcDisplayUrl || ad.pcUrl || (ad as any).pc?.final}</span>
                          </div>
                        )}
                        
                        {/* 연결 URL */}
                        {(ad.pcFinalUrl || (ad as any).pc?.final) && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">• 연결 URL:</span>
                            <a
                              href={ad.pcFinalUrl || (ad as any).pc?.final}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {ad.pcFinalUrl || (ad as any).pc?.final}
                            </a>
                          </div>
                        )}
                        
                        {/* 모바일 URL (있는 경우) */}
                        {(ad.mobileUrl || (ad as any).mobile?.final) && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">• 모바일 URL:</span>
                            <a 
                              href={ad.mobileUrl || (ad as any).mobile?.final} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {ad.mobileUrl || (ad as any).mobile?.final}
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {/* 수정/삭제 버튼 */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleEdit(ad)}
                          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          편집 후 새로 등록
                        </button>
                        <button
                          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          삭제보기
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {ad.stats?.impCnt?.toLocaleString() || '0'}
                  </td>
                  <td className="p-3 text-center">
                    {ad.stats?.clkCnt?.toLocaleString() || '0'}
                  </td>
                  <td className="p-3 text-center">
                    {(ad.stats?.ctr || 0).toFixed(2)}%
                  </td>
                  <td className="p-3 text-center">
                    ₩{Math.round(ad.stats?.cpc || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-center font-medium">
                    ₩{Math.round(ad.stats?.salesAmt || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-sm text-gray-400">-</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingAd ? '광고 소재 수정' : '새 광고 소재 만들기'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  maxLength={15}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="최대 15자"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.headline.length}/15자
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={45}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="최대 45자"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/45자
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PC 연결 URL
                  </label>
                  <input
                    type="url"
                    value={formData.pcUrl}
                    onChange={(e) => setFormData({ ...formData, pcUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    모바일 연결 URL
                  </label>
                  <input
                    type="url"
                    value={formData.mobileUrl}
                    onChange={(e) => setFormData({ ...formData, mobileUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://m.example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PC 표시 URL
                  </label>
                  <input
                    type="text"
                    value={formData.pcDisplayUrl}
                    onChange={(e) => setFormData({ ...formData, pcDisplayUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    모바일 표시 URL
                  </label>
                  <input
                    type="text"
                    value={formData.mobileDisplayUrl}
                    onChange={(e) => setFormData({ ...formData, mobileDisplayUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="m.example.com"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingAd(null)
                  resetForm()
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.headline || !formData.description}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300"
              >
                {editingAd ? '수정' : '만들기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}