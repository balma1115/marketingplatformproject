import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { findUserByEmail } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, userSubjects } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email)

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Validate userSubjects
    if (!userSubjects || userSubjects.length === 0) {
      return NextResponse.json(
        { error: 'At least one subject must be selected' },
        { status: 400 }
      )
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user with userSubjects in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Determine user role based on selections
      let userRole = 'user'
      const hasBranchManager = userSubjects.some((s: any) => s.isBranchManager)

      if (hasBranchManager) {
        userRole = 'branch_manager'
      }

      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword, // Use hashed password
          name,
          phone: null, // Phone is optional now
          role: userRole,
          plan: 'basic',
          isApproved: false // Requires branch approval
        }
      })

      // Create user-subject relationships
      for (const subject of userSubjects) {
        await tx.userSubject.create({
          data: {
            userId: newUser.id,
            subjectId: subject.subjectId,
            branchId: subject.branchId,
            academyId: subject.academyId || null, // Can be null for branch managers
            isBranchManager: subject.isBranchManager || false
          }
        })
      }

      return newUser
    })

    // Don't generate auth token for unapproved users
    // They need to wait for branch approval
    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다. 지사 승인 후 서비스를 이용할 수 있습니다.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        isApproved: user.isApproved
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}