import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

// GET - 사용자 프로필 조회
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = authResult.userId

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        academyName: true,
        academyAddress: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - 사용자 프로필 업데이트
export async function PUT(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = authResult.userId

    const body = await req.json()
    const { name, phone, academyName, academyAddress } = body

    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        name,
        phone,
        academyName,
        academyAddress,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        academyName: true,
        academyAddress: true,
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to update user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}