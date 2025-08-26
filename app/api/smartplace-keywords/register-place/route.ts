import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const { placeName, placeId } = await request.json()

      if (!placeName || !placeId) {
        return NextResponse.json({ error: '장소 이름과 Place ID를 입력해주세요.' }, { status: 400 })
      }

      // Place ID 형식 검증 (숫자만 허용)
      if (!/^\d+$/.test(placeId)) {
        return NextResponse.json({ error: 'Place ID는 숫자만 입력 가능합니다.' }, { status: 400 })
      }

      // 기존 스마트플레이스 확인 (사용자당 1개만 허용)
      const existing = await prisma.trackingProject.findFirst({
        where: {
          userId: userId
        }
      })

      if (existing) {
        return NextResponse.json({ error: '이미 등록된 스마트플레이스가 있습니다.' }, { status: 400 })
      }

      // 스마트플레이스 프로젝트 생성
      const place = await prisma.trackingProject.create({
        data: {
          userId: userId,
          placeName: placeName,
          placeId: placeId,
          isActive: true
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
          isActive: place.isActive,
          lastUpdated: place.lastUpdated
        }
      })
    } catch (error) {
      console.error('Failed to register smartplace:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}