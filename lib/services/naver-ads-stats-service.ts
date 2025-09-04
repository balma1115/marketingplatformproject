import crypto from 'crypto'
import axios from 'axios'

interface DailyStats {
  date: string
  impressions: number
  clicks: number
  cost: number
  ctr: number
  cpc: number
}

interface CampaignDailyStats {
  campaignId: string
  campaignName: string
  dailyStats: DailyStats[]
  totalStats: {
    impressions: number
    clicks: number
    cost: number
    ctr: number
    cpc: number
  }
}

export class NaverAdsStatsService {
  private apiKey: string
  private secretKey: string
  private customerId: string
  private baseURL = 'https://api.searchad.naver.com'
  
  constructor(apiKey: string, secretKey: string, customerId: string) {
    this.apiKey = apiKey
    this.secretKey = secretKey
    this.customerId = customerId
  }

  private generateSignature(method: string, uri: string, timestamp: string): string {
    const message = `${timestamp}.${method.toUpperCase()}.${uri}`
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message, 'utf-8')
      .digest('base64')
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

  async getCampaigns(): Promise<Map<string, string>> {
    const uri = '/ncc/campaigns'
    const campaignMap = new Map<string, string>()
    
    try {
      const response = await axios.get(
        `${this.baseURL}${uri}`,
        {
          headers: this.getAuthHeaders('GET', uri)
        }
      )
      
      if (response.status === 200 && Array.isArray(response.data)) {
        response.data.forEach((campaign: any) => {
          campaignMap.set(campaign.nccCampaignId, campaign.name)
        })
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    }
    
    return campaignMap
  }

  async createStatReport(startDate: string, endDate: string): Promise<number | null> {
    const uri = '/stat-reports'
    
    try {
      // Format dates to YYYYMMDD
      const formatDate = (date: string) => date.replace(/-/g, '')
      
      const response = await axios.post(
        `${this.baseURL}${uri}`,
        {
          reportTp: 'AD_DETAIL',  // Use AD_DETAIL for hourly data
          statDt: formatDate(startDate),
          endDt: formatDate(endDate)
        },
        {
          headers: this.getAuthHeaders('POST', uri)
        }
      )
      
      if (response.status === 200 && response.data.reportJobId) {
        return response.data.reportJobId
      }
    } catch (error: any) {
      if (error.response?.data?.code === 10004) {
        console.log('No data available for this period')
      } else {
        console.error('Failed to create report:', error.response?.data || error.message)
      }
    }
    
    return null
  }

  async waitForReport(reportJobId: number, maxAttempts = 30): Promise<string | null> {
    const uri = `/stat-reports/${reportJobId}`
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      try {
        const response = await axios.get(
          `${this.baseURL}${uri}`,
          {
            headers: this.getAuthHeaders('GET', uri)
          }
        )
        
        if (response.data.status === 'BUILT' || response.data.status === 'DONE') {
          return response.data.downloadUrl
        } else if (response.data.status === 'FAILED') {
          console.log('Report generation failed')
          return null
        } else if (response.data.status === 'NONE' && i > 10) {
          console.log('No data available')
          return null
        }
      } catch (error) {
        console.error('Failed to check report status:', error)
      }
    }
    
    return null
  }

  async downloadReport(downloadUrl: string): Promise<string | null> {
    try {
      // Parse URL and create signature for path only
      const urlParts = new URL(downloadUrl)
      const path = urlParts.pathname
      const timestamp = Date.now().toString()
      const signature = this.generateSignature('GET', path, timestamp)
      
      const response = await axios.get(downloadUrl, {
        headers: {
          'X-Timestamp': timestamp,
          'X-API-KEY': this.apiKey,
          'X-Customer': this.customerId,
          'X-Signature': signature,
          'Accept': 'text/tab-separated-values'
        },
        responseType: 'text'
      })
      
      if (response.status === 200) {
        return response.data
      }
    } catch (error: any) {
      console.error('Download failed:', error.message)
    }
    
    return null
  }

