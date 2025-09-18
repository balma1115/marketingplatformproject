import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-middleware'

// GET: 학원 목록 조회
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branchId')
    const subjectId = searchParams.get('subjectId')

    let where: any = {}
    
    if (branchId) {
      where.branchId = parseInt(branchId)
    } else if (subjectId) {
      where.branch = {
        subjectId: parseInt(subjectId)
      }
    }

    const academies = await prisma.academy.findMany({
      where,
      include: {
        branch: {
          include: {
            subject: true
          }
        },
        _count: {
          select: {
            userSubjects: true
          }
        }
      },
      orderBy: [
        { branch: { subjectId: 'asc' } },
        { branch: { name: 'asc' } },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ academies })
  } catch (error) {
    console.error('Failed to fetch academies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 학원 추가
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { branchId, name, address, phone, registrationNumber } = await req.json()

    // 필수 필드 확인
    if (!branchId || !name) {
      return NextResponse.json({ 
        error: '지사와 학원명은 필수입니다.' 
      }, { status: 400 })
    }

    // 지사 존재 확인
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    })

    if (!branch) {
      return NextResponse.json({ 
        error: '존재하지 않는 지사입니다.' 
      }, { status: 404 })
    }

    // 같은 지사 내에서 중복 확인
    const existing = await prisma.academy.findFirst({
      where: {
        branchId,
        name
      }
    })

    if (existing) {
      return NextResponse.json({ 
        error: '해당 지사에 이미 존재하는 학원명입니다.' 
      }, { status: 400 })
    }

    const academy = await prisma.academy.create({
      data: {
        branchId,
        name,
        address,
        phone,
        registrationNumber
      },
      include: {
        branch: {
          include: {
            subject: true
          }
        }
      }
    })

    return NextResponse.json({ academy })
  } catch (error) {
    console.error('Failed to create academy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: 학원 수정
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Academy ID is required' }, { status: 400 })
    }

    const { name, address, phone, registrationNumber } = await req.json()

    // 학원 존재 확인
    const academy = await prisma.academy.findUnique({
      where: { id: parseInt(id) }
    })

    if (!academy) {
      return NextResponse.json({ error: 'Academy not found' }, { status: 404 })
    }

    // 이름 중복 확인 (자신 제외)
    if (name && name !== academy.name) {
      const existing = await prisma.academy.findFirst({
        where: {
          branchId: academy.branchId,
          name,
          NOT: { id: parseInt(id) }
        }
      })

      if (existing) {
        return NextResponse.json({ 
          error: '해당 지사에 이미 존재하는 학원명입니다.' 
        }, { status: 400 })
      }
    }

    const updatedAcademy = await prisma.academy.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(registrationNumber !== undefined && { registrationNumber })
      },
      include: {
        branch: {
          include: {
            subject: true
          }
        }
      }
    })

    return NextResponse.json({ academy: updatedAcademy })
  } catch (error) {
    console.error('Failed to update academy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 학원 삭제
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Academy ID is required' }, { status: 400 })
    }

    // 연결된 데이터 확인
    const academy = await prisma.academy.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            userSubjects: true
          }
        }
      }
    })

    if (!academy) {
      return NextResponse.json({ error: 'Academy not found' }, { status: 404 })
    }

    if (academy._count.userSubjects > 0) {
      return NextResponse.json({ 
        error: '해당 학원에 연결된 사용자가 있습니다.' 
      }, { status: 400 })
    }

    await prisma.academy.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete academy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 학원 일괄 등록 (CSV 업로드)
// Internal function for bulk operations (not exported as HTTP method)
async function postBulk(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { academies } = await req.json()

    if (!Array.isArray(academies) || academies.length === 0) {
      return NextResponse.json({ 
        error: '학원 데이터가 필요합니다.' 
      }, { status: 400 })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const academy of academies) {
      try {
        const { subjectName, branchName, academyName, address, phone, registrationNumber } = academy

        // 과목 찾기
        const subject = await prisma.subject.findFirst({
          where: { name: subjectName }
        })

        if (!subject) {
          results.failed++
          results.errors.push(`과목 '${subjectName}'을 찾을 수 없습니다.`)
          continue
        }

        // 지사 찾기
        const branch = await prisma.branch.findFirst({
          where: {
            subjectId: subject.id,
            name: branchName
          }
        })

        if (!branch) {
          results.failed++
          results.errors.push(`지사 '${branchName}'을 찾을 수 없습니다.`)
          continue
        }

        // 중복 확인
        const existing = await prisma.academy.findFirst({
          where: {
            branchId: branch.id,
            name: academyName
          }
        })

        if (existing) {
          results.failed++
          results.errors.push(`학원 '${academyName}'이 이미 존재합니다.`)
          continue
        }

        // 학원 생성
        await prisma.academy.create({
          data: {
            branchId: branch.id,
            name: academyName,
            address,
            phone,
            registrationNumber
          }
        })

        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(`학원 '${academy.academyName}' 등록 실패`)
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Failed to bulk create academies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}