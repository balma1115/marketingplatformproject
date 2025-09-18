import { NextResponse } from 'next/server'
import axios from 'axios'
import * as crypto from 'crypto'
import { chromium } from 'playwright'

// 네이버 검색광고 API 설정
const API_KEY = process.env.NAVER_ADS_API_KEY || ''
const SECRET_KEY = process.env.NAVER_ADS_SECRET_KEY || ''
const CUSTOMER_ID = process.env.NAVER_ADS_CUSTOMER_ID || ''
const BASE_URL = 'https://api.naver.com'

// API 서명 생성
function generateSignature(timestamp: string, method: string, path: string) {
  const message = `${timestamp}.${method}.${path}`
  return crypto.createHmac('sha256', SECRET_KEY)
    .update(message)
    .digest('base64')
}

// 토큰 분리 함수
function tokenizeKeyword(keyword: string): string[] {
  const tokens = keyword.split(/\s+/)
  const uniqueTokens: string[] = []
  
  // 개별 토큰
  tokens.forEach(token => {
    if (token && !uniqueTokens.includes(token)) {
      uniqueTokens.push(token)
    }
  })
  
  // 2개 조합
  for (let i = 0; i < tokens.length - 1; i++) {
    const combination = `${tokens[i]} ${tokens[i + 1]}`
    if (!uniqueTokens.includes(combination)) {
      uniqueTokens.push(combination)
    }
  }
  
  return uniqueTokens
}

// 키워드 그룹화 함수 - 변환된 형식 사용
function groupKeywords(relatedKeywords: any[], tokenCombinations: string[]) {
  // 먼저 키워드를 변환된 형식으로 매핑
  const transformedKeywords = relatedKeywords.map(item => {
    const pcCount = parseInt(item.monthlyPcQcCnt) || 0
    const mobileCount = parseInt(item.monthlyMobileQcCnt) || 0

    return {
      keyword: item.relKeyword,
      monthlySearchVolume: pcCount + mobileCount,
      monthlyPcQcCnt: pcCount,
      monthlyMobileQcCnt: mobileCount,
      compIdx: item.compIdx || '낮음',
      isAutocomplete: item.isAutocomplete || false,
      groups: [] as string[]
    }
  })

  const keywordGroups: Record<string, any[]> = {
    '전체': transformedKeywords
  }

  tokenCombinations.forEach(token => {
    keywordGroups[token] = transformedKeywords.filter(item => {
      return item.keyword.includes(token)
    })
  })

  // 각 키워드에 그룹 정보 추가
  transformedKeywords.forEach(keyword => {
    keyword.groups = tokenCombinations.filter(token =>
      keyword.keyword.includes(token)
    )
  })

  return { keywordGroups, tokenCombinations }
}

