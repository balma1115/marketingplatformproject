import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

// GET: 캠페인 목록 조회
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          naverAdApiKey: true,
          naverAdSecret: true,
          naverAdCustomerId: true
        }
      })

      if (!user?.naverAdApiKey || !user?.naverAdSecret || !user?.naverAdCustomerId) {
        return NextResponse.json(
          { 
            error: 'API credentials not configured',
            requiresSetup: true
          },
          { status: 400 }
        )
      }

      const naverAds = new NaverAdsAPI({
        apiKey: user.naverAdApiKey,
        secretKey: user.naverAdSecret,
        customerId: user.naverAdCustomerId
      })

      const campaigns = await naverAds.getCampaigns()

      return NextResponse.json({
        success: true,
        data: campaigns
      })
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }
  })
}

// POST: 캠페인 생성
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          naverAdApiKey: true,
          naverAdSecret: true,
          naverAdCustomerId: true
        }
      })

      if (!user?.naverAdApiKey || !user?.naverAdSecret || !user?.naverAdCustomerId) {
        return NextResponse.json(
          { 
            error: 'API credentials not configured',
            requiresSetup: true
          },
          { status: 400 }
        )
      }

      const body = await request.json()
      
      const naverAds = new NaverAdsAPI({
        apiKey: user.naverAdApiKey,
        secretKey: user.naverAdSecret,
        customerId: user.naverAdCustomerId
      })

      const campaign = await naverAds.createCampaign(body)
      
      return NextResponse.json({
        success: true,
        data: campaign
      })
    } catch (error: any) {
      console.error('Failed to create campaign:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create campaign',
          details: error.response?.data || error.message 
        },
        { status: 500 }
      )
    }
  })
}

// PUT: 캠페인 일괄 수정
export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          naverAdApiKey: true,
          naverAdSecret: true,
          naverAdCustomerId: true
        }
      })

      if (!user?.naverAdApiKey || !user?.naverAdSecret || !user?.naverAdCustomerId) {
        return NextResponse.json(
          { 
            error: 'API credentials not configured',
            requiresSetup: true
          },
          { status: 400 }
        )
      }

      const body = await request.json()
      const { campaignIds, enable } = body
      
      const naverAds = new NaverAdsAPI({
        apiKey: user.naverAdApiKey,
        secretKey: user.naverAdSecret,
        customerId: user.naverAdCustomerId
      })

      const result = await naverAds.bulkUpdateCampaignStatus(campaignIds, enable)
      
      return NextResponse.json({
        success: true,
        data: result
      })
    } catch (error: any) {
      console.error('Failed to update campaigns:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update campaigns',
          details: error.response?.data || error.message 
        },
        { status: 500 }
      )
    }
  })
}