import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Public endpoint - no auth required
export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: [
        { subjectId: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ branches })
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 })
  }
}