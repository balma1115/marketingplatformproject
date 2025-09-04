import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'

// GET: Fetch user's API keys
export async function GET(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // Fetch user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          naverAdApiKey: true,
          naverAdSecret: true,
          naverAdCustomerId: true,
          instagramAccessToken: true,
          instagramUserId: true
        }
      })
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      // Return API keys
      return NextResponse.json({
        naverAdApiKey: user.naverAdApiKey || '',
        naverAdSecret: user.naverAdSecret || '',
        naverAdCustomerId: user.naverAdCustomerId || '',
        instagramAccessToken: user.instagramAccessToken || '',
        instagramUserId: user.instagramUserId || ''
      })
      
    } catch (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// POST: Save/Update user's API keys
export async function POST(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // Get request body
      const body = await request.json()
      const {
        naverAdApiKey,
        naverAdSecret,
        naverAdCustomerId,
        instagramAccessToken,
        instagramUserId
      } = body
      
      // Update user's API keys
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          naverAdApiKey: naverAdApiKey || null,
          naverAdSecret: naverAdSecret || null,
          naverAdCustomerId: naverAdCustomerId || null,
          instagramAccessToken: instagramAccessToken || null,
          instagramUserId: instagramUserId || null
        },
        select: {
          id: true,
          email: true,
          name: true
        }
      })
      
      // Log API key update for security
      console.log(`API keys updated for user: ${updatedUser.email} (ID: ${updatedUser.id})`)
      
      return NextResponse.json({
        success: true,
        message: 'API keys successfully saved'
      })
      
    } catch (error) {
      console.error('Error saving API keys:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// DELETE: Remove user's API keys  
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (request, userId) => {
    try {
      // Clear user's API keys
      await prisma.user.update({
        where: { id: userId },
        data: {
          naverAdApiKey: null,
          naverAdSecret: null,
          naverAdCustomerId: null,
          instagramAccessToken: null,
          instagramUserId: null
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'API keys successfully removed'
      })
      
    } catch (error) {
      console.error('Error removing API keys:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}