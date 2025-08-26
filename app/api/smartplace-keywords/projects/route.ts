import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // 스마트플레이스 프로젝트 조회
      const projects = await prisma.trackingProject.findMany({
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
        placeName: p.placeName,
        placeId: p.placeId,
        keywordCount: p._count.keywords,
        isActive: p.isActive,
        lastUpdated: p.lastUpdated
      }))

      return NextResponse.json({ projects: formattedProjects })
    } catch (error) {
      console.error('Failed to fetch smartplace projects:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const { placeName, placeId } = await request.json()

    if (!placeName || !placeId) {
      return NextResponse.json({ error: '장소 이름과 Place ID를 입력해주세요.' }, { status: 400 })
    }

    // Place ID 형식 검증 (숫자만 허용)
    if (!/^\d+$/.test(placeId)) {
      return NextResponse.json({ error: 'Place ID는 숫자만 입력 가능합니다.' }, { status: 400 })
    }

    // 중복 확인
    const existing = await prisma.trackingProject.findFirst({
      where: {
        userId: userId,
        placeId: placeId
      }
    })

    if (existing) {
      return NextResponse.json({ error: '이미 등록된 스마트플레이스입니다.' }, { status: 400 })
    }

    // 프로젝트 생성
    const project = await prisma.trackingProject.create({
      data: {
        userId: userId,
        placeName: placeName,
        placeId: placeId,
        isActive: true
      }
    })

      return NextResponse.json({ 
        success: true,
        project: {
          id: project.id,
          placeName: project.placeName,
          placeId: project.placeId,
          keywordCount: 0,
          isActive: project.isActive,
          lastUpdated: project.lastUpdated
        }
      })
    } catch (error) {
      console.error('Failed to create smartplace project:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}