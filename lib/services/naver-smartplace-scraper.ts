/**
 * 네이버 스마트플레이스 순위 추적 스크래퍼
 * Place ID 기반 정확한 순위 추적 시스템
 */

import { chromium, Browser, Page } from 'playwright'

interface SmartPlaceRankings {
  organicRank: number | null  // 오가닉 순위 (1-210)
  adRank: number | null       // 광고 순위
  found: boolean
  timestamp: Date
  placeTitle?: string         // 검색된 업체명
  topTenPlaces?: Array<{      // 상위 10개 업체 정보
    rank: number
    placeName: string
    placeId: string
    isAd: boolean
  }>
}

interface SmartPlaceInfo {
  placeId: string
  placeName: string
  placeUrl?: string
}

export class NaverSmartPlaceScraper {
  private browser: Browser | null = null
  private page: Page | null = null
  
  constructor() {
    // Browser will be initialized when needed
  }
  
  private async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
    if (!this.page) {
      this.page = await this.browser.newPage()
    }
    return this.page
  }
  
  /**
   * URL에서 Place ID 추출
   * 6가지 URL 패턴 처리:
   * - place.naver.com/restaurant/1632045
   * - map.naver.com/.../place/1632045
   * - naver.me/xxxxx → 리다이렉트 추적
   */
  async extractPlaceId(url: string): Promise<string | null> {
    try {
      // naver.me 단축 URL인 경우 리다이렉트 추적
      if (url.includes('naver.me')) {
        const page = await this.ensureBrowser()
        await page.goto(url, { waitUntil: 'networkidle' })
        await page.waitForTimeout(1000)
        
        const finalUrl = page.url()
        url = finalUrl // 리다이렉트된 최종 URL 사용
      }
      
      // Place ID 추출 정규식
      const patterns = [
        /place\.naver\.com\/.*?\/(\d+)/,
        /map\.naver\.com\/.*?place\/(\d+)/,
        /place\/(\d+)/,
        /placeId=(\d+)/,
        /id=(\d+)/
      ]
      
      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) {
          return match[1]
        }
      }
      
      // URL에서 직접 찾지 못한 경우, 페이지 접속해서 추출
      const page = await this.ensureBrowser()
      await page.goto(url, { waitUntil: 'networkidle' })
      
      // iframe 내부에서 Place ID 찾기
      const placeId = await page.evaluate(() => {
        // entryIframe 우선 확인
        const entryIframe = document.querySelector('#entryIframe') as HTMLIFrameElement
        if (entryIframe?.contentWindow) {
          const iframeDoc = entryIframe.contentDocument || entryIframe.contentWindow.document
          const urlElement = iframeDoc.querySelector('[data-place-id]')
          if (urlElement) {
            return urlElement.getAttribute('data-place-id')
          }
        }
        
        // data-place-id 속성 확인
        const placeElement = document.querySelector('[data-place-id]')
        if (placeElement) {
          return placeElement.getAttribute('data-place-id')
        }
        
        // URL에서 추출
        const urlMatch = window.location.href.match(/(\d{7,})/)
        if (urlMatch) {
          return urlMatch[1]
        }
        
        return null
      })
      
      return placeId
      
    } catch (error) {
      console.error('Place ID 추출 실패:', error)
      return null
    }
  }
  
  /**
   * 스마트플레이스 업체명 추출
   * iframe 처리 우선순위: #entryIframe → 전체 iframe → 메인 페이지
   */
  async getPlaceName(url: string): Promise<string | null> {
    try {
      const page = await this.ensureBrowser()
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
      
      // iframe 내부에서 업체명 찾기
      const placeName = await page.evaluate(() => {
        // 1차: entryIframe 직접 접근
        const entryIframe = document.querySelector('#entryIframe') as HTMLIFrameElement
        if (entryIframe?.contentWindow) {
          try {
            const iframeDoc = entryIframe.contentDocument || entryIframe.contentWindow.document
            const titleElement = iframeDoc.querySelector('#_title > div > span.GHAhO')
            if (titleElement) {
              return titleElement.textContent?.trim() || null
            }
          } catch (e) {
            console.log('iframe 접근 실패:', e)
          }
        }
        
        // 2차: 모든 iframe 순회
        const iframes = document.querySelectorAll('iframe')
        for (const iframe of iframes) {
          try {
            const iframeDoc = (iframe as HTMLIFrameElement).contentDocument
            if (iframeDoc) {
              const titleElement = iframeDoc.querySelector('#_title > div > span.GHAhO')
              if (titleElement) {
                return titleElement.textContent?.trim() || null
              }
            }
          } catch (e) {
            continue
          }
        }
        
        // 3차: 메인 페이지에서 찾기
        const mainTitle = document.querySelector('.GHAhO, .place_name, [class*="place_name"], h1')
        if (mainTitle) {
          return mainTitle.textContent?.trim() || null
        }
        
        return null
      })
      
      return placeName
      
    } catch (error) {
      console.error('업체명 추출 실패:', error)
      return null
    }
  }
  
  /**
   * 스마트플레이스 순위 추적
   * 최대 210개 결과 스크롤링 + 중복 제거
   */
  async trackRanking(
    keyword: string, 
    placeInfo: SmartPlaceInfo
  ): Promise<SmartPlaceRankings> {
    try {
      const page = await this.ensureBrowser()
      
      // 위치 권한 설정
      await page.context().grantPermissions(['geolocation'])
      await page.context().setGeolocation({ latitude: 37.5665, longitude: 126.9780 })
      
      // 검색 페이지 이동
      const searchUrl = `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}`
      await page.goto(searchUrl, { waitUntil: 'networkidle' })
      await page.waitForTimeout(3000)
      
      // 순위 추적 시작
      let organicRank = 0
      let adRank = 0
      let overallRank = 0
      let found = false
      let foundTitle = ''
      let foundOrganicRank: number | null = null
      let foundAdRank: number | null = null
      const seenPlaceIds = new Set<string>()
      const topTenPlaces: Array<{ rank: number; placeName: string; placeId: string; isAd: boolean }> = []
      
      // 최대 210개까지 스크롤하며 검색
      while (seenPlaceIds.size < 210) {
        // 현재 보이는 결과 추출
        const results = await page.evaluate(() => {
          const items: Array<{
            placeId: string
            title: string
            isAd: boolean
          }> = []
          
          // 모든 장소 아이템 선택
          const placeItems = document.querySelectorAll('li[data-laim-exp-id]')
          
          placeItems.forEach(item => {
            const dataLaimExpId = item.getAttribute('data-laim-exp-id') || ''
            const titleElement = item.querySelector('.place_name, .YwYLL')
            const title = titleElement?.textContent?.trim() || ''
            
            // Place ID 추출 (숫자 부분)
            const placeIdMatch = dataLaimExpId.match(/(\d+)\*/)?.[1]
            if (placeIdMatch) {
              // 광고 여부 판단 (*e = 광고, *s = 오가닉)
              const isAd = dataLaimExpId.endsWith('*e')
              
              items.push({
                placeId: placeIdMatch,
                title: title,
                isAd: isAd
              })
            }
          })
          
          return items
        })
        
        // 결과 처리
        for (const result of results) {
          // 중복 제거
          if (seenPlaceIds.has(result.placeId)) {
            continue
          }
          seenPlaceIds.add(result.placeId)
          
          // 순위 카운트
          if (result.isAd) {
            adRank++
          } else {
            organicRank++
          }
          overallRank++
          
          // 상위 10개 업체 저장
          if (topTenPlaces.length < 10 && !result.isAd) {
            topTenPlaces.push({
              rank: organicRank,
              placeName: result.title,
              placeId: result.placeId,
              isAd: result.isAd
            })
          }
          
          // Place ID 매칭
          if (result.placeId === placeInfo.placeId) {
            if (!found) {
              found = true
              foundTitle = result.title
              if (result.isAd) {
                foundAdRank = adRank
              } else {
                foundOrganicRank = organicRank
              }
            }
          }
          
          // 업체명 매칭 (카테고리 제거 후 비교)
          const cleanedTitle = this.cleanPlaceTitle(result.title)
          const targetTitle = this.cleanPlaceTitle(placeInfo.placeName)
          
          if (cleanedTitle === targetTitle && !found) {
            found = true
            foundTitle = result.title
            if (result.isAd) {
              foundAdRank = adRank
            } else {
              foundOrganicRank = organicRank
            }
          }
        }
        
        // 상위 10개 업체만 수집하면 중단 (found 여부와 관계없이 계속 수집)
        if (topTenPlaces.length >= 10 && found) break
        
        // 더 이상 결과가 없으면 중단
        const hasMoreResults = await page.evaluate(() => {
          const items = document.querySelectorAll('li[data-laim-exp-id]')
          return items.length > 0
        })
        
        if (!hasMoreResults) break
        
        // 스크롤
        await page.evaluate(() => {
          window.scrollBy(0, 2000)
        })
        await page.waitForTimeout(2000)
        
        // 무한 루프 방지
        if (seenPlaceIds.size >= 210) break
      }
      
      return {
        organicRank: foundOrganicRank,
        adRank: foundAdRank,
        found: found,
        timestamp: new Date(),
        placeTitle: foundTitle || undefined,
        topTenPlaces: topTenPlaces
      }
      
    } catch (error) {
      console.error('순위 추적 실패:', error)
      return {
        organicRank: null,
        adRank: null,
        found: false,
        timestamp: new Date(),
        topTenPlaces: []
      }
    }
  }
  
  /**
   * 업체명 정규화 (카테고리 태그 제거)
   * "미래엔아이 센터영어톡톡영어교육" → "미래엔아이 센터영어"
   */
  private cleanPlaceTitle(title: string): string {
    if (!title) return ''
    
    // "톡톡" 이후 모든 텍스트 제거
    const tokTokIndex = title.indexOf('톡톡')
    if (tokTokIndex !== -1) {
      title = title.substring(0, tokTokIndex).trim()
    }
    
    // 끝에 있는 카테고리 패턴 제거
    const categoryPatterns = [
      /영어교육$/,
      /수학교육$/,
      /학원$/,
      /교습소$/,
      /공부방$/,
      /센터$/,
      /아카데미$/
    ]
    
    for (const pattern of categoryPatterns) {
      title = title.replace(pattern, '').trim()
    }
    
    return title.trim()
  }
  
  async close() {
    if (this.page) {
      await this.page.close()
      this.page = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}