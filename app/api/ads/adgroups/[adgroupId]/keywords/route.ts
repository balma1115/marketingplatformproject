import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    console.log('Keywords API called')
    
    // Next.js 15 requires awaiting params
    const params = await props.params
    const adgroupId = params.adgroupId
    console.log('AdGroup ID:', adgroupId)
    
    if (!adgroupId) {
      return NextResponse.json(
        { error: 'AdGroup ID is required' },
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

    // Get user from database - always use nokyang user for development
    const user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })

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
      // Return empty array when no API credentials
      console.log('No API credentials configured, returning empty keyword list')
      return NextResponse.json([])
    }

    // Initialize Naver Ads API
    const naverAdsApi = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    // Get ad group details first to get the group bid amount
    let adGroup: any = null
    try {
      const adGroups = await naverAdsApi.getAdGroups(undefined)
      adGroup = adGroups.find((ag: any) => ag.nccAdgroupId === adgroupId)
      console.log('Ad group found:', adGroup ? 'Yes' : 'No', 'Group bidAmt:', adGroup?.bidAmt)
    } catch (error) {
      console.error('Error fetching ad group:', error)
    }

    // Get keywords for the ad group
    console.log('Fetching keywords for ad group:', adgroupId)
    
    let keywords: any[] = []
    try {
      keywords = await naverAdsApi.getKeywords(adgroupId)
      console.log('Keywords fetched successfully:', keywords?.length || 0, 'keywords')
      
      // 디버그: 첫 번째 키워드의 상세 정보 출력
      if (keywords && keywords.length > 0) {
        console.log('Sample keyword data:', JSON.stringify(keywords[0], null, 2))
      }
    } catch (keywordError: any) {
      console.error('Error fetching keywords:', {
        message: keywordError.message,
        status: keywordError.status,
        code: keywordError.response?.data?.code,
        title: keywordError.response?.data?.title
      })
      // Continue with empty array for now
      keywords = []
    }
    
    // Get date range from query params for stats
    const url = new URL(request.url)
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    
    // Process keywords with quality index and stats
    const processedKeywords = keywords.map((keyword: any) => {
      // Extract quality index from nccQi
      const qualityIndex = keyword.nccQi?.qiGrade || null
      
      // Determine effective bid amount
      const effectiveBidAmt = keyword.useGroupBidAmt && adGroup ? adGroup.bidAmt : keyword.bidAmt
      
      // Base keyword object with metadata
      const keywordData: any = {
        ...keyword,
        qualityIndex,
        effectiveBidAmt,
        groupBidAmt: adGroup?.bidAmt || null,
        // Initialize stats with zeros (will be updated if data available)
        stats: {
          impCnt: 0,
          clkCnt: 0,
          ctr: 0,
          cpc: 0,
          salesAmt: 0
        }
      }
      
      return keywordData
    })
    
    // If date range is provided, try to get stats for keywords
    if (keywords && keywords.length > 0 && dateFrom && dateTo) {
      // First try to use processed JSON data for better performance
      try {
        const fs = await import('fs')
        const path = await import('path')
        const jsonDir = path.join(process.cwd(), 'data', 'json-processed')
        
        if (fs.existsSync(jsonDir)) {
          console.log('Using processed JSON data for keyword stats')
          
          const keywordStatsMap: Record<string, any> = {}
          const keywordIds = processedKeywords.map((k: any) => k.nccKeywordId)
          
          // Initialize all keywords with zero stats
          keywordIds.forEach(id => {
            keywordStatsMap[id] = {
              impCnt: 0,
              clkCnt: 0,
              ctr: 0,
              cpc: 0,
              salesAmt: 0
            }
          })
          
          // Process each day in the date range
          const start = new Date(dateFrom)
          const end = new Date(dateTo)
          
          for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0]
            const filePath = path.join(jsonDir, `processed_${dateStr}.json`)
            
            if (fs.existsSync(filePath)) {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
              
              // Use the keywords map directly for better aggregation
              if (data.keywords && typeof data.keywords === 'object') {
                Object.entries(data.keywords).forEach(([keywordId, kwData]: [string, any]) => {
                  // Check if this keyword belongs to the current adgroup and is in our list
                  if (kwData.adgroupId === adgroupId && keywordIds.includes(keywordId)) {
                    keywordStatsMap[keywordId].impCnt += kwData.impressions || 0
                    keywordStatsMap[keywordId].clkCnt += kwData.clicks || 0
                    keywordStatsMap[keywordId].salesAmt += kwData.cost || 0
                  }
                })
              }
              
              // Also process raw data as fallback (for keywords not in main map)
              if (data.rawData && Array.isArray(data.rawData)) {
                data.rawData.forEach((row: any) => {
                  if (row.adgroupId === adgroupId && keywordIds.includes(row.keywordId)) {
                    // Only add if not already processed from keywords map
                    if (keywordStatsMap[row.keywordId].impCnt === 0) {
                      keywordStatsMap[row.keywordId].impCnt += row.impressions || 0
                      keywordStatsMap[row.keywordId].clkCnt += row.clicks || 0
                      keywordStatsMap[row.keywordId].salesAmt += row.cost || 0
                    }
                  }
                })
              }
            }
          }
          
          // Calculate CTR and CPC for each keyword
          Object.keys(keywordStatsMap).forEach(keywordId => {
            const stats = keywordStatsMap[keywordId]
            stats.ctr = stats.impCnt > 0 ? (stats.clkCnt / stats.impCnt * 100) : 0
            stats.cpc = stats.clkCnt > 0 ? (stats.salesAmt / stats.clkCnt) : 0
          })
          
          // Update processed keywords with stats
          processedKeywords.forEach((keyword: any) => {
            if (keywordStatsMap[keyword.nccKeywordId]) {
              keyword.stats = keywordStatsMap[keyword.nccKeywordId]
            }
          })
          
          console.log(`Got stats for ${Object.keys(keywordStatsMap).length} keywords from processed data`)
        }
      } catch (error) {
        console.log('Could not use processed data, falling back to API:', error)
        
        // Fallback to API if processed data is not available
        // Check date range limit (31 days max)
        let adjustedDateFrom = dateFrom
        let adjustedDateTo = dateTo
        
        const start = new Date(dateFrom)
        const end = new Date(dateTo)
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff > 31) {
          console.log(`Date range ${daysDiff} days exceeds 31 days limit, adjusting to last 31 days`)
          // Adjust to last 31 days from end date
          const adjustedStart = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
          adjustedDateFrom = adjustedStart.toISOString().split('T')[0]
        }
        
        // Try to get stat reports for keywords that are ELIGIBLE
        const eligibleKeywords = processedKeywords.filter((k: any) => k.status === 'ELIGIBLE')
        
        if (eligibleKeywords.length > 0) {
          try {
            const keywordIds = eligibleKeywords.map((keyword: any) => keyword.nccKeywordId)
            
            // Use the new Job-based approach for keyword stats (like campaigns)
            console.log(`Fetching stats for ${keywordIds.length} keywords using Job-based API`)
            
            let keywordStatsMap: Record<string, any> = {}
            try {
              // Use the new method that works like getCampaignStats
              keywordStatsMap = await naverAdsApi.getMultipleKeywordStats(
                keywordIds,
                adjustedDateFrom,
                adjustedDateTo
              )
              console.log(`Got stats for ${Object.keys(keywordStatsMap).length} keywords`)
            } catch (statError: any) {
              console.log('Job-based keyword stats failed, falling back to zeros:', statError.message)
              
              // Return zeros if stats fetch fails
              keywordIds.forEach(id => {
                keywordStatsMap[id] = {
                  impCnt: 0,
                  clkCnt: 0,
                  ctr: 0,
                  cpc: 0,
                  salesAmt: 0
                }
              })
            }
            
            // Update stats for keywords that have data
            Object.entries(keywordStatsMap).forEach(([keywordId, stats]) => {
              const keyword = processedKeywords.find((k: any) => k.nccKeywordId === keywordId)
              if (keyword) {
                keyword.stats = {
                  impCnt: stats.impCnt || 0,
                  clkCnt: stats.clkCnt || 0,
                  ctr: stats.ctr || 0,
                  cpc: stats.cpc || 0,
                  salesAmt: stats.salesAmt || 0
                }
              }
            })
          } catch (error: any) {
            console.error('Error fetching stat reports for keywords:', error.message)
            // Continue with zero stats - they're already initialized
          }
        }
      }
      
      // Debug log for first keyword
      if (processedKeywords.length > 0) {
        console.log('First keyword with stats:', {
          keyword: processedKeywords[0].keyword,
          bidAmt: processedKeywords[0].bidAmt,
          status: processedKeywords[0].status,
          qualityIndex: processedKeywords[0].qualityIndex,
          stats: processedKeywords[0].stats
        })
      }
      
      return NextResponse.json(processedKeywords)
    }

    // Return processed keywords with quality index and default stats
    return NextResponse.json(processedKeywords)
    
  } catch (error: any) {
    console.error('Error fetching keywords:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch keywords',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}