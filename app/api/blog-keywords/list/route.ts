import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // 블로그 키워드 조회
      const keywords = await prisma.blogTrackingKeyword.findMany({
        where: {
          project: {
            userId: userId
          }
        },
        include: {
          project: true,
          results: {
            orderBy: {
              trackingDate: 'desc'
            },
            take: 1
          }
        }
      })

      // 데이터 포맷팅
      const formattedKeywords = keywords.map(k => ({
        id: k.id,
        projectId: k.projectId,
        projectName: k.project.blogName,
        blogUrl: k.project.blogUrl,
        keyword: k.keyword,
        addedDate: k.addedDate,
        isActive: k.isActive,
        mainTabExposed: k.results[0]?.mainTabExposed || false,
        blogTabRank: k.results[0]?.blogTabRank || null,
        lastTracked: k.results[0]?.trackingDate || null
      }))

      return NextResponse.json({ keywords: formattedKeywords })
    } catch (error) {
      console.error('Failed to fetch blog keywords:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}