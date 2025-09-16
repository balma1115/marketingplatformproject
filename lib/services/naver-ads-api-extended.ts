import crypto from 'crypto'
import axios, { AxiosInstance, AxiosError } from 'axios'
import { NaverAdsAPI } from './naver-ads-api'

// Extended API interfaces for complete functionality
export interface StatReportRequest {
  reportTp: 'CAMPAIGN' | 'ADGROUP' | 'AD' | 'KEYWORD' | 'AD_EXTENSION'
  start: string  // YYYY-MM-DD format
  end: string    // YYYY-MM-DD format
  ids?: string[]
  timeIncrement?: 'allDays' | 'daily' | 'weekly' | 'monthly'
  fields?: string[]
  breakdown?: 'hh24' | 'day' | 'week' | 'month'
}

export interface StatReportResponse {
  id: string
  customerId?: number
  reportTp?: string
  statDt?: string
  impCnt: number       // 노출수
  clkCnt: number       // 클릭수
  salesAmt: number     // 비용
  ctr: number          // 클릭률 (%)
  cpc: number          // 평균 클릭비용
  avgRnk?: number      // 평균 순위
  ccnt?: number        // 전환수
  convAmt?: number     // 전환 매출
  viewCnt?: number     // 조회수
  avgDepth?: number    // 평균 체류 깊이
}

export interface MasterReportRequest {
  reportTp: string
  time: {
    start: string    // YYYY-MM-DD
    end: string      // YYYY-MM-DD
  }
  dimension?: string[]
  metric?: string[]
  filter?: any
}

export interface BusinessChannel {
  nccBusinessChannelId?: string
  businessChannelKey?: string
  channelTp: 'SITE' | 'PHONE' | 'MAP' | 'TALK'
  name: string
  enabled?: boolean
  channelId?: string
  businessId?: string
  statusReason?: string
  editTm?: string
  regTm?: string
  status?: string
  inspectStatus?: string
  penalties?: any[]
}

export interface ManagedKeyword {
  keyword: string
  monthlyPcQcCnt?: number      // PC 월간 검색수
  monthlyMobileQcCnt?: number  // 모바일 월간 검색수
  monthlyAvePcClkCnt?: number  // PC 평균 클릭수
  monthlyAveMobileClkCnt?: number // 모바일 평균 클릭수
  plAvgDepth?: number          // 평균 노출 깊이
  compIdx?: 'LOW' | 'MEDIUM' | 'HIGH'  // 경쟁도
}

export interface IpExclusion {
  ipExclusionId?: string
  customerId?: number
  filterIp: string
  memo?: string
  regTm?: string
  editTm?: string
}

export interface EstimateRequest {
  device: 'PC' | 'MOBILE' | 'BOTH'
  period?: 'DAY' | 'MONTH'
  items: Array<{
    key: string      // 키워드
    position?: number // 목표 순위
    bidAmt?: number  // 입찰가
  }>
}

export interface EstimateResponse {
  device: string
  period: string
  items: Array<{
    key: string
    bidAmt: number
    minBid?: number
    maxBid?: number
    estimate?: {
      impressions: number
      clicks: number
      cost: number
      position: number
    }
  }>
}

// Extended Naver Ads API Class
export class NaverAdsAPIExtended extends NaverAdsAPI {
  
  // ===== StatReport API (통계 리포트) =====
  
  /**
   * 통계 리포트 조회 - 개선된 버전
   */
  async getStatReportsEnhanced(params: StatReportRequest): Promise<StatReportResponse[]> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams()
      queryParams.append('reportTp', params.reportTp)
      queryParams.append('start', params.start)
      queryParams.append('end', params.end)
      
      if (params.ids && params.ids.length > 0) {
        queryParams.append('ids', params.ids.join(','))
      }
      
      if (params.timeIncrement) {
        queryParams.append('timeIncrement', params.timeIncrement)
      }
      
      if (params.fields && params.fields.length > 0) {
        queryParams.append('fields', params.fields.join(','))
      }
      
      if (params.breakdown) {
        queryParams.append('breakdown', params.breakdown)
      }
      
      // Use GET method with query parameters
      const response = await this.request('GET', `/stat-reports?${queryParams.toString()}`)
      
