import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const token = req.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const { keywords } = await req.json()

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 })
    }

    if (keywords.length > 30) {
      return NextResponse.json({ error: '스마트플레이스는 최대 30개까지 키워드를 등록할 수 있습니다.' }, { status: 400 })
    }

    // 사용자의 스마트플레이스 가져오기
    const smartPlace = await prisma.smartPlace.findUnique({
      where: {
        userId: userId
      }
    })

    if (!smartPlace) {
      return NextResponse.json({ 
        error: '먼저 스마트플레이스를 등록해주세요.' 
      }, { status: 400 })
    }

    // 현재 등록된 키워드 수 확인
    const currentKeywordCount = await prisma.smartPlaceKeyword.count({
      where: {
        smartPlaceId: smartPlace.id,
        isActive: true
      }
    })

    if (currentKeywordCount + keywords.length > 30) {
      return NextResponse.json({ 
        error: `현재 ${currentKeywordCount}개의 키워드가 등록되어 있습니다. 최대 ${30 - currentKeywordCount}개까지 추가할 수 있습니다.` 
      }, { status: 400 })
    }

    // 키워드 추가
    const addedKeywords = []
    const duplicates = []

    for (const keyword of keywords) {
      const trimmedKeyword = keyword.trim()
      if (!trimmedKeyword) continue

      // 중복 확인
      const existing = await prisma.smartPlaceKeyword.findFirst({
        where: {
          smartPlaceId: smartPlace.id,
          keyword: trimmedKeyword
        }
      })

      if (existing) {
        duplicates.push(trimmedKeyword)
        continue
      }

      const created = await prisma.smartPlaceKeyword.create({
        data: {
          userId: userId,
          smartPlaceId: smartPlace.id,
          keyword: trimmedKeyword,
          isActive: true
        }
      })

      addedKeywords.push(created)
    }

    return NextResponse.json({
      success: true,
      added: addedKeywords.length,
      duplicates: duplicates.length,
      duplicateKeywords: duplicates
    })
  } catch (error) {
    console.error('Failed to add smartplace keywords:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}