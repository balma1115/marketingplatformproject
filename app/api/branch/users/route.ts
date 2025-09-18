import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(req: NextRequest) {
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

    const userId = parseInt(decoded.userId)

    // Get user and verify role
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userSubjects: {
          where: { isBranchManager: true },
          include: {
            branch: true,
            subject: true
          }
        }
      }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is branch manager or admin
    if (currentUser.role !== 'branch_manager' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let users

    if (currentUser.role === 'admin') {
      // Admin can see all users
      users = await prisma.user.findMany({
        include: {
          userSubjects: {
            include: {
              subject: true,
              branch: true,
              academy: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Branch manager can only see users in their branches
      const branchIds = currentUser.userSubjects
        .filter(us => us.isBranchManager)
        .map(us => us.branchId)

      if (branchIds.length === 0) {
        return NextResponse.json({ users: [] })
      }

      users = await prisma.user.findMany({
        where: {
          userSubjects: {
            some: {
              branchId: { in: branchIds }
            }
          }
        },
        include: {
          userSubjects: {
            include: {
              subject: true,
              branch: true,
              academy: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Filter userSubjects to only show those in manager's branches
      users = users.map(user => ({
        ...user,
        userSubjects: user.userSubjects.filter(us => branchIds.includes(us.branchId))
      }))
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}