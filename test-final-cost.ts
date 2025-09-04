import { prisma } from './lib/db'
import { NaverAdsAPI } from './lib/services/naver-ads-api'

async function testFinalCost() {
  try {
    console.log('💰 최종 비용 데이터 테스트\n')
    console.log('목표: 7일 ₩2,000, 30일 ₩8,000\n')
    
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
    
    console.log(`Customer ID: ${nokyangUser.naverAdCustomerId}\n`)
    
    const naverAds = new NaverAdsAPI({
      accessKey: nokyangUser.naverAdApiKey,
      secretKey: nokyangUser.naverAdSecret,
      customerId: nokyangUser.naverAdCustomerId
    })
    
    // Get campaigns first
    const campaigns = await naverAds.getCampaigns()
    console.log(`Found ${campaigns.length} campaigns:`)
    campaigns.forEach(c => {
      console.log(`  - ${c.name} (${c.nccCampaignId}): ₩${c.totalChargeCost}`)
    })
    
    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const formatDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📅 7일간 통계 테스트')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Test aggregate stats for 7 days
    const stats7d = await naverAds.getCampaignStats(
      undefined, // All campaigns
      formatDate(sevenDaysAgo),
      formatDate(today)
    )
    
    console.log('7일간 통합 통계:')
    console.log(`  노출수: ${stats7d.impCnt.toLocaleString()}`)
    console.log(`  클릭수: ${stats7d.clkCnt}`)
    console.log(`  비용: ₩${Math.round(stats7d.salesAmt).toLocaleString()} (목표: ₩2,000)`)
    console.log(`  CTR: ${stats7d.ctr.toFixed(2)}%`)
    console.log(`  CPC: ₩${Math.round(stats7d.cpc).toLocaleString()}`)
    
    if (Math.abs(stats7d.salesAmt - 2000) < 500) {
      console.log('  ✅ 7일 데이터가 실제와 근접!')
    } else {
      console.log('  ⚠️ 7일 데이터 불일치')
    }
    
    // Test individual campaigns for 7 days
    console.log('\n캠페인별 7일간 통계:')
    for (const campaign of campaigns) {
      const campaignStats = await naverAds.getCampaignStats(
        campaign.nccCampaignId,
        formatDate(sevenDaysAgo),
        formatDate(today)
      )
      
      if (campaignStats.salesAmt > 0) {
        console.log(`  ${campaign.name}:`)
        console.log(`    노출: ${campaignStats.impCnt}, 클릭: ${campaignStats.clkCnt}`)
        console.log(`    비용: ₩${Math.round(campaignStats.salesAmt).toLocaleString()}`)
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📅 30일간 통계 테스트')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Test aggregate stats for 30 days
    const stats30d = await naverAds.getCampaignStats(
      undefined, // All campaigns
      formatDate(thirtyDaysAgo),
      formatDate(today)
    )
    
    console.log('30일간 통합 통계:')
    console.log(`  노출수: ${stats30d.impCnt.toLocaleString()}`)
    console.log(`  클릭수: ${stats30d.clkCnt}`)
    console.log(`  비용: ₩${Math.round(stats30d.salesAmt).toLocaleString()} (목표: ₩8,000)`)
    console.log(`  CTR: ${stats30d.ctr.toFixed(2)}%`)
    console.log(`  CPC: ₩${Math.round(stats30d.cpc).toLocaleString()}`)
    
    if (Math.abs(stats30d.salesAmt - 8000) < 1000) {
      console.log('  ✅ 30일 데이터가 실제와 근접!')
    } else {
      console.log('  ⚠️ 30일 데이터 불일치')
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 결론')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const diff7d = Math.abs(stats7d.salesAmt - 2000)
    const diff30d = Math.abs(stats30d.salesAmt - 8000)
    
    if (diff7d < 500 && diff30d < 1000) {
      console.log('✅ 데이터가 실제 지출과 일치합니다!')
    } else {
      console.log('현재 API 결과:')
      console.log(`  7일: ₩${Math.round(stats7d.salesAmt).toLocaleString()} (차이: ₩${Math.round(diff7d).toLocaleString()})`)
      console.log(`  30일: ₩${Math.round(stats30d.salesAmt).toLocaleString()} (차이: ₩${Math.round(diff30d).toLocaleString()})`)
      console.log('\n추가 검증이 필요합니다.')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFinalCost()