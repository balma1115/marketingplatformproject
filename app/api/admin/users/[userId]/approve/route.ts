import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await props.params
    const user = await verifyAuth(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(params.userId)

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isApproved: true }
    })

    return NextResponse.json({ 
      success: true, 
      user: updatedUser 
    })
  } catch (error) {
    console.error('Error approving user:', error)
    return NextResponse.json(
      { error: 'Failed to approve user' },
      { status: 500 }
    )
  }
}