import crypto from 'crypto'
import axios, { AxiosInstance, AxiosError } from 'axios'

export interface NaverAdsConfig {
  customerId: string
  accessKey: string
  secretKey: string
  baseURL?: string
}

export interface Campaign {
  nccCampaignId?: string
  campaignTp: 'WEB_SITE' | 'SHOPPING' | 'BRAND_SEARCH' | 'POWER_CONTENTS' | 'PLACE'
  name: string
  customerId?: number
  dailyBudget?: number
  useDailyBudget?: boolean
  deliveryMethod?: 'STANDARD' | 'ACCELERATED'
  trackingMode?: 'TRACKING_DISABLED' | 'CONVERSION_TRACKING'
  period?: {
    since: string
    until: string
  }
  status?: 'ENABLED' | 'PAUSED' | 'DELETED'
  placeChannelKey?: string  // PLACE 캠페인용
}

export interface AdGroup {
  nccAdgroupId?: string
  nccCampaignId: string
  name: string
  pcChannelKey?: string
  mobileChannelKey?: string
  dailyBudget?: number
  useDailyBudget?: boolean
  bidAmt?: number
  contentsNetworkBidAmt?: number
  useCntsNetworkBidAmt?: boolean
  keywordPlusWeight?: number
  targets?: {
    pcDevice?: boolean
    mobileDevice?: boolean
    schedule?: Record<string, number[]>
    region?: {
      code: string[]
    }
  }
}

export interface Keyword {
  nccKeywordId?: string
  nccAdgroupId?: string
  keyword: string
  bidAmt?: number
  useGroupBidAmt?: boolean
  userLock?: boolean
}

export interface Ad {
  nccAdId?: string
  nccAdgroupId: string
  type: 'TEXT_45' | 'RSA_AD' | 'TEXT_AD' | 'PLACE_AD'
  ad: {
    headline?: string
    description?: string
    pc?: {
      final: string
      display?: string
    }
    mobile?: {
      final: string
      display?: string
    }
    placeChannelKey?: string  // PLACE_AD용
    businessInfo?: {
      phone?: string
      address?: string
      businessHours?: string
    }
  }
  inspectRequestMsg?: string
  userLock?: boolean
}

export class NaverAdsAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public response?: any
  ) {
    super(message)
    this.name = 'NaverAdsAPIError'
  }
}

export class NaverAdsAPIClient {
  private client: AxiosInstance
  private customerId: string
  private accessKey: string
  private secretKey: string

