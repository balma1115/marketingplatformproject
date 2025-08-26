import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { source: string, keywordId: string } }
) {
  try {
    // 인증 확인
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const { source, keywordId } = params
    const id = parseInt(keywordId)

    if (!source || !keywordId || isNaN(id)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    if (source === 'smartplace') {
      // 스마트플레이스 키워드 삭제
      const keyword = await prisma.trackingKeyword.findFirst({
        where: {
          id: id,
          project: {
            userId: userId
          }
        }
      })

      if (!keyword) {
        return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
      }

      // 소프트 삭제 (isActive를 false로 설정)
      await prisma.trackingKeyword.update({
        where: { id: id },
        data: { isActive: false }
      })

      return NextResponse.json({ success: true })
    } else if (source === 'blog') {
      // 블로그 키워드 삭제
      const keyword = await prisma.blogTrackingKeyword.findFirst({
        where: {
          id: id,
          project: {
            userId: userId
          }
        }
      })

      if (!keyword) {
        return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
      }

      // 소프트 삭제 (isActive를 false로 설정)
      await prisma.blogTrackingKeyword.update({
        where: { id: id },
        data: { isActive: false }
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }
  } catch (error) {
    console.error('Failed to delete keyword:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}