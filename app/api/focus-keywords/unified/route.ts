import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const userIdNum = parseInt(userId)
      
      // 스마트플레이스 조회
      const smartPlace = await prisma.smartPlace.findFirst({
        where: {
          userId: userIdNum
        }
      })

      // 스마트플레이스 키워드 조회
      const smartplaceKeywords = smartPlace ? await prisma.smartPlaceKeyword.findMany({
        where: {
          smartPlaceId: smartPlace.id,
          isActive: true
        },
        include: {
          rankings: {
            orderBy: {
              checkDate: 'desc'
            },
            take: 1
          }
        }
      }) : []

      // 블로그 프로젝트 조회
      const blogProject = await prisma.blogProject.findFirst({
        where: {
          userId: userIdNum
        }
      })

      // 블로그 키워드 조회
      const blogKeywords = blogProject ? await prisma.blogKeyword.findMany({
        where: {
          projectId: blogProject.id,
          isActive: true
        },
        include: {
          rankings: {
            orderBy: {
              checkDate: 'desc'
            },
            take: 1
          }
        }
      }) : []

      // 키워드를 통합하여 중복 제거
      const keywordMap = new Map<string, any>()

      // 스마트플레이스 키워드 처리
      smartplaceKeywords.forEach(sk => {
        const data = {
          keyword: sk.keyword,
          smartplace: {
            id: sk.id,
            projectName: smartPlace?.placeName || '',
            projectId: smartPlace?.placeId || '',
            addedDate: sk.createdAt,
            currentRank: sk.rankings[0]?.organicRank || null,
            adRank: sk.rankings[0]?.adRank || null,
            lastTracked: sk.rankings[0]?.checkDate || null
          },
          blog: null
        }
        keywordMap.set(sk.keyword, data)
      })

      // 블로그 키워드 처리
      blogKeywords.forEach(bk => {
        const existing = keywordMap.get(bk.keyword)
        const blogData = {
          id: bk.id,
          projectName: blogProject?.blogName || '',
          projectId: blogProject?.id.toString() || '',
          addedDate: bk.createdAt,
          mainTabExposed: bk.rankings[0]?.mainTabExposed || false,
          mainTabRank: null,  // Not tracked in new structure
          blogTabRank: bk.rankings[0]?.rank || null,
          lastTracked: bk.rankings[0]?.checkDate || null
        }

        if (existing) {
          existing.blog = blogData
        } else {
          keywordMap.set(bk.keyword, {
            keyword: bk.keyword,
            smartplace: null,
            blog: blogData
          })
        }
      })

      const keywords = Array.from(keywordMap.values())

      // 통계 계산
      const stats = {
        totalKeywords: keywords.length,
        smartplaceOnly: keywords.filter(k => k.smartplace && !k.blog).length,
        blogOnly: keywords.filter(k => !k.smartplace && k.blog).length,
        both: keywords.filter(k => k.smartplace && k.blog).length
      }

      const response = NextResponse.json({ 
        keywords,
        stats
      })
      
      // 서버사이드 캐싱: 1분간 캐시, 5분까지는 stale-while-revalidate
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
      
      return response
    } catch (error) {
      console.error('Failed to fetch unified keywords:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}