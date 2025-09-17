import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    console.log('AdGroup detail API called')
    
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

    // Get ad group details
    console.log('Fetching ad group details:', adgroupId)
    
    let adGroup: any = null
    try {
      // Get single ad group by ID
      const adGroups = await naverAdsApi.getAdGroups()
      adGroup = adGroups.find((ag: any) => ag.nccAdgroupId === adgroupId)
      
      if (!adGroup) {
        return NextResponse.json(
          { error: 'Ad group not found' },
          { status: 404 }
        )
      }
      
      console.log('Ad group found:', adGroup.name)
    } catch (adGroupError: any) {
      console.error('Error fetching ad group:', {
        message: adGroupError.message,
        status: adGroupError.status,
        code: adGroupError.response?.data?.code,
        title: adGroupError.response?.data?.title
      })
      
      return NextResponse.json(
        { error: 'Failed to fetch ad group details' },
        { status: 500 }
      )
    }

    // Get date range from query params for stats
    const url = new URL(request.url)
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    
    // If date range is provided, get stats
    let stats = {
      impCnt: 0,
      clkCnt: 0,
      ctr: 0,
      cpc: 0,
      salesAmt: 0
    }
    
    if (dateFrom && dateTo) {
      try {
        const statReports = await naverAdsApi.getStatReports({
          reportTp: 'ADGROUP',
          dateRange: {
            since: dateFrom.replace(/-/g, ''),
            until: dateTo.replace(/-/g, '')
          },
          ids: [adgroupId]
        })
        
        if (statReports && statReports.length > 0) {
          const report = statReports[0]
          stats = {
            impCnt: report.impCnt || 0,
            clkCnt: report.clkCnt || 0,
            ctr: report.ctr || 0,
            cpc: report.cpc || 0,
            salesAmt: report.salesAmt || 0
          }
        }
      } catch (error) {
        console.error('Error fetching stat reports for ad group:', error)
        // Keep default stats values
      }
    }

    // Always return with stats (either actual or default)
    return NextResponse.json({
      ...adGroup,
      stats
    })
    
  } catch (error: any) {
    console.error('Error fetching ad group:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch ad group',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    console.log('AdGroup update API called')
    
    // Next.js 15 requires awaiting params
    const params = await props.params
    const adgroupId = params.adgroupId
    const body = await request.json()
    
    console.log('AdGroup ID:', adgroupId)
    console.log('Update data:', body)
    
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

    // Get user from database
    let user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
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

    // Prepare update data
    const updateData: any = {
      nccAdgroupId: adgroupId
    }
    
    if (body.bidAmt !== undefined) {
      updateData.bidAmt = body.bidAmt
    }
    
    if (body.dailyBudget !== undefined) {
      updateData.dailyBudget = body.dailyBudget
    }
    
    if (body.useDailyBudget !== undefined) {
      updateData.useDailyBudget = body.useDailyBudget
    }

    // Update ad group
    console.log('Updating ad group with:', updateData)
    const updatedAdGroup = await naverAdsApi.updateAdGroup(adgroupId, updateData)
    
    console.log('Ad group updated successfully')
    return NextResponse.json(updatedAdGroup)
    
  } catch (error: any) {
    console.error('Error updating ad group:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update ad group',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}