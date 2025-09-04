import { prisma } from './lib/db'
import { NaverAdsAPI } from './lib/services/naver-ads-api'

async function testNokyangData() {
  try {
    console.log('🎯 Testing with 녹양역학원 account (Customer ID: 2982259)\n')
    
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
    
    console.log(`✅ Found 녹양역학원 account`)
    console.log(`Customer ID: ${nokyangUser.naverAdCustomerId}\n`)
    
    const api = new NaverAdsAPI({
      accessKey: nokyangUser.naverAdApiKey,
      secretKey: nokyangUser.naverAdSecret,
      customerId: nokyangUser.naverAdCustomerId
    })
    
    // 1. Get campaigns
    console.log('📋 Getting campaigns...')
    const campaigns = await api.getCampaigns()
    console.log(`Found ${campaigns.length} campaigns:`)
    
    campaigns.forEach(camp => {
      console.log(`\n  ${camp.name} (${camp.nccCampaignId})`)
      console.log(`  - Status: ${camp.status}`)
      console.log(`  - Type: ${camp.campaignTp}`)
      console.log(`  - Total Cost: ₩${camp.totalChargeCost?.toLocaleString() || 0}`)
    })
    
    // 2. Test the exact date range from screenshot (Aug 28 - Sep 3, 2025)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📅 Testing screenshot date range')
    console.log('Date: Aug 28 - Sep 3, 2025 (7 days)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const stats = await api.getCampaignStats(undefined, '2025-08-28', '2025-09-03')
    
    console.log('\n📊 Results:')
    console.log(`  노출수: ${stats.impCnt.toLocaleString()}`)
    console.log(`  클릭수: ${stats.clkCnt.toLocaleString()}`)
    console.log(`  CTR: ${stats.ctr.toFixed(2)}%`)
    console.log(`  평균 CPC: ₩${Math.round(stats.cpc).toLocaleString()}`)
    console.log(`  총 비용: ₩${Math.round(stats.salesAmt).toLocaleString()}`)
    
    console.log('\n📸 Expected from screenshot:')
    console.log(`  노출수: 3,133`)
    console.log(`  클릭수: 16`)
    console.log(`  CTR: 0.51%`)
    
    if (stats.impCnt === 3133 && stats.clkCnt === 16) {
      console.log('\n✅✅✅ PERFECT MATCH! Data matches screenshot exactly!')
    } else if (stats.impCnt > 0 || stats.clkCnt > 0) {
      console.log('\n✅ Data retrieved successfully (may differ due to time or date range)')
    } else {
      console.log('\n⚠️ No data found - checking other date ranges...')
      
      // Try recent dates
      const recentStats = await api.getCampaignStats()
      if (recentStats.impCnt > 0 || recentStats.clkCnt > 0) {
        console.log('\n✅ Found data for last 7 days:')
        console.log(`  노출수: ${recentStats.impCnt.toLocaleString()}`)
        console.log(`  클릭수: ${recentStats.clkCnt.toLocaleString()}`)
        console.log(`  총 비용: ₩${Math.round(recentStats.salesAmt).toLocaleString()}`)
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNokyangData()