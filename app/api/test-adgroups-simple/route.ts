import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('Simple test API called')
    
    // Get nokyang user directly
    const user = await prisma.user.findFirst({
      where: {
        email: 'nokyang@marketingplat.com'
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const accessKey = user.naverAdApiKey
    const secretKey = user.naverAdSecret
    const customerId = user.naverAdCustomerId
    
    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }
    
    const api = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })
    
    // Get ad groups for the first campaign
    const campaignId = 'cmp-a001-01-000000009160501'
    const adGroups = await api.getAdGroups(campaignId)
    
    return NextResponse.json({
      success: true,
      campaignId,
      adGroupsCount: adGroups?.length || 0,
      adGroups: adGroups || []
    })
    
  } catch (error: any) {
    console.error('Simple test API error:', error)
    return NextResponse.json({
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}