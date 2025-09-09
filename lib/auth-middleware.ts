import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'
import jwt from 'jsonwebtoken'

export async function verifyAuth(req: NextRequest) {
  try {
    // Check cookie first
    let token = req.cookies.get('auth-token')?.value
    
    // If no cookie, check Authorization header
    if (!token) {
      const authHeader = req.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
    
    if (!token) {
      return { success: false, error: 'No token provided' }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production') as any
    return {
      success: true,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { success: false, error: 'Invalid token' }
  }
}

export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, userId: number, user?: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      // For development, create a test user
      if (process.env.NODE_ENV === 'development') {
        const devUser = { userId: 1, email: 'admin@test.com', role: 'admin' }
        return await handler(request, 1, devUser) // Test user ID
      }
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify token using jwt directly
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production') as any
      const userPayload = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      }
      
      // Call the handler with the user ID and user object
      return await handler(request, decoded.userId, userPayload)
    } catch (verifyError) {
      // For development, create a test user
      if (process.env.NODE_ENV === 'development') {
        const devUser = { userId: 1, email: 'admin@test.com', role: 'admin' }
        return await handler(request, 1, devUser) // Test user ID
      }
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    
    // For development, allow access
    if (process.env.NODE_ENV === 'development') {
      const devUser = { userId: 1, email: 'admin@test.com', role: 'admin' }
      return await handler(request, 1, devUser) // Test user ID
    }
    
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    )
  }
}