// 네이버 블로그 상위 포스트 가져오기
async function getTopBlogPosts(keyword: string) {
  let browser = null
  
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    const page = await context.newPage()
    // naverkeyword.md 기준 URL 형식
    const searchUrl = `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(keyword)}`
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000
    })
    
    // 페이지 로딩 대기
    await page.waitForTimeout(3000)
    
    // 스크롤하여 더 많은 컨텐츠 로드
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await page.waitForTimeout(2000)
    
    // 블로그 포스트 수집 (개선된 날짜 선택자 사용)
    const posts = await page.evaluate(() => {
      const results: any[] = []

      // main_pack > section > div.api_subject_bx > ul > li 형식으로 접근
      const mainPack = document.querySelector('#main_pack')
      if (mainPack) {
        const listItems = mainPack.querySelectorAll('section > div.api_subject_bx > ul > li')
        console.log(`Found ${listItems.length} blog list items in main_pack`)

        listItems.forEach((li, index) => {
          if (results.length >= 20) return

          // 광고 체크
          const isAd = li.classList.contains('spblog') ||
                       li.querySelector('.link_ad') !== null ||
                       li.querySelector('[data-cr-area*="nbl*a"]') !== null

          if (isAd) {
            console.log(`Item ${index + 1}: Skipping ad`)
            return
          }

          // 제목과 링크
          const titleLink = li.querySelector('.title_link, .total_tit a') as HTMLAnchorElement
          if (!titleLink) return

          const title = titleLink.innerText?.trim() || titleLink.textContent?.trim() || ''
          if (!title) return

          // 블로거 정보
          const userBox = li.querySelector('.user_box')
          let bloggerName = '네이버 블로거'
          let postdate = ''

          if (userBox) {
            // 블로거 이름
            const nameEl = userBox.querySelector('.name')
            const linkEl = userBox.querySelector('a')
            bloggerName = nameEl?.textContent?.trim() ||
                         linkEl?.textContent?.trim() ||
                         '네이버 블로거'

            // 날짜 정보 - user_box_inner > div > span 선택자 사용
            const dateSpan = userBox.querySelector('.user_box_inner > div > span')
            if (dateSpan) {
              postdate = dateSpan.textContent?.trim() || ''
            }

            // 날짜가 없으면 다른 방법으로 시도
            if (!postdate) {
              const userBoxTexts = userBox.querySelectorAll('span, em')
              for (const elem of Array.from(userBoxTexts)) {
                const text = (elem as HTMLElement).innerText || ''
                if (text.match(/\d{4}\.\d{2}\.\d{2}/) ||
                    text.match(/\d+일\s*전/) ||
                    text.match(/\d+시간\s*전/) ||
                    text.match(/어제/) ||
                    text.match(/오늘/)) {
                  postdate = text.trim()
                  break
                }
              }
            }
          }

          console.log(`Item ${index + 1}: Found date: ${postdate}`)

          results.push({
            title: title,
            link: titleLink.href,
            bloggername: bloggerName,
            postdate: postdate || '날짜 정보 없음',
            rank: index + 1
          })
        })
      }

      // view_wrap 방식 (폴백)
      if (results.length < 20) {
        const allWraps = document.querySelectorAll('.view_wrap')
        console.log(`Fallback: Found ${allWraps.length} view_wrap elements`)

        allWraps.forEach((wrap, index) => {
          if (results.length >= 20) return

          // 이미 처리된 항목인지 확인
          const titleLink = wrap.querySelector('.title_link') as HTMLAnchorElement
          if (titleLink && results.find(r => r.link === titleLink.href)) {
            return
          }

          // 파워링크 광고 체크
          const parentLi = wrap.closest('li')
          const isAd = parentLi?.classList.contains('spblog') ||
                       wrap.querySelector('.link_ad') !== null ||
                       wrap.querySelector('[data-cr-area*="nbl*a"]') !== null

          if (isAd) return

          // 제목과 링크 찾기
          const titleAreaLink = wrap.querySelector('.title_area a') as HTMLAnchorElement
          const mainLink = titleLink || titleAreaLink

          if (!mainLink) return

          const title = mainLink.innerText?.trim() || mainLink.textContent?.trim() || ''
          if (!title) return

          // 블로거 정보와 날짜
          const userInfo = wrap.querySelector('.user_info')
          let bloggerName = '네이버 블로거'
          let postdate = ''

          if (userInfo) {
            const nameEl = userInfo.querySelector('.name')
            const linkEl = userInfo.querySelector('a')
            bloggerName = nameEl?.textContent?.trim() ||
                         linkEl?.textContent?.trim() ||
                         '네이버 블로거'

            // 날짜 찾기
            const userInfoTexts = userInfo.querySelectorAll('span, em')
            for (const elem of Array.from(userInfoTexts)) {
              const text = (elem as HTMLElement).innerText || ''
              if (text.match(/\d{4}\.\d{2}\.\d{2}/) ||
                  text.match(/\d+일\s*전/) ||
                  text.match(/\d+시간\s*전/) ||
                  text.match(/어제/) ||
                  text.match(/오늘/)) {
                postdate = text.trim()
                break
              }
            }
          }

          results.push({
            title: title,
            link: mainLink.href,
            bloggername: bloggerName,
            postdate: postdate || '날짜 정보 없음',
            rank: results.length + 1
          })
        })
      }

      return results
    })
    
    console.log(`Collected ${posts.length} blog posts`)
    
    return posts
    
  } catch (error) {
    console.error('블로그 포스트 수집 오류:', error)
    return []
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json()
    
    if (!keyword) {
      return NextResponse.json({ error: '키워드를 입력해주세요' }, { status: 400 })
    }

    // API 키 확인
    if (!API_KEY || !SECRET_KEY || !CUSTOMER_ID) {
      console.error('Missing API credentials:', {
        API_KEY: !!API_KEY,
        SECRET_KEY: !!SECRET_KEY,
        CUSTOMER_ID: !!CUSTOMER_ID
      })
      return NextResponse.json({ 
        error: 'API 설정이 올바르지 않습니다. 환경변수를 확인해주세요.' 
      }, { status: 500 })
    }

    // 1. 키워드 통계 가져오기
    const timestamp = Date.now().toString()
    const method = 'GET'
    const path = '/keywordstool'
    const signature = generateSignature(timestamp, method, path)
    
    let statsResponse
    try {
      statsResponse = await axios({
        method: 'GET',
        url: `${BASE_URL}${path}`,
        params: {
          hintKeywords: keyword,
          showDetail: '1'
        },
        headers: {
          'X-Timestamp': timestamp,
          'X-API-KEY': API_KEY,
          'X-Customer': CUSTOMER_ID,
          'X-Signature': signature
        }
      })
    } catch (apiError: any) {
      console.error('Naver API Error:', apiError.response?.status, apiError.response?.data)
      if (apiError.response?.status === 403) {
        return NextResponse.json({ 
          error: 'API 인증 실패. 네이버 검색광고 API 키를 확인해주세요.' 
        }, { status: 403 })
      }
      throw apiError
    }

    const keywordData = statsResponse.data.keywordList?.[0] || {}
    console.log('Main keyword data:', keywordData)

    // 2. 연관 키워드 가져오기
    let relatedResponse
    try {
      relatedResponse = await axios({
        method: 'GET',
        url: `${BASE_URL}${path}`,
        params: {
          hintKeywords: keyword,
          showDetail: '1'
          // returnTp 파라미터 제거 - 네이버 API에서 지원하지 않을 수 있음
        },
        headers: {
          'X-Timestamp': timestamp,
          'X-API-KEY': API_KEY,
          'X-Customer': CUSTOMER_ID,
          'X-Signature': signature
        }
      })
    } catch (relatedError: any) {
      console.error('Related keywords API Error:', relatedError.response?.status, relatedError.response?.data)
      // 연관 키워드 실패 시 기본 키워드만 사용
      relatedResponse = { data: { keywordList: [keywordData] } }
    }

    const relatedKeywords = relatedResponse.data.keywordList || []
    console.log('Related keywords count:', relatedKeywords.length)
    if (relatedKeywords.length > 0) {
      console.log('Sample related keyword:', relatedKeywords[0])
    }

    // 자동완성 키워드 가져오기
    const autocompleteKeywords = await getAutocompleteKeywords(keyword)
    
    // 연관 키워드와 자동완성 키워드 병합
    const allRelatedKeywords = [...relatedKeywords]
    
    // 자동완성 키워드 중 연관 키워드에 없는 것만 추가
    for (const autoKeyword of autocompleteKeywords) {
      if (!allRelatedKeywords.find(k => k.relKeyword === autoKeyword)) {
        allRelatedKeywords.push({
          relKeyword: autoKeyword,
          monthlyPcQcCnt: 0,
          monthlyMobileQcCnt: 0,
          monthlyAvePcClkCnt: 0,
          monthlyAveMobileClkCnt: 0,
          monthlyAvePcCtr: 0,
          monthlyAveMobileCtr: 0,
          plAvgDepth: 0,
          compIdx: '낮음',
          isAutocomplete: true
        })
      }
    }

    // 키워드 그룹화
    const tokenCombinations = tokenizeKeyword(keyword)
    const { keywordGroups } = groupKeywords(allRelatedKeywords, tokenCombinations)

    // 연관 키워드 상세 정보는 '전체' 그룹에서 가져옴 (이미 변환됨)
    const relatedKeywordsDetail = keywordGroups['전체'] || []

    // 3. 블로그 상위 포스트 가져오기 (선택적)
    let topBlogPosts = []
    try {
      topBlogPosts = await getTopBlogPosts(keyword)
    } catch (blogError) {
      console.warn('블로그 포스트 수집 건너뜀:', blogError)
      // 블로그 수집 실패해도 계속 진행
    }

    const result = {
      keyword,
      stats: {
        monthlyPcQcCnt: parseInt(keywordData.monthlyPcQcCnt) || 0,
        monthlyMobileQcCnt: parseInt(keywordData.monthlyMobileQcCnt) || 0,
        monthlyAvePcClkCnt: parseFloat(keywordData.monthlyAvePcClkCnt) || 0,
        monthlyAveMobileClkCnt: parseFloat(keywordData.monthlyAveMobileClkCnt) || 0,
        monthlyAvePcCtr: parseFloat(keywordData.monthlyAvePcCtr) || 0,
        monthlyAveMobileCtr: parseFloat(keywordData.monthlyAveMobileCtr) || 0,
        plAvgDepth: parseInt(keywordData.plAvgDepth) || 0,
        compIdx: keywordData.compIdx || '낮음'
      },
      relatedKeywords: relatedKeywordsDetail.map(item => item.keyword),
      relatedKeywordsDetail,
      keywordGroups,
      tokenCombinations,
      topBlogPosts
    }

    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error('키워드 분석 오류:', error)
    return NextResponse.json(
      { 
        error: '키워드 분석 중 오류가 발생했습니다',
        details: error.response?.data || error.message 
      }, 
      { status: 500 }
    )
  }
}

// 자동완성 키워드 가져오기
async function getAutocompleteKeywords(keyword: string): Promise<string[]> {
  try {
    const response = await axios.get('https://ac.search.naver.com/nx/ac', {
      params: {
        q: keyword,
        con: '1',
        frm: 'nv',
        ans: '2',
        r_format: 'json',
        r_enc: 'UTF-8',
        r_unicode: '0',
        t_koreng: '1',
        run: '2',
        rev: '4',
        q_enc: 'UTF-8',
        st: '100'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    const items = response.data.items?.[0] || []
    return items.map((item: any[]) => item[0])
  } catch (error) {
    console.error('자동완성 키워드 가져오기 오류:', error)
    return []
  }
}