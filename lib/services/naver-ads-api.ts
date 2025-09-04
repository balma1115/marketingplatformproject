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
  accessKey: string
  secretKey: string
}

export interface PowerLinkCampaign {
  nccCampaignId?: string
  customerId: number
  name: string
  campaignTp: CampaignType
  deliveryMethod: 'STANDARD' | 'ACCELERATED'
  dailyBudget?: number
  useDailyBudget?: boolean
  status?: 'ENABLED' | 'PAUSED' | 'DELETED'
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
  status?: 'ENABLED' | 'PAUSED' | 'DELETED'
  statusReason?: string
  regTm?: string
  editTm?: string
}

export interface Keyword {
  nccKeywordId?: string
  nccAdgroupId: string
  keyword: string
  bidAmt?: number
  useGroupBidAmt?: boolean
  status?: 'ENABLED' | 'PAUSED' | 'DELETED'
  statusReason?: string
  qualityIndex?: number
  regTm?: string
  editTm?: string
}

export interface Ad {
  nccAdId?: string
  nccAdgroupId: string
  adTp: AdType
  headline: string
  description: string
  pc?: {
    final: string
  }
  mobile?: {
    final: string
  }
  status?: 'ENABLED' | 'PAUSED' | 'DELETED'
  statusReason?: string
  regTm?: string
  editTm?: string
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
  private apiKey: string
  private secretKey: string
  private customerId: string
  private axios: AxiosInstance
  private baseURL = 'https://api.searchad.naver.com'
  private maxRetries = 3
  private retryDelay = 1000

