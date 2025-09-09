import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPIExtended } from '@/lib/services/naver-ads-api-extended'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const cookieStore = cookies()
    const token = cookieStore.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as any
    const userId = decoded.userId
    
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
      campaignId,
      name,
      pcChannelId,
      mobileChannelId,
      bidAmt,
      dailyBudget,
      useDailyBudget = true,
      keywordPlusWeight = 100,
      contentsNetworkBidAmt,
      useCntsNetworkBidAmt = false,
      mobileNetworkBidAmt,
      useMobileNetworkBidAmt = false,
      adgroupAttrJson,
      targets
    } = body
    
    if (!campaignId || !name) {
      return NextResponse.json({ 
        error: '캠페인 ID와 광고그룹 이름은 필수입니다' 
      }, { status: 400 })
    }
    
    // API 클라이언트 초기화
    const api = new NaverAdsAPIExtended({
      customerId,
      accessKey,
      secretKey
    })
    
    // 광고그룹 생성 데이터
    const adGroupData: any = {
      nccCampaignId: campaignId,
      name,
      bidAmt: bidAmt || 100,
      dailyBudget: dailyBudget || 10000,
      useDailyBudget,
      keywordPlusWeight,
      userLock: false
    }
    
    // 채널 ID 설정 (캠페인 타입에 따라)
    if (pcChannelId) {
      adGroupData.pcChannelId = pcChannelId
    }
    
    if (mobileChannelId) {
      adGroupData.mobileChannelId = mobileChannelId
    }
    
    // 컨텐츠 네트워크 입찰가
    if (contentsNetworkBidAmt) {
      adGroupData.contentsNetworkBidAmt = contentsNetworkBidAmt
      adGroupData.useCntsNetworkBidAmt = useCntsNetworkBidAmt
    }
    
    // 모바일 네트워크 입찰가
    if (mobileNetworkBidAmt) {
      adGroupData.mobileNetworkBidAmt = mobileNetworkBidAmt
      adGroupData.useMobileNetworkBidAmt = useMobileNetworkBidAmt
    }
    
    // 광고그룹 속성 (JSON)
    if (adgroupAttrJson) {
      adGroupData.adgroupAttrJson = adgroupAttrJson
    }
    
    // 타겟팅 설정
    if (targets) {
      adGroupData.targets = targets
    }
    
    // 광고그룹 생성
    const adGroup = await api.createAdGroup(adGroupData)
    
    return NextResponse.json({
      success: true,
      data: adGroup
    })
    
  } catch (error: any) {
    console.error('AdGroup creation error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create ad group' 
    }, { status: 500 })
  }
}