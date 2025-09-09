import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ keywordId: string }> }
) {
  try {
    const params = await props.params
    const keywordId = params.keywordId
    
    if (!keywordId) {
      return NextResponse.json(
        { error: 'Keyword ID is required' },
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

    // Get current keyword status
    const keyword = await naverAdsApi.getKeyword(keywordId)
    
    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword not found' },
        { status: 404 }
      )
    }

    // Toggle the keyword status
    const newUserLock = keyword.status === 'ELIGIBLE' ? true : false
    
    const updatedKeyword = await naverAdsApi.updateKeyword(keywordId, {
      nccKeywordId: keywordId,
      userLock: newUserLock
    })
    
    return NextResponse.json({
      success: true,
      keyword: updatedKeyword
    })
    
  } catch (error: any) {
    console.error('Error toggling keyword:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to toggle keyword',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}