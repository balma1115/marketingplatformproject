/**
 * Process TSV reports to JSON format for easier keyword stats retrieval
 * 
 * TSV 컬럼 구조:
 * [0] Date (YYYYMMDD)
 * [1] Customer ID
 * [2] Campaign ID
 * [3] Ad Group ID
 * [4] Keyword ID (or '-' for non-keyword)
 * [5] Ad ID
 * [6] Business Channel ID
 * [7] Query ID
 * [8] Device Type (M/P)
 * [9] Average Rank
 * [10] Clicks
 * [11] Cost (VAT excluded)
 * [12] Impressions
 * [13] Conversions (if available)
 */

import * as fs from 'fs'
import * as path from 'path'

interface KeywordStats {
  keywordId: string
  adgroupId: string
  campaignId: string
  impressions: number
  clicks: number
  cost: number
  avgRank: number
  device: string
}

interface ExtendedSearchResult {
  adgroupId: string
  campaignId: string
  impressions: number
  clicks: number
  cost: number
  avgRank: number
  device: string
}

interface DailyData {
  date: string
  customerId: string
  keywords: KeywordStats[]
  extendedSearchResults: ExtendedSearchResult[]
  campaigns: Record<string, {
    impressions: number
    clicks: number
    cost: number
  }>
  adgroups: Record<string, {
    impressions: number
    clicks: number
    cost: number
  }>
}

function processTSVFile(filePath: string): DailyData | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    const keywords: KeywordStats[] = []
    const extendedSearchResults: ExtendedSearchResult[] = []
    const campaigns: Record<string, any> = {}
    const adgroups: Record<string, any> = {}
    
    let date = ''
    let customerId = ''
    
    for (const line of lines) {
      const cells = line.split('\t')
      
      // Skip header or invalid lines
      if (cells.length < 13 || cells[0] === 'Date') continue
      
      // Extract date and customer ID
      if (!date && cells[0].length === 8) {
        date = `${cells[0].substring(0,4)}-${cells[0].substring(4,6)}-${cells[0].substring(6,8)}`
      }
      if (!customerId) {
        customerId = cells[1]
      }
      
      const campaignId = cells[2]
      const adgroupId = cells[3]
      const keywordId = cells[4]
      const device = cells[8]
      const avgRank = parseFloat(cells[9]) || 0
      const clicks = parseInt(cells[10]) || 0
      const cost = parseFloat(cells[11]) || 0
      const impressions = parseInt(cells[12]) || 0
      
      // Process keyword data or extended search results
      if (keywordId && keywordId !== '-') {
        keywords.push({
          keywordId,
          adgroupId,
          campaignId,
          impressions,
          clicks,
          cost,
          avgRank,
          device
        })
      } else if (keywordId === '-') {
        // This is an extended search result (no specific keyword)
        extendedSearchResults.push({
          adgroupId,
          campaignId,
          impressions,
          clicks,
          cost,
          avgRank,
          device
        })
      }
      
      // Aggregate campaign data
      if (!campaigns[campaignId]) {
        campaigns[campaignId] = { impressions: 0, clicks: 0, cost: 0 }
      }
      campaigns[campaignId].impressions += impressions
      campaigns[campaignId].clicks += clicks
      campaigns[campaignId].cost += cost
      
      // Aggregate adgroup data
      if (!adgroups[adgroupId]) {
        adgroups[adgroupId] = { impressions: 0, clicks: 0, cost: 0 }
      }
      adgroups[adgroupId].impressions += impressions
      adgroups[adgroupId].clicks += clicks
      adgroups[adgroupId].cost += cost
    }
    
    return {
      date,
      customerId,
      keywords,
      extendedSearchResults,
      campaigns,
      adgroups
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error)
    return null
  }
}

