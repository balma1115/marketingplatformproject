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

    // Check if user is branch manager, branch or admin
    if (currentUser.role !== 'branch_manager' && currentUser.role !== 'branch' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let academies

    if (currentUser.role === 'admin') {
      // Admin can see all academies
      academies = await prisma.academy.findMany({
        include: {
          branch: {
            include: {
              subject: true
            }
          },
          userSubjects: {
            include: {
              user: {
                select: {
                  id: true,
                  isApproved: true
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      })
    } else {
      // Branch manager can only see academies in their branches
      const branchIds = currentUser.userSubjects
        .filter(us => us.isBranchManager)
        .map(us => us.branchId)

      if (branchIds.length === 0) {
        return NextResponse.json({ academies: [] })
      }

      academies = await prisma.academy.findMany({
        where: {
          branchId: { in: branchIds }
        },
        include: {
          branch: {
            include: {
              subject: true
            }
          },
          userSubjects: {
            include: {
              user: {
                select: {
                  id: true,
                  isApproved: true
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      })
    }

    // Format the response
    const formattedAcademies = academies.map(academy => ({
      id: academy.id,
      name: academy.name,
      address: academy.address || '',
      phone: academy.phone || '',
      branch: {
        id: academy.branch.id,
        name: academy.branch.name
      },
      subject: {
        id: academy.branch.subject.id,
        name: academy.branch.subject.name
      },
      userCount: academy.userSubjects.length,
      activeUsers: academy.userSubjects.filter(us => us.user.isApproved).length
    }))

    return NextResponse.json({ academies: formattedAcademies })
  } catch (error) {
    console.error('Error fetching academies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch academies' },
      { status: 500 }
    )
  }
}