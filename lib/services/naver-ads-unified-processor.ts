/**
 * Naver Ads Unified Data Processor
 * 
 * StatReport API를 통해 캠페인, 광고그룹, 키워드 데이터를 통합 처리
 * 
 * 주요 특징:
 * 1. StatReport는 요청 날짜의 다음 날 데이터를 반환 (날짜 보정 필요)
 * 2. 비용은 부가세가 제외된 금액 (실제 청구는 × 1.1)
 * 3. TSV 형식으로 상세 데이터 제공
 */

import NaverAdsAPI from './naver-ads-api'

// TSV 컬럼 인덱스
const TSV_COLUMNS = {
  DATE: 0,           // YYYYMMDD
  CUSTOMER_ID: 1,    // Customer ID
  CAMPAIGN_ID: 2,    // Campaign ID
  ADGROUP_ID: 3,     // Ad Group ID
  KEYWORD_ID: 4,     // Keyword ID (or '-' for non-keyword)
  AD_ID: 5,          // Ad ID
  BUSINESS_ID: 6,    // Business Channel ID
  QUERY_ID: 7,       // Search Query ID
  DEVICE: 8,         // Device Type (M/P)
  AVG_RANK: 9,       // Average Rank
  CLICKS: 10,        // Click count
  COST: 11,          // Cost (VAT excluded)
  IMPRESSIONS: 12,   // Impression count
  CONVERSIONS: 13    // Conversion count (if available)
}

interface UnifiedStats {
  impressions: number
  clicks: number
  cost: number        // VAT excluded
  costWithVAT: number // VAT included
  ctr: number        // Click-through rate (%)
  cpc: number        // Cost per click
  avgRank?: number   // Average rank
  conversions?: number
}

interface CampaignData extends UnifiedStats {
  campaignId: string
  campaignName?: string
  adGroups: Map<string, AdGroupData>
}

interface AdGroupData extends UnifiedStats {
  adGroupId: string
  adGroupName?: string
  keywords: Map<string, KeywordData>
}

interface KeywordData extends UnifiedStats {
  keywordId: string
  keywordText?: string
  matchType?: string
}

interface ProcessedData {
  date: string
  actualDate: string  // Actual date in the data (may be different)
  customerId: string
  campaigns: Map<string, CampaignData>
  totals: UnifiedStats
}

export class NaverAdsUnifiedProcessor {
  private api: NaverAdsAPI

  constructor(credentials: {
    accessKey: string
    secretKey: string
    customerId: string
  }) {
    this.api = new NaverAdsAPI(credentials)
  }

  /**
   * Process data for a specific date using StatReport
   * Note: StatReport returns next day's data, so we need to adjust
   */
  async processDateData(targetDate: string): Promise<ProcessedData | null> {
    try {
      console.log(`\n📊 Processing data for ${targetDate}`)
      
      // Adjust date for StatReport API (request previous day to get target date)
      const requestDate = this.getPreviousDate(targetDate)
      console.log(`  📅 Requesting StatReport for ${requestDate} to get ${targetDate} data`)

      // Create StatReport
      const reportResponse = await this.api.request('POST', '/stat-reports', {
        reportTp: 'AD',
        statDt: `${requestDate}T00:00:00.000Z`
      })

      if (!reportResponse.success) {
        console.error('Failed to create StatReport')
        return null
      }

      const reportId = reportResponse.data.reportJobId
      console.log(`  Report ID: ${reportId}`)

      // Wait for report to be ready
      const reportData = await this.waitForReport(reportId)
      if (!reportData) {
        console.error('Failed to get report data')
        return null
      }

      // Parse TSV data
      return this.parseTSVData(reportData, targetDate)

    } catch (error) {
      console.error('Error processing date data:', error)
      return null
    }
  }

