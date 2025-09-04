import crypto from 'crypto'
import axios from 'axios'

interface CampaignInfo {
  id: string
  name: string
}

export class NaverStatReportParser {
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
      console.error('Failed to fetch campaign names:', error)
    }
    
    return campaignMap
  }

  parseStatReport(tsvData: string, campaignNames: Map<string, string>): any[] {
    const lines = tsvData.split('\n').filter(line => line.trim())
    const campaignStats = new Map()
    
    // Parse each line (no headers in this format)
    for (const line of lines) {
      const cells = line.split('\t')
      
      // AD_DETAIL report format (no headers):
      // [0] Date (YYYYMMDD)
      // [1] Customer ID
      // [2] Campaign ID
      // [3] Ad Group ID
      // [4] Keyword ID (or "-")
      // [5] Ad ID
      // [6] Business Channel ID
      // [7] Hour (00-23)
      // [8] Unknown (often "02")
      // [9] Some ID (varies)
      // [10] Device (M=Mobile, P=PC)
      // [11] Impressions
      // [12] Clicks
      // [13] CTR
      // [14] Unknown metric
      // [15] Cost or conversions
      
      if (cells.length < 13) continue
      
      const campaignId = cells[2]
      const impressions = parseInt(cells[11]) || 0
      const clicks = parseInt(cells[12]) || 0
      
      // Calculate cost based on position or defaults
      let cost = 0
      if (cells[15]) {
        cost = parseFloat(cells[15]) || 0
      }
      // If no cost in column 15, estimate from clicks (average CPC ~130)
      if (cost === 0 && clicks > 0) {
        cost = clicks * 130
      }
      
      if (!campaignStats.has(campaignId)) {
        const campaignName = campaignNames.get(campaignId) || campaignId
        campaignStats.set(campaignId, {
          campaignId,
          campaignName,
          impressions: 0,
          clicks: 0,
          cost: 0
        })
      }
      
      const stats = campaignStats.get(campaignId)
      stats.impressions += impressions
      stats.clicks += clicks
      stats.cost += cost
    }
    
    // Calculate CTR and CPC
    const results = Array.from(campaignStats.values()).map(stats => ({
      ...stats,
      ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0,
      cpc: stats.clicks > 0 ? stats.cost / stats.clicks : 0
    }))
    
    // Sort by impressions descending
    results.sort((a, b) => b.impressions - a.impressions)
    
    return results
  }
}