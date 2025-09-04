import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  // URL에서 userId 파라미터 가져오기 (관리자가 특정 사용자의 키워드를 조회할 때)
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')
  
  return withAuth(req, async (request, userId) => {
    try {
      // userId 파라미터가 있으면 해당 사용자의 데이터 조회, 없으면 현재 사용자의 데이터 조회
      const queryUserId = targetUserId ? parseInt(targetUserId) : parseInt(userId)
      
      // 블로그 프로젝트 먼저 조회
      const blogProject = await prisma.blogProject.findFirst({
        where: {
          userId: queryUserId
        }
      })
      
      if (!blogProject) {
        return NextResponse.json({ keywords: [] })
      }
      
      // 블로그 키워드 조회
      const keywords = await prisma.blogKeyword.findMany({
        where: {
          projectId: blogProject.id
        },
        include: {
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
        keyword: k.keyword,
        isActive: k.isActive,
        rank: k.rankings[0]?.rank || null,
        blogTabRank: k.rankings[0]?.rank || null,  // For compatibility with UI
        mainTabExposed: k.rankings[0]?.mainTabExposed || false,
        found: k.rankings[0]?.found || false,
        url: k.rankings[0]?.url || null,
        title: k.rankings[0]?.title || null,
        totalResults: k.rankings[0]?.totalResults || 0,
        lastChecked: k.rankings[0]?.checkDate || null,
        lastTracked: k.rankings[0]?.checkDate || null,  // For compatibility with UI
        createdAt: k.createdAt
      }))

      const response = NextResponse.json({ keywords: formattedKeywords })
      
      // 더 짧은 캐시로 변경하여 빠른 업데이트 반영
      response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
      
      return response
    } catch (error) {
      console.error('Failed to fetch blog keywords:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}