import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // 스마트플레이스 키워드 조회
      const smartplaceKeywords = await prisma.trackingKeyword.findMany({
        where: {
          project: {
            userId: userId,
            isActive: true
          },
          isActive: true
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

      // 블로그 키워드 조회
      const blogKeywords = await prisma.blogTrackingKeyword.findMany({
        where: {
          project: {
            userId: userId
          },
          isActive: true
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

      // 키워드를 통합하여 중복 제거
      const keywordMap = new Map<string, any>()

      // 스마트플레이스 키워드 처리
      smartplaceKeywords.forEach(sk => {
        const data = {
          keyword: sk.keyword,
          smartplace: {
            id: sk.id,
            projectName: sk.project.placeName,
            projectId: sk.project.placeId,
            addedDate: sk.addedDate,
            currentRank: sk.rankings[0]?.rank || null,
            overallRank: sk.rankings[0]?.overallRank || null,
            rankingType: sk.rankings[0]?.rankingType || 'organic',
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
          projectName: bk.project.blogName,
          projectId: bk.project.id.toString(),
          addedDate: bk.createdAt,
          mainTabRank: bk.results[0]?.mainTabRank || null,
          blogTabRank: bk.results[0]?.blogTabRank || null,
          viewTabRank: bk.results[0]?.viewTabRank || null,
          lastTracked: bk.results[0]?.trackingDate || null
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

      return NextResponse.json({ 
        keywords,
        stats
      })
    } catch (error) {
      console.error('Failed to fetch unified keywords:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}