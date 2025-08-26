import { playwrightCrawlerService } from './playwrightCrawler'

export interface SmartPlaceInfo {
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
  hasParking?: boolean
  hasWifi?: boolean
  hasWaitingRoom?: boolean
  hasToilet?: boolean
  hasWheelchair?: boolean
  hasVehicle?: boolean
}

export class NaverMapService {
  async getSmartPlaceInfo(placeId: string): Promise<SmartPlaceInfo> {
    try {
      console.log('=== NAVER MAP SERVICE: getSmartPlaceInfo ===')
      console.log('Place ID:', placeId)

      // Playwright 크롤러 서비스를 사용하여 정보 가져오기
      const placeDetail = await playwrightCrawlerService.getPlaceDetails(placeId)
      
      // SmartPlaceInfo 형식으로 변환
      const smartPlaceInfo: SmartPlaceInfo = {
        id: placeId,
        name: placeDetail.name || `업체 (ID: ${placeId})`,
        category: placeDetail.category || '분류 정보 없음',
        businessHours: placeDetail.businessHours || '영업시간 정보 없음',
        phone: placeDetail.phone || '',
        address: placeDetail.address || '',
        hasReservation: placeDetail.hasReservation,
        hasInquiry: placeDetail.hasInquiry,
        hasCoupon: placeDetail.hasCoupon,
        hasOrder: placeDetail.hasOrder,
        hasTalk: placeDetail.hasTalk,
        hasSmartCall: placeDetail.hasSmartCall,
        tabs: placeDetail.tabs.length > 0 ? placeDetail.tabs : ['홈'],
        description: placeDetail.description || '',
        images: placeDetail.images || [],
        amenities: placeDetail.amenities,
        keywords: placeDetail.keywords,
        visitorReviewCount: placeDetail.visitorReviewCount,
        blogReviewCount: placeDetail.blogReviewCount,
        reviewScore: placeDetail.reviewScore,
        responseRate: placeDetail.responseRate,
        directions: placeDetail.directions,
        blogLink: placeDetail.blogLink,
        instagramLink: placeDetail.instagramLink,
        introduction: placeDetail.introduction,
        representativeKeywords: placeDetail.representativeKeywords,
        educationInfo: placeDetail.educationInfo,
        imageRegistrationDates: placeDetail.imageRegistrationDates,
        hasClipTab: placeDetail.hasClipTab,
        newsUpdateDates: placeDetail.newsUpdateDates,
        visitorReviews: placeDetail.visitorReviews,
        blogReviews: placeDetail.blogReviews,
        priceDisplay: placeDetail.priceDisplay,
        hasMenuPhoto: placeDetail.hasMenuPhoto,
        hasInteriorPhoto: placeDetail.hasInteriorPhoto,
        hasExteriorPhoto: placeDetail.hasExteriorPhoto,
        lastPhotoUpdate: placeDetail.lastPhotoUpdate,
        newsCount: placeDetail.newsCount,
        lastNewsDate: placeDetail.lastNewsDate,
        hasEvent: placeDetail.hasEvent,
        hasNotice: placeDetail.hasNotice
      }

      console.log('=== FINAL SMARTPLACE INFO ===')
      console.log('Extracted info:', JSON.stringify(smartPlaceInfo, null, 2))
      
      return smartPlaceInfo
    } catch (error: any) {
      console.error('Error in getSmartPlaceInfo:', error.message)
      throw new Error(`스마트플레이스 정보를 가져올 수 없습니다: ${error.message}`)
    }
  }
}

export const naverMapService = new NaverMapService()