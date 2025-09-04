import { NextRequest, NextResponse } from 'next/server'

// Mock KT Pass SMS verification
// In production, this would integrate with actual KT Pass API
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Simulate sending SMS
    // In production, call actual KT Pass API here
    console.log(`[MOCK] Sending verification code to ${phone}`)
    
    // For development, we'll use a fixed code: 123456
    // Store this in session/cache in production
    
    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent',
      // In development only - remove in production
      devCode: '123456' 
    })
  } catch (error) {
    console.error('Failed to send verification:', error)
    return NextResponse.json({ error: 'Failed to send verification' }, { status: 500 })
  }
}