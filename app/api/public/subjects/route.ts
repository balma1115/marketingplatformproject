import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Public endpoint - no auth required
export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ subjects })
  } catch (error) {
    console.error('Failed to fetch subjects:', error)
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }
}