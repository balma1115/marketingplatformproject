import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

// GET: 등록된 플레이스 목록 조회
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 데이터베이스에서 사용자의 플레이스 목록 조회
    const places = await prisma.naverAdsPlace.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(places || [])
  } catch (error: any) {
    console.error('Failed to fetch places:', error)
    return NextResponse.json(
      { error: '플레이스 목록을 불러오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST: 새 플레이스 등록
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { placeId, placeName, address, phoneNumber, category, description } = body

    // 필수 필드 검증
    if (!placeId || !placeName) {
      return NextResponse.json(
        { error: '플레이스 ID와 이름은 필수 입력 항목입니다' },
        { status: 400 }
      )
    }

    // 중복 체크
    const existing = await prisma.naverAdsPlace.findFirst({
      where: {
        userId: auth.userId,
        placeId
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: '이미 등록된 플레이스입니다' },
        { status: 409 }
      )
    }

    // 플레이스 생성
    const place = await prisma.naverAdsPlace.create({
      data: {
        userId: auth.userId,
        placeId,
        placeName,
        address: address || null,
        phoneNumber: phoneNumber || null,
        category: category || null,
        description: description || null
      }
    })

    return NextResponse.json({
      success: true,
      place
    })
  } catch (error: any) {
    console.error('Failed to create place:', error)
    return NextResponse.json(
      { error: '플레이스 등록에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PUT: 플레이스 정보 수정
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: '플레이스 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 소유권 확인
    const existing = await prisma.naverAdsPlace.findFirst({
      where: {
        id,
        userId: auth.userId
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: '플레이스를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 플레이스 업데이트
    const updated = await prisma.naverAdsPlace.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      place: updated
    })
  } catch (error: any) {
    console.error('Failed to update place:', error)
    return NextResponse.json(
      { error: '플레이스 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE: 플레이스 삭제
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '플레이스 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 소유권 확인
    const existing = await prisma.naverAdsPlace.findFirst({
      where: {
        id,
        userId: auth.userId
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: '플레이스를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 플레이스 삭제
    await prisma.naverAdsPlace.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '플레이스가 삭제되었습니다'
    })
  } catch (error: any) {
    console.error('Failed to delete place:', error)
    return NextResponse.json(
      { error: '플레이스 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}