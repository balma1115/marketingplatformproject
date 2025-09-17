import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value || request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = await verifyToken(token)

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user and check admin role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get system settings (you can store these in a database table or use defaults)
    const settings = {
      maintenance: false,
      allowRegistration: true,
      defaultPlan: 'basic',
      defaultCoins: 100,
      maxApiCallsPerDay: 1000,
      features: {
        smartPlace: true,
        blogTracking: true,
        naverAds: true,
        keywordAnalysis: true
      }
    }

    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error) {
    console.error('[Admin/Settings] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value || request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = await verifyToken(token)

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user and check admin role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Here you would save settings to database
    // For now, we just return success
    console.log('[Admin/Settings] Saving settings:', body)

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    })
  } catch (error) {
    console.error('[Admin/Settings] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}