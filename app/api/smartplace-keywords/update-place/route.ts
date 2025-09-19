import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// PUT - 스마트플레이스 정보 업데이트
export async function PUT(req: NextRequest) {
  try {
    const userId = await verifyAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
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
}