function main() {
  // Process both august-2025-final and data/tsv-reports directories
  const directories = [
    path.join(process.cwd(), 'august-2025-final'),
    path.join(process.cwd(), 'data', 'tsv-reports')
  ]
  
  const outputDir = path.join(process.cwd(), 'data', 'json-processed')
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  let allFiles: string[] = []
  
  // Collect all TSV files from both directories
  for (const dir of directories) {
    if (fs.existsSync(dir)) {
      const dirFiles = fs.readdirSync(dir)
        .filter(f => f.endsWith('.tsv'))
        .map(f => path.join(dir, f))
      allFiles = allFiles.concat(dirFiles)
    }
  }
  
  // Remove duplicates based on date
  const uniqueFiles = new Map<string, string>()
  for (const file of allFiles) {
    const match = path.basename(file).match(/(\d{4}-\d{2}-\d{2})/)
    if (match) {
      const date = match[1]
      // Keep the first occurrence (august-2025-final has priority)
      if (!uniqueFiles.has(date)) {
        uniqueFiles.set(date, file)
      }
    }
  }
  
  const files = Array.from(uniqueFiles.values())
  console.log(`Found ${files.length} unique TSV files to process`)
  
  for (const filePath of files) {
    const data = processTSVFile(filePath)
    
    if (data) {
      const outputFile = path.join(outputDir, `processed_${data.date}.json`)
      
      // Aggregate keyword stats by keywordId
      const keywordMap: Record<string, any> = {}
      for (const kw of data.keywords) {
        if (!keywordMap[kw.keywordId]) {
          keywordMap[kw.keywordId] = {
            keywordId: kw.keywordId,
            adgroupId: kw.adgroupId,
            campaignId: kw.campaignId,
            impressions: 0,
            clicks: 0,
            cost: 0,
            devices: { M: 0, P: 0 },
            avgRank: []
          }
        }
        
        keywordMap[kw.keywordId].impressions += kw.impressions
        keywordMap[kw.keywordId].clicks += kw.clicks
        keywordMap[kw.keywordId].cost += kw.cost
        keywordMap[kw.keywordId].devices[kw.device] += kw.impressions
        if (kw.avgRank > 0) {
          keywordMap[kw.keywordId].avgRank.push(kw.avgRank)
        }
      }
      
      // Calculate average rank
      Object.values(keywordMap).forEach((kw: any) => {
        kw.avgRank = kw.avgRank.length > 0 
          ? kw.avgRank.reduce((a: number, b: number) => a + b, 0) / kw.avgRank.length
          : 0
        kw.ctr = kw.impressions > 0 ? (kw.clicks / kw.impressions * 100) : 0
        kw.cpc = kw.clicks > 0 ? (kw.cost / kw.clicks) : 0
      })
      
      // Aggregate extended search results by adgroup
      const extendedSearchByAdgroup: Record<string, any> = {}
      for (const esr of data.extendedSearchResults) {
        if (!extendedSearchByAdgroup[esr.adgroupId]) {
          extendedSearchByAdgroup[esr.adgroupId] = {
            adgroupId: esr.adgroupId,
            campaignId: esr.campaignId,
            impressions: 0,
            clicks: 0,
            cost: 0,
            devices: { M: 0, P: 0 }
          }
        }
        extendedSearchByAdgroup[esr.adgroupId].impressions += esr.impressions
        extendedSearchByAdgroup[esr.adgroupId].clicks += esr.clicks
        extendedSearchByAdgroup[esr.adgroupId].cost += esr.cost
        extendedSearchByAdgroup[esr.adgroupId].devices[esr.device] += esr.impressions
      }
      
      // Calculate CTR and CPC for extended search results
      Object.values(extendedSearchByAdgroup).forEach((esr: any) => {
        esr.ctr = esr.impressions > 0 ? (esr.clicks / esr.impressions * 100) : 0
        esr.cpc = esr.clicks > 0 ? (esr.cost / esr.clicks) : 0
      })
      
      const output = {
        date: data.date,
        customerId: data.customerId,
        keywords: keywordMap,
        extendedSearchResults: extendedSearchByAdgroup,
        campaigns: data.campaigns,
        adgroups: data.adgroups,
        rawData: data.keywords.map(kw => ({
          ...kw,
          date: data.date
        }))
      }
      
      fs.writeFileSync(outputFile, JSON.stringify(output, null, 2))
      console.log(`✅ Processed ${path.basename(filePath)} -> ${path.basename(outputFile)}`)
      
      // Show sample stats
      const totalKeywords = Object.keys(keywordMap).length
      const totalImpressions = Object.values(keywordMap).reduce((sum: number, kw: any) => sum + kw.impressions, 0)
      const totalClicks = Object.values(keywordMap).reduce((sum: number, kw: any) => sum + kw.clicks, 0)
      const totalCost = Object.values(keywordMap).reduce((sum: number, kw: any) => sum + kw.cost, 0)
      
      console.log(`   📊 ${totalKeywords} keywords, ${totalImpressions} impressions, ${totalClicks} clicks, ₩${totalCost.toFixed(0)} cost`)
    }
  }
  
  console.log('\n✅ All TSV files processed successfully!')
  console.log(`📁 JSON files saved to: ${outputDir}`)
}

// Run the processor
main()