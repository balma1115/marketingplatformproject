import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'

export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, userId: number) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      // For development, create a test user
      if (process.env.NODE_ENV === 'development') {
        return await handler(request, 1) // Test user ID
      }
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = verifyToken(token)
    
    if (!payload) {
      // For development, create a test user
      if (process.env.NODE_ENV === 'development') {
        return await handler(request, 1) // Test user ID
      }
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Call the handler with the user ID
    return await handler(request, payload.userId)
  } catch (error) {
    console.error('Auth middleware error:', error)
    
    // For development, allow access
    if (process.env.NODE_ENV === 'development') {
      return await handler(request, 1) // Test user ID
    }
    
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    )
  }
}