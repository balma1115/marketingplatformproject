import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

// GET: 지사 목록 조회
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const subjectId = searchParams.get('subjectId')

    const where = subjectId ? { subjectId: parseInt(subjectId) } : {}

    const branches = await prisma.branch.findMany({
      where,
      include: {
        subject: true,
        academies: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            academies: true,
            userSubjects: true
          }
        }
      },
      orderBy: [
        { subjectId: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ branches })
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 지사 추가
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subjectId, name, code, managerId } = await req.json()

    // 필수 필드 확인
    if (!subjectId || !name) {
      return NextResponse.json({ 
        error: '과목과 지사명은 필수입니다.' 
      }, { status: 400 })
    }

    // 과목 존재 확인
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId }
    })

    if (!subject) {
      return NextResponse.json({ 
        error: '존재하지 않는 과목입니다.' 
      }, { status: 404 })
    }

    // 같은 과목 내에서 중복 확인
    const existing = await prisma.branch.findFirst({
      where: {
        subjectId,
        name
      }
    })

    if (existing) {
      return NextResponse.json({ 
        error: '해당 과목에 이미 존재하는 지사명입니다.' 
      }, { status: 400 })
    }

    // 매니저 확인 (선택사항)
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId }
      })

      if (!manager) {
        return NextResponse.json({ 
          error: '존재하지 않는 매니저입니다.' 
        }, { status: 404 })
      }
    }

    const branch = await prisma.branch.create({
      data: {
        subjectId,
        name,
        code,
        managerId
      },
      include: {
        subject: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ branch })
  } catch (error) {
    console.error('Failed to create branch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: 지사 수정
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 })
    }

    const { name, code, managerId } = await req.json()

    // 지사 존재 확인
    const branch = await prisma.branch.findUnique({
      where: { id: parseInt(id) }
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    // 이름 중복 확인 (자신 제외)
    if (name && name !== branch.name) {
      const existing = await prisma.branch.findFirst({
        where: {
          subjectId: branch.subjectId,
          name,
          NOT: { id: parseInt(id) }
        }
      })

      if (existing) {
        return NextResponse.json({ 
          error: '해당 과목에 이미 존재하는 지사명입니다.' 
        }, { status: 400 })
      }
    }

    // 매니저 확인 (선택사항)
    if (managerId !== undefined && managerId !== null) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId }
      })

      if (!manager) {
        return NextResponse.json({ 
          error: '존재하지 않는 매니저입니다.' 
        }, { status: 404 })
      }
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(code !== undefined && { code }),
        ...(managerId !== undefined && { managerId })
      },
      include: {
        subject: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ branch: updatedBranch })
  } catch (error) {
    console.error('Failed to update branch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 지사 삭제
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 })
    }

    // 연결된 데이터 확인
    const branch = await prisma.branch.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            academies: true,
            userSubjects: true
          }
        }
      }
    })

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    if (branch._count.academies > 0 || branch._count.userSubjects > 0) {
      return NextResponse.json({ 
        error: '해당 지사에 연결된 학원 또는 사용자가 있습니다.' 
      }, { status: 400 })
    }

    await prisma.branch.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete branch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}