import crypto from 'crypto'
import axios, { AxiosInstance } from 'axios'

export interface StatReportRequest {
  reportTp: 'AD' | 'AD_DETAIL' | 'AD_CONVERSION' | 'CAMPAIGN' | 'ADGROUP' | 'KEYWORD'
  statDt: string  // YYYYMMDD format
  endDt: string   // YYYYMMDD format
}

export interface StatReportResponse {
  reportJobId: number
  statDt: string
  updateTm: string
  reportTp: string
  status: 'REGIST' | 'RUNNING' | 'BUILT' | 'DONE' | 'FAILED' | 'NONE'
  downloadUrl: string
  regTm: string
  loginId: string
}

export interface CampaignStats {
  campaignId: string
  campaignName: string
  impressions: number
  clicks: number
  cost: number
  ctr: number
  cpc: number
  conversions?: number
}

export class NaverStatReportAPI {
  private apiKey: string
  private secretKey: string
  private customerId: string
  private axios: AxiosInstance
  private baseURL = 'https://api.searchad.naver.com'

  constructor(apiKey: string, secretKey: string, customerId: string) {
    this.apiKey = apiKey
    this.secretKey = secretKey
    this.customerId = customerId
    
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 30000
    })
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

  /**
   * Create a new stat report (single day only)
   * StatReport API only accepts single-day reports with statDt parameter
   */
  async createReport(reportTp: string, targetDate: string): Promise<StatReportResponse | null> {
    const uri = '/stat-reports'
    
    try {
      const response = await this.axios.post(
        `${this.baseURL}${uri}`,
        {
          reportTp,
          statDt: `${targetDate}T00:00:00.000Z`  // ISO format that works!
        },
        {
          headers: this.getAuthHeaders('POST', uri)
        }
      )
      
      if (response.status === 200) {
        console.log(`✅ Created ${reportTp} report: ID ${response.data.reportJobId}`)
        return response.data
      }
      return null
    } catch (error: any) {
      console.error(`Failed to create ${reportTp} report:`, error.response?.data || error.message)
      return null
    }
  }

  /**
   * Check report status
   */
  async getReportStatus(reportJobId: number): Promise<StatReportResponse | null> {
    const uri = `/stat-reports/${reportJobId}`
    
    try {
      const response = await this.axios.get(
        `${this.baseURL}${uri}`,
        {
          headers: this.getAuthHeaders('GET', uri)
        }
      )
      
      if (response.status === 200) {
        return response.data
      }
      return null
    } catch (error: any) {
      console.error('Failed to get report status:', error.message)
      return null
    }
  }

  /**
   * Download report data
   */
  async downloadReport(downloadUrl: string): Promise<string | null> {
    try {
      // The download URL contains an authtoken, but still needs API headers
      // Just not the signature (authtoken replaces signature)
      const response = await axios.get(downloadUrl, {
        headers: {
          'X-API-KEY': this.apiKey,
          'X-Customer': this.customerId,
          'X-Timestamp': Date.now().toString(),
          // Don't include X-Signature - the authtoken handles auth
          'Accept': 'text/tab-separated-values, text/plain, */*'
        },
        responseType: 'text',
        validateStatus: (status) => status < 500  // Accept any status < 500
      })
      
      if (response.status === 200) {
        console.log('✅ Report downloaded successfully')
        return response.data
      } else if (response.status === 400) {
        // Try with signature if headers alone don't work
        console.log('Retrying download with signature...')
        const urlParts = new URL(downloadUrl)
        const path = urlParts.pathname
        const timestamp = Date.now().toString()
        // Don't include query params in signature when authtoken is present
        const signature = this.generateSignature('GET', path, timestamp)
        
        const retryResponse = await axios.get(downloadUrl, {
          headers: {
            'X-Timestamp': timestamp,
            'X-API-KEY': this.apiKey,
            'X-Customer': this.customerId,
            'X-Signature': signature,
            'Accept': 'text/tab-separated-values, text/plain, */*'
          },
          responseType: 'text',
          validateStatus: (status) => status < 500
        })
        
        if (retryResponse.status === 200) {
          console.log('✅ Report downloaded with signature')
          return retryResponse.data
        }
      }
      
      console.error('Download failed with status:', response.status)
      console.error('Response:', response.data)
      return null
    } catch (error: any) {
      console.error('Download error:', error.message)
      if (error.response) {
        console.error('Status:', error.response.status)
        console.error('Data:', error.response.data)
      }
      return null
    }
  }

  /**
   * Parse TSV report data into campaign stats
   */
  parseReportData(tsvData: string): CampaignStats[] {
    const lines = tsvData.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []
    
    const headers = lines[0].split('\t')
    const campaignMap = new Map<string, CampaignStats>()
    
    // Find column indices
    const findIndex = (patterns: string[]) => {
      for (const pattern of patterns) {
        const idx = headers.findIndex(h => h.includes(pattern))
        if (idx >= 0) return idx
      }
      return -1
    }
    
    const campaignIdIdx = findIndex(['캠페인ID', 'campaignId', 'nccCampaignId'])
    const campaignNameIdx = findIndex(['캠페인', 'campaignName', 'Campaign'])
    const impIdx = findIndex(['노출', 'impCnt', 'Impression'])
    const clickIdx = findIndex(['클릭', 'clkCnt', 'Click'])
    const costIdx = findIndex(['비용', '광고비', 'salesAmt', 'Cost'])
    const convIdx = findIndex(['전환', 'ccnt', 'Conversion'])
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split('\t')
      if (cells.length < headers.length) continue
      
      const campaignId = campaignIdIdx >= 0 ? cells[campaignIdIdx] : ''
      const campaignName = campaignNameIdx >= 0 ? cells[campaignNameIdx] : ''
      const impressions = impIdx >= 0 ? parseInt(cells[impIdx]) || 0 : 0
      const clicks = clickIdx >= 0 ? parseInt(cells[clickIdx]) || 0 : 0
      const cost = costIdx >= 0 ? parseFloat(cells[costIdx]) || 0 : 0
      const conversions = convIdx >= 0 ? parseInt(cells[convIdx]) || 0 : undefined
      
      const key = campaignId || campaignName
      if (!key) continue
      
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          campaignId,
          campaignName,
          impressions: 0,
          clicks: 0,
          cost: 0,
          ctr: 0,
          cpc: 0,
          conversions: 0
        })
      }
      
      const stats = campaignMap.get(key)!
      stats.impressions += impressions
      stats.clicks += clicks
      stats.cost += cost
      if (conversions !== undefined) {
        stats.conversions = (stats.conversions || 0) + conversions
      }
    }
    
    // Calculate CTR and CPC
    campaignMap.forEach(stats => {
      stats.ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0
      stats.cpc = stats.clicks > 0 ? stats.cost / stats.clicks : 0
    })
    
    return Array.from(campaignMap.values())
  }

  /**
   * Get campaign stats for a specific date (single day)
   * Note: For date ranges, you need to create multiple reports and aggregate
   */
  async getCampaignStats(targetDate: string): Promise<CampaignStats[]> {
    console.log(`📊 Getting campaign stats for ${targetDate}...`)
    
    // Try AD_DETAIL report first (most comprehensive)
    let report = await this.createReport('AD_DETAIL', targetDate)
    
    // If AD_DETAIL fails, try AD report
    if (!report) {
      console.log('AD_DETAIL failed, trying AD report...')
      report = await this.createReport('AD', targetDate)
    }
    
    if (!report) {
      console.error('Failed to create any report')
      return []
    }
    
    // Poll for report completion
    const maxAttempts = 30
    let attempts = 0
    
    while (attempts < maxAttempts) {
      attempts++
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const status = await this.getReportStatus(report.reportJobId)
      if (!status) continue
      
      console.log(`  Attempt ${attempts}/${maxAttempts}: Status = ${status.status}`)
      
      if (status.status === 'BUILT' || status.status === 'DONE') {
        if (status.downloadUrl) {
          console.log('📥 Report ready, downloading...')
          const data = await this.downloadReport(status.downloadUrl)
          
          if (data) {
            console.log('✅ Download successful, parsing data...')
            return this.parseReportData(data)
          }
        }
        break
      } else if (status.status === 'FAILED') {
        console.error('Report generation failed')
        break
      }
    }
    
    console.error('Report generation timeout or failed')
    return []
  }
}

// Export convenience function (single day)
export async function getNaverAdsCampaignStats(
  apiKey: string,
  secretKey: string,
  customerId: string,
  targetDate: string
): Promise<CampaignStats[]> {
  const api = new NaverStatReportAPI(apiKey, secretKey, customerId)
  return api.getCampaignStats(targetDate)
}