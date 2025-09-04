import crypto from 'crypto'
import axios from 'axios'

interface HourlyData {
  date: string
  hour: string
  impressions: number
  clicks: number
  cost: number
}

interface CampaignData {
  campaignId: string
  campaignName: string
  adGroupId: string
  adGroupName: string
  adId: string
  adName: string
  hourlyData: HourlyData[]
  totalImpressions: number
  totalClicks: number
  totalCost: number
}

export class NaverAdsDetailedParser {
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

  async getCampaignNames(): Promise<Map<string, string>> {
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

  async getAdGroupNames(campaignId: string): Promise<Map<string, string>> {
    const uri = `/ncc/campaigns/${campaignId}/adgroups`
    const adGroupMap = new Map<string, string>()
    
    try {
      const response = await axios.get(
        `${this.baseURL}${uri}`,
        {
          headers: this.getAuthHeaders('GET', uri)
        }
      )
      
      if (response.status === 200 && Array.isArray(response.data)) {
        response.data.forEach((adGroup: any) => {
          adGroupMap.set(adGroup.nccAdgroupId, adGroup.name)
        })
      }
    } catch (error) {
      // Silently fail - not all campaigns have ad groups
    }
    
    return adGroupMap
  }

  async createDetailedReport(startDate: string, endDate: string): Promise<number | null> {
    const uri = '/stat-reports'
    
    try {
      const response = await axios.post(
        `${this.baseURL}${uri}`,
        {
          reportTp: 'AD_DETAIL',
          statDt: startDate.replace(/-/g, ''),
          endDt: endDate.replace(/-/g, '')
        },
        {
          headers: this.getAuthHeaders('POST', uri)
        }
      )
      
      if (response.status === 200 && response.data.reportJobId) {
        return response.data.reportJobId
      }
    } catch (error: any) {
      // Check if error is "no data"
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
        } else if (response.data.status === 'NONE' && i > 5) {
          // No data after 5 attempts
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
      // Parse URL to get path only for signature
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

  parseDetailedReport(tsvData: string, campaignNames: Map<string, string>): CampaignData[] {
    const lines = tsvData.split('\n').filter(line => line.trim())
    const dataMap = new Map<string, CampaignData>()
    
    // AD_DETAIL report column mapping (no headers)
    // Based on analysis, the columns are:
    // 0: Date (YYYYMMDD)
    // 1: Customer ID
    // 2: Campaign ID
    // 3: Campaign Name (sometimes)
    // 4: Ad Group ID
    // 5: Ad Group Name (sometimes)
    // 6: Ad ID
    // 7: Hour (0-23)
    // 8: Minute (for sub-hourly data)
    // 9: Ad Extension ID
    // 10: Device
    // 11: Impressions
    // 12: Clicks
    // 13: Average Position
    // 14: Depth (for shopping)
    // 15: Cost (actual spending)
    
    for (const line of lines) {
      const cells = line.split('\t')
      if (cells.length < 13) continue
      
      const date = cells[0]
      const campaignId = cells[2]
      const adGroupId = cells[4] || ''
      const adId = cells[6] || ''
      const hour = cells[7] || '00'
      const impressions = parseInt(cells[11]) || 0
      const clicks = parseInt(cells[12]) || 0
      
      // Cost can be in different columns based on report type
      // Try column 15 first (most common), then 13 if it looks like cost
      let cost = 0
      if (cells.length > 15) {
        const costValue = parseFloat(cells[15])
        if (!isNaN(costValue) && costValue > 0) {
          cost = costValue
        }
      }
      
      // If no cost in column 15, check if column 13 might be cost (not avg position)
      if (cost === 0 && cells.length > 13) {
        const altCost = parseFloat(cells[13])
        // Cost values are typically > 10, avg position is typically < 10
        if (!isNaN(altCost) && altCost > 10) {
          cost = altCost
        }
      }
      
      const key = `${campaignId}_${adGroupId}_${adId}`
      
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          campaignId,
          campaignName: campaignNames.get(campaignId) || campaignId,
          adGroupId,
          adGroupName: '',
          adId,
          adName: '',
          hourlyData: [],
          totalImpressions: 0,
          totalClicks: 0,
          totalCost: 0
        })
      }
      
      const campaignData = dataMap.get(key)!
      
      // Add hourly data
      campaignData.hourlyData.push({
        date: `${date.substring(0,4)}-${date.substring(4,6)}-${date.substring(6,8)}`,
        hour,
        impressions,
        clicks,
        cost
      })
      
      // Update totals
      campaignData.totalImpressions += impressions
      campaignData.totalClicks += clicks
      campaignData.totalCost += cost
    }
    
    return Array.from(dataMap.values())
  }

  async getDetailedStats(startDate: string, endDate: string) {
    console.log(`📊 Getting detailed stats from ${startDate} to ${endDate}...`)
    
    // Get campaign names first
    const campaignNames = await this.getCampaignNames()
    console.log(`Found ${campaignNames.size} campaigns`)
    
    // Create detailed report
    const reportId = await this.createDetailedReport(startDate, endDate)
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
    
    // First, let's analyze the TSV structure
    const lines = tsvData.split('\n').filter(line => line.trim())
    console.log(`Total lines: ${lines.length}`)
    
    if (lines.length > 0) {
      const firstLine = lines[0].split('\t')
      console.log(`Columns in first line: ${firstLine.length}`)
      console.log('Sample first line:', firstLine.slice(0, 20))
      
      // Look for cost values
      for (let i = 10; i < Math.min(firstLine.length, 20); i++) {
        const value = parseFloat(firstLine[i])
        if (!isNaN(value) && value > 0) {
          console.log(`Column ${i}: ${value} (potential metric)`)
        }
      }
    }
    
    // Parse data
    const campaigns = this.parseDetailedReport(tsvData, campaignNames)
    
    // Group by campaign for summary
    const campaignSummary = new Map<string, any>()
    
    campaigns.forEach(data => {
      if (!campaignSummary.has(data.campaignId)) {
        campaignSummary.set(data.campaignId, {
          campaignId: data.campaignId,
          campaignName: data.campaignName,
          totalImpressions: 0,
          totalClicks: 0,
          totalCost: 0,
          dailyStats: new Map()
        })
      }
      
      const summary = campaignSummary.get(data.campaignId)!
      summary.totalImpressions += data.totalImpressions
      summary.totalClicks += data.totalClicks
      summary.totalCost += data.totalCost
      
      // Group by date for daily stats
      data.hourlyData.forEach(hourly => {
        if (!summary.dailyStats.has(hourly.date)) {
          summary.dailyStats.set(hourly.date, {
            date: hourly.date,
            impressions: 0,
            clicks: 0,
            cost: 0
          })
        }
        const daily = summary.dailyStats.get(hourly.date)
        daily.impressions += hourly.impressions
        daily.clicks += hourly.clicks
        daily.cost += hourly.cost
      })
    })
    
    // Calculate totals
    let totalImpressions = 0
    let totalClicks = 0
    let totalCost = 0
    
    const campaignResults = Array.from(campaignSummary.values()).map(campaign => {
      totalImpressions += campaign.totalImpressions
      totalClicks += campaign.totalClicks
      totalCost += campaign.totalCost
      
      const dailyStats = Array.from(campaign.dailyStats.values())
      
      return {
        ...campaign,
        dailyStats,
        ctr: campaign.totalImpressions > 0 ? (campaign.totalClicks / campaign.totalImpressions) * 100 : 0,
        cpc: campaign.totalClicks > 0 ? campaign.totalCost / campaign.totalClicks : 0
      }
    })
    
    return {
      campaigns: campaignResults,
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