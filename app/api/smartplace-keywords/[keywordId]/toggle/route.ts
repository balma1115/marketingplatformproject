import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: { keywordId: string } }
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
    const keywordId = parseInt(params.keywordId)
    const { isActive } = await req.json()

    if (isNaN(keywordId)) {
      return NextResponse.json({ error: 'Invalid keyword ID' }, { status: 400 })
    }

    // 키워드 확인
    const keyword = await prisma.trackingKeyword.findFirst({
      where: {
        id: keywordId,
        project: {
          userId: userId
        }
      }
    })

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
    }

    // 키워드 상태 업데이트
    const updated = await prisma.trackingKeyword.update({
      where: { id: keywordId },
      data: { isActive }
    })

    return NextResponse.json({ success: true, keyword: updated })
  } catch (error) {
    console.error('Failed to toggle smartplace keyword:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}