  constructor(config: NaverAdsConfig) {
    this.customerId = config.customerId
    this.accessKey = config.accessKey
    this.secretKey = config.secretKey

    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.searchad.naver.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      }
    })

    // 요청 인터셉터로 인증 헤더 추가
    this.client.interceptors.request.use(config => {
      const timestamp = Date.now().toString()
      const method = config.method?.toUpperCase() || 'GET'
      const uri = config.url || ''
      
      const signature = this.generateSignature(method, uri, timestamp)
      
      config.headers['X-Timestamp'] = timestamp
      config.headers['X-API-KEY'] = this.accessKey
      config.headers['X-Customer'] = this.customerId
      config.headers['X-Signature'] = signature
      
      console.log('📤 API Request:', {
        method,
        uri,
        headers: {
          'X-Timestamp': timestamp,
          'X-API-KEY': this.accessKey.substring(0, 10) + '...',
          'X-Customer': this.customerId,
          'X-Signature': signature.substring(0, 20) + '...'
        }
      })
      
      return config
    })

    // 응답 인터셉터로 에러 처리
    this.client.interceptors.response.use(
      response => {
        console.log('✅ API Response:', {
          status: response.status,
          data: response.data
        })
        return response.data
      },
      async error => {
        if (error.response) {
          console.error('❌ API Error:', {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
          })
          
          if (error.response.status === 429) {
            // Rate limiting - 재시도
            console.log('⏳ Rate limited, retrying...')
            return this.retryWithBackoff(error.config)
          }
          
          throw new NaverAdsAPIError(
            error.response.data?.message || error.message,
            error.response.status,
            error.response.data?.code,
            error.response.data
          )
        }
        throw error
      }
    )
  }

  private generateSignature(method: string, uri: string, timestamp: string): string {
    // HMAC-SHA256 서명 생성
    const message = `${timestamp}.${method}.${uri}`
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64')
    
    console.log('🔐 Signature Generation:', {
      message,
      secretKey: this.secretKey.substring(0, 10) + '...',
      signature: signature.substring(0, 20) + '...'
    })
    
    return signature
  }

  private async retryWithBackoff(config: any, attempt: number = 1): Promise<any> {
    if (attempt > 3) {
      throw new NaverAdsAPIError('Max retries exceeded', 429)
    }
    
    const delay = Math.pow(2, attempt) * 1000
    console.log(`⏳ Retrying after ${delay}ms (attempt ${attempt}/3)`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    return this.client(config)
  }

  // ============= 캠페인 관리 =============
  
  async createCampaign(campaign: Campaign): Promise<Campaign> {
    console.log('🚀 Creating campaign:', campaign)
    
    // customerId를 숫자로 변환
    const payload = {
      ...campaign,
      customerId: parseInt(this.customerId)
    }
    
    return this.client.post('/ncc/campaigns', payload)
  }

  async getCampaigns(options?: { campaignId?: string }): Promise<Campaign[]> {
    const params = options?.campaignId ? { nccCampaignId: options.campaignId } : {}
    return this.client.get('/ncc/campaigns', { params })
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    return this.client.get(`/ncc/campaigns/${campaignId}`)
  }

  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    return this.client.put(`/ncc/campaigns/${campaignId}`, updates)
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    return this.client.delete(`/ncc/campaigns/${campaignId}`)
  }

  // ============= 광고그룹 관리 =============
  
  async createAdGroup(adgroup: AdGroup): Promise<AdGroup> {
    console.log('📁 Creating ad group:', adgroup)
    return this.client.post('/ncc/adgroups', adgroup)
  }

  async getAdGroups(campaignId?: string): Promise<AdGroup[]> {
    const params = campaignId ? { nccCampaignId: campaignId } : {}
    return this.client.get('/ncc/adgroups', { params })
  }

  async getAdGroup(adgroupId: string): Promise<AdGroup> {
    return this.client.get(`/ncc/adgroups/${adgroupId}`)
  }

  async updateAdGroup(adgroupId: string, updates: Partial<AdGroup>): Promise<AdGroup> {
    return this.client.put(`/ncc/adgroups/${adgroupId}`, updates)
  }

  async deleteAdGroup(adgroupId: string): Promise<void> {
    return this.client.delete(`/ncc/adgroups/${adgroupId}`)
  }

  // ============= 키워드 관리 =============
  
  async addKeywords(adgroupId: string, keywords: Omit<Keyword, 'nccAdgroupId'>[]): Promise<Keyword[]> {
    console.log('🔑 Adding keywords:', keywords)
    
    // 입찰가 검증
    keywords.forEach(kw => {
      if (kw.bidAmt) {
        if (kw.bidAmt < 70) {
          throw new NaverAdsAPIError(`최소 입찰가는 70원입니다: ${kw.keyword}`)
        }
        if (kw.bidAmt > 100000) {
          throw new NaverAdsAPIError(`최대 입찰가는 100,000원입니다: ${kw.keyword}`)
        }
      }
    })
    
    return this.client.post('/ncc/keywords', {
      nccAdgroupId: adgroupId,
      keywords
    })
  }

  async getKeywords(adgroupId?: string): Promise<Keyword[]> {
    const params = adgroupId ? { nccAdgroupId: adgroupId } : {}
    return this.client.get('/ncc/keywords', { params })
  }

  async updateKeywordBids(updates: { nccKeywordId: string; bidAmt: number }[]): Promise<Keyword[]> {
    return this.client.put('/ncc/keywords', { keywords: updates })
  }

  async deleteKeywords(keywordIds: string[]): Promise<void> {
    return this.client.delete('/ncc/keywords', {
      params: { ids: keywordIds.join(',') }
    })
  }

  // ============= 광고 소재 관리 =============
  
  async createAd(ad: Ad): Promise<Ad> {
    console.log('📝 Creating ad:', ad)
    
    // 문자 길이 검증
    if (ad.ad.headline && ad.ad.headline.length > 15) {
      throw new NaverAdsAPIError('제목은 15자를 초과할 수 없습니다')
    }
    if (ad.ad.description && ad.ad.description.length > 45) {
      throw new NaverAdsAPIError('설명은 45자를 초과할 수 없습니다')
    }
    
    return this.client.post('/ncc/ads', ad)
  }

  async getAds(adgroupId?: string): Promise<Ad[]> {
    const params = adgroupId ? { nccAdgroupId: adgroupId } : {}
    return this.client.get('/ncc/ads', { params })
  }

  async updateAd(adId: string, updates: Partial<Ad>): Promise<Ad> {
    return this.client.put(`/ncc/ads/${adId}`, updates)
  }

  async deleteAd(adId: string): Promise<void> {
    return this.client.delete(`/ncc/ads/${adId}`)
  }

  // ============= 통계 조회 =============
  
  async getStats(
    id: string,
    options: {
      fields?: string[]
      timeRange?: {
        since: string
        until: string
      }
      datePreset?: string
      timeIncrement?: string
      breakdown?: string
    } = {}
  ): Promise<any> {
    const params = {
      id,
      fields: options.fields?.join(',') || 'impCnt,clkCnt,ctr,cpc,salesAmt',
      ...options.timeRange,
      datePreset: options.datePreset || 'LAST_7_DAYS',
      timeIncrement: options.timeIncrement || 'allDays',
      breakdown: options.breakdown
    }
    
    return this.client.get('/stats', { params })
  }
}