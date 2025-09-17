import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  try {
    // 인증 확인
    const token = req.cookies.get('auth-token')?.value || req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const { keywordId } = await params // await params
    const { isActive } = await req.json()

    // 키워드 확인 - SmartPlaceKeyword 사용
    const keyword = await prisma.smartPlaceKeyword.findFirst({
      where: {
        id: keywordId,
        userId: userId
      }
    })

    if (!keyword) {
      return NextResponse.json({ error: '키워드를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 키워드 상태 업데이트
    const updatedKeyword = await prisma.smartPlaceKeyword.update({
      where: {
        id: keywordId
      },
      data: {
        isActive: isActive
      }
    })

    return NextResponse.json({ success: true, keyword: updatedKeyword })
  } catch (error) {
    console.error('Failed to toggle keyword:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}