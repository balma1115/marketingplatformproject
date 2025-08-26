import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // 사용자의 스마트플레이스 프로젝트 조회 (1개만)
      const place = await prisma.trackingProject.findFirst({
        where: {
          userId: userId
        },
        include: {
          _count: {
            select: { keywords: true }
          }
        }
      })

      if (!place) {
        return NextResponse.json({ place: null })
      }

      // 데이터 포맷팅
      const formattedPlace = {
        id: place.id,
        placeName: place.placeName,
        placeId: place.placeId,
        keywordCount: place._count.keywords,
        isActive: place.isActive,
        lastUpdated: place.lastUpdated
      }

      return NextResponse.json({ place: formattedPlace })
    } catch (error) {
      console.error('Failed to fetch user smartplace:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}