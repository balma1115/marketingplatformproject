import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const { name, url } = await request.json()

      if (!name || !url) {
        return NextResponse.json({ error: '블로그 이름과 URL을 입력해주세요.' }, { status: 400 })
      }

      // URL 형식 검증
      try {
        new URL(url)
      } catch {
        return NextResponse.json({ error: '유효한 URL을 입력해주세요.' }, { status: 400 })
      }

      // 기존 블로그 확인 (사용자당 1개만 허용)
      const existing = await prisma.blogTrackingProject.findFirst({
        where: {
          userId: userId
        }
      })

      if (existing) {
        return NextResponse.json({ error: '이미 등록된 블로그가 있습니다.' }, { status: 400 })
      }

      // 블로그 프로젝트 생성
      const blog = await prisma.blogTrackingProject.create({
        data: {
          userId: userId,
          blogName: name,
          blogUrl: url
        },
        include: {
          _count: {
            select: { keywords: true }
          }
        }
      })

      return NextResponse.json({ 
        success: true,
        blog: {
          id: blog.id,
          blogName: blog.blogName,
          blogUrl: blog.blogUrl,
          keywordCount: blog._count.keywords
        }
      })
    } catch (error) {
      console.error('Failed to register blog:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}