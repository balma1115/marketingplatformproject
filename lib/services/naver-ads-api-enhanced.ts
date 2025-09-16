import axios, { AxiosInstance } from 'axios'
import crypto from 'crypto'

/**
 * Enhanced Naver Ads API with full date range support
 * Creates multiple single-day reports and aggregates data
 */

interface KeywordStatsMap {
  [keywordId: string]: {
    impressions: number
    clicks: number
    cost: number
    ctr?: number
    cpc?: number
  }
}

export class NaverAdsAPIEnhanced {
  private accessKey: string
  private secretKey: string
  private customerId: string
  private baseURL = 'https://api.searchad.naver.com'
  private axios: AxiosInstance

  constructor(config: {
    accessKey?: string
    secretKey?: string
    customerId?: string
  }) {
    this.accessKey = config.accessKey || ''
    this.secretKey = config.secretKey || ''
    this.customerId = config.customerId || ''
    
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
    const pathOnly = uri.split('?')[0]
    const signature = this.generateSignature(method, pathOnly, timestamp)

    return {
      'X-Timestamp': timestamp,
      'X-API-KEY': this.accessKey,
      'X-Customer': this.customerId,
      'X-Signature': signature,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Get all dates between start and end (inclusive)
   */
  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
    
    return dates
  }

  /**
   * Get or create reports for all dates in range
   */
  async getOrCreateReportsForDateRange(
    startDate: string, 
    endDate: string
  ): Promise<Map<string, any>> {
    console.log(`\n📅 Getting reports for ${startDate} to ${endDate}...`)
    
    // Step 1: Get existing reports
    const uri = '/stat-reports'
    const response = await this.axios.get(uri, {
      headers: this.getAuthHeaders('GET', uri)
    })
    
    const existingReports = response.data
    console.log(`Found ${existingReports.length} total existing reports`)
    
    // Filter for AD reports in our date range
    const dateRange = this.getDateRange(startDate, endDate)
    const reportMap = new Map<string, any>()
    
    // Map existing reports by date
    existingReports.forEach((report: any) => {
      if (report.reportTp === 'AD' && report.statDt) {
        const reportDate = report.statDt.split('T')[0]
        if (dateRange.includes(reportDate)) {
          reportMap.set(reportDate, report)
        }
      }
    })
    
    console.log(`Found ${reportMap.size} existing reports in date range`)
    
    // Step 2: Create missing reports
    const missingDates = dateRange.filter(date => !reportMap.has(date))
    console.log(`Need to create ${missingDates.length} new reports`)
    
    for (const date of missingDates) {
      console.log(`Creating report for ${date}...`)
      
      try {
        const createResponse = await this.axios.post(
          uri,
          {
            reportTp: 'AD',
            statDt: `${date}T00:00:00.000Z`
          },
          {
            headers: this.getAuthHeaders('POST', uri)
          }
        )
        
        console.log(`✅ Created report ${createResponse.data.reportJobId} for ${date}`)
        reportMap.set(date, createResponse.data)
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error: any) {
        console.log(`❌ Failed to create report for ${date}:`, error.response?.data?.message || error.message)
      }
    }
    
    return reportMap
  }

  /**
   * Wait for all reports to be built
   */
  async waitForReports(reportMap: Map<string, any>): Promise<void> {
    console.log('\n⏳ Waiting for reports to be built...')
    
    const pendingReports = Array.from(reportMap.entries())
      .filter(([_, report]) => report.status !== 'BUILT' && report.status !== 'DONE')
    
    if (pendingReports.length === 0) {
      console.log('All reports are already built')
      return
    }
    
    const maxAttempts = 30
    let attempts = 0
    
    while (attempts < maxAttempts && pendingReports.length > 0) {
      attempts++
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      for (let i = pendingReports.length - 1; i >= 0; i--) {
        const [date, report] = pendingReports[i]
        
        try {
          const uri = `/stat-reports/${report.reportJobId}`
          const statusResponse = await this.axios.get(uri, {
            headers: this.getAuthHeaders('GET', uri)
          })
          
          reportMap.set(date, statusResponse.data)
          
          if (statusResponse.data.status === 'BUILT' || statusResponse.data.status === 'DONE') {
            console.log(`✅ Report for ${date} is ready`)
            pendingReports.splice(i, 1)
          }
        } catch (error: any) {
          console.log(`Error checking report ${report.reportJobId}:`, error.message)
        }
      }
      
      if (pendingReports.length > 0) {
        console.log(`Attempt ${attempts}/${maxAttempts}: ${pendingReports.length} reports still pending...`)
      }
    }
    
    if (pendingReports.length > 0) {
      console.log(`⚠️ ${pendingReports.length} reports did not complete in time`)
    }
  }

  /**
   * Download and aggregate keyword stats from all reports
   */
  async aggregateKeywordStats(reportMap: Map<string, any>, keywordIds?: string[]): Promise<KeywordStatsMap> {
    console.log('\n📊 Downloading and aggregating keyword data...')
    
    const aggregatedStats: KeywordStatsMap = {}
    let successfulDownloads = 0
    
    for (const [date, report] of reportMap.entries()) {
      if (report.status !== 'BUILT' && report.status !== 'DONE') {
        console.log(`⚠️ Skipping ${date} - report not ready`)
        continue
      }
      
      if (!report.downloadUrl) {
        console.log(`⚠️ Skipping ${date} - no download URL`)
        continue
      }
      
      try {
        console.log(`Downloading data for ${date}...`)
        
        // Extract path from download URL for signature
        const urlPath = new URL(report.downloadUrl).pathname
        const timestamp = Date.now().toString()
        const signature = this.generateSignature('GET', urlPath, timestamp)
        
        const downloadResponse = await axios.get(report.downloadUrl, {
          headers: {
            'X-Timestamp': timestamp,
            'X-API-KEY': this.accessKey,
            'X-Customer': this.customerId,
            'X-Signature': signature,
            'Accept': 'text/tab-separated-values'
          },
          responseType: 'text'
        })
        
        // Parse TSV data
        const lines = downloadResponse.data.split('\n').filter((line: string) => line.trim())
        
        for (const line of lines) {
          const cells = line.split('\t')
          if (cells.length < 13) continue
          
          const campaignId = cells[2]
          const keywordId = cells[4] || 'expanded'  // Use 'expanded' for empty keyword IDs
          
          // Only include PowerLink campaigns (cmp-a001-01)
          // Skip Place campaigns (cmp-a001-06) which might inflate the numbers
          if (!campaignId.includes('cmp-a001-01')) continue
          
          // Process both keyword data and expanded search results
          // For expanded search: keywordId will be empty, '-', or 'null'
          let effectiveKeywordId = keywordId
          if (!keywordId || keywordId === '' || keywordId === 'null' || keywordId === '-') {
            effectiveKeywordId = 'expanded'  // Group all expanded search results
          }
          
          // Filter by requested keywords if specified
          if (keywordIds && keywordIds.length > 0) {
            // Check if this is one of the requested keywords or expanded search
            if (!keywordIds.includes(effectiveKeywordId) && effectiveKeywordId !== 'expanded') {
              // For keyword data, must match requested keywords
              if (effectiveKeywordId.startsWith('nkw-')) continue
            }
          }
          
          // Column mapping for AD report TSV (confirmed from Naver UI):
          // [9] = 노출수 (Impressions)
          // [10] = 클릭수 (Clicks)
          // [11] = 비용 (Cost)
          // [12] = 평균순위 (Average Rank)
          // [13] = 비디오조회수 (Video Views)
          const impressions = parseInt(cells[9]) || 0
          const clicks = parseInt(cells[10]) || 0
          const cost = parseFloat(cells[11]) || 0  // Cost is already in won
          const avgRank = parseFloat(cells[12]) || 0
          
          if (!aggregatedStats[effectiveKeywordId]) {
            aggregatedStats[effectiveKeywordId] = {
              impressions: 0,
              clicks: 0,
              cost: 0
            }
          }
          
          aggregatedStats[effectiveKeywordId].impressions += impressions
          aggregatedStats[effectiveKeywordId].clicks += clicks
          aggregatedStats[effectiveKeywordId].cost += cost
        }
        
        successfulDownloads++
        console.log(`   ✅ Downloaded ${date}: ${lines.length} lines`)
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error: any) {
        console.log(`❌ Failed to download ${date}:`, error.message)
        // Add longer delay after error
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.log(`✅ Successfully downloaded ${successfulDownloads} reports`)
    
    // Calculate CTR and CPC
    Object.values(aggregatedStats).forEach(stats => {
      stats.ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0
      stats.cpc = stats.clicks > 0 ? Math.round(stats.cost / stats.clicks) : 0
    })
    
    return aggregatedStats
  }

  /**
   * Main method: Get keyword stats for full date range
   */
  async getKeywordStatsForDateRange(
    keywordIds: string[],
    startDate: string,
    endDate: string
  ): Promise<KeywordStatsMap> {
    console.log('=' .repeat(60))
    console.log(`Getting keyword stats for ${startDate} to ${endDate}`)
    console.log(`Keywords: ${keywordIds.length}`)
    console.log('=' .repeat(60))
    
    // Adjust dates: API returns data shifted by one day
    // If user wants Aug 1-31, we need to request Jul 31-Aug 30
    const adjustedStartDate = new Date(startDate)
    adjustedStartDate.setDate(adjustedStartDate.getDate() - 1)
    const adjustedEndDate = new Date(endDate)
    adjustedEndDate.setDate(adjustedEndDate.getDate() - 1)
    
    const apiStartDate = adjustedStartDate.toISOString().split('T')[0]
    const apiEndDate = adjustedEndDate.toISOString().split('T')[0]
    
    console.log(`📅 Adjusted API dates: ${apiStartDate} to ${apiEndDate} (TSV contains next day's data)`)
    
    // Step 1: Get or create reports for adjusted dates
    const reportMap = await this.getOrCreateReportsForDateRange(apiStartDate, apiEndDate)
    
    // Step 2: Wait for reports to be built
    await this.waitForReports(reportMap)
    
    // Step 3: Download and aggregate data (pass keywordIds to include expanded search)
    const aggregatedStats = await this.aggregateKeywordStats(reportMap, keywordIds)
    
    // Step 4: Filter for requested keywords and include expanded search
    const filteredStats: KeywordStatsMap = {}
    
    // Always include expanded search results if they exist
    if (aggregatedStats['expanded']) {
      filteredStats['expanded'] = aggregatedStats['expanded']
    }
    
    // Include requested keywords
    keywordIds.forEach(keywordId => {
      if (aggregatedStats[keywordId]) {
        filteredStats[keywordId] = aggregatedStats[keywordId]
      } else {
        filteredStats[keywordId] = {
          impressions: 0,
          clicks: 0,
          cost: 0,
          ctr: 0,
          cpc: 0
        }
      }
    })
    
    console.log(`\n📊 Final Results:`)
    console.log(`   Keywords with data: ${Object.keys(filteredStats).filter(k => filteredStats[k].impressions > 0).length}`)
    console.log(`   Total keywords: ${keywordIds.length}`)
    
    return filteredStats
  }
}