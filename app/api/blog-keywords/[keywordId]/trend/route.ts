import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ keywordId: string }> }
) {
  const { keywordId } = await params
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')
  
  return withAuth(req, async (request, userId) => {
    try {
      // Get keyword with its rankings
      const keyword = await prisma.blogKeyword.findUnique({
        where: {
          id: keywordId
        },
        include: {
          rankings: {
            orderBy: {
              checkDate: 'desc'
            },
            take: 30 // Last 30 records
          },
          project: true
        }
      })
      
      if (!keyword) {
        return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
      }
      
      // Verify user has access
      const queryUserId = targetUserId ? parseInt(targetUserId) : userId
      if (keyword.project.userId !== queryUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      // Process trend data
      const trends = keyword.rankings
        .sort((a, b) => new Date(a.checkDate).getTime() - new Date(b.checkDate).getTime())
        .map(ranking => ({
          date: ranking.checkDate,
          rank: ranking.rank,
          mainTabExposed: ranking.mainTabExposed || false,
          found: ranking.found || false,
          title: ranking.title,
          url: ranking.url
        }))
      
      // Calculate statistics
      const ranks = keyword.rankings.filter(r => r.rank !== null).map(r => r.rank!)
      const stats = {
        currentRank: keyword.rankings[0]?.rank || null,
        bestRank: ranks.length > 0 ? Math.min(...ranks) : null,
        avgRank: ranks.length > 0 ? 
          Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length * 10) / 10 : null,
        totalExposures: keyword.rankings.filter(r => r.mainTabExposed).length
      }
      
      return NextResponse.json({
        keyword: {
          id: keyword.id,
          keyword: keyword.keyword
        },
        trends,
        stats
      })
    } catch (error) {
      console.error('Failed to fetch trend data:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}