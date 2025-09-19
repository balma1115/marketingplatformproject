import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// PUT - 비밀번호 변경
export async function PUT(req: NextRequest) {
  try {
    const userId = await verifyAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 현재 비밀번호 확인
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: '현재 비밀번호가 일치하지 않습니다.' }, { status: 400 })
    }

    // 새 비밀번호 해시
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        password: hashedPassword
      }
    })

    return NextResponse.json({ message: '비밀번호가 변경되었습니다.' })
  } catch (error) {
    console.error('Failed to change password:', error)
    return NextResponse.json({ error: '비밀번호 변경에 실패했습니다.' }, { status: 500 })
  }
}