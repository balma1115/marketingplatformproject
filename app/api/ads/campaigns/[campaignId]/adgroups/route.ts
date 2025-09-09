import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ campaignId: string }> }
) {
  try {
    console.log('Ad groups API called')
    
    // Next.js 15 requires awaiting params
    const params = await props.params
    const campaignId = params.campaignId
    console.log('Campaign ID:', campaignId)
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const authHeader = request.headers.get('cookie')
    if (!authHeader || !authHeader.includes('token=')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from database - specifically look for nokyang user first
    let user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
    // If nokyang user not found, fall back to any user with credentials
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'admin' },
            { role: 'academy' }
          ],
          AND: {
            OR: [
              {
                naverAdsAccessKey: { not: null },
                naverAdsSecretKey: { not: null },
                naverAdsCustomerId: { not: null }
              },
              {
                naverAdApiKey: { not: null },
                naverAdSecret: { not: null },
                naverAdCustomerId: { not: null }
              }
            ]
          }
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or no API credentials' },
        { status: 404 }
      )
    }

    // Use the appropriate API credentials
    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { error: 'Naver Ads API credentials not configured' },
        { status: 400 }
      )
    }

    // Initialize Naver Ads API
    const naverAdsApi = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Get ad groups for the campaign
    console.log('Fetching ad groups for campaign:', campaignId)
    console.log('Using credentials - Access Key:', accessKey?.substring(0, 5) + '...')
    console.log('Customer ID:', customerId)
    
    let adGroups
    try {
      adGroups = await naverAdsApi.getAdGroups(campaignId)
      console.log('Ad groups fetched successfully:', adGroups?.length || 0, 'groups')
    } catch (adGroupError: any) {
      console.error('Error fetching ad groups:', {
        message: adGroupError.message,
        status: adGroupError.status,
        code: adGroupError.response?.data?.code,
        title: adGroupError.response?.data?.title
      })
      // Continue with empty array for now
      adGroups = []
    }
    
    // Get date range from query params
    const url = new URL(request.url)
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    
    console.log(`[AdGroups API] Campaign: ${campaignId}, Date params - From: ${dateFrom}, To: ${dateTo}`)
    
    // If date range is provided, get stats for each ad group
    if (adGroups && adGroups.length > 0) {
      // Get stat reports for all ad groups if date range is provided
      let statsMap = new Map()
      
      if (dateFrom && dateTo) {
        try {
          const adGroupIds = adGroups.map((ag: any) => ag.nccAdgroupId)
          console.log(`[AdGroups API] Fetching stats for ${adGroupIds.length} ad groups from ${dateFrom} to ${dateTo}`)
          
          // Use the new getAdGroupStats method that works with /stats endpoint
          const adGroupStats = await naverAdsApi.getAdGroupStats(adGroupIds, dateFrom, dateTo)
          
          console.log(`[AdGroups API] Received stats for ${adGroupStats.length} ad groups`)
          if (adGroupStats.length > 0) {
            console.log(`[AdGroups API] Sample stats - ID: ${adGroupStats[0].id}, Impressions: ${adGroupStats[0].impCnt}`)
          }
          
          // Create a map for easy lookup
          adGroupStats.forEach((stat: any) => {
            statsMap.set(stat.id, stat)
          })
        } catch (error) {
          console.error('Error fetching ad group stats:', error)
        }
      }

      const adGroupsWithData = await Promise.all(
        adGroups.map(async (adGroup: any) => {
          try {
            // Get keywords for the ad group
            const keywords = await naverAdsApi.getKeywords(adGroup.nccAdgroupId)
            
            // Get stats from the map or use defaults
            const stats = statsMap.get(adGroup.nccAdgroupId) || {
              impCnt: 0,
              clkCnt: 0,
              ctr: 0,
              cpc: 0,
              salesAmt: 0
            }
            
            return {
              ...adGroup,
              stats: {
                impCnt: stats.impCnt || 0,
                clkCnt: stats.clkCnt || 0,
                ctr: stats.ctr || 0,
                cpc: stats.cpc || 0,
                salesAmt: stats.salesAmt || 0
              },
              keywordCount: keywords?.length || 0,
              keywords: keywords || []
            }
          } catch (error) {
            console.error(`Error fetching data for ad group ${adGroup.nccAdgroupId}:`, error)
            return {
              ...adGroup,
              stats: {
                impCnt: 0,
                clkCnt: 0,
                ctr: 0,
                cpc: 0,
                salesAmt: 0
              },
              keywordCount: 0,
              keywords: []
            }
          }
        })
      )
      
      return NextResponse.json(adGroupsWithData)
    }

    // Return ad groups without stats if no date range
    const adGroupsWithKeywords = await Promise.all(
      (adGroups || []).map(async (adGroup: any) => {
        try {
          const keywords = await naverAdsApi.getKeywords(adGroup.nccAdgroupId)
          return {
            ...adGroup,
            keywordCount: keywords?.length || 0,
            keywords: keywords || []
          }
        } catch (error) {
          return {
            ...adGroup,
            keywordCount: 0,
            keywords: []
          }
        }
      })
    )

    return NextResponse.json(adGroupsWithKeywords)
    
  } catch (error: any) {
    console.error('Error fetching ad groups:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch ad groups',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}