import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-middleware'
import { NaverAdsAPI } from '@/lib/services/naver-ads-api'
import { prisma } from '@/lib/db'

// PATCH: 개별 캠페인 수정
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ campaignId: string }> }
) {
  try {
    const params = await props.params
    const { campaignId } = params
    
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true,
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdsCustomerId: true
      }
    })

    // Support both field name patterns
    const accessKey = user?.naverAdsAccessKey || user?.naverAdApiKey
    const secretKey = user?.naverAdsSecretKey || user?.naverAdSecret
    const customerId = user?.naverAdsCustomerId || user?.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
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
      accessKey,
      secretKey,
      customerId
    })
    
    // 먼저 기존 캠페인 정보를 가져옴
    const existingCampaign = await naverAds.getCampaign(campaignId)
    
    // Naver Ads API에서 요구하는 정확한 형식으로 데이터 구성
    // 기존 캠페인의 모든 필드를 복사하고 수정할 필드만 오버라이드
    const updateData: any = {
      // 모든 기존 필드 복사
      ...existingCampaign,
      // 수정할 필드만 업데이트
      name: body.name || existingCampaign.name,
      deliveryMethod: body.deliveryMethod || existingCampaign.deliveryMethod
    }
    
    // 예산 관련 필드 처리
    if (body.useDailyBudget !== undefined) {
      updateData.useDailyBudget = Boolean(body.useDailyBudget)
      if (body.useDailyBudget) {
        updateData.dailyBudget = body.dailyBudget !== undefined 
          ? Number(body.dailyBudget) 
          : Number(existingCampaign.dailyBudget)
      }
    } else if (body.dailyBudget !== undefined) {
      updateData.dailyBudget = Number(body.dailyBudget)
    }
    
    // 광고 노출 기간 설정
    if (body.usePeriod !== undefined) {
      updateData.usePeriod = Boolean(body.usePeriod)
      if (body.usePeriod) {
        // 기간 사용 시 시작일과 종료일 설정
        if (body.periodStartDate) {
          // YYYY-MM-DD 형식을 YYYY-MM-DD'T'00:00:00.000Z 형식으로 변환
          updateData.periodStartDt = body.periodStartDate + 'T00:00:00.000Z'
        }
        if (body.periodEndDate) {
          // YYYY-MM-DD 형식을 YYYY-MM-DD'T'23:59:59.000Z 형식으로 변환
          updateData.periodEndDt = body.periodEndDate + 'T23:59:59.000Z'
        }
      } else {
        // 기간 미사용 시 기간 필드 제거
        delete updateData.periodStartDt
        delete updateData.periodEndDt
      }
    }
    
    // customerId는 숫자형으로 확실히 변환
    updateData.customerId = parseInt(customerId)
    
    // 불필요한 필드 제거 (읽기 전용 필드)
    delete updateData.regTm
    delete updateData.editTm
    delete updateData.totalChargeCost
    delete updateData.expectCost
    delete updateData.statusReason
    delete updateData.migType
    delete updateData.delFlag

    // 로그 출력으로 전송 데이터 확인
    console.log('Update campaign request data:', JSON.stringify(updateData, null, 2))

    const result = await naverAds.updateCampaign(campaignId, updateData)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Failed to update campaign:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update campaign',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    )
  }
}

// DELETE: 캠페인 삭제
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ campaignId: string }> }
) {
  try {
    const params = await props.params
    const { campaignId } = params
    
    const auth = await verifyAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true,
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdsCustomerId: true
      }
    })

    // Support both field name patterns
    const accessKey = user?.naverAdsAccessKey || user?.naverAdApiKey
    const secretKey = user?.naverAdsSecretKey || user?.naverAdSecret
    const customerId = user?.naverAdsCustomerId || user?.naverAdCustomerId

    if (!accessKey || !secretKey || !customerId) {
      return NextResponse.json(
        { 
          error: 'API credentials not configured',
          requiresSetup: true
        },
        { status: 400 }
      )
    }
    
    const naverAds = new NaverAdsAPI({
      accessKey,
      secretKey,
      customerId
    })

    const result = await naverAds.deleteCampaign(campaignId)
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('Failed to delete campaign:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete campaign',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    )
  }
}