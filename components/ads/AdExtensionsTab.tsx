'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Play, 
  Pause,
  MapPin,
  Phone,
  MessageSquare,
  FileText,
  Link,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import axiosClient from '@/lib/axios-client'

interface AdExtension {
  nccAdExtensionId: string
  ownerId: string
  type: string
  status: string
  mobileChannelId?: string
  pcChannelId?: string
  schedule?: {
    sun?: boolean
    mon?: boolean
    tue?: boolean
    wed?: boolean
    thu?: boolean
    fri?: boolean
    sat?: boolean
  }
  bidAdjustment?: number
  adExtensionSitelink?: {
    headline: string
    description1?: string
    description2?: string
    pcLinkUrl?: string
    mobileLinkUrl?: string
  }[]
  adExtensionCalls?: {
    phoneNumber: string
  }[]
  adExtensionApps?: {
    appStore: string
    appId: string
    appLinkUrl: string
  }[]
}

interface AdExtensionsTabProps {
  adgroupId: string
  campaignType?: string
}

const EXTENSION_TYPES = [
  { value: 'CALLOUT', label: '콜아웃 확장', icon: MessageSquare },
  { value: 'SITELINK', label: '사이트링크', icon: Link },
  { value: 'CALL', label: '전화번호', icon: Phone },
  { value: 'LOCATION', label: '위치', icon: MapPin },
  { value: 'APP', label: '앱', icon: FileText },
]

