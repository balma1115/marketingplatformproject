import crypto from 'crypto'
import axios, { AxiosInstance, AxiosError } from 'axios'
import { prisma } from '@/lib/db'

// Campaign Types
export enum CampaignType {
  WEB_SITE = 'WEB_SITE',           // 파워링크
  POWER_CONTENTS = 'POWER_CONTENTS', // 파워콘텐츠
  SHOPPING = 'SHOPPING'              // 쇼핑검색 (제한적 지원)
}

// Ad Group Types
export enum AdGroupType {
  WEB_SITE = 'WEB_SITE',
  POWER_CONTENTS = 'POWER_CONTENTS'
}

// AdExtension Types
export enum AdExtensionType {
  PLACE = 'PLACE'  // 플레이스 광고 확장
}

// Bidding Strategies
export enum BiddingStrategy {
  MANUAL_CPC = 'MANUAL_CPC'
}

// Device Types
export enum DeviceType {
  PC = 'PC',
  MOBILE = 'MOBILE',
  ALL = 'ALL'
}

// Match Types
export enum MatchType {
  EXACT = 'EXACT',
  PHRASE = 'PHRASE',
  BROAD = 'BROAD'
}

// Ad Types
export enum AdType {
  TEXT_45 = 'TEXT_45',
  RSA_AD = 'RSA_AD',
  IMAGE_BANNER = 'IMAGE_BANNER'
}

// ===== Interfaces =====

export interface NaverAdsCredentials {
  customerId: string
  accessKey?: string
  apiKey?: string  // Alternative field name for backward compatibility
  secretKey: string
}

export interface PowerLinkCampaign {
  nccCampaignId?: string
  customerId: number
  name: string
  campaignTp: CampaignType  // Note: API uses 'campaignTp' not 'campaignType'
  deliveryMethod: 'STANDARD' | 'ACCELERATED'
  dailyBudget?: number
  useDailyBudget?: boolean
  status?: 'ELIGIBLE' | 'PAUSED' | 'DELETED'  // Fixed: ELIGIBLE is the correct running status
  statusReason?: string
  trackingMode?: 'TRACKING_DISABLED' | 'CONVERSION_TRACKING'
  regTm?: string
  editTm?: string
}

export interface AdGroup {
  nccAdgroupId?: string
  customerId?: number
  nccCampaignId: string
  name: string
  bidAmt?: number
  dailyBudget?: number
  useDailyBudget?: boolean
  contentsNetworkBidAmt?: number
  mobileNetworkBidAmt?: number
  pcNetworkBidAmt?: number
  status?: 'ELIGIBLE' | 'PAUSED' | 'DELETED'  // Fixed: ELIGIBLE is the primary running status
  statusReason?: string
  userLock?: boolean
  budgetLock?: boolean
  delFlag?: boolean
  expectCost?: number
  migType?: number
  regTm?: string
  editTm?: string
  targets?: any[]
  targetSummary?: any
  pcChannelKey?: string
  mobileChannelKey?: string
  adgroupType?: string
  adRollingType?: string
}

export interface RestrictedKeyword {
  keyword: string
  type?: 'KEYWORD_PLUS_RESTRICT' | 'PHRASE_KEYWORD_RESTRICT' | 'EXACT_KEYWORD_RESTRICT'
  regTm?: string
  editTm?: string
}

export interface AdGroupsQuery {
  ids?: string[]
  nccCampaignId?: string
  nccLabelId?: string
  baseSearchId?: string
  recordSize?: number
  selector?: string
}

export interface Keyword {
  nccKeywordId?: string
  nccAdgroupId: string
  keyword: string
  bidAmt?: number
  useGroupBidAmt?: boolean
  status?: 'ELIGIBLE' | 'PAUSED' | 'DELETED'  // Fixed: ELIGIBLE instead of ENABLED
  statusReason?: string
  qualityIndex?: number
  regTm?: string
  editTm?: string
  userLock?: boolean  // Added missing field
  links?: any  // Added links field for keyword tracking
}

export interface Ad {
  nccAdId?: string
  nccAdgroupId: string
  adTp?: AdType  // Made optional for flexibility
  headline?: string  // Made optional as it can be in nested 'ad' object
  description?: string  // Made optional as it can be in nested 'ad' object
  pc?: {
    final: string
  }
  mobile?: {
    final: string
  }
  status?: 'ELIGIBLE' | 'PAUSED' | 'DELETED'  // Fixed: ELIGIBLE instead of ENABLED
  statusReason?: string
  regTm?: string
  editTm?: string
  userLock?: boolean  // Added missing field
  ad?: {  // Added nested ad object structure as per API
    headline: string
    description: string
    pc?: {
      url: string
    }
    mobile?: {
      url: string
    }
  }
}

export interface AdExtension {
  nccAdExtensionId?: string
  ownerId: string  // adGroupId or campaignId
  type: AdExtensionType
  pcMobileType: 'ALL' | 'PC' | 'MOBILE'
  scheduledManagement: boolean
  schedule?: {
    businessHours?: Array<{
      dayOfWeek: string
      startTime: string
      endTime: string
    }>
  }
  // Place specific fields
  placeId?: string
  placeName?: string
  address?: string
  phoneNumber?: string
  status?: 'ENABLED' | 'PAUSED' | 'DELETED'
}

export interface NaverStatsResponse {
  impCnt: number      // 노출수
  clkCnt: number      // 클릭수
  salesAmt: number    // 광고비
  ctr: number         // 클릭률
  cpc: number         // 클릭당 비용
  avgRnk: number      // 평균 순위
  ccnt?: number       // 전환수
}

export interface KeywordEstimate {
  keyword: string
  bidAmt: number
  minBid: number
  competition: 'LOW' | 'MEDIUM' | 'HIGH'
  monthlySearchVolume?: number
}

export interface BulkKeywordOperation {
  nccKeywordId: string
  bidAmt?: number
  status?: 'ENABLED' | 'PAUSED'
}

// ===== Main API Class =====

export class NaverAdsAPI {
  apiKey: string
  secretKey: string
  customerId: string
  private axios: AxiosInstance
  private baseURL = 'https://api.searchad.naver.com'
  private maxRetries = 3
  private retryDelay = 1000

