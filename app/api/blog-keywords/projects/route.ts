import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // 블로그 프로젝트 조회
      const projects = await prisma.blogTrackingProject.findMany({
        where: {
          userId: userId
        },
        include: {
          _count: {
            select: { keywords: true }
          }
        }
      })

      // 데이터 포맷팅
      const formattedProjects = projects.map(p => ({
        id: p.id,
        blogName: p.blogName,
        blogUrl: p.blogUrl,
        keywordCount: p._count.keywords
      }))

      return NextResponse.json({ projects: formattedProjects })
    } catch (error) {
      console.error('Failed to fetch blog projects:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

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

      // 중복 확인
      const existing = await prisma.blogTrackingProject.findFirst({
        where: {
          userId: userId,
          blogUrl: url
        }
      })

      if (existing) {
        return NextResponse.json({ error: '이미 등록된 블로그입니다.' }, { status: 400 })
      }

      // 프로젝트 생성
      const project = await prisma.blogTrackingProject.create({
        data: {
          userId: userId,
          blogName: name,
          blogUrl: url
        }
      })

      return NextResponse.json({ 
        success: true,
        project: {
          id: project.id,
          blogName: project.blogName,
          blogUrl: project.blogUrl,
          keywordCount: 0
        }
      })
    } catch (error) {
      console.error('Failed to create blog project:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}