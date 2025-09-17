import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value || request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = await verifyToken(token)

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user and check admin role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get API usage data - apiUsage 테이블이 없을 경우 빈 배열 반환
    let usages = []
    try {
      // apiUsage 테이블이 존재하는지 확인
      usages = await prisma.apiUsage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      })
    } catch (error) {
      console.log('[Admin/ApiUsage] apiUsage table not found, returning empty array')
      usages = []
    }

    return NextResponse.json({
      success: true,
      usages
    })
  } catch (error) {
    console.error('[Admin/ApiUsage] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}