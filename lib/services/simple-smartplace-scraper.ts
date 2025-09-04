import { chromium, Browser, Page } from 'playwright'

export interface SmartPlaceRankingResult {
  organicRank: number | null
  adRank: number | null
  found: boolean
  timestamp: Date
  topTenPlaces?: Array<{
    rank: number
    placeName: string
    placeId: string
    isAd: boolean
  }>
}

export class SimpleSmartPlaceScraper {
  private browser: Browser | null = null

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
  }

  async trackRanking(
    keyword: string,
    targetPlace: { placeId: string; placeName: string }
  ): Promise<SmartPlaceRankingResult> {
    let page: Page | null = null
    
    try {
      // 브라우저 초기화
      if (!this.browser) {
        await this.init()
      }
      
      // 새 페이지 생성
      page = await this.browser!.newPage()
      
      console.log(`Searching for: ${keyword}, Target: ${targetPlace.placeName} (${targetPlace.placeId})`)
      
      // 네이버 장소 검색 URL 직접 사용
      const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(keyword)}`
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      })
      
      // iframe 대기
      await page.waitForTimeout(3000)
      
      // iframe 내부의 검색 결과 가져오기
      const frame = page.frames().find(f => f.url().includes('search.naver.com'))
      
      let results: any[] = []
      if (frame) {
        // iframe 내부에서 검색 결과 추출
        results = await frame.evaluate(() => {
          const items: any[] = []
          const placeElements = document.querySelectorAll('.YwYLL')
          
          placeElements.forEach((el, index) => {
            const placeNameEl = el.querySelector('.place_bluelink')
            const linkEl = el.querySelector('a')
            const href = linkEl?.getAttribute('href') || ''
            
            // Place ID 추출
            const placeIdMatch = href.match(/place\/(\d+)/)
            const placeId = placeIdMatch ? placeIdMatch[1] : ''
            
            // 광고 여부 확인
            const isAd = el.closest('.place_ad_list_scroll') !== null
            
            if (placeId && placeNameEl) {
              items.push({
                placeId,
                placeName: placeNameEl.textContent?.trim() || '',
                isAd,
                rank: index + 1
              })
            }
          })
          
          return items
        })
      } else {
        // iframe이 없으면 메인 페이지에서 검색
        results = await page.evaluate(() => {
          const items: any[] = []
          const searchResults = document.querySelectorAll('#_pcmap_list_scroll_container li')
          
          searchResults.forEach((el, index) => {
            const titleEl = el.querySelector('span.place_bluelink')
            const dataId = el.getAttribute('data-cid') || ''
            
            if (titleEl && dataId) {
              items.push({
                placeId: dataId,
                placeName: titleEl.textContent?.trim() || '',
                isAd: false,
                rank: index + 1
              })
            }
          })
          
          return items
        })
      }
      
      console.log(`Found ${results.length} results`)
      
      // 결과 분석
      let organicRank: number | null = null
      let adRank: number | null = null
      let found = false
      const topTenPlaces: any[] = []
      
      let organicCount = 0
      let adCount = 0
      
      for (const result of results) {
        if (result.isAd) {
          adCount++
        } else {
          organicCount++
        }
        
        // Top 10 수집
        if (topTenPlaces.length < 10) {
          topTenPlaces.push({
            rank: topTenPlaces.length + 1,
            placeName: result.placeName,
            placeId: result.placeId,
            isAd: result.isAd
          })
        }
        
        // 타겟 매칭
        if (result.placeId === targetPlace.placeId) {
          found = true
          if (result.isAd) {
            adRank = adCount
          } else {
            organicRank = organicCount
          }
          console.log(`Found target at organic: ${organicRank}, ad: ${adRank}`)
        }
        
        // 이름으로도 매칭 시도
        const cleanName = (name: string) => name.replace(/[^가-힣a-zA-Z0-9]/g, '')
        if (!found && cleanName(result.placeName) === cleanName(targetPlace.placeName)) {
          found = true
          if (result.isAd) {
            adRank = adCount
          } else {
            organicRank = organicCount
          }
          console.log(`Found by name at organic: ${organicRank}, ad: ${adRank}`)
        }
      }
      
      const trackingResult = {
        organicRank,
        adRank,
        found,
        timestamp: new Date(),
        topTenPlaces
      }
      
      console.log('Tracking result:', trackingResult)
      
      return trackingResult
      
    } catch (error) {
      console.error('Tracking failed:', error)
      return {
        organicRank: null,
        adRank: null,
        found: false,
        timestamp: new Date(),
        topTenPlaces: []
      }
    } finally {
      if (page) {
        await page.close()
      }
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}