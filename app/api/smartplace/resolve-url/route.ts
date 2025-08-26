import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// 단축 URL을 원본 URL로 변환하는 함수
async function resolveShortUrl(shortUrl: string): Promise<string> {
  try {
    const response = await axios.get(shortUrl, {
      maxRedirects: 5,
      validateStatus: () => true,
    })
    
    const finalUrl = response.request.res?.responseUrl || response.config.url || shortUrl
    console.log('Final URL after redirects:', finalUrl)
    
    return finalUrl
  } catch (error: any) {
    // HEAD 요청으로 재시도
    try {
      const headResponse = await axios.head(shortUrl, {
        maxRedirects: 0,
        validateStatus: (status) => status === 301 || status === 302 || status === 303 || status === 307 || status === 308
      })
      
      if (headResponse.headers.location) {
        return headResponse.headers.location
      }
    } catch (headError: any) {
      if (headError.response?.headers?.location) {
        return headError.response.headers.location
      }
    }
    
    throw new Error('URL을 변환할 수 없습니다.')
  }
}

// Place ID 추출 함수
function extractPlaceId(url: string): string | null {
  // naver.me 단축 URL인 경우
  if (url.includes('naver.me/')) {
    return null // 단축 URL은 먼저 원본으로 변환 필요
  }
  
  // 다양한 네이버 플레이스 URL 패턴 처리
  const patterns = [
    /place\.naver\.com\/restaurant\/(\d+)/,
    /place\.map\.naver\.com\/restaurant\/(\d+)/,
    /map\.naver\.com\/.*\/place\/(\d+)/,
    /m\.place\.naver\.com\/restaurant\/(\d+)/,
    /m\.place\.naver\.com\/place\/(\d+)/,
    /place\.naver\.com\/place\/(\d+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL이 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('=== RESOLVE URL REQUEST ===')
    console.log('Input URL:', url)

    let finalUrl = url
    let placeId = null

    // naver.me 단축 URL인 경우 원본 URL로 변환
    if (url.includes('naver.me/')) {
      try {
        finalUrl = await resolveShortUrl(url)
        console.log('Resolved URL:', finalUrl)
      } catch (error) {
        console.error('Error resolving short URL:', error)
        return NextResponse.json(
          { success: false, error: '단축 URL을 변환할 수 없습니다.' },
          { status: 400 }
        )
      }
    }

    // Place ID 추출
    placeId = extractPlaceId(finalUrl)
    
    if (!placeId) {
      return NextResponse.json(
        { success: false, error: '유효한 스마트플레이스 URL이 아닙니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        originalUrl: url,
        resolvedUrl: finalUrl,
        placeId: placeId
      }
    })
  } catch (error: any) {
    console.error('Error in resolve URL:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'URL 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}