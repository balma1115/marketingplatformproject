import * as playwright from 'playwright'

interface BlogRankingResult {
  mainTabExposed: boolean  // 메인탭은 노출 여부만 확인 (순위 X)
  blogTabRank: number | null  // 블로그탭 1-30위 순위
  url?: string
  error?: string
}

export class NaverBlogScraperV2 {
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
        
        // Block images to speed up scraping
        await this.page.route('**/*.{png,jpg,jpeg,gif,svg,ico,webp}', route => route.abort())
      }
    } catch (error) {
      console.error('Failed to initialize browser:', error)
      throw error
    }
  }

  async checkBlogRanking(blogUrl: string, keyword: string): Promise<BlogRankingResult> {
    const result: BlogRankingResult = {
      mainTabExposed: false,  // 메인탭 노출 여부
      blogTabRank: null,      // 블로그탭 순위
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

      // 1. Check main tab (통합검색) - 노출 여부만 확인
      try {
        const mainTabResult = await this.checkMainTab(blogId, keyword)
        result.mainTabExposed = mainTabResult.exposed
        if (mainTabResult.url) result.url = mainTabResult.url
      } catch (error) {
        console.error('Error checking main tab:', error)
      }

      // 2. Check blog tab (블로그 탭)
      try {
        const blogTabResult = await this.checkBlogTab(blogId, keyword)
        result.blogTabRank = blogTabResult.rank
        if (!result.url && blogTabResult.url) result.url = blogTabResult.url
      } catch (error) {
        console.error('Error checking blog tab:', error)
      }

    } catch (error) {
      console.error('Error during blog ranking check:', error)
      result.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return result
  }

  private async checkMainTab(blogId: string, keyword: string): Promise<{ exposed: boolean, url?: string }> {
    const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`
    
    console.log(`Checking main tab for keyword: ${keyword}`)
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    // Wait for content to load
    await this.page.waitForTimeout(3000)
    
    // 메인탭에서 노출 여부만 확인 (순위 추적 X)
    const blogLinksInfo = await this.page.evaluate((blogId: string) => {
      // 광고 필터링을 위한 셀렉터들
      const adSelectors = [
        '.link_ad', '.ad_label', '[class*="_ad"]', '[class*="splink_ad"]',
        '.power_link', '.brand_search', '[data-cr-area*="bad"]',
        '[class*="_fds"]', '[class*="featured"]'
      ]
      
      // 비디오, 쇼핑 등 특수 영역 제외
      const excludeSections = ['video', 'shop', 'news', 'image']
      
      // 모든 블로그 링크 찾기
      const blogLinks = document.querySelectorAll('a[href*="blog.naver.com"]')
      let isExposed = false
      let firstUrl = ''
      
      blogLinks.forEach((link: any) => {
        const href = link.href || ''
        
        // 광고 체크
        let isAd = false
        const parent = link.closest('li, article, section')
        if (parent) {
          for (const selector of adSelectors) {
            if (parent.querySelector(selector) || parent.matches(selector)) {
              isAd = true
              break
            }
          }
        }
        
        // 특수 섹션 제외
        const section = link.closest('section')
        if (section) {
          const sectionClass = section.className.toLowerCase()
          for (const exclude of excludeSections) {
            if (sectionClass.includes(exclude)) {
              isAd = true
              break
            }
          }
        }
        
        // 광고가 아니고 해당 블로그의 게시물이면 노출로 표시
        if (!isAd && (href.includes(`/${blogId}/`) || href.includes(`/${blogId}?`) || href.includes(`blogId=${blogId}`))) {
          isExposed = true
          if (!firstUrl) firstUrl = href
        }
      })
      
      return {
        exposed: isExposed,
        firstUrl: firstUrl
      }
    }, blogId)
    
    console.log(`Main tab (노출 여부) for ${blogId}:`, blogLinksInfo.exposed)
    
    return {
      exposed: blogLinksInfo.exposed,
      url: blogLinksInfo.firstUrl
    }
  }

  private async checkBlogTab(blogId: string, keyword: string): Promise<{ rank: number | null, url?: string }> {
    const url = `https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=${encodeURIComponent(keyword)}`
    
    console.log(`Checking blog tab for keyword: ${keyword}`)
    await this.page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    await this.page.waitForTimeout(3000)
    
    // 블로그 탭에서 순위 찾기 - 정확한 셀렉터 사용
    const blogTabInfo = await this.page.evaluate((blogId: string) => {
      let realRank = 0
      let foundRank = null
      let foundUrl = null
      let totalItems = 0
      
      // 1. api_subject_bx 내의 블로그 아이템 처리 (상위 노출 영역)
      const sections = document.querySelectorAll('#main_pack > section')
      sections.forEach(section => {
        const subjectBoxes = section.querySelectorAll('div.api_subject_bx')
        subjectBoxes.forEach(box => {
          const listItems = box.querySelectorAll('ul > li')
          listItems.forEach(item => {
            totalItems++
            
            // 광고 체크
            const isAd = item.querySelector('.link_ad') !== null ||
                        item.classList.contains('sp_nreview_ad')
            
            if (!isAd) {
              realRank++
              
              // 블로그 ID 추출
              let currentBlogId = ''
              
              // 작성자 링크에서 블로그 ID 추출 (가장 정확)
              const authorLink = item.querySelector('.sub_txt.sub_name, .user_info > a, .user_box_inner a.name') as HTMLAnchorElement
              if (authorLink && authorLink.href) {
                const match = authorLink.href.match(/blog\.naver\.com\/([^/?]+)/)
                if (match) {
                  currentBlogId = match[1]
                }
              }
              
              // 폴백: 제목 링크에서 추출
              if (!currentBlogId) {
                const titleLink = item.querySelector('.api_txt_lines.total_tit, .total_tit') as HTMLAnchorElement
                if (titleLink && titleLink.href) {
                  const match = titleLink.href.match(/blog\.naver\.com\/([^/?]+)/)
                  if (match) {
                    currentBlogId = match[1]
                  }
                }
              }
              
              // 타겟 블로그 확인
              if (currentBlogId === blogId && !foundRank) {
                foundRank = realRank
                const link = item.querySelector('a[href*="blog.naver.com"]') as HTMLAnchorElement
                if (link) foundUrl = link.href
              }
            }
          })
        })
      })
      
      // 2. 일반 li.bx 아이템 처리 (api_subject_bx에 속하지 않은 것만)
      const regularItems = document.querySelectorAll('li.bx')
      regularItems.forEach(item => {
        // 이미 api_subject_bx에서 처리된 것은 제외
        if (item.closest('div.api_subject_bx')) return
        
        totalItems++
        
        // 광고 체크
        const itemClass = item.className
        const isAd = itemClass.includes('sp_nreview_ad') || 
                     itemClass.includes('splink') ||
                     item.querySelector('.link_ad') !== null
        
        if (!isAd) {
          realRank++
          
          // 블로그 ID 추출
          let currentBlogId = ''
          const authorLink = item.querySelector('.sub_txt.sub_name, .user_info > a, .user_box_inner a.name') as HTMLAnchorElement
          if (authorLink && authorLink.href) {
            const match = authorLink.href.match(/blog\.naver\.com\/([^/?]+)/)
            if (match) {
              currentBlogId = match[1]
            }
          }

          // 폴백: 제목 링크에서 추출
          if (!currentBlogId) {
            const titleLink = item.querySelector('a[href*="blog.naver.com"]') as HTMLAnchorElement
            if (titleLink && titleLink.href) {
              const match = titleLink.href.match(/blog\.naver\.com\/([^/?]+)/)
              if (match) {
                currentBlogId = match[1]
              }
            }
          }
          
          // 타겟 블로그 확인
          if (currentBlogId === blogId && !foundRank) {
            foundRank = realRank
            const link = item.querySelector('a[href*="blog.naver.com"]') as HTMLAnchorElement
            if (link) foundUrl = link.href
          }
        }
      })
      
      return {
        rank: foundRank,
        url: foundUrl,
        totalItems: totalItems,
        realItemCount: realRank
      }
    }, blogId)
    
    console.log(`Blog tab results for ${blogId}:`, {
      rank: blogTabInfo.rank,
      totalItems: blogTabInfo.totalItems
    })
    
    return {
      rank: blogTabInfo.rank,
      url: blogTabInfo.url
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
let scraperInstance: NaverBlogScraperV2 | null = null

export async function getNaverBlogScraperV2(): Promise<NaverBlogScraperV2> {
  if (!scraperInstance) {
    scraperInstance = new NaverBlogScraperV2()
    await scraperInstance.initialize()
  }
  return scraperInstance
}

export async function closeNaverBlogScraperV2() {
  if (scraperInstance) {
    await scraperInstance.close()
    scraperInstance = null
  }
}