  /**
   * Process data for a date range
   */
  async processDateRange(
    startDate: string,
    endDate: string
  ): Promise<Map<string, ProcessedData>> {
    const results = new Map<string, ProcessedData>()
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Process each day
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      const data = await this.processDateData(dateStr)
      
      if (data) {
        results.set(dateStr, data)
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return results
  }

  /**
   * Parse TSV data and structure it hierarchically
   */
  private parseTSVData(tsvContent: string, expectedDate: string): ProcessedData {
    const lines = tsvContent.split('\n').filter(line => line.trim())
    const campaigns = new Map<string, CampaignData>()
    
    let actualDate = ''
    let customerId = ''
    let totals: UnifiedStats = {
      impressions: 0,
      clicks: 0,
      cost: 0,
      costWithVAT: 0,
      ctr: 0,
      cpc: 0
    }

    // Process each data line
    for (const line of lines) {
      const cells = line.split('\t')
      
      // Skip header or invalid lines
      if (cells.length < 13 || cells[0] === 'Date') continue
      
      // Extract data
      const rowDate = cells[TSV_COLUMNS.DATE]
      customerId = cells[TSV_COLUMNS.CUSTOMER_ID]
      const campaignId = cells[TSV_COLUMNS.CAMPAIGN_ID]
      const adGroupId = cells[TSV_COLUMNS.ADGROUP_ID]
      const keywordId = cells[TSV_COLUMNS.KEYWORD_ID]
      const impressions = parseInt(cells[TSV_COLUMNS.IMPRESSIONS]) || 0
      const clicks = parseInt(cells[TSV_COLUMNS.CLICKS]) || 0
      const cost = parseFloat(cells[TSV_COLUMNS.COST]) || 0
      const avgRank = parseFloat(cells[TSV_COLUMNS.AVG_RANK]) || 0

      // Set actual date (first valid date found)
      if (!actualDate && rowDate && rowDate.length === 8) {
        actualDate = `${rowDate.substring(0,4)}-${rowDate.substring(4,6)}-${rowDate.substring(6,8)}`
      }

      // Initialize campaign if not exists
      if (!campaigns.has(campaignId)) {
        campaigns.set(campaignId, {
          campaignId,
          impressions: 0,
          clicks: 0,
          cost: 0,
          costWithVAT: 0,
          ctr: 0,
          cpc: 0,
          adGroups: new Map()
        })
      }

      const campaign = campaigns.get(campaignId)!
      
      // Initialize ad group if not exists
      if (!campaign.adGroups.has(adGroupId)) {
        campaign.adGroups.set(adGroupId, {
          adGroupId,
          impressions: 0,
          clicks: 0,
          cost: 0,
          costWithVAT: 0,
          ctr: 0,
          cpc: 0,
          keywords: new Map()
        })
      }

      const adGroup = campaign.adGroups.get(adGroupId)!

      // Add keyword data if exists
      if (keywordId && keywordId !== '-') {
        if (!adGroup.keywords.has(keywordId)) {
          adGroup.keywords.set(keywordId, {
            keywordId,
            impressions: 0,
            clicks: 0,
            cost: 0,
            costWithVAT: 0,
            ctr: 0,
            cpc: 0,
            avgRank: 0
          })
        }

        const keyword = adGroup.keywords.get(keywordId)!
        keyword.impressions += impressions
        keyword.clicks += clicks
        keyword.cost += cost
        keyword.costWithVAT = keyword.cost * 1.1
        keyword.ctr = keyword.impressions > 0 ? (keyword.clicks / keyword.impressions * 100) : 0
        keyword.cpc = keyword.clicks > 0 ? (keyword.cost / keyword.clicks) : 0
        keyword.avgRank = avgRank
      }

      // Update ad group stats
      adGroup.impressions += impressions
      adGroup.clicks += clicks
      adGroup.cost += cost
      adGroup.costWithVAT = adGroup.cost * 1.1
      adGroup.ctr = adGroup.impressions > 0 ? (adGroup.clicks / adGroup.impressions * 100) : 0
      adGroup.cpc = adGroup.clicks > 0 ? (adGroup.cost / adGroup.clicks) : 0

      // Update campaign stats
      campaign.impressions += impressions
      campaign.clicks += clicks
      campaign.cost += cost
      campaign.costWithVAT = campaign.cost * 1.1
      campaign.ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100) : 0
      campaign.cpc = campaign.clicks > 0 ? (campaign.cost / campaign.clicks) : 0

      // Update totals
      totals.impressions += impressions
      totals.clicks += clicks
      totals.cost += cost
    }

    // Calculate total metrics
    totals.costWithVAT = totals.cost * 1.1
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0
    totals.cpc = totals.clicks > 0 ? (totals.cost / totals.clicks) : 0

    return {
      date: expectedDate,
      actualDate,
      customerId,
      campaigns,
      totals
    }
  }

  /**
   * Wait for report to be ready and download
   */
  private async waitForReport(reportId: string): Promise<string | null> {
    const maxAttempts = 30
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const statusResponse = await this.api.request('GET', `/stat-reports/${reportId}`)
      
      if (statusResponse.success && statusResponse.data.status === 'REGIST') {
        // Report is ready, download it
        const downloadResponse = await this.api.request('GET', `/stat-reports/${reportId}/download`)
        
        if (downloadResponse.success && downloadResponse.data) {
          return downloadResponse.data
        }
      }
      
      attempts++
    }

    return null
  }

  /**
   * Get previous date (for StatReport API adjustment)
   */
  private getPreviousDate(dateStr: string): string {
    const date = new Date(dateStr)
    date.setDate(date.getDate() - 1)
    return date.toISOString().split('T')[0]
  }

  /**
   * Format stats for display
   */
  formatStats(stats: UnifiedStats): string {
    return `
    📊 Statistics:
      - Impressions: ${stats.impressions.toLocaleString()}
      - Clicks: ${stats.clicks.toLocaleString()}
      - Cost (VAT excluded): ${stats.cost.toFixed(2)}원
      - Cost (VAT included): ${stats.costWithVAT.toFixed(2)}원
      - CTR: ${stats.ctr.toFixed(2)}%
      - CPC: ${stats.cpc.toFixed(2)}원
    `
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(data: ProcessedData): string {
    let report = `
📊 Naver Ads Report for ${data.date}
${'='.repeat(50)}

📅 Data Date: ${data.actualDate}
👤 Customer ID: ${data.customerId}

${this.formatStats(data.totals)}

📦 Campaigns (${data.campaigns.size}):
`

    for (const [campaignId, campaign] of data.campaigns) {
      report += `
  Campaign: ${campaignId}
    - Impressions: ${campaign.impressions}
    - Clicks: ${campaign.clicks}
    - Cost: ${campaign.cost.toFixed(2)}원 (+ VAT: ${campaign.costWithVAT.toFixed(2)}원)
    - Ad Groups: ${campaign.adGroups.size}
`

      // Show top ad groups
      const topAdGroups = Array.from(campaign.adGroups.values())
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 3)

      for (const adGroup of topAdGroups) {
        report += `      AdGroup ${adGroup.adGroupId}: ${adGroup.impressions} imps, ${adGroup.clicks} clicks\n`
      }
    }

    return report
  }
}

export default NaverAdsUnifiedProcessor