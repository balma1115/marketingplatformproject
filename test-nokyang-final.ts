import { prisma } from './lib/db'
import { NaverAdsStatsService } from './lib/services/naver-ads-stats-service'

async function testNokyangFinal() {
  try {
    console.log('🎯 녹양역학원 최종 데이터 테스트\n')
    
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
    
    const statsService = new NaverAdsStatsService(
      nokyangUser.naverAdApiKey,
      nokyangUser.naverAdSecret,
      nokyangUser.naverAdCustomerId
    )
    
    // Test different date ranges
    const testRanges = [
      { start: '2025-08-28', end: '2025-09-03', label: 'Screenshot period (Aug 28 - Sep 3)' },
      { start: '2025-01-01', end: '2025-01-04', label: 'Recent (Jan 1-4, 2025)' }
    ]
    
    for (const range of testRanges) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`📅 ${range.label}`)
      console.log(`Date range: ${range.start} to ${range.end}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      const stats = await statsService.getDetailedStats(range.start, range.end)
      
      if (stats.summary.totalImpressions > 0 || stats.summary.totalClicks > 0) {
        console.log('\n📊 Summary:')
        console.log(`  총 노출수: ${stats.summary.totalImpressions.toLocaleString()}`)
        console.log(`  총 클릭수: ${stats.summary.totalClicks.toLocaleString()}`)
        console.log(`  총 비용: ₩${Math.round(stats.summary.totalCost).toLocaleString()}`)
        console.log(`  평균 CTR: ${stats.summary.avgCtr.toFixed(2)}%`)
        console.log(`  평균 CPC: ₩${Math.round(stats.summary.avgCpc).toLocaleString()}`)
        
        console.log('\n📈 Campaign Breakdown:')
        stats.campaigns.forEach(campaign => {
          if (campaign.totalStats.impressions > 0 || campaign.totalStats.clicks > 0) {
            console.log(`\n  ${campaign.campaignName}:`)
            console.log(`    노출수: ${campaign.totalStats.impressions.toLocaleString()}`)
            console.log(`    클릭수: ${campaign.totalStats.clicks.toLocaleString()}`)
            console.log(`    비용: ₩${Math.round(campaign.totalStats.cost).toLocaleString()}`)
            console.log(`    CTR: ${campaign.totalStats.ctr.toFixed(2)}%`)
            console.log(`    CPC: ₩${Math.round(campaign.totalStats.cpc).toLocaleString()}`)
            
            // Show daily breakdown for first campaign with data
            if (campaign.dailyStats.length > 0) {
              console.log(`\n    Daily Stats:`)
              campaign.dailyStats.forEach(day => {
                if (day.impressions > 0 || day.clicks > 0) {
                  const dateStr = `${day.date.substring(0,4)}-${day.date.substring(4,6)}-${day.date.substring(6,8)}`
                  console.log(`      ${dateStr}: ${day.impressions} impressions, ${day.clicks} clicks`)
                }
              })
            }
          }
        })
        
        // Check if this matches screenshot
        if (range.label.includes('Screenshot')) {
          console.log('\n📸 Comparison with Screenshot:')
          console.log(`  Expected: 3,133 impressions, 16 clicks`)
          console.log(`  Got: ${stats.summary.totalImpressions.toLocaleString()} impressions, ${stats.summary.totalClicks.toLocaleString()} clicks`)
          
          if (Math.abs(stats.summary.totalImpressions - 3133) < 100 && 
              Math.abs(stats.summary.totalClicks - 16) < 5) {
            console.log('  ✅ Data matches screenshot!')
          } else {
            console.log('  ⚠️ Data does not match exactly')
          }
        }
      } else {
        console.log('\n⚠️ No data for this period')
      }
      
      console.log()
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNokyangFinal()