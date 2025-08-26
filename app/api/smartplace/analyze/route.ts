import { NextRequest, NextResponse } from 'next/server'
import { naverMapService } from '@/lib/services/naverMapService'

// 정보 완성도 점수 계산
function calculateInfoScore(info: any): number {
  let score = 0
  const totalPoints = 100
  
  if (info.name) score += 10
  if (info.category) score += 10
  if (info.address) score += 10
  if (info.phone) score += 10
  if (info.businessHours) score += 15
  if (info.description) score += 15
  if (info.amenities && info.amenities.length > 0) score += 10
  if (info.keywords && info.keywords.length > 0) score += 10
  if (info.hasReservation || info.hasInquiry) score += 10
  
  return Math.min(score, totalPoints)
}

// 시각적 콘텐츠 점수 계산
function calculateVisualScore(info: any): number {
  let score = 0
  
  if (info.images && info.images.length > 0) {
    score = Math.min(info.images.length * 10, 100)
  }
  
  return score
}

// 고객 참여도 점수 계산
function calculateEngagementScore(info: any): number {
  let score = 0
  
  if (info.hasReservation) score += 30
  if (info.hasInquiry) score += 30
  if (info.tabs && info.tabs.includes('리뷰')) score += 20
  if (info.tabs && info.tabs.includes('이벤트')) score += 20
  
  return score
}

// 개선 권장사항 생성
function generateRecommendations(info: any): string[] {
  const recommendations: string[] = []
  
  if (!info.businessHours) {
    recommendations.push('영업시간 정보를 추가하세요.')
  }
  if (!info.description || info.description.length < 50) {
    recommendations.push('업체 소개를 더 자세히 작성하세요.')
  }
  if (!info.images || info.images.length < 5) {
    recommendations.push('더 많은 사진을 추가하여 시각적 매력을 높이세요.')
  }
  if (!info.hasReservation) {
    recommendations.push('네이버 예약 기능을 활성화하여 고객 편의를 높이세요.')
  }
  if (!info.amenities || info.amenities.length === 0) {
    recommendations.push('편의시설 정보를 추가하세요.')
  }
  if (!info.keywords || info.keywords.length < 3) {
    recommendations.push('검색 노출을 위한 키워드를 더 추가하세요.')
  }
  
  return recommendations
}

export async function POST(req: NextRequest) {
  try {
    const { placeId } = await req.json()
    
    if (!placeId) {
      return NextResponse.json(
        { success: false, error: 'Place ID가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('=== SMARTPLACE ANALYZE REQUEST ===')
    console.log('Place ID:', placeId)

    // 정보 가져오기
    const placeInfo = await naverMapService.getSmartPlaceInfo(placeId)

    // 분석 결과 생성
    const analysis = {
      basicInfo: placeInfo,
      score: {
        informationCompleteness: calculateInfoScore(placeInfo),
        visualContent: calculateVisualScore(placeInfo),
        customerEngagement: calculateEngagementScore(placeInfo),
        overall: 0
      },
      recommendations: generateRecommendations(placeInfo)
    }

    // 전체 점수 계산
    analysis.score.overall = Math.round(
      (analysis.score.informationCompleteness + 
       analysis.score.visualContent + 
       analysis.score.customerEngagement) / 3
    )

    return NextResponse.json({
      success: true,
      data: analysis
    })
  } catch (error: any) {
    console.error('Error in smartplace analyze:', error)
    return NextResponse.json(
      { success: false, error: error.message || '스마트플레이스 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}