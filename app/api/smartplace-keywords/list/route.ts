import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // 스마트플레이스 키워드 조회
      const keywords = await prisma.trackingKeyword.findMany({
        where: {
          project: {
            userId: userId
          }
        },
        include: {
          project: true,
          rankings: {
            orderBy: {
              checkDate: 'desc'
            },
            take: 1
          }
        }
      })

      // 데이터 포맷팅
      const formattedKeywords = keywords.map(k => ({
        id: k.id,
        projectId: k.projectId,
        projectName: k.project.placeName,
        placeId: k.project.placeId,
        keyword: k.keyword,
        addedDate: k.addedDate,
        isActive: k.isActive,
        rank: k.rankings[0]?.rank || null,
        overallRank: k.rankings[0]?.overallRank || null,
        lastTracked: k.rankings[0]?.checkDate || null,
        rankingType: k.rankings[0]?.rankingType || 'organic'
      }))

      return NextResponse.json({ keywords: formattedKeywords })
    } catch (error) {
      console.error('Failed to fetch smartplace keywords:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}