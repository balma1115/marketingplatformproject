import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

// GET: 과목 목록 조회
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subjects = await prisma.subject.findMany({
      include: {
        branches: {
          include: {
            academies: true
          }
        },
        _count: {
          select: {
            userSubjects: true,
            branches: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    })

    return NextResponse.json({ subjects })
  } catch (error) {
    console.error('Failed to fetch subjects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 과목 추가
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, code } = await req.json()

    // 중복 확인
    const existing = await prisma.subject.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    })

    if (existing) {
      return NextResponse.json({ 
        error: '이미 존재하는 과목명 또는 코드입니다.' 
      }, { status: 400 })
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        isActive: true
      }
    })

    return NextResponse.json({ subject })
  } catch (error) {
    console.error('Failed to create subject:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 과목 삭제
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 })
    }

    // 연결된 데이터 확인
    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            branches: true,
            userSubjects: true
          }
        }
      }
    })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    if (subject._count.branches > 0 || subject._count.userSubjects > 0) {
      return NextResponse.json({ 
        error: '해당 과목에 연결된 지사 또는 사용자가 있습니다.' 
      }, { status: 400 })
    }

    await prisma.subject.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete subject:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}