export default function AdExtensionsTab({ adgroupId, campaignType }: AdExtensionsTabProps) {
  const [extensions, setExtensions] = useState<AdExtension[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingExtension, setEditingExtension] = useState<AdExtension | null>(null)
  const [selectedExtensions, setSelectedExtensions] = useState<Set<string>>(new Set())
  const [selectedType, setSelectedType] = useState('SITELINK')
  
  const [formData, setFormData] = useState({
    type: 'SITELINK',
    sitelinks: [{
      headline: '',
      description1: '',
      description2: '',
      pcLinkUrl: '',
      mobileLinkUrl: ''
    }],
    phoneNumber: '',
    appStore: 'GOOGLE_PLAY',
    appId: '',
    appLinkUrl: '',
    calloutText: []
  })

  useEffect(() => {
    fetchExtensions()
  }, [adgroupId])

  const fetchExtensions = async () => {
    try {
      setLoading(true)
      const response = await axiosClient.get(`/api/ads/adgroups/${adgroupId}/ad-extensions`)
      console.log('Ad Extensions Response:', response.data)
      const extensionData = response.data?.data || []
      console.log('Extension Data:', extensionData)
      
      // 각 확장소재의 상세 정보 로그
      extensionData.forEach((ext: any) => {
        console.log(`Extension ${ext.nccAdExtensionId}:`, {
          type: ext.type,
          adExtensionSitelink: ext.adExtensionSitelink,
          adExtensionCalls: ext.adExtensionCalls,
          adExtensionCallouts: ext.adExtensionCallouts,
          adExtensionApps: ext.adExtensionApps,
          adExtensionLocations: ext.adExtensionLocations
        })
      })
      
      setExtensions(extensionData)
    } catch (error) {
      console.error('Failed to fetch ad extensions:', error)
      setExtensions([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const payload: any = {
        ownerId: adgroupId,
        type: formData.type
      }

      // Type-specific data
      switch (formData.type) {
        case 'SITELINK':
          payload.adExtensionSitelink = formData.sitelinks.filter(s => s.headline)
          break
        case 'CALL':
          payload.adExtensionCalls = [{ phoneNumber: formData.phoneNumber }]
          break
        case 'APP':
          payload.adExtensionApps = [{
            appStore: formData.appStore,
            appId: formData.appId,
            appLinkUrl: formData.appLinkUrl
          }]
          break
        case 'CALLOUT':
          payload.calloutText = formData.calloutText
          break
      }

      if (editingExtension) {
        await axiosClient.put(`/api/ads/adgroups/${adgroupId}/ad-extensions`, {
          extensionId: editingExtension.nccAdExtensionId,
          ...payload
        })
      } else {
        await axiosClient.post(`/api/ads/adgroups/${adgroupId}/ad-extensions`, payload)
      }
      
      setShowCreateModal(false)
      setEditingExtension(null)
      resetForm()
      fetchExtensions()
    } catch (error: any) {
      alert(error.response?.data?.error || '확장소재 저장에 실패했습니다.')
    }
  }

  const handleDelete = async (extensionId: string) => {
    if (!confirm('정말로 이 확장소재를 삭제하시겠습니까?')) return
    
    try {
      await axiosClient.delete(`/api/ads/adgroups/${adgroupId}/ad-extensions?extensionId=${extensionId}`)
      fetchExtensions()
    } catch (error) {
      alert('확장소재 삭제에 실패했습니다.')
    }
  }

  const toggleExtensionStatus = async (extension: AdExtension) => {
    try {
      await axiosClient.put(`/api/ads/adgroups/${adgroupId}/ad-extensions`, {
        extensionId: extension.nccAdExtensionId,
        userLock: extension.status === 'ELIGIBLE'
      })
      fetchExtensions()
    } catch (error) {
      alert('상태 변경에 실패했습니다.')
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'SITELINK',
      sitelinks: [{
        headline: '',
        description1: '',
        description2: '',
        pcLinkUrl: '',
        mobileLinkUrl: ''
      }],
      phoneNumber: '',
      appStore: 'GOOGLE_PLAY',
      appId: '',
      appLinkUrl: '',
      calloutText: []
    })
  }

  const addSitelink = () => {
    setFormData({
      ...formData,
      sitelinks: [...formData.sitelinks, {
        headline: '',
        description1: '',
        description2: '',
        pcLinkUrl: '',
        mobileLinkUrl: ''
      }]
    })
  }

  const removeSitelink = (index: number) => {
    setFormData({
      ...formData,
      sitelinks: formData.sitelinks.filter((_, i) => i !== index)
    })
  }

  const updateSitelink = (index: number, field: string, value: string) => {
    const newSitelinks = [...formData.sitelinks]
    newSitelinks[index] = { ...newSitelinks[index], [field]: value }
    setFormData({ ...formData, sitelinks: newSitelinks })
  }

  const getExtensionTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'SITELINK': '사이트링크',
      'CALL': '전화번호',
      'PHONE': '전화번호',
      'CALLOUT': '콜아웃',
      'APP': '앱',
      'LOCATION': '위치',
      'CALCULATION': '계산',
      'HEADLINE': '헤드라인',
      'DESCRIPTION': '설명',
      'DESCRIPTION_EXTRA': '추가설명',
      'SUB_LINKS': '서브링크',
      'PROMOTION': '프로모션',
      'POWER_LINK_IMAGE': '파워링크 이미지',
      'IMAGE_SUB_LINKS': '이미지 서브링크',
      'CATALOG_RELEASE_DATE': '카탈로그 출시일',
      'CATALOG_DETAIL': '카탈로그 상세',
      'CATALOG_IMAGE': '카탈로그 이미지',
      'CATALOG_PROMOTION': '카탈로그 프로모션',
      'CATALOG_EVENT': '카탈로그 이벤트',
      'CATALOG_MOVIE': '카탈로그 동영상',
      'CATALOG_BRAND_MESSAGE': '브랜드 메시지',
      'NAVER_TV_VIDEO': '네이버TV 동영상'
    }
    
    return typeLabels[type] || type
  }

  const getExtensionIcon = (type: string) => {
    const found = EXTENSION_TYPES.find(t => t.value === type)
    const Icon = found?.icon || FileText
    return <Icon size={14} />
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
        <h3 className="text-lg font-semibold">확장소재 ({extensions.length})</h3>
        <button
          onClick={() => {
            setEditingExtension(null)
            resetForm()
            setShowCreateModal(true)
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus size={16} />
          확장소재 추가
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 p-3">
                <input type="checkbox" />
              </th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">ON/OFF</th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">상태</th>
              <th className="text-left p-3 text-sm font-medium text-gray-700 min-w-[350px]">확장소재 유형 및 내용</th>
              <th className="text-left p-3 text-sm font-medium text-gray-700">요일/시간</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">노출수</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">클릭수</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">클릭률(%)</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">평균클릭비용(VAT포함,원)</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">총비용(VAT포함,원)</th>
              <th className="text-center p-3 text-sm font-medium text-gray-700">특별관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {extensions.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-gray-500">
                  등록된 확장소재가 없습니다.
                </td>
              </tr>
            ) : (
              extensions.map((extension) => (
                <React.Fragment key={extension.nccAdExtensionId}>
                  <tr className="hover:bg-gray-50">
                    <td className="p-3">
                      <input type="checkbox" />
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleExtensionStatus(extension)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          extension.status === 'ELIGIBLE' ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            extension.status === 'ELIGIBLE' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(extension.status)}
                    </td>
                    <td className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getExtensionIcon(extension.type)}
                          <span className="font-medium">{getExtensionTypeLabel(extension.type)}</span>
                        </div>
                        
                        {/* 확장소재 내용 표시 - parsedAdExtension 사용 */}
                        <div className="pl-6 text-sm">
                          {(() => {
                            const adData = (extension as any).parsedAdExtension || {}
                            
                            // 이미지 경로를 전체 URL로 변환하는 함수
                            const getImageUrl = (path: string) => {
                              if (!path) return null
                              if (path.startsWith('http')) return path
                              return `https://searchad-phinf.pstatic.net${path}`
                            }
                            
                            switch(extension.type) {
                              case 'CALCULATION':
                                return (
                                  <div>
                                    {adData.final ? (
                                      <a href={adData.final} className="text-blue-600 hover:underline text-xs">
                                        {adData.final}
                                      </a>
                                    ) : <span className="text-gray-400">URL 정보 없음</span>}
                                  </div>
                                )
                                
                              case 'HEADLINE':
                                return (
                                  <div className="font-medium text-gray-800">
                                    {adData.headline || '헤드라인 정보 없음'}
                                  </div>
                                )
                                
                              case 'DESCRIPTION':
                                return (
                                  <div>
                                    {adData.heading && (
                                      <div className="font-medium">{adData.heading}</div>
                                    )}
                                    <div className="text-xs text-gray-600">
                                      {adData.description || '설명 정보 없음'}
                                    </div>
                                  </div>
                                )
                                
                              case 'DESCRIPTION_EXTRA':
                                return (
                                  <div className="text-gray-600">
                                    {adData.adExtension?.description || adData.description || '추가 설명 정보 없음'}
                                  </div>
                                )
                                
                              case 'SUB_LINKS':
                                return (
                                  <div className="space-y-1">
                                    {Array.isArray(adData) && adData.length > 0 ? (
                                      adData.map((link: any, idx: number) => (
                                        <div key={idx} className="flex items-start gap-2 p-1">
                                          <div className="flex-1">
                                            <div className="font-medium">{link.name}</div>
                                            <div className="text-xs text-gray-500">연결 URL: {link.final}</div>
                                          </div>
                                        </div>
                                      ))
                                    ) : <span className="text-gray-400">서브링크 정보 없음</span>}
                                  </div>
                                )
                                
                              case 'PROMOTION':
                                return (
                                  <div>
                                    <div className="font-medium">{adData.basicText || '프로모션 정보 없음'}</div>
                                    {adData.additionalText && (
                                      <div className="text-xs text-gray-600">{adData.additionalText}</div>
                                    )}
                                  </div>
                                )
                                
                              case 'POWER_LINK_IMAGE':
                                return (
                                  <div>
                                    {adData.imagePath ? (
                                      <img 
                                        src={getImageUrl(adData.imagePath) || ''} 
                                        alt="파워링크 이미지"
                                        className="w-16 h-16 object-cover rounded border"
                                      />
                                    ) : <span className="text-gray-400">이미지 정보 없음</span>}
                                  </div>
                                )
                                
                              case 'IMAGE_SUB_LINKS':
                                return (
                                  <div className="space-y-2">
                                    {Array.isArray(adData) && adData.length > 0 ? (
                                      adData.map((link: any, idx: number) => (
                                        <div key={idx} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                                          {link.imagePath && (
                                            <img 
                                              src={getImageUrl(link.imagePath) || ''} 
                                              alt={link.name}
                                              className="w-12 h-12 object-cover rounded"
                                            />
                                          )}
                                          <div className="flex-1">
                                            <div className="font-medium">이미지형 서브링크{idx + 1}</div>
                                            <div className="text-sm">링크이름: {link.name}</div>
                                            <div className="text-xs text-gray-500">연결 URL: {link.final}</div>
                                          </div>
                                        </div>
                                      ))
                                    ) : <span className="text-gray-400">이미지 서브링크 정보 없음</span>}
                                  </div>
                                )
                                
                              case 'CATALOG_RELEASE_DATE':
                                return (
                                  <div className="text-gray-600">
                                    출시일: {adData.releaseDate ? new Date(adData.releaseDate).toLocaleDateString('ko-KR') : '정보 없음'}
                                  </div>
                                )
                                
                              case 'CATALOG_DETAIL':
                                return (
                                  <div className="text-gray-600">
                                    상세: {adData.detail || '정보 없음'}
                                  </div>
                                )
                                
                              case 'CATALOG_IMAGE':
                                return (
                                  <div>
                                    {adData.imagePath ? (
                                      <img 
                                        src={getImageUrl(adData.imagePath) || ''} 
                                        alt="카탈로그 이미지"
                                        className="w-16 h-16 object-cover rounded border"
                                      />
                                    ) : <span className="text-gray-400">카탈로그 이미지 정보 없음</span>}
                                  </div>
                                )
                                
                              case 'CATALOG_PROMOTION':
                                return (
                                  <div>
                                    <div className="font-medium">{adData.basicText || '카탈로그 프로모션 정보 없음'}</div>
                                    {adData.additionalText && (
                                      <div className="text-xs text-gray-600">{adData.additionalText}</div>
                                    )}
                                  </div>
                                )
                                
                              case 'CATALOG_EVENT':
                                return (
                                  <div>
                                    <div className="text-xs text-gray-600">이벤트 ID: {adData.dittoId || '정보 없음'}</div>
                                    {adData.thumbnail && (
                                      <a href={adData.thumbnail} className="text-xs text-blue-600 hover:underline">썸네일 보기</a>
                                    )}
                                  </div>
                                )
                                
                              case 'CATALOG_MOVIE':
                                return (
                                  <div>
                                    <div className="text-xs text-gray-600">동영상 ID: {adData.dittoId || '정보 없음'}</div>
                                    {adData.thumbnail && (
                                      <a href={adData.thumbnail} className="text-xs text-blue-600 hover:underline">썸네일 보기</a>
                                    )}
                                  </div>
                                )
                                
                              case 'CATALOG_BRAND_MESSAGE':
                                return (
                                  <div className="text-gray-700">
                                    {adData.text || '브랜드 메시지 정보 없음'}
                                  </div>
                                )
                                
                              case 'NAVER_TV_VIDEO':
                                return (
                                  <div className="space-y-1">
                                    {adData.imagePath && (
                                      <img 
                                        src={getImageUrl(adData.imagePath) || ''} 
                                        alt="동영상 썸네일"
                                        className="w-20 h-12 object-cover rounded"
                                      />
                                    )}
                                    <div className="text-gray-700">{adData.description || '동영상 설명 없음'}</div>
                                    {adData.isSponsorReview && (
                                      <span className="text-xs text-blue-600">스폰서 리뷰</span>
                                    )}
                                  </div>
                                )
                                
                              // 기존 유형들 (이전 버전과의 호환성)
                              case 'SITELINK':
                                return extension.adExtensionSitelink && extension.adExtensionSitelink.length > 0 ? (
                                  <div className="space-y-1">
                                    {extension.adExtensionSitelink.map((link: any, idx: number) => (
                                      <div key={idx} className="border-l-2 border-blue-200 pl-2">
                                        <div className="font-medium text-blue-600">{link.headline}</div>
                                        {(link.description1 || link.description2) && (
                                          <div className="text-xs text-gray-500">
                                            {link.description1} {link.description2}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : <span className="text-gray-400">사이트링크 정보 없음</span>
                                
                              case 'PHONE':
                              case 'CALL':
                                // PHONE 타입의 경우 parsedAdExtension에서 직접 전화번호 가져오기
                                const phoneNumber = adData.phoneNumber || 
                                                   adData.phone || 
                                                   (extension.adExtensionCalls && extension.adExtensionCalls[0]?.phoneNumber) ||
                                                   (typeof adData === 'string' ? adData : null)
                                return phoneNumber ? (
                                  <div className="font-medium text-lg">{phoneNumber}</div>
                                ) : <span className="text-gray-400">전화번호 정보 없음</span>
                                
                              case 'CALLOUT':
                                return extension.adExtensionCallouts && extension.adExtensionCallouts.length > 0 ? (
                                  <div>
                                    {extension.adExtensionCallouts.map((callout: any, idx: number) => (
                                      <span key={idx} className="inline-block mr-2 mb-1 px-2 py-1 bg-gray-100 rounded text-xs">
                                        {callout.text}
                                      </span>
                                    ))}
                                  </div>
                                ) : <span className="text-gray-400">콜아웃 정보 없음</span>
                                
                              default:
                                return (
                                  <div className="text-gray-400">
                                    <div>알 수 없는 유형: {extension.type}</div>
                                    {Object.keys(adData).length > 0 && (
                                      <pre className="text-xs mt-1">{JSON.stringify(adData, null, 2)}</pre>
                                    )}
                                  </div>
                                )
                            }
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-gray-600">
                        모든 요일 및 시간
                      </span>
                    </td>
                    <td className="p-3 text-center">0</td>
                    <td className="p-3 text-center">0</td>
                    <td className="p-3 text-center">0.00%</td>
                    <td className="p-3 text-center">₩0</td>
                    <td className="p-3 text-center">₩0</td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleDelete(extension.nccAdExtensionId)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingExtension ? '확장소재 수정' : '새 확장소재 만들기'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  확장소재 유형
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EXTENSION_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setFormData({ ...formData, type: type.value })
                        setSelectedType(type.value)
                      }}
                      className={`p-3 border rounded-lg flex items-center gap-2 ${
                        formData.type === type.value 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {React.createElement(type.icon, { size: 16 })}
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SITELINK Type */}
              {formData.type === 'SITELINK' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">사이트링크</h3>
                    <button
                      onClick={addSitelink}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      링크 추가
                    </button>
                  </div>
                  
                  {formData.sitelinks.map((sitelink, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium">사이트링크 {index + 1}</h4>
                        {formData.sitelinks.length > 1 && (
                          <button
                            onClick={() => removeSitelink(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          링크 텍스트 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={sitelink.headline}
                          onChange={(e) => updateSitelink(index, 'headline', e.target.value)}
                          maxLength={25}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="최대 25자"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            설명 1
                          </label>
                          <input
                            type="text"
                            value={sitelink.description1}
                            onChange={(e) => updateSitelink(index, 'description1', e.target.value)}
                            maxLength={35}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="최대 35자"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            설명 2
                          </label>
                          <input
                            type="text"
                            value={sitelink.description2}
                            onChange={(e) => updateSitelink(index, 'description2', e.target.value)}
                            maxLength={35}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="최대 35자"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          연결 URL
                        </label>
                        <input
                          type="url"
                          value={sitelink.pcLinkUrl}
                          onChange={(e) => updateSitelink(index, 'pcLinkUrl', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CALL Type */}
              {formData.type === 'CALL' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    전화번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="02-1234-5678"
                  />
                </div>
              )}

              {/* APP Type */}
              {formData.type === 'APP' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      앱 스토어
                    </label>
                    <select
                      value={formData.appStore}
                      onChange={(e) => setFormData({ ...formData, appStore: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="GOOGLE_PLAY">Google Play</option>
                      <option value="APP_STORE">App Store</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      앱 ID
                    </label>
                    <input
                      type="text"
                      value={formData.appId}
                      onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="com.example.app"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      앱 링크 URL
                    </label>
                    <input
                      type="url"
                      value={formData.appLinkUrl}
                      onChange={(e) => setFormData({ ...formData, appLinkUrl: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="https://play.google.com/store/apps/details?id=..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingExtension(null)
                  resetForm()
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {editingExtension ? '수정' : '만들기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}