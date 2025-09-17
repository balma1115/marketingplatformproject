import { NextRequest, NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// Test login endpoint for development
export async function GET(request: NextRequest) {
  try {
    // Create a test user token
    const token = generateToken({
      userId: 1,
      email: 'test@example.com',
      role: 'user'
    })

    // Set the auth cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return NextResponse.json({
      success: true,
      message: 'Test login successful',
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        plan: 'basic'
      }
    })
  } catch (error) {
    console.error('Test login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}