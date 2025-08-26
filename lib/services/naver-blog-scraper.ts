import * as playwright from 'playwright'

interface BlogRankingResult {
  mainTabRank: number | null
  blogTabRank: number | null
  viewTabRank: number | null
  mainTabExposed: boolean
  url?: string
  error?: string
}

export class NaverBlogScraper {
  private browser: any = null
  private context: any = null
  private page: any = null

  async initialize() {
    try {
      if (!this.browser) {
        this.browser = await playwright.chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        })
        
        this.context = await this.browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          viewport: { width: 1920, height: 1080 }
        })
        
        this.page = await this.context.newPage()
        
        // Block images and unnecessary resources to speed up scraping
        await this.page.route('**/*.{png,jpg,jpeg,gif,svg,ico}', route => route.abort())
      }
    } catch (error) {
      console.error('Failed to initialize browser:', error)
      throw error
    }
  }

  async checkBlogRanking(blogUrl: string, keyword: string): Promise<BlogRankingResult> {
    const result: BlogRankingResult = {
      mainTabRank: null,
      blogTabRank: null,
      viewTabRank: null,
      mainTabExposed: false,
      url: undefined
    }

    try {
      await this.initialize()
      
      // Extract blog ID from URL
      const blogId = this.extractBlogId(blogUrl)
      if (!blogId) {
        result.error = 'Invalid blog URL'
        console.error('Invalid blog URL:', blogUrl)
        return result
      }

      console.log(`Checking ranking for blog ${blogId} with keyword: ${keyword}`)

      // 1. Check main tab (통합검색)
      try {
        const mainTabResult = await this.checkMainTab(blogId, keyword)
        result.mainTabRank = mainTabResult.rank
        result.mainTabExposed = mainTabResult.exposed
        if (mainTabResult.url) result.url = mainTabResult.url
      } catch (error) {
        console.error('Error checking main tab:', error)
      }

      // 2. Check blog tab
      try {
        const blogTabResult = await this.checkBlogTab(blogId, keyword)
        result.blogTabRank = blogTabResult.rank
        if (!result.url && blogTabResult.url) result.url = blogTabResult.url
      } catch (error) {
        console.error('Error checking blog tab:', error)
      }

      // 3. Check VIEW tab
      try {
        const viewTabResult = await this.checkViewTab(blogId, keyword)
        result.viewTabRank = viewTabResult.rank
        if (!result.url && viewTabResult.url) result.url = viewTabResult.url
      } catch (error) {
        console.error('Error checking VIEW tab:', error)
      }

    } catch (error) {
      console.error('Error during blog ranking check:', error)
      result.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return result
  }

  private async checkMainTab(blogId: string, keyword: string): Promise<{ rank: number | null, exposed: boolean, url?: string }> {
    const url = `https://search.naver.com/search.naver?where=nexearch&sm=top_hty&fbm=0&ie=utf8&query=${encodeURIComponent(keyword)}`
    
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    // Wait for blog section to load
    await this.page.waitForTimeout(2000)
    
    // Check if blog section exists in main search results
    const blogSection = await this.page.$('section.sc_new.sp_nblog')
    if (!blogSection) {
      return { rank: null, exposed: false }
    }

    // Get blog items in main tab (usually shows up to 5-7 blogs)
    const blogItems = await this.page.$$eval(
      'section.sc_new.sp_nblog li.bx',
      (items: any[], blogId: string) => {
        return items.map((item, index) => {
          const linkElement = item.querySelector('a.title_link, a.api_txt_lines')
          const href = linkElement?.getAttribute('href') || ''
          const isMatch = href.includes(blogId) || href.includes(`blogId=${blogId}`)
          return {
            rank: index + 1,
            url: href,
            isMatch
          }
        })
      },
      blogId
    )

    const matchedBlog = blogItems.find(item => item.isMatch)
    
    return {
      rank: matchedBlog?.rank || null,
      exposed: !!matchedBlog,
      url: matchedBlog?.url
    }
  }

  private async checkBlogTab(blogId: string, keyword: string): Promise<{ rank: number | null, url?: string }> {
    const url = `https://search.naver.com/search.naver?where=blog&sm=tab_jum&query=${encodeURIComponent(keyword)}`
    
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    await this.page.waitForTimeout(2000)
    
    // Get all blog items (check up to 30)
    const blogItems = await this.page.$$eval(
      'li.bx',
      (items: any[], blogId: string) => {
        return items.slice(0, 30).map((item, index) => {
          // Skip if it's an ad
          if (item.classList.contains('splink_ad') || 
              item.querySelector('.link_ad') || 
              item.hasAttribute('data-ad')) {
            return null
          }
          
          const linkElement = item.querySelector('a.title_link, a.api_txt_lines, .total_tit a')
          const href = linkElement?.getAttribute('href') || ''
          const isMatch = href.includes(blogId) || href.includes(`blogId=${blogId}`)
          
          return {
            rank: index + 1,
            url: href,
            isMatch
          }
        }).filter(item => item !== null)
      },
      blogId
    )

    const matchedBlog = blogItems.find(item => item?.isMatch)
    
    return {
      rank: matchedBlog?.rank || null,
      url: matchedBlog?.url
    }
  }

  private async checkViewTab(blogId: string, keyword: string): Promise<{ rank: number | null, url?: string }> {
    const url = `https://search.naver.com/search.naver?where=view&sm=tab_jum&query=${encodeURIComponent(keyword)}`
    
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    await this.page.waitForTimeout(2000)
    
    // Get all VIEW items (check up to 30)
    const viewItems = await this.page.$$eval(
      'li.bx',
      (items: any[], blogId: string) => {
        return items.slice(0, 30).map((item, index) => {
          // Skip if it's an ad
          if (item.classList.contains('splink_ad') || 
              item.querySelector('.link_ad') || 
              item.hasAttribute('data-ad')) {
            return null
          }
          
          const linkElement = item.querySelector('a.title_link, a.api_txt_lines, .total_tit a')
          const href = linkElement?.getAttribute('href') || ''
          const isMatch = href.includes(blogId) || href.includes(`blogId=${blogId}`)
          
          return {
            rank: index + 1,
            url: href,
            isMatch
          }
        }).filter(item => item !== null)
      },
      blogId
    )

    const matchedBlog = viewItems.find(item => item?.isMatch)
    
    return {
      rank: matchedBlog?.rank || null,
      url: matchedBlog?.url
    }
  }

  private extractBlogId(blogUrl: string): string | null {
    // Handle various Naver blog URL formats
    const patterns = [
      /blog\.naver\.com\/([^/?]+)/,  // https://blog.naver.com/blogid
      /blog\.naver\.com\/PostView\.naver\?blogId=([^&]+)/,  // Old format with blogId parameter
      /m\.blog\.naver\.com\/([^/?]+)/,  // Mobile blog URL
      /blog\.naver\.com\/.*blogId=([^&]+)/  // Any format with blogId parameter
    ]

    for (const pattern of patterns) {
      const match = blogUrl.match(pattern)
      if (match) {
        return match[1]
      }
    }

    // If no pattern matches, try to extract from the URL path
    try {
      const url = new URL(blogUrl)
      const pathParts = url.pathname.split('/').filter(part => part)
      if (pathParts.length > 0 && pathParts[0] !== 'PostView.naver') {
        return pathParts[0]
      }
    } catch (error) {
      console.error('Failed to parse blog URL:', error)
    }

    return null
  }

  async close() {
    try {
      if (this.page) {
        await this.page.close()
        this.page = null
      }
      if (this.context) {
        await this.context.close()
        this.context = null
      }
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
    } catch (error) {
      console.error('Error closing browser:', error)
    }
  }
}

// Singleton instance management
let scraperInstance: NaverBlogScraper | null = null

export async function getNaverBlogScraper(): Promise<NaverBlogScraper> {
  if (!scraperInstance) {
    scraperInstance = new NaverBlogScraper()
    await scraperInstance.initialize()
  }
  return scraperInstance
}

export async function closeNaverBlogScraper() {
  if (scraperInstance) {
    await scraperInstance.close()
    scraperInstance = null
  }
}