  constructor(config?: NaverAdsCredentials) {
    if (!config?.accessKey || !config?.secretKey || !config?.customerId) {
      throw new Error('Naver Ads API 인증 정보가 필요합니다')
    }
    
    this.apiKey = config.accessKey
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
  private generateSignature(method: string, uri: string, timestamp: string): string {
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
    const signature = this.generateSignature(method, uri, timestamp)

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
  private async request(method: string, endpoint: string, data?: any, retryCount = 0): Promise<any> {
    // endpoint가 이미 /ncc로 시작하면 그대로 사용, 아니면 /ncc 추가
    const uri = endpoint.startsWith('/ncc') ? endpoint : `/ncc${endpoint}`
    const fullUrl = `${this.baseURL}${uri}`
    
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

  async getAdGroups(campaignId?: string): Promise<AdGroup[]> {
    try {
      const params = campaignId ? `?nccCampaignId=${campaignId}` : ''
      const response = await this.request('GET', `/adgroups${params}`)
      return response || []
    } catch (error) {
      console.error('Failed to fetch ad groups:', error)
      return []
    }
  }

  async getAdGroup(adgroupId: string): Promise<AdGroup> {
    return this.request('GET', `/adgroups/${adgroupId}`)
  }

  async createAdGroup(adGroup: Partial<AdGroup>): Promise<AdGroup> {
    return this.request('POST', '/adgroups', adGroup)
  }

  async updateAdGroup(adgroupId: string, updates: Partial<AdGroup>): Promise<AdGroup> {
    return this.request('PUT', `/adgroups/${adgroupId}`, updates)
  }

  async deleteAdGroup(adgroupId: string): Promise<void> {
    return this.request('DELETE', `/adgroups/${adgroupId}`)
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

  async getCampaignStats(
    campaignId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<NaverStatsResponse> {
    // IMPORTANT FINDINGS (Jan 2025):
    // 1. Naver Ads API doesn't have a /stats endpoint (returns 404)
    // 2. Campaigns include totalChargeCost (total spent) and expectCost (expected today)
    // 3. Test campaign has totalChargeCost: 0 because it never ran (created but not active)
    // 4. All detailed stats (impressions, clicks, CTR) are genuinely 0
    
    try {
      const campaigns = await this.getCampaigns()
      
      if (campaignId) {
        const campaign = campaigns.find(c => c.nccCampaignId === campaignId)
        if (campaign) {
          console.log(`📊 Campaign "${campaign.name}" actual data:`)
          console.log(`- Total spent: ${campaign.totalChargeCost} won`)
          console.log(`- Expected cost today: ${campaign.expectCost} won`)
          console.log(`- Status: ${campaign.status}`)
          console.log(`- Created: ${new Date(campaign.regTm).toLocaleDateString()}`)
          
          // If campaign hasn't spent money, it means it never ran
          if (campaign.totalChargeCost === 0) {
            console.log('⚠️ Campaign has not run yet (0 won spent)')
          }
          
          // Return actual data from campaign
          return {
            impCnt: 0,  // No impressions data in API
            clkCnt: 0,  // No clicks data in API
            salesAmt: campaign.totalChargeCost || 0,  // Total amount spent
            ctr: 0,     // No CTR data in API
            cpc: 0,     // No CPC data in API
            avgRnk: 0   // No ranking data in API
          }
        }
      } else {
        // Aggregate stats for all campaigns
        const totalSpent = campaigns.reduce((sum, c) => sum + (c.totalChargeCost || 0), 0)
        const totalExpected = campaigns.reduce((sum, c) => sum + (c.expectCost || 0), 0)
        
        console.log(`📊 All campaigns aggregate data:`)
        console.log(`- Total spent: ${totalSpent} won`)
        console.log(`- Total expected today: ${totalExpected} won`)
        console.log(`- Active campaigns: ${campaigns.filter(c => c.status === 'ELIGIBLE').length}`)
        
        return {
          impCnt: 0,
          clkCnt: 0,
          salesAmt: totalSpent,
          ctr: 0,
          cpc: 0,
          avgRnk: 0
        }
      }
      
      // Default return if campaign not found
      return {
        impCnt: 0,
        clkCnt: 0,
        salesAmt: 0,
        ctr: 0,
        cpc: 0,
        avgRnk: 0
      }
    } catch (error) {
      console.error('Failed to get campaign stats:', error)
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
  
  async getCampaignById(campaignId: string): Promise<any> {
    try {
      const response = await this.request('GET', `/campaigns/${campaignId}`)
      return response
    } catch (error) {
      console.error(`Failed to get campaign ${campaignId}:`, error)
      return null
    }
  }

  async getKeywordStats(
    keywordId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<NaverStatsResponse> {
    try {
      const params = new URLSearchParams({
        entity: 'KEYWORD',
        ids: keywordId,
        dateFrom: dateFrom || this.getYesterday(),
        dateTo: dateTo || this.getYesterday()
      })
      
      const response = await this.request('GET', `/stats/keyword?${params}`)
      const data = response?.[0] || {}
      
      return {
        impCnt: data.impCnt || 0,
        clkCnt: data.clkCnt || 0,
        salesAmt: data.salesAmt || 0,
        ctr: data.ctr || 0,
        cpc: data.cpc || 0,
        avgRnk: data.avgRnk || 0,
        ccnt: data.ccnt
      }
    } catch (error) {
      console.error('Failed to fetch keyword stats:', error)
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

  // ===== Keyword Tools =====

  async getRelatedKeywords(keyword: string): Promise<KeywordEstimate[]> {
    try {
      const params = new URLSearchParams({
        hintKeywords: keyword,
        showDetail: '1'
      })

      const response = await this.request('GET', `/keywordstool?${params}`)
      const results = response?.keywordList || []
      
      return results.map((item: any) => ({
        keyword: item.relKeyword,
        bidAmt: item.compIdx === 'HIGH' ? 200 : item.compIdx === 'MEDIUM' ? 150 : 100,
        minBid: 70,
        competition: item.compIdx || 'MEDIUM',
        monthlySearchVolume: item.monthlyPcQcCnt + item.monthlyMobileQcCnt
      })).slice(0, 50)
    } catch (error) {
      console.error('Failed to get related keywords:', error)
      return []
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
export async function getNaverAdsCredentials(userId: string): Promise<NaverAdsCredentials | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

export default NaverAdsAPI
