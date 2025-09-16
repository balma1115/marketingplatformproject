import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, validatePassword } from '@/lib/db'
import { generateToken, setAuthCookie } from '@/lib/auth'

// Development mode flag
const isDevelopment = process.env.NODE_ENV === 'development'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Only log in development mode
    if (isDevelopment) {
      console.log('Login attempt for:', email)
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await findUserByEmail(email)

    if (isDevelopment) {
      console.log('User found:', !!user)
    }

    if (!user) {
      // Avoid revealing whether user exists
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const isValidPassword = await validatePassword(password, user.password)

    if (!isValidPassword) {
      // Same error message to prevent user enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    await setAuthCookie(token)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        academyName: user.academyName,
        coin: user.coin
      }
    })
  } catch (error) {
    // Only log errors in development
    if (isDevelopment) {
      console.error('Login error:', error)
    }

    // Don't expose error details in production
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}