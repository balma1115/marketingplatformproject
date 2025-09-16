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
      
      // BlogTrackingProject 모두 조회
      const blogTrackingProjects = await prisma.blogTrackingProject.findMany({
        where: {
          userId: queryUserId
        }
      })

      let formattedKeywords = [];

      if (blogTrackingProjects.length > 0) {
        // 모든 프로젝트의 키워드 조회
        const keywords = await prisma.blogTrackingKeyword.findMany({
          where: {
            projectId: {
              in: blogTrackingProjects.map(p => p.id)
            }
          },
          include: {
            results: {
              orderBy: {
                trackingDate: 'desc'
              },
              take: 1
            }
          }
        })

        // 데이터 포맷팅
        formattedKeywords = keywords.map(k => ({
          id: k.id,
          keyword: k.keyword,
          isActive: k.isActive,
          addedDate: k.addedDate,
          blogTabRank: k.results[0]?.blogTabRank || null,
          mainTabExposed: k.results[0]?.mainTabExposed || false,
          mainTabRank: k.results[0]?.mainTabRank || null,
          viewTabRank: k.results[0]?.viewTabRank || null,
          adRank: k.results[0]?.adRank || null,
          lastTracked: k.results[0]?.trackingDate || null,
          createdAt: k.createdAt
        }))
      } else {
        // BlogProject가 없으면 이전 스키마(BlogProject) 확인
        const blogProjects = await prisma.blogProject.findMany({
          where: {
            userId: queryUserId
          }
        })

        if (blogProjects.length > 0) {
          // BlogKeyword 조회
          const keywords = await prisma.blogKeyword.findMany({
            where: {
              projectId: {
                in: blogProjects.map(p => p.id)
              }
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
          formattedKeywords = keywords.map(k => ({
            id: k.id,
            keyword: k.keyword,
            isActive: k.isActive,
            addedDate: k.addedDate,
            blogTabRank: k.rankings[0]?.rank || null,
            mainTabExposed: k.rankings[0]?.mainTabExposed || false,
            mainTabRank: k.rankings[0]?.rank || null,
            viewTabRank: null,
            adRank: null,
            lastTracked: k.rankings[0]?.checkDate || null,
            createdAt: k.createdAt
          }))
        }
      }

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