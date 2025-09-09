import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    console.log('Negative Keywords API called')
    
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
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 
      'KEYWORD_PLUS_RESTRICT' | 'PHRASE_KEYWORD_RESTRICT' | 'EXACT_KEYWORD_RESTRICT' | null
    
    // Get restricted keywords (negative keywords)
    const negativeKeywords = await naverAdsApi.getRestrictedKeywords(adgroupId, type || undefined)

    return NextResponse.json(negativeKeywords)
    
  } catch (error: any) {
    console.error('Error fetching negative keywords:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch negative keywords',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}

// POST: 제외키워드 생성
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    console.log('Create negative keywords API called')
    
    // Next.js 15 requires awaiting params
    const params = await props.params
    const adgroupId = params.adgroupId
    const body = await request.json()
    
    console.log('AdGroup ID:', adgroupId)
    console.log('Keywords to add:', body)
    
    if (!adgroupId) {
      return NextResponse.json(
        { error: 'AdGroup ID is required' },
        { status: 400 }
      )
    }

    if (!body.keywords || !Array.isArray(body.keywords)) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
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

    // Create restricted keywords
    const createdKeywords = await naverAdsApi.createRestrictedKeywords(adgroupId, body.keywords)
    
    return NextResponse.json(createdKeywords)
    
  } catch (error: any) {
    console.error('Error creating negative keywords:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create negative keywords',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE: 제외키워드 삭제
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ adgroupId: string }> }
) {
  try {
    console.log('Delete negative keywords API called')
    
    // Next.js 15 requires awaiting params
    const params = await props.params
    const adgroupId = params.adgroupId
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')
    
    console.log('AdGroup ID:', adgroupId)
    console.log('Keywords to delete:', ids)
    
    if (!adgroupId) {
      return NextResponse.json(
        { error: 'AdGroup ID is required' },
        { status: 400 }
      )
    }

    if (!ids) {
      return NextResponse.json(
        { error: 'Keyword IDs are required' },
        { status: 400 }
      )
    }

    const keywordIds = ids.split(',')

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

    // Delete restricted keywords
    await naverAdsApi.deleteRestrictedKeywords(adgroupId, keywordIds)
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('Error deleting negative keywords:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to delete negative keywords',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}