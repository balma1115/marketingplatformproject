import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, validatePassword } from '@/lib/db'
import { generateToken, setAuthCookie } from '@/lib/auth'

// Development mode flag
const isDevelopment = process.env.NODE_ENV === 'development'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const { email, password } = body

    // Always log in production for debugging
    console.log(`[Login] Attempt for email: ${email}`)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Database query with error handling
    let user
    try {
      user = await findUserByEmail(email)
      console.log(`[Login] User lookup result: ${user ? 'found' : 'not found'}`)
    } catch (dbError) {
      console.error('[Login] Database error:', dbError)
      return NextResponse.json(
        {
          error: 'Database connection error',
          details: process.env.NODE_ENV === 'production' ? undefined : String(dbError)
        },
        { status: 500 }
      )
    }

    if (!user) {
      // Avoid revealing whether user exists
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Password validation with error handling
    let isValidPassword
    try {
      isValidPassword = await validatePassword(password, user.password)
    } catch (validationError) {
      console.error('[Login] Password validation error:', validationError)
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      )
    }

    if (!isValidPassword) {
      // Same error message to prevent user enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Token generation
    let token
    try {
      token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })
    } catch (tokenError) {
      console.error('[Login] Token generation error:', tokenError)
      return NextResponse.json(
        { error: 'Failed to generate authentication token' },
        { status: 500 }
      )
    }

    // Set cookie
    try {
      await setAuthCookie(token)
    } catch (cookieError) {
      console.error('[Login] Cookie setting error:', cookieError)
      return NextResponse.json(
        { error: 'Failed to set authentication cookie' },
        { status: 500 }
      )
    }

    console.log(`[Login] Successful login for user ID: ${user.id}`)

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
    console.error('[Login] Unexpected error:', error)

    // Return more detailed error in non-production
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'production' ? undefined : String(error)
      },
      { status: 500 }
    )
  }
}