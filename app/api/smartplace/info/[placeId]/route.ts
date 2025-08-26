import { NextRequest, NextResponse } from 'next/server'
import { naverMapService } from '@/lib/services/naverMapService'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await params
    
    if (!placeId) {
      return NextResponse.json(
        { success: false, error: 'Place ID가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('=== SMARTPLACE INFO REQUEST ===')
    console.log('Place ID:', placeId)

    const placeInfo = await naverMapService.getSmartPlaceInfo(placeId)

    return NextResponse.json({
      success: true,
      data: placeInfo
    })
  } catch (error: any) {
    console.error('Error in smartplace info:', error)
    return NextResponse.json(
      { success: false, error: error.message || '스마트플레이스 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}