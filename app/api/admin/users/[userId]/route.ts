import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

// Update user
export async function PATCH(
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
    const updates = await request.json()

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// Delete user
export async function DELETE(
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
    
    // Delete related data first
    await prisma.userSubject.deleteMany({
      where: { userId }
    })

    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}