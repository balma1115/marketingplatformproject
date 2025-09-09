import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { NaverAdsDataProcessor } from '@/lib/services/naver-ads-data-processor'
import { prisma } from '@/lib/db'
import axios from 'axios'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const auth = await verifyAuth(request)
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URL 파라미터에서 날짜 범위 가져오기
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // 사용자의 Naver Ads API 키 가져오기
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true,
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdsCustomerId: true
      }
    })

    // API 키가 설정되어 있는지 확인
    if (!user?.naverAdApiKey || !user?.naverAdSecret || !user?.naverAdCustomerId) {
      return NextResponse.json(
        { 
          error: 'API credentials not configured',
          requiresSetup: true,
          message: '네이버 광고 API 키를 먼저 설정해주세요.'
        },
        { status: 400 }
      )
    }

    // 사용자의 API 키로 NaverAdsAPI 인스턴스 생성
    const naverAds = new NaverAdsAPI({
      accessKey: user.naverAdApiKey,
      secretKey: user.naverAdSecret,
      customerId: user.naverAdCustomerId
    })

    // 캠페인 목록 가져오기
    const campaigns = await naverAds.getCampaigns()
    
    console.log(`User: ${auth.userId} (Customer ID: ${user.naverAdCustomerId})`)
    console.log(`Fetching stats for ${campaigns.length} campaigns from ${dateFrom || 'default'} to ${dateTo || 'default'}`)
    
    // 각 캠페인에 대한 통계 가져오기 (날짜 범위 적용)
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        try {
          const stats = await naverAds.getCampaignStats(
            campaign.nccCampaignId,
            dateFrom || undefined,
            dateTo || undefined
          )
          
          return {
            ...campaign,
            stats,
            // 캠페인 유형 한글 변환
            campaignTypeLabel: 
              campaign.campaignTp === 'WEB_SITE' ? '파워링크' :
              campaign.campaignTp === 'POWER_CONTENTS' ? '파워콘텐츠' :
              campaign.campaignTp === 'PLACE' ? '플레이스' :
              campaign.campaignTp === 'SHOPPING' ? '쇼핑' :
              campaign.campaignTp === 'BRAND_SEARCH' ? '브랜드검색' :
              campaign.campaignTp
          }
        } catch (error) {
          console.error(`Failed to get stats for campaign ${campaign.nccCampaignId}:`, error)
          return {
            ...campaign,
            stats: {
              impCnt: 0,
              clkCnt: 0,
              salesAmt: 0,
              ctr: 0,
              cpc: 0,
              avgRnk: 0
            },
            campaignTypeLabel: 
              campaign.campaignTp === 'WEB_SITE' ? '파워링크' :
              campaign.campaignTp === 'POWER_CONTENTS' ? '파워콘텐츠' :
              campaign.campaignTp === 'PLACE' ? '플레이스' :
              campaign.campaignTp === 'SHOPPING' ? '쇼핑' :
              campaign.campaignTp === 'BRAND_SEARCH' ? '브랜드검색' :
              campaign.campaignTp
          }
        }
      })
    )

    // Get breakdown data for PowerLink campaigns
    let breakdownData = null
    try {
      const powerLinkCampaigns = campaignsWithStats.filter(c => c.campaignTp === 'WEB_SITE')
      
      if (powerLinkCampaigns.length > 0 && dateFrom && dateTo) {
        const processor = new NaverAdsDataProcessor()
        
        // Use pre-downloaded data if available (for August 2025)
        const fs = await import('fs')
        const path = await import('path')
        
        // Check if we're requesting August 2025 data
        if (dateFrom.startsWith('2025-08') && dateTo.startsWith('2025-08')) {
          const dataDir = path.join(process.cwd(), 'august-2025-final')
          
          if (fs.existsSync(dataDir)) {
            // Process all August data from local files
            const dataMap = await processor.processDirectory(dataDir)
            const monthlySummary = processor.generateMonthlySummary(dataMap)
            
            const totalImpressions = monthlySummary.totals.all.impressions
            
            breakdownData = {
              keywords: {
                impressions: monthlySummary.totals.keywords.impressions,
                clicks: monthlySummary.totals.keywords.clicks,
                cost: monthlySummary.totals.keywords.cost,
                ctr: monthlySummary.totals.keywords.ctr,
                cpc: monthlySummary.totals.keywords.cpc,
                percentage: totalImpressions > 0 ? (monthlySummary.totals.keywords.impressions / totalImpressions * 100) : 0
              },
              expanded: {
                impressions: monthlySummary.totals.expanded.impressions,
                clicks: monthlySummary.totals.expanded.clicks,
                cost: monthlySummary.totals.expanded.cost,
                ctr: monthlySummary.totals.expanded.ctr,
                cpc: monthlySummary.totals.expanded.cpc,
                percentage: totalImpressions > 0 ? (monthlySummary.totals.expanded.impressions / totalImpressions * 100) : 0
              },
              period: monthlySummary.period,
              daysProcessed: monthlySummary.days
            }
          }
        }
        
        // If no pre-downloaded data, get fresh data for a single day
        if (!breakdownData) {
          const targetDate = dateTo || new Date().toISOString().split('T')[0]
          
          // Try to download and process StatReport for the end date
          const reportResponse = await naverAds.request('POST', '/stat-reports', {
            reportTp: 'AD',
            statDt: `${targetDate}T00:00:00.000Z`
          })
          
          if (reportResponse?.reportJobId) {
            // Wait for report to be ready
            let downloadUrl = ''
            const maxAttempts = 10
            
            for (let i = 0; i < maxAttempts; i++) {
              await new Promise(resolve => setTimeout(resolve, 2000))
              
              const status = await naverAds.request('GET', `/stat-reports/${reportResponse.reportJobId}`)
              
              if (status?.status === 'BUILT' || status?.status === 'DONE') {
                downloadUrl = status.downloadUrl
                break
              }
            }
            
            if (downloadUrl) {
              // Download the report
              const urlParts = new URL(downloadUrl)
              const urlPath = urlParts.pathname
              const timestamp = Date.now().toString()
              const secretKey = user.naverAdSecret
              const message = `${timestamp}.GET.${urlPath}`
              const signature = crypto.createHmac('sha256', secretKey).update(message, 'utf-8').digest('base64')
              
              const downloadResponse = await axios.get(downloadUrl, {
                headers: {
                  'X-Timestamp': timestamp,
                  'X-API-KEY': user.naverAdApiKey,
                  'X-Customer': user.naverAdCustomerId,
                  'X-Signature': signature
                },
                responseType: 'text'
              })
              
              // Process the TSV data
              const processedData = processor.processTSVContent(downloadResponse.data)
              
              // Calculate breakdown percentages
              const keywordImpressions = processedData.totals.keywords.impressions
              const expandedImpressions = processedData.totals.expanded.impressions
              const totalImpressions = processedData.totals.all.impressions
              
              breakdownData = {
                keywords: {
                  impressions: keywordImpressions,
                  clicks: processedData.totals.keywords.clicks,
                  cost: processedData.totals.keywords.cost,
                  ctr: processedData.totals.keywords.ctr,
                  cpc: processedData.totals.keywords.cpc,
                  percentage: totalImpressions > 0 ? (keywordImpressions / totalImpressions * 100) : 0
                },
                expanded: {
                  impressions: expandedImpressions,
                  clicks: processedData.totals.expanded.clicks,
                  cost: processedData.totals.expanded.cost,
                  ctr: processedData.totals.expanded.ctr,
                  cpc: processedData.totals.expanded.cpc,
                  percentage: totalImpressions > 0 ? (expandedImpressions / totalImpressions * 100) : 0
                },
                period: targetDate,
                daysProcessed: 1
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get breakdown data:', error)
      // Continue without breakdown data
    }

    return NextResponse.json({
      success: true,
      data: {
        campaigns: campaignsWithStats,
        dateRange: {
          from: dateFrom,
          to: dateTo
        },
        breakdown: breakdownData
      }
    })
  } catch (error) {
    console.error('Failed to fetch ads dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ads dashboard data' },
      { status: 500 }
    )
  }
}