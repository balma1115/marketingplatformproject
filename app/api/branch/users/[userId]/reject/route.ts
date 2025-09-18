import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface Params {
  params: {
    userId: string
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value || cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const managerId = parseInt(decoded.userId)
    const targetUserId = parseInt(params.userId)

    // Get manager and verify role
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      include: {
        userSubjects: {
          where: { isBranchManager: true },
          include: {
            branch: true
          }
        }
      }
    })

    if (!manager) {
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 })
    }

    if (manager.role !== 'branch_manager' && manager.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        userSubjects: {
          include: {
            branch: true
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If branch manager, verify they have authority over this user
    if (manager.role === 'branch_manager') {
      const managerBranchIds = manager.userSubjects
        .filter(us => us.isBranchManager)
        .map(us => us.branchId)

      const userBranchIds = targetUser.userSubjects.map(us => us.branchId)

      const hasAuthority = userBranchIds.some(branchId =>
        managerBranchIds.includes(branchId)
      )

      if (!hasAuthority) {
        return NextResponse.json(
          { error: 'You do not have authority to reject this user' },
          { status: 403 }
        )
      }
    }

    // Delete the user and their userSubjects (cascade delete)
    await prisma.user.delete({
      where: { id: targetUserId }
    })

    return NextResponse.json({ success: true, message: 'User rejected and removed successfully' })
  } catch (error) {
    console.error('Error rejecting user:', error)
    return NextResponse.json(
      { error: 'Failed to reject user' },
      { status: 500 }
    )
  }
}