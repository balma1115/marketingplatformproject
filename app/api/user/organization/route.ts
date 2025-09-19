import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// GET - 사용자의 조직 정보 조회 (과목, 지사, 학원)
export async function GET(req: NextRequest) {
  try {
    const userId = await verifyAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // UserSubject 정보 조회
    const userSubjects = await prisma.userSubject.findMany({
      where: { userId: parseInt(userId) },
      include: {
        subject: true,
        branch: true,
        academy: true,
      }
    })

    // 데이터 포맷팅
    const subjects = userSubjects.map(us => ({
      subjectId: us.subjectId,
      subjectName: us.subject.name,
      branchId: us.branchId,
      branchName: us.branch?.name || '',
      academyId: us.academyId,
      academyName: us.academy?.name || '',
      isBranchManager: us.isBranchManager || false
    }))

    return NextResponse.json({
      subjects,
      branches: [],
      academies: []
    })
  } catch (error) {
    console.error('Failed to fetch organization data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}