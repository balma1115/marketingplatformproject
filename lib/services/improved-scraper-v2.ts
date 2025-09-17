import { chromium, Browser, Page, BrowserContext } from 'playwright'
import PQueue from 'p-queue'

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

export class ImprovedNaverScraperV2 {
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

  // 페이지네이션과 스크롤로 최대 210개 결과 로드
  private async loadMoreResults(frame: Page | any, targetCount: number = 210): Promise<void> {
    let previousCount = 0
    let attempts = 0
    const maxAttempts = 10
    let currentPage = 1
    let totalItemsSeen = 0  // 전체 본 아이템 수 추적

    while (attempts < maxAttempts) {
      // 현재 로드된 아이템 수 확인
      const currentCount = await frame.evaluate(() => {
        const items = document.querySelectorAll('#_pcmap_list_scroll_container > ul > li')
        return items.length
      })

      // 페이지네이션은 내용을 교체하므로, 실제 본 아이템은 누적해야 함
      if (currentPage > 1) {
        totalItemsSeen = (currentPage - 1) * 70 + currentCount
      } else {
        totalItemsSeen = currentCount
      }

      console.log(`Page ${currentPage}: ${currentCount} items (Total seen: ${totalItemsSeen}/${targetCount})`)

      if (totalItemsSeen >= targetCount) {
        break
      }

      // 현재 페이지에서 70개 로드되면 페이지네이션 시도
      if (currentCount >= 70 && totalItemsSeen < targetCount) {
        console.log(`Current page has ${currentCount} items, trying pagination to page ${currentPage + 1}...`)
        
        // 먼저 스크롤을 최하단으로
        await frame.evaluate(() => {
          const container = document.querySelector('#_pcmap_list_scroll_container')
          if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
          }
        })
        await frame.waitForTimeout(1000)
        
        // 페이지네이션 버튼 찾기
        const paginationHandled = await frame.evaluate((pageNum: number) => {
          // 다음 페이지 버튼
          const nextButton = document.querySelector('#app-root > div > div.XUrfU > div.zRM9F > a:nth-child(7)')
          if (nextButton && !nextButton.classList.contains('fvwqf')) { // disabled가 아닌 경우
            (nextButton as HTMLElement).click()
            return 'next'
          }
          
          // 특정 페이지 번호 버튼 (2페이지, 3페이지)
          const pageSelectors = [
            '#app-root > div > div.XUrfU > div.zRM9F > a:nth-child(3)', // 2페이지
            '#app-root > div > div.XUrfU > div.zRM9F > a:nth-child(4)', // 3페이지
            '#app-root > div > div.XUrfU > div.zRM9F > a:nth-child(5)'  // 4페이지 (혹시 필요한 경우)
          ]
          
          if (pageNum <= 3 && pageSelectors[pageNum - 2]) {
            const pageButton = document.querySelector(pageSelectors[pageNum - 2])
            if (pageButton) {
              (pageButton as HTMLElement).click()
              return `page${pageNum}`
            }
          }
          
          return null
        }, currentPage + 1)
        
        if (paginationHandled) {
          console.log(`Clicked pagination: ${paginationHandled}`)
          currentPage++
          await frame.waitForTimeout(3000) // 페이지 로딩 대기
          
          // 새 결과가 로드될 때까지 대기
          try {
            await frame.waitForFunction(
              (prevCount: number) => {
                const items = document.querySelectorAll('#_pcmap_list_scroll_container > ul > li')
                return items.length !== prevCount
              },
              { timeout: 5000 },
              currentCount
            )
          } catch (e) {
            console.log('No new results loaded after pagination')
          }
          
          continue
        }
      }

      // 스크롤 다운 (페이지네이션이 없거나 실패한 경우)
      await frame.evaluate(() => {
        const container = document.querySelector('#_pcmap_list_scroll_container')
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          })
        }
      })

      await frame.waitForTimeout(2000)

      // "더보기" 버튼 찾아서 클릭
      const moreButton = await frame.$('button:has-text("더보기"), a:has-text("더보기"), [class*="more"]:has-text("더보기")')
      if (moreButton) {
        console.log('Found "더보기" button, clicking...')
        await moreButton.click()
        await frame.waitForTimeout(2000)
      }
      
      // 변화가 없으면 종료
      const newCount = await frame.evaluate(() => {
        return document.querySelectorAll('#_pcmap_list_scroll_container > ul > li').length
      })
      
      if (newCount === previousCount) {
        console.log('No more results to load')
        break
      }
      
      previousCount = newCount
      attempts++
    }
  }

  async trackRanking(
    keyword: string,
    targetPlace: { placeId: string; placeName: string }
  ): Promise<SmartPlaceRankingResult> {
    return this.queue.add(async () => {
      const browser = await this.browserManager.getBrowser()
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
      })
      const page = await context.newPage()

      try {
        console.log(`Searching for: "${keyword}", Target: "${targetPlace.placeName}"`)
        
        const searchUrl = `https://map.naver.com/p/search/${encodeURIComponent(keyword)}`
        await page.goto(searchUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        })
        
        // 초기 로딩 대기 (충분한 시간 확보)
        await page.waitForTimeout(5000)
        
        // iframe 찾기
        const frames = page.frames()
        let searchFrame: any = page

        for (const frame of frames) {
          if (frame.url().includes('pcmap.place.naver.com')) {
            searchFrame = frame
            console.log('Found search iframe')
            // iframe 로드 완료 대기
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
        
        // 모든 키워드에 대해 최대 210개까지 검색 (70개씩 3페이지)
        console.log(`Loading results for "${keyword}" up to 210 items...`)
        
        // 모든 페이지의 결과를 수집
        const allResults: any[] = []
        let currentPage = 1
        const maxPages = 3
        
        while (currentPage <= maxPages) {
          console.log(`Collecting results from page ${currentPage}...`)
          
          // 현재 페이지의 검색 결과 추출
          const pageResults = await searchFrame.evaluate(() => {
          const items: any[] = []
          const listItems = document.querySelectorAll('#_pcmap_list_scroll_container > ul > li')
          console.log(`Total items found: ${listItems.length}`)
          
          let organicCount = 0
          let adCount = 0
          
          listItems.forEach((item: Element, index: number) => {
            // 장소 이름 추출 (다양한 선택자 시도)
            let placeName = ''
            
            // 첫 번째 시도: 기본 선택자
            const nameElement = item.querySelector('div.qbGlu > div.ouxiq > div.ApCpt > a > span.YwYLL')
            if (nameElement) {
              placeName = nameElement.textContent?.trim() || ''
            }
            
            // 빈 이름은 건너뛰기
            if (!placeName) {
              return // forEach에서 continue와 같은 효과
            }
            
            // 광고 여부 확인
            let isAd = false
            
            const adElement = item.querySelector('div.iqAyT.JKKhR > a.gU6bV._DHlh')
            if (adElement) isAd = true
            
            const itemHTML = (item as HTMLElement).innerHTML
            if (itemHTML.includes('광고')) isAd = true
            
            const dataExpId = item.getAttribute('data-laim-exp-id')
            if (dataExpId && dataExpId.endsWith('*e')) isAd = true
            
            // 순위 계산
            if (isAd) {
              adCount++
            } else {
              organicCount++
            }
            
            // Place ID 추출
            const linkElement = item.querySelector('a[href*="/place/"]')
            let placeId = ''
            if (linkElement) {
              const href = (linkElement as HTMLAnchorElement).href
              const match = href.match(/place\/(\d+)/)
              if (match) placeId = match[1]
            }
            
            if (placeName) {
              placeName = placeName
                .replace(/톡톡.*$/, '')
                .replace(/\[.*?\]/g, '')
                .trim()
              
              items.push({
                position: index + 1,
                placeName,
                placeId: placeId || '',
                isAd,
                adRank: isAd ? adCount : null,
                organicRank: !isAd ? organicCount : null
              })
            }
          })
          
          return items
        })

        allResults.push(...pageResults)
        currentPage++
        }

        console.log(`Found ${allResults.length} results`)

        // 타겟 찾기
        let organicRank: number | null = null
        let adRank: number | null = null
        let found = false
        const topTenPlaces: any[] = []
        
        // 빈 이름 제거
        const validResults = allResults.filter(r => r.placeName && r.placeName.trim() !== '')
        
        // 스마트플레이스에 등록된 이름만 사용
        const targetNormalized = this.normalizeName(targetPlace.placeName)
        console.log(`Target place (normalized): "${targetNormalized}"`)
        console.log(`Target place (original): "${targetPlace.placeName}"`)
        
        for (const result of validResults) {
          // Top 10 수집
          if (topTenPlaces.length < 10) {
            topTenPlaces.push({
              rank: result.position,
              placeName: result.placeName,
              placeId: result.placeId,
              isAd: result.isAd
            })
          }
          
          // 이름 매칭
          const resultNormalized = this.normalizeName(result.placeName)
          
          // 정확한 매칭만 허용 (스마트플레이스에 등록된 이름과 완전 일치)
          const isMatch = resultNormalized === targetNormalized
          
          if (isMatch) {
            console.log(`✓ Match found: "${result.placeName}" at position ${result.position}`)
            found = true
            
            if (result.isAd && adRank === null) {
              adRank = result.adRank
              console.log(`  - Ad Rank: ${adRank}`)
            }
            
            if (!result.isAd && organicRank === null) {
              organicRank = result.organicRank
              console.log(`  - Organic Rank: ${organicRank}`)
            }
            
            if (organicRank !== null && adRank !== null) {
              break
            }
          }
        }

        console.log(`Final Result - Organic: ${organicRank}, Ad: ${adRank}, Found: ${found}`)

        await page.close()
        await context.close()

        return {
          organicRank,
          adRank,
          found,
          timestamp: new Date(),
          topTenPlaces
        }

      } catch (error) {
        await page.close()
        await context.close()
        console.error('Tracking error:', error)
        throw error
      }
    }) as Promise<SmartPlaceRankingResult>
  }

  // 여러 키워드를 Queue로 처리
  async trackMultipleKeywords(
    keywords: Array<{ keyword: string; keywordId?: string }>,
    targetPlace: { placeId: string; placeName: string }
  ): Promise<Map<string, SmartPlaceRankingResult>> {
    const results = new Map<string, SmartPlaceRankingResult>()
    
    // 모든 키워드를 큐에 추가
    const promises = keywords.map(({ keyword, keywordId }) => 
      this.trackRanking(keyword, targetPlace)
        .then(result => {
          results.set(keywordId || keyword, result)
        })
        .catch(error => {
          console.error(`Failed to track "${keyword}":`, error)
          results.set(keywordId || keyword, {
            organicRank: null,
            adRank: null,
            found: false,
            timestamp: new Date()
          })
        })
    )
    
    await Promise.all(promises)
    return results
  }

  async close() {
    await this.queue.onIdle()
    // 브라우저는 싱글톤으로 관리되므로 여기서는 닫지 않음
    // 필요시 BrowserManager.getInstance().close() 호출
  }
}