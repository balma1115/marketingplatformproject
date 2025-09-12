import { chromium, Browser, Page, BrowserContext } from 'playwright'
import PQueue from 'p-queue'

export interface SmartPlaceRankingResult {
  organicRank: number | null
  adRank: number | null
  found: boolean
  timestamp: Date
  totalResults?: number
  topTenPlaces?: Array<{
    rank: number
    placeName: string
    placeId: string
    isAd: boolean
  }>
}

// Browser 싱글톤 관리
class BrowserManager {
  private static instance: BrowserManager
  private browser: Browser | null = null
  private initPromise: Promise<Browser> | null = null

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager()
    }
    return BrowserManager.instance
  }

  async getBrowser(): Promise<Browser> {
    // 이미 초기화 중이면 기다림
    if (this.initPromise) {
      return this.initPromise
    }

    // 브라우저가 없거나 닫혀있으면 새로 생성
    if (!this.browser || !this.browser.isConnected()) {
      this.initPromise = this.createBrowser()
      this.browser = await this.initPromise
      this.initPromise = null
    }

    return this.browser
  }

  private async createBrowser(): Promise<Browser> {
    return await chromium.launch({
      headless: false, // 네이버 봇 감지 방지
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    })
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

// Export BrowserManager for external cleanup
export { BrowserManager }

export class ImprovedNaverScraperV3 {
  private browserManager: BrowserManager
  private queue: PQueue

  constructor() {
    this.browserManager = BrowserManager.getInstance()
    // 동시에 3개 키워드만 처리
    this.queue = new PQueue({ concurrency: 3 })
  }

  // 이름 정규화 함수
  private normalizeName(name: string): string {
    return name
      .replace(/\s+/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '')
      .toLowerCase()
  }

  // 스마트플레이스에 등록된 이름만 사용 (추출 금지)
  private extractKeywords(placeName: string): string[] {
    // 오직 전체 이름만 사용
    return [this.normalizeName(placeName)]
  }

  // 페이지 전환 및 결과 수집
  private async navigateToPage(frame: Page | any, pageNumber: number): Promise<boolean> {
    try {
      if (pageNumber === 1) {
        return true // 이미 1페이지
      }

      console.log(`Navigating to page ${pageNumber}...`)
      
      const clicked = await frame.evaluate((pageNum: number) => {
        // 페이지 버튼 찾기
        const pageSelectors = [
          null, // 1페이지는 기본
          '#app-root > div > div.XUrfU > div.zRM9F > a:nth-child(3)', // 2페이지
          '#app-root > div > div.XUrfU > div.zRM9F > a:nth-child(4)', // 3페이지
        ]
        
        if (pageNum <= 3 && pageSelectors[pageNum - 1]) {
          const pageButton = document.querySelector(pageSelectors[pageNum - 1])
          if (pageButton && !(pageButton as HTMLElement).classList.contains('fvwqf')) {
            (pageButton as HTMLElement).click()
            return true
          }
        }
        
        // 다음 페이지 버튼 시도
        if (pageNum === 2) {
          const nextButton = document.querySelector('#app-root > div > div.XUrfU > div.zRM9F > a:nth-child(7)')
          if (nextButton && !(nextButton as HTMLElement).classList.contains('fvwqf')) {
            (nextButton as HTMLElement).click()
            return true
          }
        }
        
        return false
      }, pageNumber)
      
      if (clicked) {
        await frame.waitForTimeout(3000) // 페이지 로딩 대기
        return true
      }
      
      return false
    } catch (error) {
      console.error(`Failed to navigate to page ${pageNumber}:`, error)
      return false
    }
  }

  // 현재 페이지에서 스크롤하여 모든 결과 로드
  private async scrollToLoadMore(frame: Page | any): Promise<void> {
    let previousCount = 0
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      const currentCount = await frame.evaluate(() => {
        return document.querySelectorAll('#_pcmap_list_scroll_container > ul > li').length
      })
      
      if (currentCount >= 70 || currentCount === previousCount) {
        break
      }
      
      previousCount = currentCount
      
      // 스크롤 다운
      await frame.evaluate(() => {
        const container = document.querySelector('#_pcmap_list_scroll_container')
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          })
        }
      })
      
      await frame.waitForTimeout(1500)
      
      // "더보기" 버튼 찾아서 클릭
      const moreButton = await frame.$('button:has-text("더보기"), a:has-text("더보기")')
      if (moreButton) {
        await moreButton.click()
        await frame.waitForTimeout(1500)
      }
      
      attempts++
    }
  }
  
  // 현재 페이지의 결과 수집
  private async collectPageResults(frame: Page | any, startRank: number = 0): Promise<any[]> {
    return await frame.evaluate((startRank) => {
      const items: any[] = []
      const listItems = document.querySelectorAll('#_pcmap_list_scroll_container > ul > li')
      console.log(`Found ${listItems.length} items on current page`)
      
      listItems.forEach((item: Element, index: number) => {
        // 장소 이름 추출
        let placeName = ''
        const nameElement = item.querySelector('div.qbGlu > div.ouxiq > div.ApCpt > a > span.YwYLL')
        if (nameElement) {
          placeName = nameElement.textContent?.trim() || ''
        }
        
        if (!placeName) return
        
        // 광고 여부 확인
        let isAd = false
        const adElement = item.querySelector('div.iqAyT.JKKhR > a.gU6bV._DHlh')
        if (adElement) isAd = true
        
        const itemHTML = (item as HTMLElement).innerHTML
        if (itemHTML.includes('광고')) isAd = true
        
        const dataExpId = item.getAttribute('data-laim-exp-id')
        if (dataExpId && dataExpId.endsWith('*e')) isAd = true
        
        // Place ID 추출 (개선된 방법)
        let placeId = ''
        
        // 방법 1: href 속성에서 직접 추출
        const linkElements = item.querySelectorAll('a')
        for (const link of linkElements) {
          const href = (link as HTMLAnchorElement).href
          if (href && href.includes('/place/')) {
            const match = href.match(/place\/(\d+)/)
            if (match && match[1]) {
              placeId = match[1]
              break
            }
          }
        }
        
        // 방법 2: data 속성에서 추출 (백업)
        if (!placeId) {
          const dataId = item.getAttribute('data-id') || item.getAttribute('data-place-id')
          if (dataId) placeId = dataId
        }
        
        placeName = placeName
          .replace(/톡톡.*$/, '')
          .replace(/\[.*?\]/g, '')
          .trim()
        
        // placeId 로그 추가 (디버깅용)
        if (index < 10) {
          console.log(`Item ${index + 1}: ${placeName} - PlaceId: ${placeId || 'NOT FOUND'}`)
        }
        
        items.push({
          position: startRank + index + 1, // 전체 순위
          placeName,
          placeId: placeId || '',
          isAd
        })
      })
      
      return items
    }, startRank)
  }

  async trackRanking(
    keyword: string,
    targetPlace: { placeId: string; placeName: string }
  ): Promise<SmartPlaceRankingResult> {
    const startTime = Date.now()
    console.log(`[${new Date().toISOString()}] Queuing keyword: "${keyword}"`)
    
    return this.queue.add(async () => {
      const queueStartTime = Date.now()
      console.log(`[${new Date().toISOString()}] Starting tracking for: "${keyword}" (waited ${queueStartTime - startTime}ms in queue)`)
      
      const browser = await this.browserManager.getBrowser()
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
      })
      const page = await context.newPage()

      try {
        console.log(`[${new Date().toISOString()}] Browser ready for: "${keyword}", Target: "${targetPlace.placeName}"`)
        
        const searchUrl = `https://map.naver.com/p/search/${encodeURIComponent(keyword)}`
        await page.goto(searchUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        })
        
        // 초기 로딩 대기
        await page.waitForTimeout(5000)
        
        // iframe 찾기
        const frames = page.frames()
        let searchFrame = page
        
        for (const frame of frames) {
          if (frame.url().includes('pcmap.place.naver.com')) {
            searchFrame = frame
            console.log('Found search iframe')
            try {
              await searchFrame.waitForLoadState('domcontentloaded')
              await searchFrame.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
            } catch (e) {
              console.log('Frame load warning:', e)
            }
            await page.waitForTimeout(2000)
            break
          }
        }
        
        // 모든 페이지에서 결과 수집 (최대 3페이지)
        const allResults: any[] = []
        let organicCount = 0
        let adCount = 0
        
        for (let pageNum = 1; pageNum <= 3; pageNum++) {
          if (pageNum > 1) {
            const navigated = await this.navigateToPage(searchFrame, pageNum)
            if (!navigated) {
              console.log(`Could not navigate to page ${pageNum}`)
              break
            }
          }
          
          // 현재 페이지에서 스크롤하여 모든 결과 로드
          console.log(`Loading results on page ${pageNum}...`)
          await this.scrollToLoadMore(searchFrame)
          
          // 현재 페이지 결과 수집
          const pageResults = await this.collectPageResults(searchFrame, allResults.length)
          console.log(`Page ${pageNum}: collected ${pageResults.length} results`)
          
          // 순위 계산 및 결과 추가
          for (const result of pageResults) {
            if (result.isAd) {
              adCount++
              result.adRank = adCount
              result.organicRank = null
            } else {
              organicCount++
              result.organicRank = organicCount
              result.adRank = null
            }
            allResults.push(result)
          }
          
          // 결과가 70개 미만이면 더 이상 페이지가 없음
          if (pageResults.length < 70) {
            console.log(`Page ${pageNum} has only ${pageResults.length} results, stopping pagination`)
            break
          }
        }
        
        console.log(`Total collected: ${allResults.length} results`)
        
        // 타겟 찾기
        let targetOrganicRank: number | null = null
        let targetAdRank: number | null = null
        let found = false
        const topTenPlaces: any[] = []
        
        const targetNormalized = this.normalizeName(targetPlace.placeName)
        console.log(`Looking for: "${targetNormalized}" (from "${targetPlace.placeName}")`)
        
        // 먼저 오가닉 결과만 필터링하여 상위 10개 수집
        let organicRankCounter = 0
        
        for (const result of allResults) {
          // 오가닉 결과만으로 Top 10 수집
          if (!result.isAd && topTenPlaces.length < 10) {
            organicRankCounter++
            topTenPlaces.push({
              rank: organicRankCounter,  // 오가닉 순위로 표시
              placeName: result.placeName,
              placeId: result.placeId,
              isAd: false
            })
          }
          
          // 이름 매칭 (정확한 매칭만)
          const resultNormalized = this.normalizeName(result.placeName)
          const isMatch = resultNormalized === targetNormalized
          
          if (isMatch) {
            console.log(`✓ Match found: "${result.placeName}" at position ${result.position}`)
            found = true
            
            if (result.isAd && targetAdRank === null) {
              targetAdRank = result.adRank
              console.log(`  - Ad Rank: ${targetAdRank}`)
            }
            
            if (!result.isAd && targetOrganicRank === null) {
              targetOrganicRank = result.organicRank
              console.log(`  - Organic Rank: ${targetOrganicRank}`)
            }
            
            // 광고와 오가닉 둘 다 찾을 수 있으므로 계속 검색
          }
        }
        
        const trackingTime = Date.now() - queueStartTime
        console.log(`[${new Date().toISOString()}] Completed "${keyword}" - Organic: ${targetOrganicRank}, Ad: ${targetAdRank}, Found: ${found} (took ${trackingTime}ms)`)
        
        return {
          organicRank: targetOrganicRank,
          adRank: targetAdRank,
          found,
          timestamp: new Date(),
          totalResults: allResults.length,
          topTenPlaces
        }
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error tracking "${keyword}":`, error)
        throw error
        
      } finally {
        await page.close()
        await context.close()
        console.log(`[${new Date().toISOString()}] Closed browser context for: "${keyword}"`)
      }
    })
  }

  // 여러 키워드를 Queue로 처리
  async trackMultipleKeywords(
    keywords: Array<{ keyword: string; keywordId?: string }>,
    targetPlace: { placeId: string; placeName: string }
  ): Promise<Map<string, SmartPlaceRankingResult>> {
    const results = new Map<string, SmartPlaceRankingResult>()
    const startTime = Date.now()
    
    console.log(`[${new Date().toISOString()}] Starting batch tracking for ${keywords.length} keywords`)
    console.log(`[${new Date().toISOString()}] Queue concurrency: ${this.queue.concurrency}`)
    console.log(`[${new Date().toISOString()}] Current queue size: ${this.queue.size}, pending: ${this.queue.pending}`)
    
    // 모든 키워드를 큐에 추가
    const promises = keywords.map(({ keyword, keywordId }, index) => {
      console.log(`[${new Date().toISOString()}] Adding keyword ${index + 1}/${keywords.length}: "${keyword}" to queue`)
      return this.trackRanking(keyword, targetPlace)
        .then(result => {
          console.log(`[${new Date().toISOString()}] ✓ Completed keyword ${index + 1}/${keywords.length}: "${keyword}"`)
          results.set(keywordId || keyword, result)
        })
        .catch(error => {
          console.error(`[${new Date().toISOString()}] ✗ Failed keyword ${index + 1}/${keywords.length}: "${keyword}":`, error)
          results.set(keywordId || keyword, {
            organicRank: null,
            adRank: null,
            found: false,
            timestamp: new Date()
          })
        })
    })
    
    await Promise.all(promises)
    
    const totalTime = Date.now() - startTime
    console.log(`[${new Date().toISOString()}] Batch tracking completed: ${keywords.length} keywords in ${totalTime}ms (avg: ${Math.round(totalTime / keywords.length)}ms per keyword)`)
    
    return results
  }

  async close() {
    await this.queue.onIdle()
    // 브라우저는 싱글톤으로 관리되므로 여기서는 닫지 않음
    // 필요시 BrowserManager.getInstance().close() 호출
  }
}