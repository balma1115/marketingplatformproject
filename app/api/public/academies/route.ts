import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Public endpoint - no auth required
export async function GET() {
  try {
    const academies = await prisma.academy.findMany({
      orderBy: [
        { branchId: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ academies })
  } catch (error) {
    console.error('Failed to fetch academies:', error)
    return NextResponse.json({ error: 'Failed to fetch academies' }, { status: 500 })
  }
}