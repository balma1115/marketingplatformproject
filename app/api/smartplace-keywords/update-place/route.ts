import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

// PUT - 스마트플레이스 정보 업데이트
export async function PUT(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const body = await request.json()
      const { placeId, placeName, address, phone } = body

    // 기존 스마트플레이스 찾기 또는 생성
    let smartPlace = await prisma.smartPlace.findFirst({
      where: { userId: parseInt(userId) }
    })

    if (smartPlace) {
      // 업데이트
      smartPlace = await prisma.smartPlace.update({
        where: { id: smartPlace.id },
        data: {
          placeId,
          placeName,
          address,
          phone,
        }
      })
    } else {
      // 새로 생성
      smartPlace = await prisma.smartPlace.create({
        data: {
          userId: parseInt(userId),
          placeId,
          placeName,
          address,
          phone,
          rating: 0,
          reviewCount: 0,
          category: '',
        }
      })
    }

      return NextResponse.json({ smartPlace })
    } catch (error) {
      console.error('Failed to update SmartPlace:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}