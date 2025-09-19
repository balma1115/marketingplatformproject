import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// GET - 네이버 광고 설정 조회
export async function GET(req: NextRequest) {
  try {
    const userId = await verifyAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await prisma.naverAdsConfig.findFirst({
      where: { userId: parseInt(userId) },
      select: {
        customerId: true,
        apiKey: true,
        secretKey: true,
      }
    })

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Failed to fetch Naver Ads config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - 네이버 광고 설정 업데이트
export async function PUT(req: NextRequest) {
  try {
    const userId = await verifyAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { customerId, apiKey, secretKey } = body

    // 기존 설정 찾기 또는 생성
    let config = await prisma.naverAdsConfig.findFirst({
      where: { userId: parseInt(userId) }
    })

    if (config) {
      // 업데이트
      config = await prisma.naverAdsConfig.update({
        where: { id: config.id },
        data: {
          customerId,
          apiKey,
          secretKey,
        }
      })
    } else {
      // 새로 생성
      config = await prisma.naverAdsConfig.create({
        data: {
          userId: parseInt(userId),
          customerId,
          apiKey,
          secretKey,
        }
      })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Failed to update Naver Ads config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}