  parseReportData(tsvData: string, campaignNames: Map<string, string>): CampaignDailyStats[] {
    const lines = tsvData.split('\n').filter(line => line.trim())
    const dailyDataByCampaign = new Map<string, Map<string, DailyStats>>()
    
    // Process each line
    for (const line of lines) {
      const cells = line.split('\t')
      if (cells.length < 13) continue
      
      // Column mapping for AD_DETAIL report
      const date = cells[0]  // YYYYMMDD
      const campaignId = cells[2]
      const impressions = parseInt(cells[11]) || 0
      const clicks = parseInt(cells[12]) || 0
      
      // Check if data might be in column 14 (sometimes impressions are duplicated there)
      const altImpressions = parseInt(cells[14]) || 0
      
      // Use the larger value as impressions (to handle potential column variations)
      const finalImpressions = Math.max(impressions, altImpressions)
      
      // Cost calculation
      let cost = 0
      if (cells.length > 15) {
        cost = parseFloat(cells[15]) || 0
      }
      if (cost === 0 && clicks > 0) {
        cost = clicks * 150  // Estimate average CPC
      }
      
      // Initialize campaign data if needed
      if (!dailyDataByCampaign.has(campaignId)) {
        dailyDataByCampaign.set(campaignId, new Map())
      }
      
      const campaignData = dailyDataByCampaign.get(campaignId)!
      
      // Initialize or update daily data
      if (!campaignData.has(date)) {
        campaignData.set(date, {
          date,
          impressions: 0,
          clicks: 0,
          cost: 0,
          ctr: 0,
          cpc: 0
        })
      }
      
      const dailyStats = campaignData.get(date)!
      dailyStats.impressions += finalImpressions
      dailyStats.clicks += clicks
      dailyStats.cost += cost
    }
    
    // Convert to final format and calculate metrics
    const results: CampaignDailyStats[] = []
    
    dailyDataByCampaign.forEach((dailyData, campaignId) => {
      const campaignName = campaignNames.get(campaignId) || campaignId
      const dailyStatsArray: DailyStats[] = []
      
      let totalImpressions = 0
      let totalClicks = 0
      let totalCost = 0
      
      dailyData.forEach(stats => {
        // Calculate CTR and CPC for each day
        stats.ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0
        stats.cpc = stats.clicks > 0 ? stats.cost / stats.clicks : 0
        
        dailyStatsArray.push(stats)
        
        totalImpressions += stats.impressions
        totalClicks += stats.clicks
        totalCost += stats.cost
      })
      
      // Sort by date
      dailyStatsArray.sort((a, b) => a.date.localeCompare(b.date))
      
      results.push({
        campaignId,
        campaignName,
        dailyStats: dailyStatsArray,
        totalStats: {
          impressions: totalImpressions,
          clicks: totalClicks,
          cost: totalCost,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          cpc: totalClicks > 0 ? totalCost / totalClicks : 0
        }
      })
    })
    
    // Sort by total impressions
    results.sort((a, b) => b.totalStats.impressions - a.totalStats.impressions)
    
    return results
  }

  async getDetailedStats(startDate: string, endDate: string): Promise<{
    campaigns: CampaignDailyStats[]
    summary: {
      totalImpressions: number
      totalClicks: number
      totalCost: number
      avgCtr: number
      avgCpc: number
    }
  }> {
    console.log(`📊 Getting detailed stats from ${startDate} to ${endDate}...`)
    
    // Get campaign names first
    const campaignNames = await this.getCampaigns()
    console.log(`Found ${campaignNames.size} campaigns`)
    
    // Create report
    const reportId = await this.createStatReport(startDate, endDate)
    if (!reportId) {
      console.log('Failed to create report or no data available')
      return {
        campaigns: [],
        summary: {
          totalImpressions: 0,
          totalClicks: 0,
          totalCost: 0,
          avgCtr: 0,
          avgCpc: 0
        }
      }
    }
    
    console.log(`Report created: ${reportId}, waiting for completion...`)
    
    // Wait for report
    const downloadUrl = await this.waitForReport(reportId)
    if (!downloadUrl) {
      console.log('Report not ready or failed')
      return {
        campaigns: [],
        summary: {
          totalImpressions: 0,
          totalClicks: 0,
          totalCost: 0,
          avgCtr: 0,
          avgCpc: 0
        }
      }
    }
    
    console.log('Downloading report...')
    
    // Download report
    const tsvData = await this.downloadReport(downloadUrl)
    if (!tsvData) {
      console.log('Failed to download report')
      return {
        campaigns: [],
        summary: {
          totalImpressions: 0,
          totalClicks: 0,
          totalCost: 0,
          avgCtr: 0,
          avgCpc: 0
        }
      }
    }
    
    console.log('Parsing report data...')
    
    // Parse data
    const campaigns = this.parseReportData(tsvData, campaignNames)
    
    // Calculate summary
    let totalImpressions = 0
    let totalClicks = 0
    let totalCost = 0
    
    campaigns.forEach(campaign => {
      totalImpressions += campaign.totalStats.impressions
      totalClicks += campaign.totalStats.clicks
      totalCost += campaign.totalStats.cost
    })
    
    return {
      campaigns,
      summary: {
        totalImpressions,
        totalClicks,
        totalCost,
        avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        avgCpc: totalClicks > 0 ? totalCost / totalClicks : 0
      }
    }
  }
}