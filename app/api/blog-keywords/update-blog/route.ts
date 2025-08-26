import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      const { blogUrl, blogName } = await req.json()
      
      // Update the existing blog project
      const updatedBlog = await prisma.blogTrackingProject.updateMany({
        where: {
          userId: userId
        },
        data: {
          blogUrl: blogUrl,
          blogName: blogName || 'My Blog',
          blogId: blogUrl.replace('https://blog.naver.com/', '').split('/')[0]
        }
      })

      if (updatedBlog.count === 0) {
        // If no blog exists, create a new one
        const newBlog = await prisma.blogTrackingProject.create({
          data: {
            userId: userId,
            blogUrl: blogUrl,
            blogName: blogName || 'My Blog',
            blogId: blogUrl.replace('https://blog.naver.com/', '').split('/')[0]
          }
        })
        
        return NextResponse.json({
          success: true,
          blog: newBlog
        })
      }

      return NextResponse.json({
        success: true,
        message: '블로그가 업데이트되었습니다.'
      })
    } catch (error) {
      console.error('Failed to update blog:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}