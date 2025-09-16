import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { NaverSmartPlaceScraper } from '@/lib/services/naver-smartplace-scraper'

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const { placeName, placeId, placeUrl } = await request.json()

      // URL이 제공된 경우 Place ID 자동 추출
      let finalPlaceId = placeId
      let extractedPlaceName = placeName
      
      if (placeUrl && !placeId) {
        const scraper = new NaverSmartPlaceScraper()
        
        try {
          // Place ID 추출
          const extractedId = await scraper.extractPlaceId(placeUrl)
          if (extractedId) {
            finalPlaceId = extractedId
          }
          
          // 업체명도 추출
          if (!placeName) {
            const extractedName = await scraper.getPlaceName(placeUrl)
            if (extractedName) {
              extractedPlaceName = extractedName
            }
          }
        } catch (error) {
          console.error('Place info extraction error:', error)
        }
      }

      if (!extractedPlaceName || !finalPlaceId) {
        return NextResponse.json({ error: '장소 이름과 Place ID를 입력해주세요.' }, { status: 400 })
      }

      // Place ID 형식 검증 (숫자만 허용)
      if (!/^\d+$/.test(finalPlaceId)) {
        return NextResponse.json({ error: 'Place ID는 숫자만 입력 가능합니다.' }, { status: 400 })
      }

      // 기존 스마트플레이스 확인 (사용자당 1개만 허용)
      const existing = await prisma.smartPlace.findUnique({
        where: {
          userId: parseInt(userId)
        }
      })

      if (existing) {
        return NextResponse.json({ error: '이미 등록된 스마트플레이스가 있습니다.' }, { status: 400 })
      }

      // 스마트플레이스 프로젝트 생성
      const place = await prisma.smartPlace.create({
        data: {
          userId: parseInt(userId),
          placeName: extractedPlaceName,
          placeId: finalPlaceId
        },
        include: {
          _count: {
            select: { keywords: true }
          }
        }
      })

      return NextResponse.json({ 
        success: true,
        place: {
          id: place.id,
          placeName: place.placeName,
          placeId: place.placeId,
          keywordCount: place._count.keywords,
          isActive: true, // SmartPlace 테이블에는 isActive 필드가 없으므로 기본값
          lastUpdated: place.lastUpdated,
          extractedInfo: placeUrl ? {
            placeId: finalPlaceId,
            placeName: extractedPlaceName,
            sourceUrl: placeUrl
          } : undefined
        }
      })
    } catch (error) {
      console.error('Failed to register smartplace:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}