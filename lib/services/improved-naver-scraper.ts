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

export class ImprovedNaverScraper {
  private browser: Browser | null = null

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: false, // Avoid detection
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
      
      // Navigate to Naver place search
      const searchUrl = `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}`
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })
      
      // Wait for results to load
      await page.waitForSelector('a.place_bluelink', { timeout: 10000 })
      await page.waitForTimeout(2000)
      
      // Get all place links
      const placeLinks = await page.locator('a.place_bluelink').all()
      console.log(`Found ${placeLinks.length} place links`)
      
      const results: any[] = []
      let organicRank: number | null = null
      let adRank: number | null = null
      let found = false
      let organicCount = 0
      let adCount = 0
      
      // Process each place link
      for (let i = 0; i < Math.min(placeLinks.length, 20); i++) {
        try {
          const link = placeLinks[i]
          
          // Get place name
          const placeName = await link.textContent()
          const cleanName = placeName?.replace(/톡톡.*$/, '').trim() || ''
          
          // Check if it's an ad
          const parent = await link.evaluateHandle(el => el.closest('.VLTHu'))
          const parentHTML = await parent.evaluate((el: any) => el?.innerHTML || '')
          const isAd = parentHTML.includes('광고') || 
                       parentHTML.includes('spnew_ad') || 
                       parentHTML.includes('ad_badge') ||
                       parentHTML.includes('ico_ad')
          
          // Click the link in a new page to get place ID
          const newPagePromise = page.context().waitForEvent('page')
          await link.click({ modifiers: ['Control'] }) // Ctrl+Click to open in new tab
          
          let placeId = ''
          try {
            const newPage = await Promise.race([
              newPagePromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
            ]) as Page
            
            // Get place ID from URL
            const url = newPage.url()
            const placeMatch = url.match(/place\/(\d+)/)
            if (placeMatch) {
              placeId = placeMatch[1]
            }
            
            await newPage.close()
          } catch (e) {
            // If new page didn't open, try getting current URL
            await link.click()
            await page.waitForTimeout(1000)
            const currentUrl = page.url()
            const placeMatch = currentUrl.match(/place\/(\d+)/)
            if (placeMatch) {
              placeId = placeMatch[1]
            }
            // Go back to search results
            await page.goBack()
            await page.waitForSelector('a.place_bluelink', { timeout: 5000 })
          }
          
          console.log(`  ${i + 1}. ${cleanName} (ID: ${placeId}, Ad: ${isAd})`)
          
          // Count ranks
          if (isAd) {
            adCount++
          } else {
            organicCount++
          }
          
          // Add to results
          if (results.length < 10) {
            results.push({
              rank: results.length + 1,
              placeName: cleanName,
              placeId,
              isAd
            })
          }
          
          // Check if this is our target place
          if (placeId === targetPlace.placeId) {
            found = true
            if (isAd) {
              adRank = adCount
            } else {
              organicRank = organicCount
            }
            console.log(`✓ Found target at rank ${i + 1} - Organic: ${organicRank}, Ad: ${adRank}`)
          } else if (!found && !placeId) {
            // Fallback to name matching if no ID
            const normalize = (str: string) => {
              return str.replace(/\s+/g, '').replace(/[^가-힣a-zA-Z0-9]/g, '').toLowerCase()
            }
            
            if (normalize(cleanName).includes(normalize(targetPlace.placeName)) || 
                normalize(targetPlace.placeName).includes(normalize(cleanName))) {
              found = true
              if (isAd) {
                adRank = adCount
              } else {
                organicRank = organicCount
              }
              console.log(`✓ Found by name at rank ${i + 1} - Organic: ${organicRank}, Ad: ${adRank}`)
            }
          }
        } catch (error) {
          console.error(`Error processing place ${i + 1}:`, error)
        }
      }
      
      return {
        organicRank,
        adRank,
        found,
        timestamp: new Date(),
        topTenPlaces: results
      }
      
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