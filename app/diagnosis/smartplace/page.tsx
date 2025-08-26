'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Search, Loader2, MapPin, Phone, Clock, 
  AlertTriangle, CheckCircle, XCircle, Download, Share2,
  Camera, Newspaper, Map, DollarSign, Star, Settings, Info,
  Instagram, Globe, MessageSquare, Calendar, ShoppingCart, Gift,
  ExternalLink, Tag, Image, Users, FileText, TrendingUp
} from 'lucide-react'
import axios from 'axios'
import html2canvas from 'html2canvas'

interface SmartPlaceInfo {
  id: string
  name: string
  category: string
  businessHours?: string
  phone?: string
  address?: string
  hasReservation?: boolean
  hasInquiry?: boolean
  hasCoupon?: boolean
  hasOrder?: boolean
  hasTalk?: boolean
  hasSmartCall?: boolean
  tabs?: string[]
  description?: string
  images?: string[]
  amenities?: string[]
  keywords?: string[]
  visitorReviewCount?: number
  blogReviewCount?: number
  reviewScore?: number
  responseRate?: string
  directions?: string
  blogLink?: string
  instagramLink?: string
  introduction?: string
  representativeKeywords?: string[]
  educationInfo?: {
    hasRegistrationNumber: boolean
    hasTuitionFee: boolean
    registrationNumber?: string
    tuitionFees?: string[]
  }
  imageRegistrationDates?: string[]
  hasClipTab?: boolean
  newsUpdateDates?: string[]
  visitorReviews?: Array<{
    date: string
    hasReply: boolean
  }>
  blogReviews?: Array<{
    date: string
    title?: string
    author?: string
  } | string>
  priceDisplay?: {
    hasText: boolean
    hasImage: boolean
    textContent?: string
  }
  hasMenuPhoto?: boolean
  hasInteriorPhoto?: boolean
  hasExteriorPhoto?: boolean
  lastPhotoUpdate?: string
  newsCount?: number
  lastNewsDate?: string
  hasEvent?: boolean
  hasNotice?: boolean
}

interface AnalysisScore {
  total: number
  details: {
    basic: number
    content: number
    activity: number
    engagement: number
  }
}

export default function SmartPlaceDiagnosisPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [placeInfo, setPlaceInfo] = useState<SmartPlaceInfo | null>(null)
  const [analysisScore, setAnalysisScore] = useState<AnalysisScore | null>(null)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const extractPlaceId = async (inputUrl: string): Promise<string> => {
    console.log('Resolving URL:', inputUrl)
    
    try {
      const response = await axios.post('/api/smartplace/resolve-url', { url: inputUrl })
      
      if (response.data.success && response.data.data?.placeId) {
        console.log('Extracted Place ID:', response.data.data.placeId)
        return response.data.data.placeId
      }
      
      throw new Error('Place ID를 추출할 수 없습니다.')
    } catch (error: any) {
      console.error('Error resolving URL:', error)
      throw new Error(error.response?.data?.error || 'URL 처리 중 오류가 발생했습니다.')
    }
  }

  const calculateScore = (info: SmartPlaceInfo): AnalysisScore => {
    let basic = 0
    let content = 0
    let activity = 0
    let engagement = 0

    // 기본 정보 점수 (25점)
    if (info.name) basic += 5
    if (info.category && info.category !== '분류 정보 없음') basic += 5
    if (info.phone) basic += 5
    if (info.address) basic += 5
    if (info.businessHours && info.businessHours !== '영업시간 정보 없음') basic += 5

    // 콘텐츠 점수 (25점)
    if (info.introduction && info.introduction.length > 100) content += 10
    if (info.representativeKeywords && info.representativeKeywords.length >= 3) content += 5
    if (info.imageRegistrationDates && info.imageRegistrationDates.length >= 3) content += 5
    if (info.priceDisplay?.hasText || info.priceDisplay?.hasImage) content += 5

    // 활동 점수 (25점)
    if (info.hasReservation) activity += 5
    if (info.hasInquiry) activity += 5
    if (info.hasCoupon) activity += 5
    if (info.blogLink) activity += 5
    if (info.instagramLink) activity += 5

    // 참여도 점수 (25점)
    if (info.visitorReviewCount && info.visitorReviewCount > 0) engagement += 10
    if (info.blogReviewCount && info.blogReviewCount > 0) engagement += 10
    if (info.visitorReviews && info.visitorReviews.some(r => r.hasReply)) engagement += 5

    const total = basic + content + activity + engagement

    return {
      total,
      details: {
        basic,
        content,
        activity,
        engagement
      }
    }
  }

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('URL을 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')
    setPlaceInfo(null)
    setAnalysisScore(null)

    try {
      const placeId = await extractPlaceId(url)
      
      const response = await axios.get(`/api/smartplace/info/${placeId}`)
      
      if (response.data.success) {
        const info = response.data.data
        setPlaceInfo(info)
        setAnalysisScore(calculateScore(info))
      } else {
        throw new Error(response.data.error || '정보를 가져올 수 없습니다.')
      }
    } catch (error: any) {
      console.error('Analysis error:', error)
      setError(error.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = async () => {
    if (!reportRef.current) return
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      })
      
      const link = document.createElement('a')
      link.download = `smartplace-report-${placeInfo?.name || 'unknown'}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    if (percentage >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatDate = (dateStr: string | any) => {
    if (!dateStr) return '날짜 정보 없음'
    
    // Convert to string if needed
    const str = typeof dateStr === 'string' ? dateStr : String(dateStr)
    
    // Handle various date formats
    if (str.includes && str.includes('.')) {
      return str // Already formatted
    }
    return str
  }

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          스마트플레이스 진단
        </h1>
        <p className="text-gray-600">
          네이버 스마트플레이스의 현황을 분석하고 개선점을 찾아드립니다
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="네이버 지도 URL을 입력하세요 (예: https://map.naver.com/...)"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-6 py-3 bg-accent-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                분석 중...
              </>
            ) : (
              <>
                <Search size={20} />
                분석하기
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {placeInfo && analysisScore && (
        <div ref={reportRef} className="space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{placeInfo.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{placeInfo.category}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadReport}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="리포트 다운로드"
                >
                  <Download size={20} />
                </button>
                <button
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="공유하기"
                >
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Phone className="text-gray-400" size={20} />
                <span className="text-gray-700">{placeInfo.phone || '전화번호 없음'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="text-gray-400" size={20} />
                <span className="text-gray-700 text-sm">{placeInfo.address || '주소 정보 없음'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="text-gray-400" size={20} />
                <span className="text-gray-700 text-sm">{placeInfo.businessHours || '영업시간 정보 없음'}</span>
              </div>
            </div>

            {/* Overall Score */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">종합 점수</h3>
              <div className="flex items-center justify-between mb-4">
                <div className="text-4xl font-bold text-accent-blue">
                  {analysisScore.total}점
                </div>
                <div className="text-sm text-gray-500">100점 만점</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-accent-blue h-3 rounded-full transition-all duration-500"
                  style={{ width: `${analysisScore.total}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">기본 정보</p>
                  <p className={`font-bold ${getScoreColor(analysisScore.details.basic, 25)}`}>
                    {analysisScore.details.basic}/25
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">콘텐츠</p>
                  <p className={`font-bold ${getScoreColor(analysisScore.details.content, 25)}`}>
                    {analysisScore.details.content}/25
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">활동성</p>
                  <p className={`font-bold ${getScoreColor(analysisScore.details.activity, 25)}`}>
                    {analysisScore.details.activity}/25
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">참여도</p>
                  <p className={`font-bold ${getScoreColor(analysisScore.details.engagement, 25)}`}>
                    {analysisScore.details.engagement}/25
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4">기능 활성화 현황</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                {placeInfo.hasReservation ? 
                  <CheckCircle className="text-green-500" size={20} /> : 
                  <XCircle className="text-gray-300" size={20} />
                }
                <span className={placeInfo.hasReservation ? 'text-gray-900' : 'text-gray-400'}>
                  예약
                </span>
              </div>
              <div className="flex items-center gap-2">
                {placeInfo.hasInquiry ? 
                  <CheckCircle className="text-green-500" size={20} /> : 
                  <XCircle className="text-gray-300" size={20} />
                }
                <span className={placeInfo.hasInquiry ? 'text-gray-900' : 'text-gray-400'}>
                  문의
                </span>
              </div>
              <div className="flex items-center gap-2">
                {placeInfo.hasCoupon ? 
                  <CheckCircle className="text-green-500" size={20} /> : 
                  <XCircle className="text-gray-300" size={20} />
                }
                <span className={placeInfo.hasCoupon ? 'text-gray-900' : 'text-gray-400'}>
                  쿠폰
                </span>
              </div>
              <div className="flex items-center gap-2">
                {placeInfo.hasSmartCall ? 
                  <CheckCircle className="text-green-500" size={20} /> : 
                  <XCircle className="text-gray-300" size={20} />
                }
                <span className={placeInfo.hasSmartCall ? 'text-gray-900' : 'text-gray-400'}>
                  스마트콜
                </span>
              </div>
            </div>
          </div>

          {/* Introduction & Keywords */}
          {(placeInfo.introduction || placeInfo.representativeKeywords?.length) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">소개 정보</h3>
              
              {placeInfo.introduction && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">소개글</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {placeInfo.introduction}
                  </p>
                </div>
              )}
              
              {placeInfo.representativeKeywords && placeInfo.representativeKeywords.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">대표 키워드</h4>
                  <div className="flex flex-wrap gap-2">
                    {placeInfo.representativeKeywords.map((keyword, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1"
                      >
                        <Tag size={14} />
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Latest Updates Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4">정보 최신 업데이트</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Image Registration */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                  <Image size={16} />
                  이미지 등록 여부
                </h4>
                <div className="space-y-2">
                  {placeInfo.imageRegistrationDates && placeInfo.imageRegistrationDates.length > 0 ? (
                    placeInfo.imageRegistrationDates.map((date, index) => (
                      <div key={index} className="text-sm">
                        <span className="text-gray-500">이미지 {index + 1}:</span>{' '}
                        <span className="text-gray-700">{formatDate(date)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">이미지 정보 없음</p>
                  )}
                </div>
              </div>

              {/* Visitor Reviews */}
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                  <Users size={16} />
                  방문자 리뷰 등록 여부
                </h4>
                <div className="space-y-2">
                  {placeInfo.visitorReviews && placeInfo.visitorReviews.length > 0 ? (
                    placeInfo.visitorReviews.map((review, index) => (
                      <div key={index} className="text-sm">
                        <span className="text-gray-500">리뷰 {index + 1}:</span>{' '}
                        <span className="text-gray-700">{formatDate(review.date)}</span>
                        {review.hasReply && (
                          <span className="ml-2 text-xs text-green-600 font-medium">답글 있음</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">방문자 리뷰 없음</p>
                  )}
                </div>
              </div>

              {/* Blog Reviews */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  블로그 리뷰 등록 여부
                </h4>
                <div className="space-y-2">
                  {placeInfo.blogReviews && placeInfo.blogReviews.length > 0 ? (
                    placeInfo.blogReviews.map((review, index) => {
                      const dateStr = typeof review === 'string' ? review : review.date
                      return (
                        <div key={index} className="text-sm">
                          <span className="text-gray-500">리뷰 {index + 1}:</span>{' '}
                          <span className="text-gray-700">{formatDate(dateStr)}</span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-400">블로그 리뷰 없음</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Price Display */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              가격 정보
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-600">가격 텍스트:</span>
                <span className="font-bold text-lg">
                  {placeInfo.priceDisplay?.hasText ? 'O' : 'X'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">가격 이미지:</span>
                <span className="font-bold text-lg">
                  {placeInfo.priceDisplay?.hasImage ? 'O' : 'X'}
                </span>
              </div>
            </div>
          </div>


          {/* Social Links */}
          {(placeInfo.blogLink || placeInfo.instagramLink) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4">소셜 미디어 연동</h3>
              <div className="flex gap-4">
                {placeInfo.blogLink && (
                  <a
                    href={placeInfo.blogLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Globe size={16} />
                    네이버 블로그
                    <ExternalLink size={14} />
                  </a>
                )}
                {placeInfo.instagramLink && (
                  <a
                    href={placeInfo.instagramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition-colors"
                  >
                    <Instagram size={16} />
                    인스타그램
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Tabs Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4">활성화된 탭</h3>
            <div className="flex flex-wrap gap-2">
              {placeInfo.tabs?.filter(tab => 
                ['홈', '쿠폰', '소식', '예약', '리뷰', '사진', '정보'].includes(tab)
              ).map((tab, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
                >
                  {tab}
                </span>
              ))}
            </div>
          </div>

          {/* Review Statistics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4">리뷰 통계</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">방문자 리뷰</p>
                <p className="text-2xl font-bold text-gray-900">
                  {placeInfo.visitorReviewCount || 0}개
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">블로그 리뷰</p>
                <p className="text-2xl font-bold text-gray-900">
                  {placeInfo.blogReviewCount || 0}개
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              개선 추천사항
            </h3>
            <div className="space-y-3">
              {analysisScore.details.basic < 20 && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-orange-500 mt-0.5" size={16} />
                  <div>
                    <p className="font-medium text-gray-900">기본 정보 보완 필요</p>
                    <p className="text-sm text-gray-600">영업시간, 전화번호 등 기본 정보를 모두 입력해주세요.</p>
                  </div>
                </div>
              )}
              {!placeInfo.introduction || placeInfo.introduction.length < 100 && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-orange-500 mt-0.5" size={16} />
                  <div>
                    <p className="font-medium text-gray-900">소개글 작성 필요</p>
                    <p className="text-sm text-gray-600">매력적인 소개글을 작성하여 고객의 관심을 끌어보세요.</p>
                  </div>
                </div>
              )}
              {!placeInfo.hasReservation && (
                <div className="flex items-start gap-3">
                  <Info className="text-blue-500 mt-0.5" size={16} />
                  <div>
                    <p className="font-medium text-gray-900">예약 기능 활성화 추천</p>
                    <p className="text-sm text-gray-600">예약 기능을 활성화하여 고객 편의성을 높여보세요.</p>
                  </div>
                </div>
              )}
              {!placeInfo.hasCoupon && (
                <div className="flex items-start gap-3">
                  <Gift className="text-purple-500 mt-0.5" size={16} />
                  <div>
                    <p className="font-medium text-gray-900">쿠폰 이벤트 활용</p>
                    <p className="text-sm text-gray-600">쿠폰을 통해 신규 고객을 유치하고 재방문을 유도해보세요.</p>
                  </div>
                </div>
              )}
              {placeInfo.visitorReviews && placeInfo.visitorReviews.filter(r => !r.hasReply).length > 0 && (
                <div className="flex items-start gap-3">
                  <MessageSquare className="text-green-500 mt-0.5" size={16} />
                  <div>
                    <p className="font-medium text-gray-900">리뷰 답글 작성 필요</p>
                    <p className="text-sm text-gray-600">
                      답글이 없는 리뷰 {placeInfo.visitorReviews.filter(r => !r.hasReply).length}개에 답글을 달아주세요.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}