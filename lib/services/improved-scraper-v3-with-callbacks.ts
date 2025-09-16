import { chromium, Browser, Page, BrowserContext } from 'playwright'
import PQueue from 'p-queue'
import { BrowserManager } from './improved-scraper-v3'

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

export interface TrackingCallbacks {
  onStart?: (keyword: string, index: number, total: number) => void
  onComplete?: (keyword: string, index: number, total: number, result: SmartPlaceRankingResult) => void
  onError?: (keyword: string, index: number, total: number, error: Error) => void
}

export class ImprovedNaverScraperV3WithCallbacks {
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
      // 현재 로드된 결과 수 확인
      const currentCount = await frame.evaluate(() => {
        const items = document.querySelectorAll('li.UEzoS, li.VLTHu')
        return items.length
      })
      
      console.log(`Attempt ${attempts + 1}: ${currentCount} results loaded`)
      
      // 더 이상 새로운 결과가 없으면 종료
      if (currentCount === previousCount && currentCount > 0) {
        console.log('No more results to load')
        break
      }
      
      previousCount = currentCount
      
      // 스크롤 다운
      await frame.evaluate(() => {
        const scrollContainer = document.querySelector('.Ryr1F') || document.body
        scrollContainer.scrollTo(0, scrollContainer.scrollHeight)
      })
      
      // 새 결과 로드 대기
      await frame.waitForTimeout(1500)
      attempts++
    }
  }

  // 한 페이지의 결과 수집
  private async collectPageResults(frame: Page | any, startRank: number = 0): Promise<any[]> {
    return await frame.evaluate((startRank: number) => {
      const items: any[] = []
      
      // 모든 검색 결과 아이템 선택
      const resultItems = document.querySelectorAll('li.UEzoS, li.VLTHu')
      
      resultItems.forEach((item, index) => {
        const position = startRank + index + 1
        
        // 업체명 추출
        const nameElement = item.querySelector('.YwYLL, .TYaxT')
        const placeName = nameElement?.textContent?.trim() || ''
        
        // placeId 추출 (링크에서)
        const linkElement = item.querySelector('a.tzwk0, a.gU6bV')
        const href = linkElement?.getAttribute('href') || ''
        const placeIdMatch = href.match(/place\/(\d+)/)
        const placeId = placeIdMatch ? placeIdMatch[1] : ''
        
        // 광고 여부 확인 (더 정확한 선택자)
        const isAd = item.classList.contains('UEzoS') && 
                    item.querySelector('div.iqAyT.JKKhR > a.gU6bV._DHlh') !== null
        
        items.push({
          position,
          placeName,
          placeId,
          isAd
        })
      })
      
      return items
    }, startRank)
  }

  async trackRanking(
    keyword: string,
    targetPlace: { placeId: string; placeName: string },
    callbacks?: {
      onStart?: () => void
      onComplete?: (result: SmartPlaceRankingResult) => void
      onError?: (error: Error) => void
    }
  ): Promise<SmartPlaceRankingResult> {
    const startTime = Date.now()
    console.log(`[${new Date().toISOString()}] Queuing keyword: "${keyword}"`)
    
    return this.queue.add(async () => {
      const queueStartTime = Date.now()
      console.log(`[${new Date().toISOString()}] Starting tracking for: "${keyword}" (waited ${queueStartTime - startTime}ms in queue)`)
      
      // 콜백 호출
      if (callbacks?.onStart) {
        callbacks.onStart()
      }
      
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
        
        for (const result of allResults) {
          // Top 10 수집 (순수하게 상위 10개만)
          if (topTenPlaces.length < 10) {
            topTenPlaces.push({
              rank: result.position,
              placeName: result.placeName,
              placeId: result.placeId,
              isAd: result.isAd
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
        
        const result = {
          organicRank: targetOrganicRank,
          adRank: targetAdRank,
          found,
          timestamp: new Date(),
          totalResults: allResults.length,
          topTenPlaces
        }
        
        // 완료 콜백 호출
        if (callbacks?.onComplete) {
          callbacks.onComplete(result)
        }
        
        return result
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error tracking "${keyword}":`, error)
        
        // 에러 콜백 호출
        if (callbacks?.onError) {
          callbacks.onError(error as Error)
        }
        
        throw error
        
      } finally {
        await page.close()
        await context.close()
        console.log(`[${new Date().toISOString()}] Closed browser context for: "${keyword}"`)
      }
    })
  }

  // 여러 키워드를 Queue로 처리 (콜백 지원)
  async trackMultipleKeywordsWithCallbacks(
    keywords: Array<{ keyword: string; keywordId?: string }>,
    targetPlace: { placeId: string; placeName: string },
    callbacks?: TrackingCallbacks
  ): Promise<Map<string, SmartPlaceRankingResult>> {
    const results = new Map<string, SmartPlaceRankingResult>()
    const startTime = Date.now()
    
    console.log(`[${new Date().toISOString()}] Starting batch tracking for ${keywords.length} keywords`)
    console.log(`[${new Date().toISOString()}] Queue concurrency: ${this.queue.concurrency}`)
    console.log(`[${new Date().toISOString()}] Current queue size: ${this.queue.size}, pending: ${this.queue.pending}`)
    
    // 모든 키워드를 큐에 추가
    const promises = keywords.map(({ keyword, keywordId }, index) => {
      console.log(`[${new Date().toISOString()}] Adding keyword ${index + 1}/${keywords.length}: "${keyword}" to queue`)
      
      return this.trackRanking(keyword, targetPlace, {
        onStart: () => {
          if (callbacks?.onStart) {
            callbacks.onStart(keyword, index, keywords.length)
          }
        },
        onComplete: (result) => {
          console.log(`[${new Date().toISOString()}] ✓ Completed keyword ${index + 1}/${keywords.length}: "${keyword}"`)
          results.set(keywordId || keyword, result)
          if (callbacks?.onComplete) {
            callbacks.onComplete(keyword, index, keywords.length, result)
          }
        },
        onError: (error) => {
          console.error(`[${new Date().toISOString()}] ✗ Failed keyword ${index + 1}/${keywords.length}: "${keyword}":`, error)
          const failedResult = {
            organicRank: null,
            adRank: null,
            found: false,
            timestamp: new Date()
          }
          results.set(keywordId || keyword, failedResult)
          if (callbacks?.onError) {
            callbacks.onError(keyword, index, keywords.length, error)
          }
        }
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