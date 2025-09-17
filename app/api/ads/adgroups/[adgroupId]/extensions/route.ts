import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    console.log('Ad Extensions API called')
    
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

    // Get ad extensions for the ad group
    console.log('Fetching ad extensions for ad group:', adgroupId)
    
    let extensions: any[] = []
    try {
      // Ad extensions are linked to campaigns or accounts, not directly to ad groups
      // We'll fetch all extensions and filter if needed
      extensions = await naverAdsApi.getAdExtensions()
      console.log('Ad extensions fetched successfully:', extensions?.length || 0, 'extensions')
    } catch (extensionError: any) {
      console.error('Error fetching ad extensions:', {
        message: extensionError.message,
        status: extensionError.status,
        code: extensionError.response?.data?.code,
        title: extensionError.response?.data?.title
      })
      // Continue with empty array for now
      extensions = []
    }
    
    // Get date range from query params for stats
    const url = new URL(request.url)
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    
    // If date range is provided, get stats for each extension
    if (extensions && extensions.length > 0 && dateFrom && dateTo) {
      // Get stat reports for all extensions
      let statsMap = new Map()
      
      try {
        const extensionIds = extensions.map((ext: any) => ext.nccAdExtensionId).filter(Boolean)
        if (extensionIds.length > 0) {
          const statReports = await naverAdsApi.getStatReports({
            reportTp: 'AD_EXTENSION',
            dateRange: {
              since: dateFrom.replace(/-/g, ''),
              until: dateTo.replace(/-/g, '')
            },
            ids: extensionIds
          })
          
          // Create a map for easy lookup
          statReports.forEach((report: any) => {
            statsMap.set(report.id, report)
          })
        }
      } catch (error) {
        console.error('Error fetching stat reports for extensions:', error)
      }

      const extensionsWithStats = extensions.map((extension: any) => {
        const stats = statsMap.get(extension.nccAdExtensionId) || {
          impCnt: 0,
          clkCnt: 0,
          ctr: 0,
          cpc: 0,
          salesAmt: 0
        }
        
        return {
          ...extension,
          stats: {
            impCnt: stats.impCnt || 0,
            clkCnt: stats.clkCnt || 0,
            ctr: stats.ctr || 0,
            cpc: stats.cpc || 0,
            salesAmt: stats.salesAmt || 0
          }
        }
      })
      
      return NextResponse.json(extensionsWithStats)
    }

    return NextResponse.json(extensions || [])
    
  } catch (error: any) {
    console.error('Error fetching ad extensions:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch ad extensions',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}