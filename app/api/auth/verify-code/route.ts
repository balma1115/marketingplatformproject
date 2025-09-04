import { NextRequest, NextResponse } from 'next/server'

// Mock KT Pass code verification
// In production, this would integrate with actual KT Pass API
export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 })
    }

    // For development, accept code "123456"
    // In production, verify against actual stored code
    if (code === '123456') {
      return NextResponse.json({ 
        success: true,
        verified: true,
        message: 'Phone number verified successfully'
      })
    } else {
      return NextResponse.json({ 
        success: false,
        verified: false,
        error: 'Invalid verification code' 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Failed to verify code:', error)
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 })
  }
}