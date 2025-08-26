import playwright from 'playwright'

interface BlogRankingResult {
  mainTabRank: number | null
  blogTabRank: number | null
  viewTabRank: number | null
  mainTabExposed: boolean
  url?: string
}

export class NaverRankingChecker {
  private browser: any = null
  private context: any = null
  private page: any = null

  async initialize() {
    if (!this.browser) {
      this.browser = await playwright.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })
      this.page = await this.context.newPage()
    }
  }

  async checkBlogRanking(blogUrl: string, keyword: string): Promise<BlogRankingResult> {
    await this.initialize()
    
    const result: BlogRankingResult = {
      mainTabRank: null,
      blogTabRank: null,
      viewTabRank: null,
      mainTabExposed: false,
      url: undefined
    }

    try {
      // Clean blog URL to get the blog ID
      const blogId = this.extractBlogId(blogUrl)
      if (!blogId) {
        console.error('Invalid blog URL:', blogUrl)
        return result
      }

      // 1. Check main tab (통합검색)
      const mainUrl = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(keyword)}`
      await this.page.goto(mainUrl, { waitUntil: 'networkidle', timeout: 30000 })
      
      // Wait a bit for content to load
      await this.page.waitForTimeout(2000)
      
      // Check blog section in main tab
      const blogSectionSelector = 'section.sc_new.sp_nblog'
      const blogSectionExists = await this.page.locator(blogSectionSelector).count() > 0
      
      if (blogSectionExists) {
        // Get all blog items in the main tab
        const blogItems = await this.page.locator(`${blogSectionSelector} li.bx`).all()
        
        for (let i = 0; i < blogItems.length; i++) {
          const linkElement = await blogItems[i].locator('a.title_link').first()
          const href = await linkElement.getAttribute('href')
          
          if (href && href.includes(blogId)) {
            result.mainTabRank = i + 1
            result.mainTabExposed = true
            result.url = href
            break
          }
        }
      }

      // 2. Check blog tab
      const blogTabUrl = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}`
      await this.page.goto(blogTabUrl, { waitUntil: 'networkidle', timeout: 30000 })
      
      await this.page.waitForTimeout(2000)
      
      // Get all blog items in blog tab
      const blogTabItems = await this.page.locator('li.bx').all()
      
      for (let i = 0; i < blogTabItems.length && i < 30; i++) {
        const linkElement = await blogTabItems[i].locator('a.title_link, a.api_txt_lines').first()
        const href = await linkElement.getAttribute('href')
        
        if (href && href.includes(blogId)) {
          result.blogTabRank = i + 1
          if (!result.url) result.url = href
          break
        }
      }

      // 3. Check VIEW tab
      const viewTabUrl = `https://search.naver.com/search.naver?where=view&query=${encodeURIComponent(keyword)}`
      await this.page.goto(viewTabUrl, { waitUntil: 'networkidle', timeout: 30000 })
      
      await this.page.waitForTimeout(2000)
      
      // Get all items in VIEW tab
      const viewTabItems = await this.page.locator('li.bx').all()
      
      for (let i = 0; i < viewTabItems.length && i < 30; i++) {
        const linkElement = await viewTabItems[i].locator('a.title_link, a.api_txt_lines').first()
        const href = await linkElement.getAttribute('href')
        
        if (href && href.includes(blogId)) {
          result.viewTabRank = i + 1
          if (!result.url) result.url = href
          break
        }
      }

    } catch (error) {
      console.error('Error checking blog ranking:', error)
    }

    return result
  }

  private extractBlogId(blogUrl: string): string | null {
    // Handle various Naver blog URL formats
    const patterns = [
      /blog\.naver\.com\/([^/?]+)/,
      /blog\.naver\.com\/PostView\.naver\?blogId=([^&]+)/,
      /m\.blog\.naver\.com\/([^/?]+)/
    ]

    for (const pattern of patterns) {
      const match = blogUrl.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  async close() {
    if (this.page) await this.page.close()
    if (this.context) await this.context.close()
    if (this.browser) await this.browser.close()
    
    this.page = null
    this.context = null
    this.browser = null
  }
}

// Singleton instance
let checkerInstance: NaverRankingChecker | null = null

export async function getNaverRankingChecker(): Promise<NaverRankingChecker> {
  if (!checkerInstance) {
    checkerInstance = new NaverRankingChecker()
  }
  return checkerInstance
}

export async function closeNaverRankingChecker() {
  if (checkerInstance) {
    await checkerInstance.close()
    checkerInstance = null
  }
}