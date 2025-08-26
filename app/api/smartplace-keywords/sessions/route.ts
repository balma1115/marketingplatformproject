import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // 최근 추적 세션 조회
      const sessions = await prisma.trackingSession.findMany({
        where: {
          userId: userId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        include: {
          project: true
        }
      })

      // 데이터 포맷팅
      const formattedSessions = sessions.map(s => ({
        id: s.id,
        status: s.status,
        totalKeywords: s.totalKeywords,
        completedKeywords: s.completedKeywords,
        createdAt: s.createdAt,
        projectName: s.project?.placeName || '전체'
      }))

      return NextResponse.json({ sessions: formattedSessions })
    } catch (error) {
      console.error('Failed to fetch tracking sessions:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}