  constructor(config?: NaverAdsCredentials) {
    // Support both accessKey and apiKey field names for backward compatibility
    const accessKey = config?.accessKey || config?.apiKey
    
    if (!accessKey || !config?.secretKey || !config?.customerId) {
      throw new Error('Naver Ads API 인증 정보가 필요합니다')
    }
    
    this.apiKey = accessKey
    this.secretKey = config.secretKey
    this.customerId = config.customerId
    
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  /**
   * HMAC-SHA256 서명 생성 (네이버 광고 API 인증)
   */
  generateSignature(method: string, uri: string, timestamp: string): string {
    // Naver Ads API signature format: timestamp.method.uri
    const message = `${timestamp}.${method.toUpperCase()}.${uri}`
    
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(message, 'utf-8')
      .digest('base64')
    
    return signature
  }

  private getAuthHeaders(method: string, uri: string): Record<string, string> {
    const timestamp = Date.now().toString()
    // For signature, we need only the path part without query parameters
    const pathOnly = uri.split('?')[0]
    const signature = this.generateSignature(method, pathOnly, timestamp)

    return {
      'X-Timestamp': timestamp,
      'X-API-KEY': this.apiKey,
      'X-Customer': this.customerId,
      'X-Signature': signature,
      'Content-Type': 'application/json'
    }
  }

  /**
   * API 요청 래퍼 with retry logic
   */
  async request(method: string, endpoint: string, data?: any, retryCount = 0): Promise<any> {
    // stat-reports, stats, keywordstool은 /ncc 없이 사용, 나머지는 /ncc 추가
    let uri: string
    if (endpoint.startsWith('/stat-reports') || 
        endpoint.startsWith('/report-download') || 
        endpoint.startsWith('/stats') ||
        endpoint.startsWith('/keywordstool')) {
      uri = endpoint // No /ncc prefix for these endpoints
    } else if (endpoint.startsWith('/ncc')) {
      uri = endpoint // Already has /ncc
    } else {
      uri = `/ncc${endpoint}` // Add /ncc prefix
    }
    const fullUrl = `${this.baseURL}${uri}`
    console.log(`Making ${method} request to: ${fullUrl}`)
    
    try {
      const response = await this.axios({
        method,
        url: fullUrl,
        headers: this.getAuthHeaders(method, uri),
        data
      })
      return response.data
    } catch (error: any) {
      const axiosError = error as AxiosError
      
      // 인증 오류는 재시도하지 않음
      if (axiosError.response?.status === 401) {
        throw new Error('API 인증에 실패했습니다. API 키를 확인해주세요.')
      }
      
      // 429 (Rate Limit) 또는 5xx 에러는 재시도
      if (retryCount < this.maxRetries && 
          (axiosError.response?.status === 429 || 
           (axiosError.response?.status && axiosError.response.status >= 500))) {
        const delay = this.retryDelay * Math.pow(2, retryCount)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.request(method, endpoint, data, retryCount + 1)
      }
      
      console.error('Naver Ads API Error:', axiosError.response?.data || axiosError.message)
      throw error
    }
  }

  // ===== Campaign Management =====

  async getCampaigns(): Promise<PowerLinkCampaign[]> {
    try {
      const response = await this.request('GET', '/campaigns')
      
      // Log the full response to see what data is included
      console.log('Full campaigns API response:', JSON.stringify(response, null, 2))
      
      // Check if campaigns already include stats data
      if (response && response.length > 0 && response[0]) {
        console.log('First campaign data structure:', Object.keys(response[0]))
      }
      
      return response || []
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      return []
    }
  }

  async getCampaign(campaignId: string): Promise<PowerLinkCampaign> {
    return this.request('GET', `/campaigns/${campaignId}`)
  }

  async createCampaign(campaign: Partial<PowerLinkCampaign>): Promise<PowerLinkCampaign> {
    const body = {
      ...campaign,
      customerId: parseInt(this.customerId)
    }
    return this.request('POST', '/campaigns', body)
  }

  async updateCampaign(campaignId: string, updates: Partial<PowerLinkCampaign>): Promise<PowerLinkCampaign> {
    return this.request('PUT', `/campaigns/${campaignId}`, updates)
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    return this.request('DELETE', `/campaigns/${campaignId}`)
  }

  // ===== Ad Group Management =====

  async getAdGroups(query?: AdGroupsQuery | string): Promise<AdGroup[]> {
    try {
      let params = ''
      
      if (typeof query === 'string') {
        // Legacy support for campaignId
        params = `?nccCampaignId=${query}`
      } else if (query) {
        const queryParams: string[] = []
        if (query.ids && query.ids.length > 0) {
          queryParams.push(`ids=${query.ids.join(',')}`)
        }
        if (query.nccCampaignId) {
          queryParams.push(`nccCampaignId=${query.nccCampaignId}`)
        }
        if (query.nccLabelId) {
          queryParams.push(`nccLabelId=${query.nccLabelId}`)
        }
        if (query.baseSearchId) {
          queryParams.push(`baseSearchId=${query.baseSearchId}`)
        }
        if (query.recordSize) {
          queryParams.push(`recordSize=${query.recordSize}`)
        }
        if (query.selector) {
          queryParams.push(`selector=${query.selector}`)
        }
        if (queryParams.length > 0) {
          params = `?${queryParams.join('&')}`
        }
      }
      
      console.log('Requesting ad groups with params:', params)
      console.log('Customer ID:', this.customerId)
      const response = await this.request('GET', `/adgroups${params}`)
      console.log('Ad groups response:', response)
      return response || []
    } catch (error) {
      console.error('Failed to fetch ad groups:', error)
      throw error
    }
  }

  async getAdGroupsByIds(ids: string[]): Promise<AdGroup[]> {
    try {
      const params = `?ids=${ids.join(',')}`
      const response = await this.request('GET', `/adgroups${params}`)
      return response || []
    } catch (error) {
      console.error('Failed to fetch ad groups by IDs:', error)
      throw error
    }
  }

  async getAdGroup(adgroupId: string): Promise<AdGroup> {
    return this.request('GET', `/adgroups/${adgroupId}`)
  }

  async createAdGroup(adGroup: Partial<AdGroup>): Promise<AdGroup> {
    console.log('Creating ad group with full URL path: /adgroups')
    console.log('Ad group data:', JSON.stringify(adGroup, null, 2))
    console.log('Customer ID being used:', this.customerId)
    return this.request('POST', '/adgroups', adGroup)
  }

  async updateAdGroup(adgroupId: string, updates: Partial<AdGroup>): Promise<AdGroup> {
    return this.request('PUT', `/adgroups/${adgroupId}`, updates)
  }

  async deleteAdGroup(adgroupId: string): Promise<void> {
    return this.request('DELETE', `/adgroups/${adgroupId}`)
  }

  // ===== Restricted Keywords (Negative Keywords) Management =====

  async getRestrictedKeywords(
    adgroupId: string, 
    type?: 'KEYWORD_PLUS_RESTRICT' | 'PHRASE_KEYWORD_RESTRICT' | 'EXACT_KEYWORD_RESTRICT'
  ): Promise<RestrictedKeyword[]> {
    try {
      const params = type ? `?type=${type}` : '?type=KEYWORD_PLUS_RESTRICT'
      const response = await this.request('GET', `/adgroups/${adgroupId}/restricted-keywords${params}`)
      return response || []
    } catch (error) {
      console.error('Failed to fetch restricted keywords:', error)
      return []
    }
  }

  async createRestrictedKeywords(
    adgroupId: string, 
    keywords: RestrictedKeyword[]
  ): Promise<RestrictedKeyword[]> {
    try {
      const response = await this.request('POST', `/adgroups/${adgroupId}/restricted-keywords`, {
        restrictedKeywords: keywords
      })
      return response || []
    } catch (error) {
      console.error('Failed to create restricted keywords:', error)
      throw error
    }
  }

  async deleteRestrictedKeywords(
    adgroupId: string, 
    keywords: string[]
  ): Promise<void> {
    try {
      const params = `?ids=${keywords.join(',')}`
      await this.request('DELETE', `/adgroups/${adgroupId}/restricted-keywords${params}`)
    } catch (error) {
      console.error('Failed to delete restricted keywords:', error)
      throw error
    }
  }

  // ===== Keyword Management =====

  async getKeywords(adgroupId?: string): Promise<Keyword[]> {
    try {
      const params = adgroupId ? `?nccAdgroupId=${adgroupId}` : ''
      const response = await this.request('GET', `/keywords${params}`)
      return response || []
    } catch (error) {
      console.error('Failed to fetch keywords:', error)
      return []
    }
  }

  async getKeyword(keywordId: string): Promise<Keyword> {
    return this.request('GET', `/keywords/${keywordId}`)
  }

  async createKeywords(keywords: Partial<Keyword>[]): Promise<Keyword[]> {
    return this.request('POST', '/keywords', { nccKeywordList: keywords })
  }

  async updateKeyword(keywordId: string, update: Partial<Keyword>): Promise<Keyword> {
    return this.request('PUT', `/keywords/${keywordId}`, update)
  }

  async updateKeywords(updates: BulkKeywordOperation[]): Promise<Keyword[]> {
    return this.request('PUT', '/keywords', { nccKeywordList: updates })
  }

  async deleteKeywords(keywordIds: string[]): Promise<void> {
    const params = `?nccKeywordIdList=${keywordIds.join(',')}`
    return this.request('DELETE', `/keywords${params}`)
  }

  // ===== Ad Management =====

  async getAds(adgroupId?: string): Promise<Ad[]> {
    try {
      const params = adgroupId ? `?nccAdgroupId=${adgroupId}` : ''
      const response = await this.request('GET', `/ads${params}`)
      
      // 각 광고의 상세 정보를 가져오기
      if (response && Array.isArray(response)) {
        const detailedAds = await Promise.all(
          response.map(async (ad: any) => {
            try {
              // GET /ads/{adId}로 상세 정보 가져오기
              const detailedAd = await this.request('GET', `/ads/${ad.nccAdId}`)
              return detailedAd || ad
            } catch (error) {
              console.error(`Failed to fetch detailed ad ${ad.nccAdId}:`, error)
              return ad
            }
          })
        )
        return detailedAds
      }
      
      return response || []
    } catch (error) {
      console.error('Failed to fetch ads:', error)
      return []
    }
  }

  async getAd(adId: string): Promise<Ad> {
    return this.request('GET', `/ads/${adId}`)
  }

  async createAd(ad: Partial<Ad>): Promise<Ad> {
    // 한글 문자 길이 검증
    if (ad.headline && ad.headline.length > 15) {
      throw new Error('제목은 15자 이하여야 합니다')
    }
    if (ad.description && ad.description.length > 45) {
      throw new Error('설명은 45자 이하여야 합니다')
    }
    return this.request('POST', '/ads', ad)
  }

  async updateAd(adId: string, updates: Partial<Ad>): Promise<Ad> {
    return this.request('PUT', `/ads/${adId}`, updates)
  }

  async deleteAd(adId: string): Promise<void> {
    return this.request('DELETE', `/ads/${adId}`)
  }

  // ===== AdExtension Management (Place Ads) =====

  async getAdExtensions(ownerId?: string): Promise<AdExtension[]> {
    try {
      const params = ownerId ? `?ownerId=${ownerId}` : ''
      const response = await this.request('GET', `/ad-extensions${params}`)
      return response || []
    } catch (error) {
      console.error('Failed to fetch ad extensions:', error)
      return []
    }
  }

  async getAdExtension(adExtensionId: string): Promise<AdExtension> {
    return this.request('GET', `/ad-extensions/${adExtensionId}`)
  }

  async createAdExtension(adExtension: Partial<AdExtension>): Promise<AdExtension> {
    return this.request('POST', '/ad-extensions', adExtension)
  }

  async updateAdExtension(adExtensionId: string, updates: Partial<AdExtension>): Promise<AdExtension> {
    return this.request('PUT', `/ad-extensions/${adExtensionId}`, updates)
  }

  async deleteAdExtension(adExtensionId: string): Promise<void> {
    return this.request('DELETE', `/ad-extensions/${adExtensionId}`)
  }

  // ===== Statistics and Reports =====

  /**
   * Get stat reports for campaigns, ad groups, keywords, etc.
   * Using the correct /stat-reports endpoint as per official documentation
   */
  async getStatReports(params: {
    reportTp: 'CAMPAIGN' | 'ADGROUP' | 'AD' | 'KEYWORD' | 'AD_EXTENSION',
    dateRange: {
      since: string,  // YYYYMMDD format (no hyphens)
      until: string   // YYYYMMDD format (no hyphens)
    },
    ids?: string[],
    timeIncrement?: '1' | '7' | 'month' | 'allDays',  // 1: daily, 7: weekly
    dataPreset?: string[],  // fields to include
    breakdown?: 'hh24'  // hourly breakdown
  }): Promise<any[]> {
    try {
      // Split into chunks if there are too many IDs (URL length limit)
      if (params.ids && params.ids.length > 20) {
        const chunks: string[][] = []
        for (let i = 0; i < params.ids.length; i += 20) {
          chunks.push(params.ids.slice(i, i + 20))
        }
        
        const results = await Promise.all(
          chunks.map(chunk => 
            this.getStatReports({ ...params, ids: chunk })
          )
        )
        
        // Flatten and return all results
        return results.flat()
      }
      
      // Build request body as per official API documentation
      const requestBody: any = {
        reportTp: params.reportTp
      }
      
      // Support both dateRange and timeRange formats
      if (params.dateRange) {
        requestBody.dateRange = {
          since: params.dateRange.since,  // YYYYMMDD format
          until: params.dateRange.until   // YYYYMMDD format
        }
      } else if ((params as any).timeRange) {
        // Convert timeRange (YYYY-MM-DD) to dateRange (YYYYMMDD) format
        requestBody.dateRange = {
          since: (params as any).timeRange.since.replace(/-/g, ''),
          until: (params as any).timeRange.until.replace(/-/g, '')
        }
      } else {
        throw new Error('Either dateRange or timeRange must be provided')
      }
      
      if (params.ids && params.ids.length > 0) {
        requestBody.ids = params.ids
      }
      
      if (params.timeIncrement) {
        requestBody.timeIncrement = params.timeIncrement
      }
      
      if (params.dataPreset) {
        requestBody.dataPreset = params.dataPreset
      }
      
      if (params.breakdown) {
        requestBody.breakdown = params.breakdown
      }

      // Use POST method with /stat-reports endpoint as per documentation
      const response = await this.request('POST', '/stat-reports', requestBody)
      
      // The API returns a reportJobId, we need to fetch the actual data
      if (response && response.reportJobId) {
        // Wait a bit for the report to be generated
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Get the actual report data
        const reportData = await this.request('GET', `/stat-reports/${response.reportJobId}`)
        
        // If the report has data, return it
        if (reportData && reportData.data) {
          return Array.isArray(reportData.data) ? reportData.data : [reportData.data]
        }
      }
      
      // Fallback: Try direct GET method (for backward compatibility)
      const queryParams = new URLSearchParams()
      queryParams.append('reportTp', params.reportTp)
      queryParams.append('since', params.dateRange.since)
      queryParams.append('until', params.dateRange.until)
      
      if (params.ids && params.ids.length > 0) {
        queryParams.append('ids', params.ids.join(','))
      }
      
      const fallbackResponse = await this.request('GET', `/stat-reports?${queryParams.toString()}`)
      return fallbackResponse || []
    } catch (error) {
      console.error('Failed to fetch stat reports:', error)
      // Try alternative stats endpoint as last resort
      try {
        // Determine date values based on available parameters
        let since, until
        if (params.dateRange) {
          since = params.dateRange.since
          until = params.dateRange.until
        } else if (params.timeRange) {
          since = params.timeRange.since.replace(/-/g, '')
          until = params.timeRange.until.replace(/-/g, '')
        } else {
          throw new Error('No date range provided')
        }
        
        const queryParams = new URLSearchParams({
          reportTp: params.reportTp,
          since,
          until
        })
        
        if (params.ids && params.ids.length > 0) {
          queryParams.append('ids', params.ids.join(','))
        }
        
        const statsResponse = await this.request('GET', `/stats?${queryParams.toString()}`)
        return statsResponse || []
      } catch (statsError) {
        console.error('Stats API also failed:', statsError)
        return []
      }
    }
  }

  /**
   * Get stats for ad groups using the /stats endpoint
   * This method specifically handles ad group stats which work differently from StatReports
   */
  async getAdGroupStats(adGroupIds: string[], dateFrom: string, dateTo: string): Promise<any[]> {
    try {
      if (!adGroupIds || adGroupIds.length === 0) {
        return []
      }

      // Format dates (remove hyphens if present)
      const formattedDateFrom = dateFrom.replace(/-/g, '')
      const formattedDateTo = dateTo.replace(/-/g, '')
      
      console.log(`[NaverAdsAPI] Getting ad group stats for ${adGroupIds.length} ad groups from ${dateFrom} to ${dateTo}`)

      // Build query parameters
      const queryParams = new URLSearchParams({
        ids: adGroupIds.join(','),
        fields: JSON.stringify(["impCnt", "clkCnt", "salesAmt", "ctr", "cpc", "avgRnk"]),
        timeRange: JSON.stringify({
          since: formattedDateFrom,
          until: formattedDateTo
        }),
        datePreset: 'CUSTOM',
        timeIncrement: 'allDays'
      })

      const response = await this.request('GET', `/stats?${queryParams.toString()}`)
      
      if (response && response.data) {
        return Array.isArray(response.data) ? response.data : [response.data]
      }
      
      return []
    } catch (error) {
      console.error('Failed to fetch ad group stats:', error)
      return []
    }
  }

  // ===== Campaign Type Specific Methods =====

  /**
   * 파워링크 캠페인 생성
   */
  async createPowerLinkCampaign(name: string, dailyBudget?: number): Promise<PowerLinkCampaign> {
    return this.createCampaign({
      name,
      campaignTp: CampaignType.WEB_SITE,
      dailyBudget,
      useDailyBudget: !!dailyBudget,
      deliveryMethod: 'STANDARD',
      trackingMode: 'TRACKING_DISABLED'
    })
  }

  /**
   * 파워링크 + 플레이스 통합 캠페인 생성
   * 1. 파워링크 캠페인 생성
   * 2. 광고그룹 생성
   * 3. 플레이스 AdExtension 추가
   */
  async createPowerLinkWithPlaceCampaign(
    name: string,
    placeId: string,
    placeName: string,
    dailyBudget?: number
  ): Promise<{
    campaign: PowerLinkCampaign
    adGroup: AdGroup
    placeExtension: AdExtension
  }> {
    // 1. 파워링크 캠페인 생성
    const campaign = await this.createPowerLinkCampaign(name, dailyBudget)
    
    // 2. 광고그룹 생성
    const adGroup = await this.createAdGroup({
      nccCampaignId: campaign.nccCampaignId!,
      name: `${name} - 광고그룹`,
      pcNetworkBidAmt: 100,
      mobileNetworkBidAmt: 120,
      useDailyBudget: false
    })
    
    // 3. 플레이스 AdExtension 추가
    const placeExtension = await this.createAdExtension({
      ownerId: adGroup.nccAdgroupId!,
      type: AdExtensionType.PLACE,
      pcMobileType: 'ALL',
      scheduledManagement: false,
      placeId,
      placeName
    })
    
    return { campaign, adGroup, placeExtension }
  }

  /**
   * 파워콘텐츠 캠페인 생성
   */
  async createPowerContentsCampaign(name: string, dailyBudget?: number): Promise<PowerLinkCampaign> {
    return this.createCampaign({
      name,
      campaignTp: CampaignType.POWER_CONTENTS,
      dailyBudget,
      useDailyBudget: !!dailyBudget
    })
  }

  // ===== Reporting & Statistics =====

  // Business Channel (Place) methods
  async getBusinessChannels(channelTp?: string): Promise<any[]> {
    try {
      let uri = '/ncc/channels'
      if (channelTp) {
        uri += `?channelTp=${channelTp}`
      }
      
      const result = await this.request('GET', uri)
      console.log('Business channels raw result:', result)
      
      // The API returns the array directly, not wrapped in a data property
      if (Array.isArray(result)) {
        return result
      }
      
      // If it's wrapped in data property, use that
      if (result && result.data && Array.isArray(result.data)) {
        return result.data
      }
      
      console.warn('Unexpected business channels response format:', result)
      return []
    } catch (error) {
      console.error('Failed to get business channels:', error)
      return []
    }
  }

  async getPurchasablePlaceChannels(): Promise<any[]> {
    try {
      const result = await this.request('GET', '/ncc/purchasable-place-channels')
      console.log('Purchasable place channels raw result:', result)
      
      // The API returns the array directly, not wrapped in a data property
      if (Array.isArray(result)) {
        return result
      }
      
      // If it's wrapped in data property, use that
      if (result && result.data && Array.isArray(result.data)) {
        return result.data
      }
      
      console.warn('Unexpected purchasable channels response format:', result)
      return []
    } catch (error) {
      console.error('Failed to get purchasable place channels:', error)
      return []
    }
  }

  async getBusinessChannel(channelId: string): Promise<any> {
    try {
      const result = await this.request('GET', `/ncc/channels/${channelId}`)
      return result.data
    } catch (error) {
      console.error('Failed to get business channel:', error)
      throw error
    }
  }

  async getCampaignStats(
    campaignId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<NaverStatsResponse> {
    // Use Stats API for accurate salesAmt data
    
    try {
      // Check date range limit (31 days max for StatReport API)
      if (dateFrom && dateTo) {
        const start = new Date(dateFrom)
        const end = new Date(dateTo)
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff > 31) {
          console.log(`Date range ${daysDiff} days exceeds 31 days limit, adjusting to last 31 days`)
          // Adjust to last 31 days from end date
          const adjustedStart = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
          dateFrom = adjustedStart.toISOString().split('T')[0]
        }
      }
      
      // Format dates properly (YYYY-MM-DD format for Stats API)
      const today = new Date()
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const formatDateForStats = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      // Use Stats API endpoint with proper parameters
      const campaigns = await this.getCampaigns()
      
      if (campaigns.length === 0) {
        console.log('No campaigns found')
        return {
          impCnt: 0,
          clkCnt: 0,
          salesAmt: 0,
          ctr: 0,
          cpc: 0,
          avgRnk: 0
        }
      }
      
      // Filter campaigns if specific campaignId is provided
      let targetCampaigns = campaigns
      if (campaignId) {
        targetCampaigns = campaigns.filter(c => c.nccCampaignId === campaignId)
        if (targetCampaigns.length === 0) {
          console.log(`Campaign ${campaignId} not found`)
          return {
            impCnt: 0,
            clkCnt: 0,
            salesAmt: 0,
            ctr: 0,
            cpc: 0,
            avgRnk: 0
          }
        }
        console.log(`Getting stats for specific campaign: ${targetCampaigns[0].name}`)
      } else {
        // If no specific campaign ID, get all PowerLink campaigns
        targetCampaigns = campaigns.filter(c => c.campaignTp === 'WEB_SITE')
        console.log(`Getting stats for ${targetCampaigns.length} PowerLink campaigns`)
      }
      
      // Get stats for each campaign
      let totalImp = 0
      let totalClicks = 0
      let totalCost = 0
      
      for (const campaign of targetCampaigns) {
        try {
          const params = new URLSearchParams()
          params.append('ids', campaign.nccCampaignId!)
          params.append('fields', '["impCnt","clkCnt","salesAmt","ctr","cpc","avgRnk","ccnt"]')
          
          // Use timeRange with dates
          const timeRange = {
            since: dateFrom || formatDateForStats(weekAgo),
            until: dateTo || formatDateForStats(today)
          }
          params.append('timeRange', JSON.stringify(timeRange))
          
          const uri = `/stats?${params.toString()}`
          const response = await this.axios.get(
            `${this.baseURL}${uri}`,
            {
              headers: this.getAuthHeaders('GET', `/stats`) // Only the path for signature
            }
          )
          
          if (response.status === 200 && response.data) {
            // Stats API returns {data: [...], compTm: ..., cycleBaseTm: ...}
            const statsArray = response.data.data || response.data
            const statData = Array.isArray(statsArray) ? statsArray[0] : null
            if (statData) {
              totalImp += statData.impCnt || 0
              totalClicks += statData.clkCnt || 0
              totalCost += statData.salesAmt || 0
              
              console.log(`Campaign ${campaign.name}: ${statData.impCnt} impressions, ${statData.clkCnt} clicks, ₩${statData.salesAmt} cost`)
            }
          }
        } catch (error: any) {
          console.log(`Stats API failed for campaign ${campaign.nccCampaignId}:`, error.response?.status, error.message)
        }
      }
      
      console.log(`✅ Total Stats: ${totalImp} impressions, ${totalClicks} clicks, ₩${Math.round(totalCost)} cost`)
      
      return {
        impCnt: totalImp,
        clkCnt: totalClicks,
        salesAmt: totalCost,
        ctr: totalImp > 0 ? (totalClicks / totalImp) * 100 : 0,
        cpc: totalClicks > 0 ? totalCost / totalClicks : 0,
        avgRnk: 0
      }
    } catch (error) {
      console.error('Failed to get stats:', error)
      
      // Fallback to StatReport API if Stats API fails completely
      try {
        return await this.getCampaignStatsViaReport(campaignId, dateFrom, dateTo)
      } catch (reportError) {
        console.error('StatReport API also failed:', reportError)
        return {
          impCnt: 0,
          clkCnt: 0,
          salesAmt: 0,
          ctr: 0,
          cpc: 0,
          avgRnk: 0
        }
      }
    }
  }
  
  private async getCampaignStatsViaReport(
    campaignId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<NaverStatsResponse> {
    // Format dates properly for StatReport API (YYYYMMDD)
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const formatDate = (date: Date | string): string => {
      if (typeof date === 'string') {
        return date.replace(/-/g, '')
      }
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}${month}${day}`
    }
    
    const startDate = dateFrom ? formatDate(dateFrom) : formatDate(weekAgo)
    const endDate = dateTo ? formatDate(dateTo) : formatDate(today)
    
    console.log(`📊 Using StatReport API from ${startDate} to ${endDate}...`)
    
    // Create AD report (most compatible type)
    const reportResponse = await this.request('POST', '/stat-reports', {
      reportTp: 'AD',
      statDt: startDate,
      endDt: endDate
    })
    
    if (!reportResponse?.reportJobId) {
      // Check if it's because there's no data
      if (reportResponse?.code === 10004) {
        console.log('No data available for the selected period')
        return {
          impCnt: 0,
          clkCnt: 0,
          salesAmt: 0,
          ctr: 0,
          cpc: 0,
          avgRnk: 0
        }
      }
      console.warn('Failed to create stat report')
      throw new Error('Failed to create stat report')
    }
    
    console.log(`Created report ${reportResponse.reportJobId}, waiting for completion...`)
    
    // Poll for completion
    let reportReady = false
    let downloadUrl = ''
    const maxAttempts = 20
    let noneCount = 0
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const status = await this.request('GET', `/stat-reports/${reportResponse.reportJobId}`)
      
      console.log(`Report status (attempt ${i + 1}/${maxAttempts}): ${status?.status || 'unknown'}`)
      
      if (status?.status === 'BUILT' || status?.status === 'DONE') {
        reportReady = true
        downloadUrl = status.downloadUrl
        break
      } else if (status?.status === 'FAILED') {
        console.log('Report generation failed')
        break
      } else if (status?.status === 'NONE') {
        noneCount++
        // If we get NONE status too many times, it might mean no data
        if (noneCount > 10) {
          console.log('Report status remains NONE - likely no data for period')
          return {
            impCnt: 0,
            clkCnt: 0,
            salesAmt: 0,
            ctr: 0,
            cpc: 0,
            avgRnk: 0
          }
        }
      }
    }
    
    if (!reportReady || !downloadUrl) {
      console.warn('Report generation timeout or failed')
      throw new Error('Report generation timeout')
    }
    
    // Download report with proper authentication
    const urlParts = new URL(downloadUrl)
    const path = urlParts.pathname
    const timestamp = Date.now().toString()
    const signature = this.generateSignature('GET', path, timestamp)
    
    const downloadResponse = await axios.get(downloadUrl, {
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY': this.apiKey,
        'X-Customer': this.customerId,
        'X-Signature': signature,
        'Accept': 'text/tab-separated-values'
      },
      responseType: 'text'
    })
    
    if (downloadResponse.status !== 200) {
      console.warn('Failed to download report')
      throw new Error('Failed to download report')
    }
    
    // Parse TSV data
    const lines = downloadResponse.data.split('\n').filter((line: string) => line.trim())
    const campaignStats = new Map()
    
    // Parse each line (AD report format without headers - CORRECTED)
    // Based on actual testing, the TSV columns are:
    // [0] Date (YYYYMMDD)
    // [1] Customer ID
    // [2] Campaign ID
    // [3-6] Various IDs (Ad Group, Keyword, Ad, etc.)
    // [7-8] Unknown fields
    // [9] Clicks (actual click count)
    // [10] Unknown (often single digit)
    // [11] Cost related (often fractional, needs *1000)
    // [12] Impressions (actual impression count)
    // [13] Unknown
    
    for (const line of lines) {
      const cells = line.split('\t')
      if (cells.length < 13) continue
      
      const parsedCampaignId = cells[2]
      // SWAPPED: Impressions is in column 12, Clicks in column 9
      const impressions = parseInt(cells[12]) || 0
      const clicks = parseInt(cells[9]) || 0
      
      // Cost is in column 11 for AD report
      // The values are fractional and need to be multiplied by 1000
      let cost = 0
      if (cells.length > 11 && cells[11]) {
        const rawCost = parseFloat(cells[11]) || 0
        // The cost values in TSV are divided by 1000
        // e.g., 0.19 actually means 190 won
        if (rawCost > 0) {
          cost = Math.round(rawCost * 1000)
        }
      }
      
      if (!campaignStats.has(parsedCampaignId)) {
        campaignStats.set(parsedCampaignId, {
          impressions: 0,
          clicks: 0,
          cost: 0
        })
      }
      
      const stats = campaignStats.get(parsedCampaignId)
      stats.impressions += impressions
      stats.clicks += clicks
      stats.cost += cost
    }
    
    // Return stats for specific campaign or aggregate
    if (campaignId && campaignStats.has(campaignId)) {
      const stats = campaignStats.get(campaignId)
      return {
        impCnt: stats.impressions,
        clkCnt: stats.clicks,
        salesAmt: stats.cost,
        ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0,
        cpc: stats.clicks > 0 ? stats.cost / stats.clicks : 0,
        avgRnk: 0
      }
    } else if (!campaignId) {
      // Aggregate all campaigns
      let totalImp = 0, totalClicks = 0, totalCost = 0
      campaignStats.forEach(stats => {
        totalImp += stats.impressions
        totalClicks += stats.clicks
        totalCost += stats.cost
      })
      
      return {
        impCnt: totalImp,
        clkCnt: totalClicks,
        salesAmt: totalCost,
        ctr: totalImp > 0 ? (totalClicks / totalImp) * 100 : 0,
        cpc: totalClicks > 0 ? totalCost / totalClicks : 0,
        avgRnk: 0
      }
    }
    
    return {
      impCnt: 0,
      clkCnt: 0,
      salesAmt: 0,
      ctr: 0,
      cpc: 0,
      avgRnk: 0
    }
  }
  
  private async getFallbackStats(campaignId?: string): Promise<NaverStatsResponse> {
    // Fallback to campaign totalChargeCost
    const campaigns = await this.getCampaigns()
    
    if (campaignId) {
      const campaign = campaigns.find(c => c.nccCampaignId === campaignId)
      return {
        impCnt: 0,
        clkCnt: 0,
        salesAmt: campaign?.totalChargeCost || 0,
        ctr: 0,
        cpc: 0,
        avgRnk: 0
      }
    }
    
    const totalCost = campaigns.reduce((sum, c) => sum + (c.totalChargeCost || 0), 0)
    return {
      impCnt: 0,
      clkCnt: 0,
      salesAmt: totalCost,
      ctr: 0,
      cpc: 0,
      avgRnk: 0
    }
  }
  
  async getCampaignById(campaignId: string): Promise<any> {
    try {
      const response = await this.request('GET', `/campaigns/${campaignId}`)
      return response
    } catch (error) {
      console.error(`Failed to get campaign ${campaignId}:`, error)
      return null
    }
  }

  // Get stats for multiple keywords using Job-based API (supports date ranges)
  async getMultipleKeywordStats(
    keywordIds: string[],
    dateFrom?: string,
    dateTo?: string
  ): Promise<Record<string, NaverStatsResponse>> {
    try {
      console.log(`Getting stats for ${keywordIds.length} keywords from ${dateFrom} to ${dateTo}`)
      
      // Check date range limit (31 days max)
      if (dateFrom && dateTo) {
        const start = new Date(dateFrom)
        const end = new Date(dateTo)
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        
        if (daysDiff > 31) {
          console.warn('Date range exceeds 31 days, adjusting to last 31 days')
          start.setTime(end.getTime() - (30 * 24 * 60 * 60 * 1000))
          dateFrom = start.toISOString().split('T')[0]
        }
      }
      
      // If date range specified, aggregate data from multiple reports
      if (dateFrom && dateTo) {
        return await this.aggregateKeywordStatsForDateRange(keywordIds, dateFrom, dateTo)
      }
      
      // Single day logic (for backward compatibility)
      const targetDate = dateTo || dateFrom || new Date().toISOString().split('T')[0]
      return await this.getKeywordStatsForSingleDay(keywordIds, targetDate)
    } catch (error: any) {
      console.error('Failed to fetch keyword stats:', error.message)
      // Return empty stats for all keywords
      const emptyStats: Record<string, NaverStatsResponse> = {}
      keywordIds.forEach(id => {
        emptyStats[id] = {
          impCnt: 0,
          clkCnt: 0,
          salesAmt: 0,
          ctr: 0,
          cpc: 0,
          avgRnk: 0
        }
      })
      return emptyStats
    }
  }

  // Get keyword stats for a single day
  private async getKeywordStatsForSingleDay(
    keywordIds: string[],
    targetDate: string
  ): Promise<Record<string, NaverStatsResponse>> {
    console.log(`Getting keyword stats for single day: ${targetDate}`)
    
    let downloadUrl = ''
    let reportJobId = ''
    
    // Check for existing report
    const existingReports = await this.request('GET', '/stat-reports')
    
    if (Array.isArray(existingReports)) {
      const existingReport = existingReports.find((r: any) => 
        r.reportTp === 'AD' && 
        r.status === 'BUILT' && 
        r.statDt && r.statDt.startsWith(targetDate) &&
        r.downloadUrl
      )
      
      if (existingReport) {
        downloadUrl = existingReport.downloadUrl
        reportJobId = existingReport.reportJobId
        console.log(`Using existing report for ${targetDate}: ${reportJobId}`)
      }
    }
    
    // Create new report if needed
    if (!downloadUrl) {
        console.log(`Creating new report for ${targetDate}...`)
        
        
        const reportBody = {
          reportTp: 'AD',  // Use AD type which includes keyword-level data
          statDt: `${targetDate}T00:00:00.000Z`  // ISO format that works!
        }
        
        console.log('Creating AD stat report (includes keyword data):', reportBody)
        
        const reportResponse = await this.request('POST', '/stat-reports', reportBody)
        
        if (!reportResponse?.reportJobId) {
          console.warn('Failed to create keyword stat report')
          throw new Error('Failed to create keyword stat report')
        }
        
        reportJobId = reportResponse.reportJobId
        console.log(`Created keyword report ${reportJobId}, waiting for completion...`)
        
        // Poll for completion
        let reportReady = false
        const maxAttempts = 20
        
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          const status = await this.request('GET', `/stat-reports/${reportJobId}`)
          
          console.log(`Keyword report status (attempt ${i + 1}/${maxAttempts}): ${status?.status || 'unknown'}`)
          
          if (status?.status === 'BUILT' || status?.status === 'DONE') {
            reportReady = true
            downloadUrl = status.downloadUrl
            break
          } else if (status?.status === 'FAILED') {
            console.log('Keyword report generation failed')
            break
          }
        }
        
        if (!reportReady || !downloadUrl) {
          console.warn('Keyword report generation timeout or failed')
          throw new Error('Keyword report generation timeout')
        }
      }
    
    // Download and parse the report
    return await this.downloadAndParseKeywordReport(downloadUrl, keywordIds)
  }

  // Aggregate keyword stats for a date range
  private async aggregateKeywordStatsForDateRange(
    keywordIds: string[],
    startDate: string,
    endDate: string
  ): Promise<Record<string, NaverStatsResponse>> {
    console.log(`Aggregating keyword stats from ${startDate} to ${endDate}`)
    
    // Get all dates in range
    const dates: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
    
    console.log(`Processing ${dates.length} days of data`)
    
    // Get existing reports
    const existingReports = await this.request('GET', '/stat-reports')
    const reportMap = new Map<string, any>()
    
    if (Array.isArray(existingReports)) {
      existingReports.forEach((report: any) => {
        if (report.reportTp === 'AD' && report.statDt) {
          const reportDate = report.statDt.split('T')[0]
          if (dates.includes(reportDate)) {
            reportMap.set(reportDate, report)
          }
        }
      })
    }
    
    console.log(`Found ${reportMap.size} existing reports out of ${dates.length} needed`)
    
    // Create missing reports
    const missingDates = dates.filter(date => !reportMap.has(date))
    
    if (missingDates.length > 0) {
      console.log(`Creating ${missingDates.length} missing reports...`)
      
      for (const date of missingDates) {
        try {
          const reportBody = {
            reportTp: 'AD',
            statDt: `${date}T00:00:00.000Z`
          }
          
          const reportResponse = await this.request('POST', '/stat-reports', reportBody)
          
          if (reportResponse?.reportJobId) {
            reportMap.set(date, reportResponse)
            console.log(`Created report for ${date}: ${reportResponse.reportJobId}`)
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500))
          
        } catch (error: any) {
          console.log(`Failed to create report for ${date}:`, error.message)
        }
      }
    }
    
    // Wait for reports to be built
    console.log('Waiting for reports to be built...')
    const pendingReports = Array.from(reportMap.entries())
      .filter(([_, report]) => report.status !== 'BUILT' && report.status !== 'DONE')
    
    if (pendingReports.length > 0) {
      const maxAttempts = 30
      let attempts = 0
      
      while (attempts < maxAttempts && pendingReports.length > 0) {
        attempts++
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        for (let i = pendingReports.length - 1; i >= 0; i--) {
          const [date, report] = pendingReports[i]
          
          try {
            const statusResponse = await this.request('GET', `/stat-reports/${report.reportJobId}`)
            
            if (statusResponse.status === 'BUILT' || statusResponse.status === 'DONE') {
              reportMap.set(date, statusResponse)
              pendingReports.splice(i, 1)
              console.log(`Report for ${date} is ready`)
            }
          } catch (error: any) {
            console.log(`Error checking report for ${date}:`, error.message)
          }
        }
        
        if (pendingReports.length > 0) {
          console.log(`Waiting for ${pendingReports.length} reports...`)
        }
      }
    }
    
    // Initialize aggregated stats
    const aggregatedStats: Record<string, NaverStatsResponse> = {}
    keywordIds.forEach(id => {
      aggregatedStats[id] = {
        impCnt: 0,
        clkCnt: 0,
        salesAmt: 0,
        ctr: 0,
        cpc: 0,
        avgRnk: 0
      }
    })
    
    // Download and aggregate all reports
    console.log('Downloading and aggregating data...')
    let successfulDownloads = 0
    
    for (const [date, report] of reportMap.entries()) {
      if ((report.status === 'BUILT' || report.status === 'DONE') && report.downloadUrl) {
        try {
          const dayStats = await this.downloadAndParseKeywordReport(report.downloadUrl, keywordIds)
          
          // Aggregate the daily stats
          Object.keys(dayStats).forEach(keywordId => {
            if (aggregatedStats[keywordId]) {
              aggregatedStats[keywordId].impCnt += dayStats[keywordId].impCnt || 0
              aggregatedStats[keywordId].clkCnt += dayStats[keywordId].clkCnt || 0
              aggregatedStats[keywordId].salesAmt += dayStats[keywordId].salesAmt || 0
            }
          })
          
          successfulDownloads++
          console.log(`Aggregated data for ${date}`)
          
        } catch (error: any) {
          console.log(`Failed to download data for ${date}:`, error.message)
        }
      }
    }
    
    console.log(`Successfully aggregated ${successfulDownloads} days of data`)
    
    // Calculate CTR and CPC
    Object.values(aggregatedStats).forEach(stats => {
      if (stats.impCnt > 0) {
        stats.ctr = (stats.clkCnt / stats.impCnt * 100)
      }
      if (stats.clkCnt > 0) {
        stats.cpc = Math.round(stats.salesAmt / stats.clkCnt)
      }
    })
    
    return aggregatedStats
  }

  // Download and parse a keyword report
  private async downloadAndParseKeywordReport(
    downloadUrl: string,
    keywordIds: string[]
  ): Promise<Record<string, NaverStatsResponse>> {
      // Download report with proper authentication
      const urlParts = new URL(downloadUrl)
      const path = urlParts.pathname
      const timestamp = Date.now().toString()
      const signature = this.generateSignature('GET', path, timestamp)
      
      const downloadResponse = await axios.get(downloadUrl, {
        headers: {
          'X-Timestamp': timestamp,
          'X-API-KEY': this.apiKey || this.accessKey,
          'X-Customer': this.customerId,
          'X-Signature': signature,
          'Accept': 'text/tab-separated-values'
        },
        responseType: 'text'
      })
      
      if (downloadResponse.status !== 200) {
        console.warn('Failed to download keyword report')
        throw new Error('Failed to download keyword report')
      }
      
      // Parse TSV data
      const lines = downloadResponse.data.split('\n').filter((line: string) => line.trim())
      const keywordStats: Record<string, NaverStatsResponse> = {}
      
      // Initialize all keywords with zero stats
      keywordIds.forEach(id => {
        keywordStats[id] = {
          impCnt: 0,
          clkCnt: 0,
          salesAmt: 0,
          ctr: 0,
          cpc: 0,
          avgRnk: 0
        }
      })
      
      // Parse each line (AD report format)
      // AD Report TSV columns based on actual testing:
      // [0] Date (YYYYMMDD)
      // [1] Customer ID
      // [2] Campaign ID
      // [3] Ad Group ID
      // [4] Keyword ID (this is what we need!)
      // [5] Ad ID
      // [6-8] Other IDs
      // [9] Average Rank (not clicks!)
      // [10] Clicks (corrected from [9])
      // [11] Cost (already in won, no multiplication needed)
      // [12] Impressions
      
      console.log(`Parsing ${lines.length} lines of TSV data for keyword stats...`)
      
      for (const line of lines) {
        const cells = line.split('\t')
        if (cells.length < 13) continue
        
        const keywordId = cells[4] // Keyword ID is in column 4
        
        // Skip empty or null keyword IDs
        if (!keywordId || keywordId === '' || keywordId === 'null' || keywordId === '-') continue
        
        // Check if this keyword is one we're looking for
        if (keywordIds.includes(keywordId)) {
          const impressions = parseInt(cells[12]) || 0
          const clicks = parseInt(cells[10]) || 0  // Changed from [9] to [10] - [9] is average rank
          const cost = parseFloat(cells[11]) || 0  // Cost is already in won, no multiplication needed
          
          // Aggregate stats if keyword appears multiple times (different dates)
          if (!keywordStats[keywordId]) {
            keywordStats[keywordId] = {
              impCnt: impressions,
              clkCnt: clicks,
              salesAmt: cost,
              ctr: 0,
              cpc: 0,
              avgRnk: 0
            }
          } else {
            // Add to existing stats
            keywordStats[keywordId].impCnt += impressions
            keywordStats[keywordId].clkCnt += clicks
            keywordStats[keywordId].salesAmt += cost
          }
        }
      }
      
      // Calculate CTR and CPC for keywords with data
      Object.keys(keywordStats).forEach(keywordId => {
        const stats = keywordStats[keywordId]
        if (stats.impCnt > 0) {
          stats.ctr = (stats.clkCnt / stats.impCnt * 100)
        }
        if (stats.clkCnt > 0) {
          stats.cpc = Math.round(stats.salesAmt / stats.clkCnt)
        }
      })
      
      return keywordStats
  }

  async getKeywordStats(
    keywordId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<NaverStatsResponse> {
    // Use the new multiple keyword stats method for single keyword
    const stats = await this.getMultipleKeywordStats([keywordId], dateFrom, dateTo)
    return stats[keywordId] || {
      impCnt: 0,
      clkCnt: 0,
      salesAmt: 0,
      ctr: 0,
      cpc: 0,
      avgRnk: 0
    }
  }

  // ===== Keyword Tools =====

  async getRelatedKeywords(keyword: string): Promise<any[]> {
    try {
      console.log('[NaverAdsAPI] Getting related keywords for:', keyword)
      
      const params = new URLSearchParams({
        hintKeywords: keyword,
        showDetail: '1',
        includeHintKeywords: '0',  // 입력 키워드는 제외하고 연관 키워드만
        returnEmptyResult: '1'     // 결과가 없어도 빈 결과 반환
      })

      const response = await this.request('GET', `/keywordstool?${params}`)
      console.log('[NaverAdsAPI] Related keywords response:', JSON.stringify(response, null, 2))
      
      const results = response?.keywordList || []
      
      return results.map((item: any) => {
        // 경쟁 정도 매핑
        let compIdx = item.compIdx || 'UNKNOWN'
        let compIdxKor = '알 수 없음'
        if (compIdx === 'HIGH') compIdxKor = '높음'
        else if (compIdx === 'MEDIUM') compIdxKor = '중간'
        else if (compIdx === 'LOW') compIdxKor = '낮음'
        
        return {
          relKeyword: item.relKeyword,
          keyword: item.relKeyword,
          bidAmt: compIdx === 'HIGH' ? 200 : compIdx === 'MEDIUM' ? 150 : 100,
          minBid: 70,
          competition: compIdx,
          compIdx: compIdxKor,
          monthlySearchVolume: parseInt(item.monthlyPcQcCnt || '0') + parseInt(item.monthlyMobileQcCnt || '0'),
          monthlyPcQcCnt: parseInt(item.monthlyPcQcCnt || '0'),
          monthlyMobileQcCnt: parseInt(item.monthlyMobileQcCnt || '0'),
          monthlyAvePcCtr: parseFloat(item.monthlyAvePcCtr || '0'),
          monthlyAveMobileCtr: parseFloat(item.monthlyAveMobileCtr || '0'),
          monthlyAvePcClkCnt: parseFloat(item.monthlyAvePcClkCnt || '0'),
          monthlyAveMobileClkCnt: parseFloat(item.monthlyAveMobileClkCnt || '0'),
          plAvgDepth: parseInt(item.plAvgDepth || '15')
        }
      }).slice(0, 100)
    } catch (error) {
      console.error('[NaverAdsAPI] Failed to get related keywords:', error)
      return []
    }
  }

  /**
   * 키워드 통계 조회 (키워드 분석용)
   */
  async getKeywordStats(keywords: string[]): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        hintKeywords: keywords.join(','),
        showDetail: '1'
      })

      console.log('Requesting keyword stats for:', keywords)
      const response = await this.request('GET', `/keywordstool?${params}`)
      const results = response?.keywordList || []
      console.log(`Received ${results.length} keyword results`)
      
      // 입력한 키워드와 정확히 일치하는 결과만 필터링
      const keywordSet = new Set(keywords.map(k => k.toLowerCase()))
      const exactMatches = results.filter((item: any) => 
        keywordSet.has(item.relKeyword?.toLowerCase())
      )
      
      console.log(`Found ${exactMatches.length} exact matches`)
      
      // 정확한 결과가 없으면 첫 번째 키워드로 기본값 생성
      if (exactMatches.length === 0 && keywords.length > 0) {
        console.log('No exact matches found, returning default values')
        return keywords.map(keyword => ({
          relKeyword: keyword,
          monthlyPcQcCnt: 0,
          monthlyMobileQcCnt: 0,
          monthlyAvePcCtr: 0,
          monthlyAveMobileCtr: 0,
          monthlyAvePcClkCnt: 0,
          monthlyAveMobileClkCnt: 0,
          plAvgDepth: 15,
          compIdx: '낮음'
        }))
      }
      
      // Handle string values like "< 10" for monthlyPcQcCnt
      return exactMatches.map((item: any) => ({
        relKeyword: item.relKeyword,
        monthlyPcQcCnt: typeof item.monthlyPcQcCnt === 'string' && item.monthlyPcQcCnt.includes('<') ? 5 : parseInt(item.monthlyPcQcCnt || '0'),
        monthlyMobileQcCnt: typeof item.monthlyMobileQcCnt === 'string' && item.monthlyMobileQcCnt.includes('<') ? 5 : parseInt(item.monthlyMobileQcCnt || '0'),
        monthlyAvePcCtr: parseFloat(item.monthlyAvePcCtr || '0'),
        monthlyAveMobileCtr: parseFloat(item.monthlyAveMobileCtr || '0'),
        monthlyAvePcClkCnt: parseFloat(item.monthlyAvePcClkCnt || '0'),
        monthlyAveMobileClkCnt: parseFloat(item.monthlyAveMobileClkCnt || '0'),
        plAvgDepth: parseInt(item.plAvgDepth || '15'),
        compIdx: item.compIdx || '낮음'
      }))
    } catch (error) {
      console.error('Failed to get keyword stats:', error)
      // 오류 시 기본값 반환
      return keywords.map(keyword => ({
        relKeyword: keyword,
        monthlyPcQcCnt: 0,
        monthlyMobileQcCnt: 0,
        monthlyAvePcCtr: 0,
        monthlyAveMobileCtr: 0,
        monthlyAvePcClkCnt: 0,
        monthlyAveMobileClkCnt: 0,
        plAvgDepth: 15,
        compIdx: '낮음'
      }))
    }
  }

  async getKeywordEstimate(keywords: string[]): Promise<KeywordEstimate[]> {
    try {
      const body = {
        device: 'PC',
        period: 'MONTH',
        items: keywords.map(keyword => ({
          key: keyword,
          position: 1,
          bidAmt: 100
        }))
      }

      const response = await this.request('POST', '/estimate/exposure-minimum-bid/keyword', body)
      const results = response?.items || []
      
      return results.map((item: any) => ({
        keyword: item.key,
        bidAmt: item.bidAmt || 100,
        minBid: 70,
        competition: item.competition || 'MEDIUM',
        monthlySearchVolume: item.monthlySearchVolume
      }))
    } catch (error) {
      console.error('Failed to get keyword estimate:', error)
      return []
    }
  }

  // ===== Utility Methods =====

  private getYesterday(): string {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0].replace(/-/g, '')
  }
  
  private formatDateForAPI(date: string): string {
    // Convert YYYY-MM-DD to YYYYMMDD
    return date.replace(/-/g, '')
  }

  async getAccountBalance(): Promise<{ bizmoney: number }> {
    try {
      // Bizmoney endpoint works! Returns current account balance
      const response = await this.request('GET', '/billing/bizmoney')
      console.log('Account balance:', response.bizmoney, 'won')
      return { bizmoney: response.bizmoney || 0 }
    } catch (error) {
      console.error('Failed to fetch account balance:', error)
      return { bizmoney: 0 }
    }
  }

  /**
   * 키워드 입찰가 일괄 조정
   */
  async adjustKeywordBids(adjustments: Array<{ keywordId: string, newBid: number }>): Promise<any> {
    const updates = adjustments.map(adj => ({
      nccKeywordId: adj.keywordId,
      bidAmt: adj.newBid
    }))
    
    return this.updateKeywords(updates)
  }

  /**
   * 전체 대시보드 데이터 조회
   */
  async getDashboardData(): Promise<any> {
    try {
      const [
        campaigns,
        adGroups,
        keywords,
        todayStats,
        balance
      ] = await Promise.all([
        this.getCampaigns(),
        this.getAdGroups(),
        this.getKeywords(),
        this.getCampaignStats(),
        this.getAccountBalance()
      ])

      // 활성 항목만 필터링
      const activeCampaigns = campaigns.filter(c => c.status === 'ENABLED')
      const activeAdGroups = adGroups.filter(a => a.status === 'ENABLED')
      const activeKeywords = keywords.filter(k => k.status === 'ENABLED')

      return {
        summary: {
          totalCampaigns: campaigns.length,
          activeCampaigns: activeCampaigns.length,
          totalAdGroups: adGroups.length,
          activeAdGroups: activeAdGroups.length,
          totalKeywords: keywords.length,
          activeKeywords: activeKeywords.length,
          accountBalance: balance
        },
        campaigns,
        adGroups,
        keywords,
        stats: {
          today: todayStats,
          week: todayStats,
          month: todayStats
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      throw error
    }
  }
}

// ===== Helper Functions =====

/**
 * 네이버 광고 자격 증명 저장
 */
export async function saveNaverAdsCredentials(
  userId: string,
  credentials: NaverAdsCredentials
): Promise<any> {
  // 자격 증명 검증
  try {
    const api = new NaverAdsAPI(credentials)
    await api.getCampaigns() // 인증 테스트
  } catch (error) {
    throw new Error('네이버 광고 API 인증 실패: 자격 증명을 확인하세요')
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      naverAdsCustomerId: credentials.customerId,
      naverAdsAccessKey: credentials.accessKey,
      naverAdsSecretKey: credentials.secretKey,
    }
  })
}

/**
 * 네이버 광고 자격 증명 조회
 */
export async function getNaverAdsCredentials(userId: string | number): Promise<NaverAdsCredentials | null> {
  const user = await prisma.user.findUnique({
    where: { id: typeof userId === 'string' ? parseInt(userId) : userId },
    select: {
      naverAdsCustomerId: true,
      naverAdsAccessKey: true,
      naverAdsSecretKey: true,
    }
  })

  if (!user?.naverAdsCustomerId || !user?.naverAdsAccessKey || !user?.naverAdsSecretKey) {
    return null
  }

  return {
    customerId: user.naverAdsCustomerId,
    accessKey: user.naverAdsAccessKey,
    secretKey: user.naverAdsSecretKey,
  }
}

// 싱글톤 인스턴스는 생성하지 않음 - 사용자별로 생성해야 함
// export const naverAdsApi = ...

export default NaverAdsAPI
