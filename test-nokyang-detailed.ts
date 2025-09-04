import { prisma } from './lib/db'
import { NaverStatReportAPI } from './lib/services/naver-statreport-api'
import { NaverStatReportParser } from './lib/services/naver-statreport-parser'

async function testNokyangDetailed() {
  try {
    console.log('🔍 녹양역학원 계정 상세 데이터 분석\n')
    
    // Get nokyang user credentials
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
      console.error('❌ Nokyang user not found or missing credentials')
      return
    }
    
    console.log(`Customer ID: ${nokyangUser.naverAdCustomerId}\n`)
    
    const api = new NaverStatReportAPI(
      nokyangUser.naverAdApiKey,
      nokyangUser.naverAdSecret,
      nokyangUser.naverAdCustomerId
    )
    
    const parser = new NaverStatReportParser(
      nokyangUser.naverAdApiKey,
      nokyangUser.naverAdSecret,
      nokyangUser.naverAdCustomerId
    )
    
    // Get campaign names
    const campaignNames = await parser.getCampaignNames()
    console.log('📋 캠페인 목록:')
    campaignNames.forEach((name, id) => {
      console.log(`  - ${id}: ${name}`)
    })
    
    // Test with the exact date from screenshot
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📅 스크린샷 날짜 테스트 (2025-08-28 ~ 2025-09-03)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Create AD_DETAIL report for more detailed data
    const report = await api.createReport('AD_DETAIL', '20250828', '20250903')
    
    if (report) {
      console.log(`✅ Report created: ${report.reportJobId}`)
      console.log('⏳ Waiting for completion...')
      
      let attempts = 0
      while (attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const status = await api.getReportStatus(report.reportJobId)
        
        if (status) {
          process.stdout.write(`\rStatus: ${status.status} (attempt ${attempts + 1}/20)`)
          
          if (status.status === 'BUILT' || status.status === 'DONE') {
            console.log('\n✅ Report ready!')
            
            if (status.downloadUrl) {
              const data = await api.downloadReport(status.downloadUrl)
              
              if (data) {
                // Analyze raw data first
                const lines = data.split('\n').filter(line => line.trim())
                console.log(`\n📄 Raw data: ${lines.length} rows`)
                
                if (lines.length > 0) {
                  // Show first few lines to understand structure
                  console.log('\n🔍 Sample data (first 3 rows):')
                  for (let i = 0; i < Math.min(3, lines.length); i++) {
                    const cells = lines[i].split('\t')
                    console.log(`Row ${i + 1}: ${cells.length} columns`)
                    cells.forEach((cell, idx) => {
                      if (cell && cell !== '-' && cell !== '0') {
                        console.log(`  [${idx}]: ${cell}`)
                      }
                    })
                  }
                  
                  // Analyze all data to find correct columns
                  console.log('\n📊 Data Analysis:')
                  let totalImpressions = 0
                  let totalClicks = 0
                  let totalCost = 0
                  const campaignData = new Map()
                  
                  for (const line of lines) {
                    const cells = line.split('\t')
                    
                    // Try different column positions
                    const possibleImpressions = [
                      parseInt(cells[11]) || 0,  // Original assumption
                      parseInt(cells[12]) || 0,
                      parseInt(cells[10]) || 0,
                      parseInt(cells[9]) || 0
                    ]
                    
                    const possibleClicks = [
                      parseInt(cells[12]) || 0,  // Original assumption  
                      parseInt(cells[11]) || 0,
                      parseInt(cells[13]) || 0,
                      parseInt(cells[10]) || 0
                    ]
                    
                    // Find which columns make sense (impressions should be > clicks usually)
                    let impressions = 0
                    let clicks = 0
                    
                    // Check each combination
                    for (let i = 0; i < possibleImpressions.length; i++) {
                      const imp = possibleImpressions[i]
                      const clk = possibleClicks[i]
                      
                      // Impressions should typically be >= clicks
                      if (imp >= clk && imp > 0) {
                        impressions = imp
                        clicks = clk
                        break
                      }
                    }
                    
                    // If no valid combination, try reverse (maybe clicks and impressions are swapped)
                    if (impressions === 0 && clicks === 0) {
                      // Check if data might be swapped
                      const imp = parseInt(cells[12]) || 0
                      const clk = parseInt(cells[11]) || 0
                      if (imp > 0 || clk > 0) {
                        // Data is likely swapped
                        impressions = clk  // Column 11 is actually impressions
                        clicks = imp       // Column 12 is actually clicks
                      }
                    }
                    
                    const campaignId = cells[2]
                    if (!campaignData.has(campaignId)) {
                      campaignData.set(campaignId, {
                        impressions: 0,
                        clicks: 0,
                        cost: 0
                      })
                    }
                    
                    const stats = campaignData.get(campaignId)
                    stats.impressions += impressions
                    stats.clicks += clicks
                    
                    totalImpressions += impressions
                    totalClicks += clicks
                  }
                  
                  console.log(`\n📊 Total Stats (Raw Parsing):`)
                  console.log(`  노출수: ${totalImpressions.toLocaleString()}`)
                  console.log(`  클릭수: ${totalClicks.toLocaleString()}`)
                  
                  // Expected from screenshot
                  console.log('\n📸 Expected from screenshot:')
                  console.log(`  노출수: 3,133`)
                  console.log(`  클릭수: 16`)
                  
                  // Check if we need to swap columns
                  if (totalImpressions === 16 && totalClicks === 3133) {
                    console.log('\n⚠️ Columns are definitely swapped!')
                    console.log('Correcting...')
                    const temp = totalImpressions
                    totalImpressions = totalClicks
                    totalClicks = temp
                    console.log(`\n✅ Corrected Stats:`)
                    console.log(`  노출수: ${totalImpressions.toLocaleString()}`)
                    console.log(`  클릭수: ${totalClicks.toLocaleString()}`)
                  } else if (Math.abs(totalImpressions - 3133) < 100 && Math.abs(totalClicks - 16) < 5) {
                    console.log('\n✅ Data matches screenshot closely!')
                  }
                  
                  // Show per-campaign breakdown
                  console.log('\n📊 Per Campaign Breakdown:')
                  campaignData.forEach((stats, campaignId) => {
                    const name = campaignNames.get(campaignId) || campaignId
                    if (stats.impressions > 0 || stats.clicks > 0) {
                      console.log(`\n  ${name}:`)
                      console.log(`    노출수: ${stats.impressions.toLocaleString()}`)
                      console.log(`    클릭수: ${stats.clicks.toLocaleString()}`)
                    }
                  })
                }
              }
            }
            break
          } else if (status.status === 'FAILED') {
            console.log('\n❌ Report generation failed')
            break
          }
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

testNokyangDetailed()