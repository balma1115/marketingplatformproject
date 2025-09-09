import { NextRequest, NextResponse } from 'next/server'
import { NaverAdsAPIExtended } from '@/lib/services/naver-ads-api-extended'
import { getNaverAdsCredentials } from '@/lib/services/naver-ads-api'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

interface Props {
  params: Promise<{ adgroupId: string }>
}

export async function GET(req: NextRequest, props: Props) {
  try {
    const params = await props.params
    const { adgroupId } = params
    
    // 인증 확인
    const cookieStore = cookies()
    const token = cookieStore.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as any
    const userId = decoded.userId
    
    // 사용자 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        naverAdsCustomerId: true,
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdCustomerId: true,
        naverAdApiKey: true,
        naverAdSecret: true,
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // API 자격 증명
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId
    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    
    if (!customerId || !accessKey || !secretKey) {
      return NextResponse.json({ 
        error: 'Naver Ads API 설정이 필요합니다',
        requiresSetup: true 
      }, { status: 400 })
    }
    
    // API 클라이언트 초기화
    const api = new NaverAdsAPIExtended({
      customerId,
      accessKey,
      secretKey
    })
    
    // 쿼리 파라미터로 타입 받기
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'KEYWORD_PLUS_RESTRICT'
    
    // 제외 키워드 조회
    const restrictedKeywords = await api.getRestrictedKeywords(
      adgroupId,
      type as any
    )
    
    return NextResponse.json({
      success: true,
      data: restrictedKeywords
    })
    
  } catch (error: any) {
    console.error('Error fetching restricted keywords:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch restricted keywords' 
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest, props: Props) {
  try {
    const params = await props.params
    const { adgroupId } = params
    
    // 인증 확인
    const cookieStore = cookies()
    const token = cookieStore.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as any
    const userId = decoded.userId
    
    // 사용자 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        naverAdsCustomerId: true,
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdCustomerId: true,
        naverAdApiKey: true,
        naverAdSecret: true,
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId
    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    
    if (!customerId || !accessKey || !secretKey) {
      return NextResponse.json({ 
        error: 'Naver Ads API 설정이 필요합니다',
        requiresSetup: true 
      }, { status: 400 })
    }
    
    // Request body 파싱
    const body = await req.json()
    const { keywords, type = 'KEYWORD_PLUS_RESTRICT' } = body
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ 
        error: '제외할 키워드를 입력해주세요' 
      }, { status: 400 })
    }
    
    // API 클라이언트 초기화
    const api = new NaverAdsAPIExtended({
      customerId,
      accessKey,
      secretKey
    })
    
    // 제외 키워드 추가
    const restrictedKeywords = keywords.map(keyword => ({
      keyword,
      type
    }))
    
    const result = await api.createRestrictedKeywords(adgroupId, restrictedKeywords)
    
    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error: any) {
    console.error('Error creating restricted keywords:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create restricted keywords' 
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, props: Props) {
  try {
    const params = await props.params
    const { adgroupId } = params
    
    // 인증 확인
    const cookieStore = cookies()
    const token = cookieStore.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET!) as any
    const userId = decoded.userId
    
    // 사용자 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        naverAdsCustomerId: true,
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdCustomerId: true,
        naverAdApiKey: true,
        naverAdSecret: true,
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const customerId = user.naverAdsCustomerId || user.naverAdCustomerId
    const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
    const secretKey = user.naverAdsSecretKey || user.naverAdSecret
    
    if (!customerId || !accessKey || !secretKey) {
      return NextResponse.json({ 
        error: 'Naver Ads API 설정이 필요합니다',
        requiresSetup: true 
      }, { status: 400 })
    }
    
    // Query parameters
    const { searchParams } = new URL(req.url)
    const ids = searchParams.get('ids')
    
    if (!ids) {
      return NextResponse.json({ 
        error: '삭제할 제외 키워드 ID를 선택해주세요' 
      }, { status: 400 })
    }
    
    const keywordIds = ids.split(',')
    
    // API 클라이언트 초기화
    const api = new NaverAdsAPIExtended({
      customerId,
      accessKey,
      secretKey
    })
    
    // 제외 키워드 삭제
    await api.deleteRestrictedKeywords(adgroupId, keywordIds)
    
    return NextResponse.json({
      success: true,
      message: 'Restricted keywords deleted successfully'
    })
    
  } catch (error: any) {
    console.error('Error deleting restricted keywords:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to delete restricted keywords' 
    }, { status: 500 })
  }
}