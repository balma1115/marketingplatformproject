import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // 사용자의 블로그 프로젝트 조회 (1개만)
      const blog = await prisma.blogTrackingProject.findFirst({
        where: {
          userId: userId
        },
        include: {
          _count: {
            select: { keywords: true }
          }
        }
      })

      if (!blog) {
        return NextResponse.json({ blog: null })
      }

      // 데이터 포맷팅
      const formattedBlog = {
        id: blog.id,
        blogName: blog.blogName,
        blogUrl: blog.blogUrl,
        keywordCount: blog._count.keywords
      }

      return NextResponse.json({ blog: formattedBlog })
    } catch (error) {
      console.error('Failed to fetch user blog:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}