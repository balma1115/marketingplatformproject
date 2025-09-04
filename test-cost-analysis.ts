import { prisma } from './lib/db'
import { NaverStatReportAPI } from './lib/services/naver-statreport-api'
import { NaverAdsDetailedParser } from './lib/services/naver-ads-detailed-parser'
import axios from 'axios'
import crypto from 'crypto'

async function testCostAnalysis() {
  try {
    console.log('💰 네이버 광고 비용 데이터 정밀 분석\n')
    console.log('목표: 실제 지출 (7일 ₩2,000, 30일 ₩8,000) 찾기\n')
    
    const nokyangUser = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true
      }
    })
    
    if (!nokyangUser || !nokyangUser.naverAdApiKey || !nokyangUser.naverAdSecret || !nokyangUser.naverAdCustomerId) {
      console.error('❌ Nokyang user not found')
      return
    }
    
    const apiKey = nokyangUser.naverAdApiKey
    const secretKey = nokyangUser.naverAdSecret
    const customerId = nokyangUser.naverAdCustomerId
    
    console.log(`Customer ID: ${customerId}\n`)
    
    const generateSignature = (method: string, uri: string, timestamp: string): string => {
      const message = `${timestamp}.${method.toUpperCase()}.${uri}`
      return crypto
        .createHmac('sha256', secretKey)
        .update(message, 'utf-8')
        .digest('base64')
    }
    
    const getAuthHeaders = (method: string, uri: string) => {
      const timestamp = Date.now().toString()
      const signature = generateSignature(method, uri, timestamp)
      
      return {
        'X-Timestamp': timestamp,
        'X-API-KEY': apiKey,
        'X-Customer': customerId,
        'X-Signature': signature,
        'Content-Type': 'application/json'
      }
    }
    
    // Test 1: Check Master Report API
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Test 1: Master Report API 확인')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    try {
      const masterUri = '/master-reports'
      const today = new Date()
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const response = await axios.post(
        `https://api.searchad.naver.com${masterUri}`,
        {
          fromTime: sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, ''),
          toTime: today.toISOString().split('T')[0].replace(/-/g, '')
        },
        {
          headers: getAuthHeaders('POST', masterUri)
        }
      )
      
      if (response.status === 200) {
        console.log('Master Report Response:', JSON.stringify(response.data, null, 2))
      }
    } catch (error: any) {
      console.log('Master Report not available:', error.response?.status || error.message)
    }
    
    // Test 2: Detailed Parser with column analysis
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Test 2: Detailed Parser 분석')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const parser = new NaverAdsDetailedParser(apiKey, secretKey, customerId)
    
    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Test 7-day range
    console.log('\n📅 7일간 데이터 (목표: ₩2,000):')
    const stats7d = await parser.getDetailedStats(
      sevenDaysAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    )
    
    console.log(`총 노출수: ${stats7d.summary.totalImpressions.toLocaleString()}`)
    console.log(`총 클릭수: ${stats7d.summary.totalClicks.toLocaleString()}`)
    console.log(`총 비용: ₩${Math.round(stats7d.summary.totalCost).toLocaleString()}`)
    
    if (stats7d.campaigns.length > 0) {
      console.log('\n캠페인별 비용:')
      stats7d.campaigns.forEach(campaign => {
        if (campaign.totalCost > 0) {
          console.log(`  ${campaign.campaignName}: ₩${Math.round(campaign.totalCost).toLocaleString()}`)
        }
      })
    }
    
    // Test 30-day range
    console.log('\n📅 30일간 데이터 (목표: ₩8,000):')
    const stats30d = await parser.getDetailedStats(
      thirtyDaysAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    )
    
    console.log(`총 노출수: ${stats30d.summary.totalImpressions.toLocaleString()}`)
    console.log(`총 클릭수: ${stats30d.summary.totalClicks.toLocaleString()}`)
    console.log(`총 비용: ₩${Math.round(stats30d.summary.totalCost).toLocaleString()}`)
    
    if (stats30d.campaigns.length > 0) {
      console.log('\n캠페인별 비용:')
      stats30d.campaigns.forEach(campaign => {
        if (campaign.totalCost > 0) {
          console.log(`  ${campaign.campaignName}: ₩${Math.round(campaign.totalCost).toLocaleString()}`)
        }
      })
    }
    
    // Test 3: Direct TSV download and manual analysis
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Test 3: TSV 직접 분석')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const api = new NaverStatReportAPI(apiKey, secretKey, customerId)
    
    // Create AD report for 30 days
    const report = await api.createReport(
      'AD',
      thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, ''),
      today.toISOString().split('T')[0].replace(/-/g, '')
    )
    
    if (report) {
      console.log(`Report created: ${report.reportJobId}`)
      
      let attempts = 0
      while (attempts < 15) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const status = await api.getReportStatus(report.reportJobId)
        
        if (status?.status === 'BUILT' || status?.status === 'DONE') {
          const data = await api.downloadReport(status.downloadUrl!)
          
          if (data) {
            const lines = data.split('\n').filter(line => line.trim())
            console.log(`\nTotal lines: ${lines.length}`)
            
            // Analyze all numeric columns
            const numericColumns: Map<number, number[]> = new Map()
            
            for (const line of lines) {
              const cells = line.split('\t')
              
              for (let i = 0; i < cells.length; i++) {
                const value = parseFloat(cells[i])
                if (!isNaN(value) && value > 0) {
                  if (!numericColumns.has(i)) {
                    numericColumns.set(i, [])
                  }
                  numericColumns.get(i)!.push(value)
                }
              }
            }
            
            console.log('\n각 컬럼의 합계 분석:')
            numericColumns.forEach((values, col) => {
              const sum = values.reduce((a, b) => a + b, 0)
              const avg = sum / values.length
              const max = Math.max(...values)
              const min = Math.min(...values)
              
              console.log(`\nColumn ${col}:`)
              console.log(`  합계: ${sum.toLocaleString()}`)
              console.log(`  평균: ${avg.toFixed(2)}`)
              console.log(`  최소: ${min}`)
              console.log(`  최대: ${max}`)
              console.log(`  샘플: ${values.slice(0, 3).join(', ')}`)
              
              // Check if this could be the cost column
              // For 30 days with ₩8,000 spending
              if (sum >= 6000 && sum <= 10000) {
                console.log(`  💰 가능성 높음! 30일 비용 컬럼 (목표: ₩8,000)`)
              }
              // For impressions (likely much higher)
              else if (sum > 10000 && max > 1000) {
                console.log(`  📊 노출수 컬럼일 가능성`)
              }
              // For clicks (likely lower)
              else if (sum < 1000 && max < 100) {
                console.log(`  👆 클릭수 컬럼일 가능성`)
              }
            })
          }
          break
        }
        attempts++
      }
    }
    
    // Test 4: Check Stat API directly
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Test 4: Stat API 직접 호출')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    try {
      // Get campaigns first
      const campaignsUri = '/ncc/campaigns'
      const campaignsResponse = await axios.get(
        `https://api.searchad.naver.com${campaignsUri}`,
        {
          headers: getAuthHeaders('GET', campaignsUri)
        }
      )
      
      if (campaignsResponse.status === 200) {
        const campaigns = campaignsResponse.data
        let totalCost7d = 0
        let totalCost30d = 0
        
        for (const campaign of campaigns) {
          // Get stats for each campaign
          const statsUri = `/stats?ids=${campaign.nccCampaignId}&fields=["impCnt","clkCnt","salesAmt","avgRnk","ccnt","crto","cpc","ctr"]&timeRange={"since":"${sevenDaysAgo.toISOString().split('T')[0]}","until":"${today.toISOString().split('T')[0]}"}`
          
          try {
            const statsResponse = await axios.get(
              `https://api.searchad.naver.com${statsUri}`,
              {
                headers: getAuthHeaders('GET', statsUri)
              }
            )
            
            if (statsResponse.status === 200 && statsResponse.data.length > 0) {
              const stats = statsResponse.data[0]
              if (stats.salesAmt) {
                totalCost7d += stats.salesAmt
                console.log(`${campaign.name} (7d): ₩${Math.round(stats.salesAmt).toLocaleString()}`)
              }
            }
          } catch (error) {
            // Silently continue
          }
        }
        
        console.log(`\n7일 총 비용 (Stats API): ₩${Math.round(totalCost7d).toLocaleString()}`)
        console.log(`목표: ₩2,000`)
        
        if (Math.abs(totalCost7d - 2000) < 500) {
          console.log('✅ Stats API가 정확한 비용을 반환!')
        }
      }
    } catch (error: any) {
      console.log('Stats API error:', error.response?.status || error.message)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCostAnalysis()