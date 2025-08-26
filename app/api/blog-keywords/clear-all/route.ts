import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // Find user's blog project
      const blog = await prisma.blogTrackingProject.findFirst({
        where: {
          userId: userId
        }
      })

      if (!blog) {
        return NextResponse.json({ error: 'No blog project found' }, { status: 404 })
      }

      // Delete all keywords for this blog project
      await prisma.blogTrackingKeyword.deleteMany({
        where: {
          projectId: blog.id
        }
      })

      return NextResponse.json({
        success: true,
        message: 'All keywords cleared'
      })
    } catch (error) {
      console.error('Failed to clear keywords:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}