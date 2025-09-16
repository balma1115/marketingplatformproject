/**
 * Naver Ads Data Processor
 * 
 * Processes TSV data from StatReport API to separate:
 * 1. Keyword-specific performance (with keyword IDs)
 * 2. Expanded search results (without keyword IDs, marked as '-')
 */

import * as fs from 'fs'
import * as path from 'path'

// TSV Column indices
const TSV_COLUMNS = {
  DATE: 0,           // YYYYMMDD
  CUSTOMER_ID: 1,    // Customer ID
  CAMPAIGN_ID: 2,    // Campaign ID
  ADGROUP_ID: 3,     // Ad Group ID
  KEYWORD_ID: 4,     // Keyword ID (or '-' for expanded)
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

export interface PerformanceData {
  impressions: number
  clicks: number
  cost: number
  costWithVAT: number
  ctr: number
  cpc: number
  avgRank?: number
  conversions?: number
}

export interface KeywordPerformance extends PerformanceData {
  keywordId: string
  keywordName?: string
  campaignId: string
  adGroupId: string
}

export interface ExpandedSearchPerformance extends PerformanceData {
  campaignId: string
  adGroupId: string
  queryCount: number  // Number of unique queries
}

export interface ProcessedData {
  date: string
  customerId: string
  campaigns: Map<string, CampaignData>
  totals: {
    all: PerformanceData
    keywords: PerformanceData
    expanded: PerformanceData
  }
}

export interface CampaignData {
  campaignId: string
  campaignName?: string
  keywordPerformance: Map<string, KeywordPerformance>
  expandedPerformance: ExpandedSearchPerformance
  totals: PerformanceData
}

export class NaverAdsDataProcessor {
  
  /**
   * Process a single TSV file
   */
  processTSVFile(filePath: string): ProcessedData | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return this.processTSVContent(content)
    } catch (error: any) {
      console.error(`Error processing file ${filePath}:`, error.message)
      return null
    }
  }
  
  /**
   * Process TSV content string
   */
  processTSVContent(content: string): ProcessedData {
    const lines = content.split('\n').filter(line => line.trim())
    
    const campaigns = new Map<string, CampaignData>()
    let date = ''
    let customerId = ''
    
    // Initialize totals
    const totals = {
      all: this.createEmptyPerformance(),
      keywords: this.createEmptyPerformance(),
      expanded: this.createEmptyPerformance()
    }
    
    // Process each line
    for (const line of lines) {
      const cells = line.split('\t')
      
      // Skip header or invalid lines
      if (cells.length < 13 || cells[0] === 'Date' || cells[0].includes('날짜')) continue
      
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
      const queryId = cells[TSV_COLUMNS.QUERY_ID]
      
      // Set date from first valid row
      if (!date && rowDate && rowDate.length === 8) {
        date = `${rowDate.substring(0,4)}-${rowDate.substring(4,6)}-${rowDate.substring(6,8)}`
      }
      
      // Skip if not PowerLink campaign (cmp-a001-01)
      // Include only PowerLink, exclude Place campaigns (cmp-a001-06)
      if (!campaignId.includes('cmp-a001-01')) continue
      
      // Initialize campaign if not exists
      if (!campaigns.has(campaignId)) {
        campaigns.set(campaignId, {
          campaignId,
          keywordPerformance: new Map(),
          expandedPerformance: {
            campaignId,
            adGroupId,
            impressions: 0,
            clicks: 0,
            cost: 0,
            costWithVAT: 0,
            ctr: 0,
            cpc: 0,
            queryCount: 0
          },
          totals: this.createEmptyPerformance()
        })
      }
      
      const campaign = campaigns.get(campaignId)!
      
      // Process based on whether it has a keyword ID
      if (keywordId && keywordId !== '-') {
        // Keyword-specific performance
        if (!campaign.keywordPerformance.has(keywordId)) {
          campaign.keywordPerformance.set(keywordId, {
            keywordId,
            campaignId,
            adGroupId,
            impressions: 0,
            clicks: 0,
            cost: 0,
            costWithVAT: 0,
            ctr: 0,
            cpc: 0,
            avgRank: 0
          })
        }
        
        const keyword = campaign.keywordPerformance.get(keywordId)!
        keyword.impressions += impressions
        keyword.clicks += clicks
        keyword.cost += cost
        keyword.costWithVAT = keyword.cost * 1.1
        keyword.ctr = keyword.impressions > 0 ? (keyword.clicks / keyword.impressions * 100) : 0
        keyword.cpc = keyword.clicks > 0 ? (keyword.cost / keyword.clicks) : 0
        if (avgRank > 0) keyword.avgRank = avgRank
        
        // Add to keyword totals
        totals.keywords.impressions += impressions
        totals.keywords.clicks += clicks
        totals.keywords.cost += cost
        
      } else {
        // Expanded search results (no keyword ID)
        campaign.expandedPerformance.impressions += impressions
        campaign.expandedPerformance.clicks += clicks
        campaign.expandedPerformance.cost += cost
        
        // Count unique queries
        if (queryId && queryId !== '-') {
          campaign.expandedPerformance.queryCount++
        }
        
        // Add to expanded totals
        totals.expanded.impressions += impressions
        totals.expanded.clicks += clicks
        totals.expanded.cost += cost
      }
      
      // Add to campaign totals
      campaign.totals.impressions += impressions
      campaign.totals.clicks += clicks
      campaign.totals.cost += cost
      
      // Add to overall totals
      totals.all.impressions += impressions
      totals.all.clicks += clicks
      totals.all.cost += cost
    }
    
    // Calculate final metrics for all campaigns
    campaigns.forEach(campaign => {
      // Campaign totals
      campaign.totals.costWithVAT = campaign.totals.cost * 1.1
      campaign.totals.ctr = campaign.totals.impressions > 0 ? 
        (campaign.totals.clicks / campaign.totals.impressions * 100) : 0
      campaign.totals.cpc = campaign.totals.clicks > 0 ? 
        (campaign.totals.cost / campaign.totals.clicks) : 0
      
      // Expanded performance
      campaign.expandedPerformance.costWithVAT = campaign.expandedPerformance.cost * 1.1
      campaign.expandedPerformance.ctr = campaign.expandedPerformance.impressions > 0 ? 
        (campaign.expandedPerformance.clicks / campaign.expandedPerformance.impressions * 100) : 0
      campaign.expandedPerformance.cpc = campaign.expandedPerformance.clicks > 0 ? 
        (campaign.expandedPerformance.cost / campaign.expandedPerformance.clicks) : 0
    })
    
    // Calculate final metrics for totals
    this.calculateMetrics(totals.all)
    this.calculateMetrics(totals.keywords)
    this.calculateMetrics(totals.expanded)
    
    return {
      date,
      customerId,
      campaigns,
      totals
    }
  }
  
  /**
   * Process all TSV files in a directory
   */
  async processDirectory(dirPath: string): Promise<Map<string, ProcessedData>> {
    const results = new Map<string, ProcessedData>()
    
    try {
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.tsv'))
      
      for (const file of files) {
        const filePath = path.join(dirPath, file)
        const data = this.processTSVFile(filePath)
        
        if (data) {
          results.set(data.date, data)
        }
      }
      
    } catch (error: any) {
      console.error('Error processing directory:', error.message)
    }
    
    return results
  }
  
  /**
   * Generate summary report
   */
  generateSummaryReport(data: ProcessedData): string {
    let report = `
📊 Naver Ads Performance Report - ${data.date}
${'='.repeat(60)}

📅 Date: ${data.date}
👤 Customer ID: ${data.customerId}

📈 Overall Performance:
  Impressions: ${data.totals.all.impressions.toLocaleString()}
  Clicks: ${data.totals.all.clicks.toLocaleString()}
  CTR: ${data.totals.all.ctr.toFixed(2)}%
  Cost: ${data.totals.all.cost.toFixed(2)}원 (+ VAT: ${data.totals.all.costWithVAT.toFixed(2)}원)
  Avg CPC: ${data.totals.all.cpc.toFixed(2)}원

🎯 Keyword Performance:
  Impressions: ${data.totals.keywords.impressions.toLocaleString()}
  Clicks: ${data.totals.keywords.clicks.toLocaleString()}
  CTR: ${data.totals.keywords.ctr.toFixed(2)}%
  Cost: ${data.totals.keywords.cost.toFixed(2)}원 (+ VAT: ${data.totals.keywords.costWithVAT.toFixed(2)}원)
  Avg CPC: ${data.totals.keywords.cpc.toFixed(2)}원

🔍 Expanded Search Results:
  Impressions: ${data.totals.expanded.impressions.toLocaleString()}
  Clicks: ${data.totals.expanded.clicks.toLocaleString()}
  CTR: ${data.totals.expanded.ctr.toFixed(2)}%
  Cost: ${data.totals.expanded.cost.toFixed(2)}원 (+ VAT: ${data.totals.expanded.costWithVAT.toFixed(2)}원)
  Avg CPC: ${data.totals.expanded.cpc.toFixed(2)}원

📦 Campaigns (${data.campaigns.size}):
`
    
    // Add campaign details
    data.campaigns.forEach(campaign => {
      const keywordCount = campaign.keywordPerformance.size
      const expandedPercent = campaign.totals.impressions > 0 ? 
        (campaign.expandedPerformance.impressions / campaign.totals.impressions * 100).toFixed(1) : '0'
      
      report += `
  Campaign: ${campaign.campaignId}
    Total: ${campaign.totals.impressions} imps, ${campaign.totals.clicks} clicks, ${campaign.totals.cost.toFixed(2)}원
    Keywords (${keywordCount}): ${this.sumPerformance(Array.from(campaign.keywordPerformance.values())).impressions} imps
    Expanded: ${campaign.expandedPerformance.impressions} imps (${expandedPercent}% of total)
`
      
      // Show top keywords
      const topKeywords = Array.from(campaign.keywordPerformance.values())
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 3)
      
      if (topKeywords.length > 0) {
        report += `    Top Keywords:\n`
        topKeywords.forEach(kw => {
          report += `      - ${kw.keywordId}: ${kw.impressions} imps, ${kw.clicks} clicks, CTR ${kw.ctr.toFixed(2)}%\n`
        })
      }
    })
    
    return report
  }
  
  /**
   * Generate monthly summary
   */
  generateMonthlySummary(dataMap: Map<string, ProcessedData>): any {
    const summary = {
      period: '',
      days: dataMap.size,
      totals: {
        all: this.createEmptyPerformance(),
        keywords: this.createEmptyPerformance(),
        expanded: this.createEmptyPerformance()
      },
      dailyBreakdown: [] as any[]
    }
    
    // Aggregate all daily data
    dataMap.forEach((data, date) => {
      // Add to totals
      summary.totals.all.impressions += data.totals.all.impressions
      summary.totals.all.clicks += data.totals.all.clicks
      summary.totals.all.cost += data.totals.all.cost
      
      summary.totals.keywords.impressions += data.totals.keywords.impressions
      summary.totals.keywords.clicks += data.totals.keywords.clicks
      summary.totals.keywords.cost += data.totals.keywords.cost
      
      summary.totals.expanded.impressions += data.totals.expanded.impressions
      summary.totals.expanded.clicks += data.totals.expanded.clicks
      summary.totals.expanded.cost += data.totals.expanded.cost
      
      // Add daily breakdown
      summary.dailyBreakdown.push({
        date,
        all: { ...data.totals.all },
        keywords: { ...data.totals.keywords },
        expanded: { ...data.totals.expanded }
      })
    })
    
    // Calculate final metrics
    this.calculateMetrics(summary.totals.all)
    this.calculateMetrics(summary.totals.keywords)
    this.calculateMetrics(summary.totals.expanded)
    
    // Sort daily breakdown
    summary.dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date))
    
    // Set period
    if (summary.dailyBreakdown.length > 0) {
      summary.period = `${summary.dailyBreakdown[0].date} ~ ${summary.dailyBreakdown[summary.dailyBreakdown.length - 1].date}`
    }
    
    return summary
  }
  
  // Helper methods
  
  private createEmptyPerformance(): PerformanceData {
    return {
      impressions: 0,
      clicks: 0,
      cost: 0,
      costWithVAT: 0,
      ctr: 0,
      cpc: 0
    }
  }
  
  private calculateMetrics(perf: PerformanceData): void {
    perf.costWithVAT = perf.cost * 1.1
    perf.ctr = perf.impressions > 0 ? (perf.clicks / perf.impressions * 100) : 0
    perf.cpc = perf.clicks > 0 ? (perf.cost / perf.clicks) : 0
  }
  
  private sumPerformance(items: PerformanceData[]): PerformanceData {
    const sum = this.createEmptyPerformance()
    items.forEach(item => {
      sum.impressions += item.impressions
      sum.clicks += item.clicks
      sum.cost += item.cost
    })
    this.calculateMetrics(sum)
    return sum
  }
}

export default NaverAdsDataProcessor