import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')
  
  return withAuth(req, async (request, userId) => {
    try {
      const queryUserId = targetUserId ? parseInt(targetUserId) : userId
      
      // Get blog project
      const blogProject = await prisma.blogProject.findFirst({
        where: {
          userId: queryUserId
        }
      })
      
      if (!blogProject) {
        return NextResponse.json({
          project: null,
          monthlyData: []
        })
      }
      
      // Get the last 30 days of data
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      // Get all keywords for this blog
      const keywords = await prisma.blogKeyword.findMany({
        where: {
          projectId: blogProject.id
        },
        include: {
          rankings: {
            where: {
              checkDate: {
                gte: thirtyDaysAgo
              }
            },
            orderBy: {
              checkDate: 'desc'
            }
          }
        }
      })
      
      // Group rankings by date
      const rankingsByDate = new Map<string, any[]>()
      
      keywords.forEach(keyword => {
        keyword.rankings.forEach(ranking => {
          const dateStr = ranking.checkDate.toISOString().split('T')[0]
          
          if (!rankingsByDate.has(dateStr)) {
            rankingsByDate.set(dateStr, [])
          }
          
          rankingsByDate.get(dateStr)!.push({
            keyword: keyword.keyword,
            rank: ranking.rank,
            mainTabExposed: ranking.mainTabExposed || false,
            found: ranking.found || false,
            title: ranking.title,
            url: ranking.url
          })
        })
      })
      
      // Convert to array and sort by date
      const monthlyData = Array.from(rankingsByDate.entries())
        .map(([date, rankings]) => ({
          date,
          rankings
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      return NextResponse.json({
        project: {
          blogName: blogProject.blogName,
          blogUrl: blogProject.blogUrl
        },
        monthlyData
      })
    } catch (error) {
      console.error('Failed to fetch monthly data:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}