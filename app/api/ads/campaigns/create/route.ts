import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPIExtended } from '@/lib/services/naver-ads-api-extended'
import { getNaverAdsCredentials } from '@/lib/services/naver-ads-api'
import { verifyAuth } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const auth = await verifyAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = auth.userId
    
    // 사용자 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        naverAdsCustomerId: true,
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdCustomerId: true,
        naverAdApiKey: true,
        naverAdSecret: true,
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Naver Ads API 자격 증명
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId
    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    
    if (!customerId || !accessKey || !secretKey) {
      return NextResponse.json({ 
        error: 'Naver Ads API 설정이 필요합니다',
        requiresSetup: true 
      }, { status: 400 })
    }
    
    // Request body 파싱
    const body = await req.json()
    const { 
      name, 
      campaignTp, 
      dailyBudget,
      deliveryMethod = 'STANDARD',
      useDailyBudget = true,
      trackingMode = 'TRACKING_DISABLED'
    } = body
    
    if (!name || !campaignTp) {
      return NextResponse.json({ 
        error: '캠페인 이름과 유형은 필수입니다' 
      }, { status: 400 })
    }
    
    // API 클라이언트 초기화
    const api = new NaverAdsAPIExtended({
      customerId,
      accessKey,
      secretKey
    })
    
    // 캠페인 생성
    const campaign = await api.createCampaign({
      name,
      campaignTp,
      dailyBudget: dailyBudget || 10000,
      useDailyBudget,
      deliveryMethod,
      trackingMode,
      status: 'ELIGIBLE' // 바로 활성화
    })
    
    return NextResponse.json({
      success: true,
      data: campaign
    })
    
  } catch (error: any) {
    console.error('Campaign creation error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create campaign' 
    }, { status: 500 })
  }
}