import { prisma } from './lib/db'
import { NaverAdsAPI } from './lib/services/naver-ads-api'

async function testActualData() {
  try {
    console.log('🔍 Testing actual Naver Ads data retrieval\n')
    
    // Get academy user credentials
    const academyUser = await prisma.user.findFirst({
      where: {
        email: 'academy@marketingplat.com'
      },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true
      }
    })
    
    if (!academyUser || !academyUser.naverAdApiKey || !academyUser.naverAdSecret || !academyUser.naverAdCustomerId) {
      console.error('❌ Academy user not found or missing credentials')
      return
    }
    
    console.log(`Customer ID: ${academyUser.naverAdCustomerId}\n`)
    
    const api = new NaverAdsAPI({
      accessKey: academyUser.naverAdApiKey,
      secretKey: academyUser.naverAdSecret,
      customerId: academyUser.naverAdCustomerId
    })
    
    // 1. Get campaigns first
    console.log('📋 1. Getting campaigns...')
    const campaigns = await api.getCampaigns()
    console.log(`Found ${campaigns.length} campaigns:`)
    campaigns.forEach(camp => {
      console.log(`\n  Campaign: ${camp.name} (${camp.nccCampaignId})`)
      console.log(`  - Status: ${camp.status}`)
      console.log(`  - Type: ${camp.campaignTp}`)
      console.log(`  - Daily Budget: ₩${camp.dailyBudget?.toLocaleString() || 0}`)
      console.log(`  - Total Cost: ₩${camp.totalChargeCost?.toLocaleString() || 0}`)
      console.log(`  - Created: ${camp.regTm}`)
    })
    
    // 2. Get account balance
    console.log('\n📊 2. Getting account balance...')
    try {
      const balance = await api.getAccountBalance()
      console.log(`Account Balance: ₩${balance.toLocaleString()}`)
    } catch (error) {
      console.log('Could not get account balance')
    }
    
    // 3. Test different date ranges to find actual data
    console.log('\n📅 3. Testing different date ranges for stats...')
    
    const testRanges = [
      { from: '2025-01-01', to: '2025-01-04', label: 'Jan 1-4, 2025 (Today)' },
      { from: '2024-12-01', to: '2024-12-31', label: 'December 2024' },
      { from: '2024-11-01', to: '2024-11-30', label: 'November 2024' },
      { from: '2024-01-01', to: '2024-12-31', label: 'Full Year 2024' },
      { from: '2023-01-01', to: '2023-12-31', label: 'Full Year 2023' },
      { from: '2019-04-25', to: '2019-05-31', label: 'Campaign creation period (April-May 2019)' },
      { from: '2019-01-01', to: '2019-12-31', label: 'Full Year 2019' }
    ]
    
    for (const range of testRanges) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`Testing: ${range.label}`)
      console.log(`Date range: ${range.from} to ${range.to}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      try {
        const stats = await api.getCampaignStats(undefined, range.from, range.to)
        
        if (stats.impCnt > 0 || stats.clkCnt > 0 || stats.salesAmt > 0) {
          console.log('✅ DATA FOUND!')
          console.log(`  노출수: ${stats.impCnt.toLocaleString()}`)
          console.log(`  클릭수: ${stats.clkCnt.toLocaleString()}`)
          console.log(`  CTR: ${stats.ctr.toFixed(2)}%`)
          console.log(`  평균 CPC: ₩${Math.round(stats.cpc).toLocaleString()}`)
          console.log(`  총 비용: ₩${Math.round(stats.salesAmt).toLocaleString()}`)
        } else {
          console.log('⚠️ No data for this period')
        }
      } catch (error: any) {
        console.error(`❌ Error: ${error.message}`)
      }
    }
    
    // 4. Try to get individual campaign stats
    console.log('\n\n📈 4. Getting stats for each campaign individually...')
    
    for (const campaign of campaigns) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`Campaign: ${campaign.name}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      // Try last 7 days
      const today = new Date()
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const from = weekAgo.toISOString().split('T')[0]
      const to = today.toISOString().split('T')[0]
      
      try {
        const stats = await api.getCampaignStats(campaign.nccCampaignId, from, to)
        
        if (stats.impCnt > 0 || stats.clkCnt > 0 || stats.salesAmt > 0) {
          console.log('✅ DATA FOUND for last 7 days!')
          console.log(`  노출수: ${stats.impCnt.toLocaleString()}`)
          console.log(`  클릭수: ${stats.clkCnt.toLocaleString()}`)
          console.log(`  CTR: ${stats.ctr.toFixed(2)}%`)
          console.log(`  평균 CPC: ₩${Math.round(stats.cpc).toLocaleString()}`)
          console.log(`  총 비용: ₩${Math.round(stats.salesAmt).toLocaleString()}`)
        } else {
          console.log('⚠️ No data for last 7 days')
          
          // Try since creation date
          const createdDate = campaign.regTm ? new Date(campaign.regTm).toISOString().split('T')[0] : '2019-01-01'
          console.log(`\nTrying since creation (${createdDate})...`)
          
          const historicalStats = await api.getCampaignStats(campaign.nccCampaignId, createdDate, to)
          
          if (historicalStats.impCnt > 0 || historicalStats.clkCnt > 0 || historicalStats.salesAmt > 0) {
            console.log('✅ HISTORICAL DATA FOUND!')
            console.log(`  노출수: ${historicalStats.impCnt.toLocaleString()}`)
            console.log(`  클릭수: ${historicalStats.clkCnt.toLocaleString()}`)
            console.log(`  CTR: ${historicalStats.ctr.toFixed(2)}%`)
            console.log(`  평균 CPC: ₩${Math.round(historicalStats.cpc).toLocaleString()}`)
            console.log(`  총 비용: ₩${Math.round(historicalStats.salesAmt).toLocaleString()}`)
          } else {
            console.log('⚠️ No historical data found')
          }
        }
      } catch (error: any) {
        console.error(`❌ Error: ${error.message}`)
      }
    }
    
    // 5. Check if we need different API credentials
    console.log('\n\n🔐 5. Checking API credentials...')
    console.log('Current Customer ID:', academyUser.naverAdCustomerId)
    console.log('Screenshot shows Customer ID: 2982259')
    console.log('Current account Customer ID: 1632045')
    
    if (academyUser.naverAdCustomerId !== '2982259') {
      console.log('\n⚠️ IMPORTANT: The screenshot data is from a different account!')
      console.log('   Current account (1632045) has no ad spend history')
      console.log('   Screenshot account (2982259) has actual ad data')
      console.log('   To see the same data as screenshot, you need to use account 2982259\'s credentials')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testActualData()