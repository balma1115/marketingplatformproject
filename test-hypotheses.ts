import { prisma } from './lib/db'
import { NaverAdsAPI } from './lib/services/naver-ads-api'
import { NaverStatReportAPI } from './lib/services/naver-statreport-api'
import axios from 'axios'
import crypto from 'crypto'

async function testHypotheses() {
  try {
    console.log('🔍 네이버 광고 데이터 불일치 원인 분석\n')
    console.log('실제 지출: 지난 7일 ₩2,000, 30일 ₩8,000\n')
    
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
    
    // Helper function for signature generation
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
    
    // 가설 1: 날짜 범위가 잘못되었을 수 있음
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('가설 1: 날짜 범위 문제')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    console.log(`오늘: ${today.toISOString().split('T')[0]}`)
    console.log(`7일 전: ${sevenDaysAgo.toISOString().split('T')[0]}`)
    console.log(`30일 전: ${thirtyDaysAgo.toISOString().split('T')[0]}`)
    
    // 가설 2: Report Type이 잘못되었을 수 있음
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('가설 2: Report Type별 테스트')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const reportTypes = ['AD', 'AD_DETAIL', 'AD_CONVERSION']
    const api = new NaverStatReportAPI(apiKey, secretKey, customerId)
    
    for (const reportType of reportTypes) {
      console.log(`\n📊 Testing ${reportType} report...`)
      
      try {
        const report = await api.createReport(
          reportType as any,
          sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, ''),
          today.toISOString().split('T')[0].replace(/-/g, '')
        )
        
        if (report) {
          console.log(`✅ ${reportType} report created: ${report.reportJobId}`)
          
          // Wait for report
          let attempts = 0
          while (attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            const status = await api.getReportStatus(report.reportJobId)
            
            if (status?.status === 'BUILT' || status?.status === 'DONE') {
              const data = await api.downloadReport(status.downloadUrl!)
              
              if (data) {
                const lines = data.split('\n').filter(line => line.trim())
                console.log(`  Data rows: ${lines.length}`)
                
                // Analyze first row to understand structure
                if (lines.length > 0) {
                  const cells = lines[0].split('\t')
                  console.log(`  Columns: ${cells.length}`)
                  
                  // Try to find cost column
                  let totalCost = 0
                  for (const line of lines) {
                    const cells = line.split('\t')
                    
                    // Check various columns that might contain cost
                    for (let i = 13; i < cells.length; i++) {
                      const value = parseFloat(cells[i]) || 0
                      // Cost is likely to be a larger number
                      if (value > 100 && value < 100000) {
                        totalCost += value
                      }
                    }
                  }
                  
                  console.log(`  Estimated total cost: ₩${totalCost.toLocaleString()}`)
                }
              }
              break
            } else if (status?.status === 'FAILED' || status?.status === 'NONE') {
              console.log(`  ${reportType} report failed or no data`)
              break
            }
            attempts++
          }
        }
      } catch (error: any) {
        console.log(`  ❌ ${reportType} failed: ${error.message}`)
      }
    }
    
    // 가설 3: Campaign별 totalChargeCost 확인
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('가설 3: Campaign totalChargeCost 확인')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const naverAds = new NaverAdsAPI({
      accessKey: apiKey,
      secretKey: secretKey,
      customerId: customerId
    })
    
    const campaigns = await naverAds.getCampaigns()
    let totalCharge = 0
    
    campaigns.forEach(campaign => {
      if (campaign.totalChargeCost > 0) {
        console.log(`${campaign.name}: ₩${campaign.totalChargeCost.toLocaleString()}`)
        totalCharge += campaign.totalChargeCost
      }
    })
    
    console.log(`\nTotal charge from campaigns: ₩${totalCharge.toLocaleString()}`)
    
    // 가설 4: Billing API로 실제 잔액 확인
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('가설 4: Billing 정보 확인')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    try {
      const billingUri = '/billing/bizmoney'
      const response = await axios.get(
        `https://api.searchad.naver.com${billingUri}`,
        {
          headers: getAuthHeaders('GET', billingUri)
        }
      )
      
      if (response.status === 200) {
        console.log('Billing info:', JSON.stringify(response.data, null, 2))
      }
    } catch (error: any) {
      console.log('Billing API failed:', error.response?.status || error.message)
    }
    
    // 가설 5: TSV 컬럼 매핑 재확인
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('가설 5: TSV 컬럼 상세 분석')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Create a detailed report for last 7 days
    const detailReport = await api.createReport(
      'AD_DETAIL',
      sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, ''),
      today.toISOString().split('T')[0].replace(/-/g, '')
    )
    
    if (detailReport) {
      console.log('Waiting for detailed report...')
      
      let attempts = 0
      while (attempts < 15) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const status = await api.getReportStatus(detailReport.reportJobId)
        
        if (status?.status === 'BUILT' || status?.status === 'DONE') {
          const data = await api.downloadReport(status.downloadUrl!)
          
          if (data) {
            const lines = data.split('\n').filter(line => line.trim())
            console.log(`\nTotal rows: ${lines.length}`)
            
            // Analyze column values to find patterns
            const columnStats: any = {}
            
            for (const line of lines) {
              const cells = line.split('\t')
              
              for (let i = 0; i < cells.length; i++) {
                if (!columnStats[i]) {
                  columnStats[i] = {
                    min: Infinity,
                    max: -Infinity,
                    sum: 0,
                    count: 0,
                    samples: []
                  }
                }
                
                const value = parseFloat(cells[i]) || 0
                if (value > 0) {
                  columnStats[i].min = Math.min(columnStats[i].min, value)
                  columnStats[i].max = Math.max(columnStats[i].max, value)
                  columnStats[i].sum += value
                  columnStats[i].count++
                  
                  if (columnStats[i].samples.length < 3) {
                    columnStats[i].samples.push(cells[i])
                  }
                }
              }
            }
            
            console.log('\nColumn analysis (non-zero values):')
            Object.keys(columnStats).forEach(col => {
              const stats = columnStats[col]
              if (stats.count > 0) {
                console.log(`\nColumn ${col}:`)
                console.log(`  Range: ${stats.min} - ${stats.max}`)
                console.log(`  Sum: ${stats.sum}`)
                console.log(`  Count: ${stats.count}`)
                console.log(`  Samples: ${stats.samples.join(', ')}`)
                
                // Likely cost column: sum around 2000 for 7 days
                if (stats.sum >= 1500 && stats.sum <= 2500) {
                  console.log(`  🎯 LIKELY COST COLUMN (7-day total: ${stats.sum})`)
                }
                
                // Likely impressions: larger numbers
                if (stats.sum > 1000 && stats.max > 100) {
                  console.log(`  📊 Possibly impressions or other metric`)
                }
                
                // Likely clicks: smaller numbers
                if (stats.sum < 100 && stats.max < 50) {
                  console.log(`  👆 Possibly clicks`)
                }
              }
            })
          }
          break
        }
        attempts++
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testHypotheses()