import { NextRequest, NextResponse } from 'next/server'
import { createUser, findUserByEmail } from '@/lib/db'
import { generateToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, academyName, academyAddress } = await request.json()

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

    // Create new user
    const user = await createUser({
      email,
      password,
      name,
      phone,
      academyName,
      academyAddress,
      role: 'user',
      plan: 'basic'
    })

    // Generate token and set cookie
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
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}