      // If response is direct data
      if (Array.isArray(response)) {
        return response
      }
      
      // If response contains data field
      if (response?.data) {
        return Array.isArray(response.data) ? response.data : [response.data]
      }
      
      // If response is a single object
      if (response && typeof response === 'object') {
        return [response]
      }
      
      return []
    } catch (error) {
      console.error('Failed to fetch enhanced stat reports:', error)
      
      // Fallback to base implementation
      const dateRange = {
        since: params.start.replace(/-/g, ''),
        until: params.end.replace(/-/g, '')
      }
      
      return this.getStatReports({
        reportTp: params.reportTp,
        dateRange,
        ids: params.ids,
        timeIncrement: params.timeIncrement === 'daily' ? '1' : 
                      params.timeIncrement === 'weekly' ? '7' : 
                      params.timeIncrement === 'monthly' ? 'month' : 'allDays'
      })
    }
  }
  
  /**
   * 캠페인별 상세 통계 조회
   */
  async getCampaignDetailedStats(
    campaignId: string,
    start: string,
    end: string
  ): Promise<StatReportResponse> {
    const reports = await this.getStatReportsEnhanced({
      reportTp: 'CAMPAIGN',
      start,
      end,
      ids: [campaignId],
      fields: ['impCnt', 'clkCnt', 'salesAmt', 'ctr', 'cpc', 'avgRnk', 'ccnt', 'convAmt']
    })
    
    return reports[0] || {
      id: campaignId,
      impCnt: 0,
      clkCnt: 0,
      salesAmt: 0,
      ctr: 0,
      cpc: 0
    }
  }
  
  /**
   * 광고그룹별 상세 통계 조회
   */
  async getAdGroupDetailedStats(
    adgroupId: string,
    start: string,
    end: string
  ): Promise<StatReportResponse> {
    const reports = await this.getStatReportsEnhanced({
      reportTp: 'ADGROUP',
      start,
      end,
      ids: [adgroupId],
      fields: ['impCnt', 'clkCnt', 'salesAmt', 'ctr', 'cpc', 'avgRnk', 'ccnt']
    })
    
    return reports[0] || {
      id: adgroupId,
      impCnt: 0,
      clkCnt: 0,
      salesAmt: 0,
      ctr: 0,
      cpc: 0
    }
  }
  
  /**
   * 키워드별 상세 통계 조회
   */
  async getKeywordDetailedStats(
    keywordIds: string[],
    start: string,
    end: string
  ): Promise<StatReportResponse[]> {
    return this.getStatReportsEnhanced({
      reportTp: 'KEYWORD',
      start,
      end,
      ids: keywordIds,
      fields: ['impCnt', 'clkCnt', 'salesAmt', 'ctr', 'cpc', 'avgRnk', 'ccnt']
    })
  }
  
  /**
   * 광고 소재별 상세 통계 조회
   */
  async getAdDetailedStats(
    adIds: string[],
    start: string,
    end: string
  ): Promise<StatReportResponse[]> {
    return this.getStatReportsEnhanced({
      reportTp: 'AD',
      start,
      end,
      ids: adIds,
      fields: ['impCnt', 'clkCnt', 'salesAmt', 'ctr', 'cpc', 'avgRnk']
    })
  }
  
  // ===== BusinessChannel API (비즈니스 채널) =====
  
  /**
   * 비즈니스 채널 목록 조회
   */
  async getBusinessChannels(channelTp?: string): Promise<BusinessChannel[]> {
    try {
      const params = channelTp ? `?channelTp=${channelTp}` : ''
      const response = await this.request('GET', `/channels${params}`)
      return response || []
    } catch (error) {
      console.error('Failed to fetch business channels:', error)
      return []
    }
  }
  
  /**
   * 비즈니스 채널 생성
   */
  async createBusinessChannel(channel: Partial<BusinessChannel>): Promise<BusinessChannel> {
    return this.request('POST', '/channels', channel)
  }
  
  /**
   * 비즈니스 채널 수정
   */
  async updateBusinessChannel(
    channelId: string,
    updates: Partial<BusinessChannel>
  ): Promise<BusinessChannel> {
    return this.request('PUT', `/channels/${channelId}`, updates)
  }
  
  /**
   * 비즈니스 채널 삭제
   */
  async deleteBusinessChannel(channelId: string): Promise<void> {
    return this.request('DELETE', `/channels/${channelId}`)
  }
  
  // ===== ManagedKeyword API (관리 키워드) =====
  
  /**
   * 관리 키워드 조회 (월간 검색수 및 경쟁도)
   */
  async getManagedKeywords(keywords: string[]): Promise<ManagedKeyword[]> {
    try {
      const params = `?keywords=${keywords.join(',')}`
      const response = await this.request('GET', `/managedKeyword${params}`)
      return response || []
    } catch (error) {
      console.error('Failed to fetch managed keywords:', error)
      return []
    }
  }
  
  // ===== IpExclusion API (IP 제외) =====
  
  /**
   * 제외 IP 목록 조회
   */
  async getIpExclusions(): Promise<IpExclusion[]> {
    try {
      const response = await this.request('GET', '/tool/ip-exclusions')
      return response || []
    } catch (error) {
      console.error('Failed to fetch IP exclusions:', error)
      return []
    }
  }
  
  /**
   * 제외 IP 추가
   */
  async createIpExclusion(ip: string, memo?: string): Promise<IpExclusion> {
    return this.request('POST', '/tool/ip-exclusions', {
      filterIp: ip,
      memo
    })
  }
  
  /**
   * 제외 IP 삭제
   */
  async deleteIpExclusion(id: string): Promise<void> {
    return this.request('DELETE', `/tool/ip-exclusions/${id}`)
  }
  
  // ===== Estimate API (예상 비용) =====
  
  /**
   * 평균 노출 위치별 예상 입찰가
   */
  async getAveragePositionBid(request: EstimateRequest): Promise<EstimateResponse> {
    try {
      const response = await this.request(
        'POST', 
        '/estimate/average-position-bid/keyword',
        request
      )
      return response
    } catch (error) {
      console.error('Failed to get average position bid:', error)
      throw error
    }
  }
  
  /**
   * 최소 노출 입찰가
   */
  async getExposureMinimumBid(request: EstimateRequest): Promise<EstimateResponse> {
    try {
      const response = await this.request(
        'POST',
        '/estimate/exposure-minimum-bid/keyword',
        request
      )
      return response
    } catch (error) {
      console.error('Failed to get minimum bid:', error)
      throw error
    }
  }
  
  /**
   * 예상 입찰가별 성과 예측
   */
  async getPerformanceEstimate(request: EstimateRequest): Promise<EstimateResponse> {
    try {
      const response = await this.request(
        'POST',
        '/estimate/performance/keyword',
        request
      )
      return response
    } catch (error) {
      console.error('Failed to get performance estimate:', error)
      throw error
    }
  }
  
  // ===== MasterReport API (마스터 리포트) =====
  
  /**
   * 마스터 리포트 생성
   */
  async createMasterReport(request: MasterReportRequest): Promise<any> {
    try {
      const response = await this.request('POST', '/master-reports', request)
      return response
    } catch (error) {
      console.error('Failed to create master report:', error)
      throw error
    }
  }
  
  /**
   * 마스터 리포트 조회
   */
  async getMasterReport(reportId: string): Promise<any> {
    try {
      const response = await this.request('GET', `/master-reports/${reportId}`)
      return response
    } catch (error) {
      console.error('Failed to get master report:', error)
      throw error
    }
  }
  
  /**
   * 마스터 리포트 목록 조회
   */
  async getMasterReports(): Promise<any[]> {
    try {
      const response = await this.request('GET', '/master-reports')
      return response || []
    } catch (error) {
      console.error('Failed to get master reports:', error)
      return []
    }
  }
  
  /**
   * 마스터 리포트 삭제
   */
  async deleteMasterReport(reportId: string): Promise<void> {
    return this.request('DELETE', `/master-reports/${reportId}`)
  }
  
  // ===== RelKwdStat API (연관 키워드 통계) =====
  
  /**
   * 연관 키워드 및 통계 조회
   */
  async getRelatedKeywordStats(params: {
    hintKeywords?: string
    businessId?: string
    season?: string
    eventId?: string
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams()
      
      if (params.hintKeywords) {
        queryParams.append('hintKeywords', params.hintKeywords)
      }
      if (params.businessId) {
        queryParams.append('businessId', params.businessId)
      }
      if (params.season) {
        queryParams.append('season', params.season)
      }
      if (params.eventId) {
        queryParams.append('eventId', params.eventId)
      }
      
      const response = await this.request('GET', `/keywordstool?${queryParams.toString()}`)
      return response?.keywordList || []
    } catch (error) {
      console.error('Failed to get related keyword stats:', error)
      return []
    }
  }
  
  // ===== Comprehensive Dashboard Data =====
  
  /**
   * 전체 대시보드 데이터 조회 (향상된 버전)
   */
  async getComprehensiveDashboardData(
    dateRange?: { start: string, end: string }
  ): Promise<any> {
    try {
      // Default to last 7 days
      const today = new Date()
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const start = dateRange?.start || weekAgo.toISOString().split('T')[0]
      const end = dateRange?.end || today.toISOString().split('T')[0]
      
      // Fetch all data in parallel
      const [
        campaigns,
        balance,
        channels
      ] = await Promise.all([
        this.getCampaigns(),
        this.getAccountBalance(),
        this.getBusinessChannels()
      ])
      
      // Get detailed data for each campaign
      const campaignDetails = await Promise.all(
        campaigns.map(async (campaign) => {
          const [adGroups, stats] = await Promise.all([
            this.getAdGroups({ nccCampaignId: campaign.nccCampaignId }),
            this.getCampaignDetailedStats(campaign.nccCampaignId!, start, end)
          ])
          
          // Get data for each ad group
          const adGroupDetails = await Promise.all(
            adGroups.map(async (adGroup) => {
              const [keywords, ads, adGroupStats] = await Promise.all([
                this.getKeywords(adGroup.nccAdgroupId),
                this.getAds(adGroup.nccAdgroupId),
                this.getAdGroupDetailedStats(adGroup.nccAdgroupId!, start, end)
              ])
              
              return {
                ...adGroup,
                keywords,
                ads,
                stats: adGroupStats
              }
            })
          )
          
          return {
            ...campaign,
            adGroups: adGroupDetails,
            stats
          }
        })
      )
      
      // Calculate totals
      const totals = {
        campaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'ELIGIBLE').length,
        adGroups: campaignDetails.reduce((sum, c) => sum + c.adGroups.length, 0),
        activeAdGroups: campaignDetails.reduce(
          (sum, c) => sum + c.adGroups.filter(a => a.status === 'ELIGIBLE').length, 
          0
        ),
        keywords: campaignDetails.reduce(
          (sum, c) => sum + c.adGroups.reduce((s, a) => s + a.keywords.length, 0),
          0
        ),
        ads: campaignDetails.reduce(
          (sum, c) => sum + c.adGroups.reduce((s, a) => s + a.ads.length, 0),
          0
        ),
        totalBudget: campaigns.reduce((sum, c) => sum + (c.dailyBudget || 0), 0),
        totalSpent: campaignDetails.reduce((sum, c) => sum + c.stats.salesAmt, 0),
        totalImpressions: campaignDetails.reduce((sum, c) => sum + c.stats.impCnt, 0),
        totalClicks: campaignDetails.reduce((sum, c) => sum + c.stats.clkCnt, 0),
        avgCtr: campaignDetails.length > 0 
          ? campaignDetails.reduce((sum, c) => sum + c.stats.ctr, 0) / campaignDetails.length
          : 0,
        avgCpc: campaignDetails.reduce((sum, c) => sum + c.stats.clkCnt, 0) > 0
          ? campaignDetails.reduce((sum, c) => sum + c.stats.salesAmt, 0) / 
            campaignDetails.reduce((sum, c) => sum + c.stats.clkCnt, 0)
          : 0
      }
      
      return {
        dateRange: { start, end },
        balance,
        totals,
        campaigns: campaignDetails,
        channels
      }
    } catch (error) {
      console.error('Failed to fetch comprehensive dashboard data:', error)
      throw error
    }
  }
}

export default NaverAdsAPIExtended