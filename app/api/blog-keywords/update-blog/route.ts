import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// PUT - 블로그 정보 업데이트
export async function PUT(req: NextRequest) {
  try {
    const userId = await verifyAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { blogUrl, blogName, blogId } = body

    // 기존 블로그 프로젝트 찾기 또는 생성
    let project = await prisma.blogTrackingProject.findFirst({
      where: { userId: parseInt(userId) }
    })

    if (project) {
      // 업데이트
      project = await prisma.blogTrackingProject.update({
        where: { id: project.id },
        data: {
          blogUrl,
          blogName,
          blogId,
        }
      })
    } else {
      // 새로 생성
      project = await prisma.blogTrackingProject.create({
        data: {
          userId: parseInt(userId),
          blogUrl,
          blogName,
          blogId,
        }
      })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Failed to update blog project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}