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

export class WorkingNaverScraper {
  private browser: Browser | null = null

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: false, // Changed to false to avoid detection
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      })
    }
  }

  async trackRanking(
    keyword: string,
    targetPlace: { placeId: string; placeName: string }
  ): Promise<SmartPlaceRankingResult> {
    let page: Page | null = null
    
    try {
      if (!this.browser) {
        await this.init()
      }
      
      page = await this.browser!.newPage({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })
      
      console.log(`Searching for: ${keyword}, Target: ${targetPlace.placeName} (${targetPlace.placeId})`)
      
      // 네이버 플레이스 맵 직접 검색
      const searchUrl = `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}`
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })
      
      // 검색 결과 로딩 대기 - 요소가 나타날 때까지 대기
      try {
        await page.waitForSelector('a.place_bluelink', { timeout: 10000 })
      } catch (e) {
        console.log('place_bluelink not found, trying alternative selectors...')
        // 대체 선택자 시도
        await page.waitForSelector('#_pcmap_list_scroll_container', { timeout: 5000 })
      }
      
      // 추가 대기
      await page.waitForTimeout(2000)
      
      // 검색 결과 추출 - 링크에서 Place ID 가져오기
      const results = await page.evaluate(() => {
        const items: any[] = []
        
        // place_bluelink 클래스를 가진 모든 링크 찾기
        const links = document.querySelectorAll('a.place_bluelink')
        console.log(`Found ${links.length} place links`)
        
        links.forEach((link, index) => {
          const anchor = link as HTMLAnchorElement
          const placeName = link.textContent?.trim() || ''
          let placeId = ''
          
          // href에서 place ID 추출
          if (anchor.href) {
            const match = anchor.href.match(/\/place\/(\d+)/)
            if (match) {
              placeId = match[1]
            }
          }
          
          // 광고 여부 확인 - 링크의 부모 요소에서 광고 표시 찾기
          const parentLi = link.closest('li')
          const isAd = parentLi ? 
            (parentLi.querySelector('.spnew_ad, .ad_badge, .ico_ad') !== null) : 
            false
          
          if (placeName && placeId) {
            items.push({
              placeName: placeName.replace(/톡톡.*$/, '').trim(),
              placeId,
              isAd,
              rank: index + 1
            })
          }
        })
        
        return items
      })
      
      console.log(`Found ${results.length} results:`)
      results.forEach(r => {
        console.log(`  ${r.rank}. ${r.placeName} (ID: ${r.placeId}, Ad: ${r.isAd})`)
      })
      
      // 결과 분석
      let organicRank: number | null = null
      let adRank: number | null = null
      let found = false
      const topTenPlaces: any[] = []
      
      let organicCount = 0
      let adCount = 0
      
      for (const result of results) {
        // 광고/오가닉 구분 카운트
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
        
        // Place ID로 매칭
        if (result.placeId === targetPlace.placeId) {
          found = true
          if (result.isAd) {
            adRank = adCount
          } else {
            organicRank = organicCount
          }
          console.log(`✓ Found by ID at rank ${result.rank} - Organic: ${organicRank}, Ad: ${adRank}`)
        }
      }
      
      // Place ID로 못찾았으면 이름으로 매칭
      if (!found && results.length > 0) {
        organicCount = 0
        adCount = 0
        
        for (const result of results) {
          if (result.isAd) {
            adCount++
          } else {
            organicCount++
          }
          
          // 이름 정규화 비교
          const normalize = (str: string) => {
            return str
              .replace(/\s+/g, '')
              .replace(/[^가-힣a-zA-Z0-9]/g, '')
              .toLowerCase()
          }
          
          const normalizedResult = normalize(result.placeName)
          const normalizedTarget = normalize(targetPlace.placeName)
          
          if (normalizedResult.includes(normalizedTarget) || 
              normalizedTarget.includes(normalizedResult)) {
            found = true
            if (result.isAd) {
              adRank = adCount
            } else {
              organicRank = organicCount
            }
            console.log(`✓ Found by name at rank ${result.rank} - Organic: ${organicRank}, Ad: ${adRank}`)
            break
          }
        }
      }
      
      const trackingResult = {
        organicRank,
        adRank,
        found,
        timestamp: new Date(),
        topTenPlaces
      }
      
      console.log('Final result:', trackingResult)
      
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