import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ keywordId: string }> }
) {
  try {
    // Next.js 15에서 params는 Promise이므로 await 필요
    const params = await props.params
    
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

    if (isNaN(keywordId)) {
      return NextResponse.json({ error: 'Invalid keyword ID' }, { status: 400 })
    }

    // 키워드 확인
    const keyword = await prisma.blogTrackingKeyword.findFirst({
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

    // 키워드 삭제 (관련 결과도 함께 삭제됨 - cascade 설정)
    await prisma.blogTrackingKeyword.delete({
      where: { id: keywordId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete blog keyword:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}