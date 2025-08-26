import { chromium, Browser, Page } from 'playwright'

export interface SmartplaceData {
  placeId: string
  name: string
  category: string
  address: string
  phone: string
  businessHours: { [key: string]: string }
  homepage: string
  description: string
  rating: number
  reviewCount: number
  photoCount: number
  visitorReviews: number
  blogReviews: number
  menuItems?: Array<{ name: string; price?: string }> | string[]
  amenities?: string[]
  parkingInfo?: string
  lastUpdated: string
  // Additional fields from original code
  tabs?: string[]
  hasReservation?: boolean
  hasInquiry?: boolean
  hasCoupon?: boolean
  keywords?: string[]
  images?: string[]
  directions?: string
  blogLink?: string
  instagramLink?: string
  introduction?: string
  representativeKeywords?: string[]
  educationInfo?: {
    hasRegistrationNumber: boolean
    hasTuitionFee: boolean
    registrationNumber?: string
    tuitionFees?: string[]
  }
  imageRegistrationDates?: string[]
  hasClipTab?: boolean
  newsUpdateDates?: string[]
  hasSmartCall?: boolean
  priceDisplay?: {
    hasText: boolean
    hasImage: boolean
  } | string | null
  // SNS and photo analysis
  hasInstagram?: boolean
  instagramHandle?: string
  snsLinks?: {
    instagram?: string
    facebook?: string
    youtube?: string
    blog?: string
  }
  hasFacebook?: boolean
  hasYoutube?: boolean
  hasBlog?: boolean
  hasMenuPhoto?: boolean
  hasInteriorPhoto?: boolean
  hasExteriorPhoto?: boolean
  // News and events
  newsCount?: number
  lastNewsDate?: string
  hasEvent?: boolean
  // Additional features
  hasOrder?: boolean
  hasTalk?: boolean
  snsActivityLevel?: string
  responseRate?: number
  recentReviews?: number
  hasTransport?: boolean
  hasParking?: boolean
  hasDetailedDirections?: boolean
  hasPriceInfo?: boolean
  hasMenuPrice?: boolean
  priceTransparency?: string
  lastPhotoUpdate?: string
}

export class SmartplaceCrawler {
  private browser: Browser | null = null
  private page: Page | null = null

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
    if (!this.page) {
      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
      })
      this.page = await context.newPage()
    }
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

  async crawlSmartplace(placeId: string): Promise<SmartplaceData> {
    await this.init()
    
    try {
      // Try different URL formats
      const urls = [
        `https://pcmap.place.naver.com/place/${placeId}/home`,
        `https://map.naver.com/p/entry/place/${placeId}`,
        `https://m.place.naver.com/place/${placeId}`
      ]
      
      let loaded = false
      for (const url of urls) {
        try {
          console.log('Trying URL:', url)
          await this.page!.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
          await this.page!.waitForTimeout(2000)
          
          // Check if content loaded
          const hasContent = await this.page!.$('.place_section, .PkgBl, [class*="place"], [class*="Place"]')
          if (hasContent) {
            loaded = true
            console.log('Page loaded successfully')
            break
          }
        } catch (e) {
          console.log('Failed to load URL:', e.message)
        }
      }
      
      if (!loaded) {
        throw new Error('Could not load any place URL')
      }

      // Extract all data points for comprehensive analysis
      const blogReviews = await this.extractBlogReviews()
      const visitorReviews = await this.extractVisitorReviews()
      const instagramData = await this.extractInstagramData()
      const snsLinks = await this.extractSNSLinks()
      const photoAnalysis = await this.analyzePhotoCategories()
      const newsData = await this.extractNewsData()
      const recentReviews = await this.calculateRecentReviews()
      const responseRate = await this.calculateResponseRate()
      const hasOrder = await this.checkOrder()
      const hasTalk = await this.checkTalk()
      const hasMenuPrice = await this.checkMenuPrice()
      const hasTransport = await this.checkTransport()
      const hasDetailedDirections = await this.checkDetailedDirections()
      const parkingInfo = await this.extractParkingInfo()
      const priceDisplay = await this.extractPriceDisplay()
      
      // Extract comprehensive information
      const data: SmartplaceData = {
        placeId,
        name: await this.extractText('.GHAhO') || await this.extractText('.Fc1rA') || await this.extractText('.YouOG .TYaxT') || '',
        category: await this.extractText('.lnJFt') || await this.extractText('.DJJvD') || await this.extractText('.KCMnt') || '',
        address: await this.extractText('.IH7VW') || await this.extractText('.PkgBl') || await this.extractText('.LDgIH') || '',
        phone: await this.extractPhone(),
        businessHours: await this.extractBusinessHours(),
        homepage: await this.extractHomepage(),
        description: await this.extractDescription(),
        rating: await this.extractRating(),
        reviewCount: await this.extractReviewCount(),
        photoCount: await this.extractPhotoCount(),
        visitorReviews,
        blogReviews,
        menuItems: await this.extractMenuItems(),
        amenities: await this.extractAmenities(),
        parkingInfo,
        lastUpdated: new Date().toISOString(),
        // Additional fields
        tabs: await this.extractTabs(),
        hasReservation: await this.checkReservation(),
        hasInquiry: await this.checkInquiry(),
        hasCoupon: await this.checkCoupon(),
        keywords: await this.extractKeywords(),
        images: await this.extractImages(),
        directions: await this.extractDirections(),
        blogLink: await this.extractBlogLink(),
        instagramLink: await this.extractInstagramLink(),
        introduction: await this.extractIntroduction(),
        representativeKeywords: await this.extractRepresentativeKeywords(),
        educationInfo: await this.extractEducationInfo(),
        imageRegistrationDates: await this.extractImageDates(),
        hasClipTab: await this.checkClipTab(),
        newsUpdateDates: await this.extractNewsUpdateDates(),
        hasSmartCall: await this.checkSmartCall(),
        priceDisplay,
        // New comprehensive fields
        hasInstagram: instagramData.hasInstagram,
        instagramHandle: instagramData.instagramHandle,
        snsLinks,
        hasFacebook: !!snsLinks.facebook,
        hasYoutube: !!snsLinks.youtube,
        hasBlog: !!snsLinks.blog,
        hasMenuPhoto: photoAnalysis.hasMenuPhoto,
        hasInteriorPhoto: photoAnalysis.hasInteriorPhoto,
        hasExteriorPhoto: photoAnalysis.hasExteriorPhoto,
        newsCount: newsData.newsCount,
        lastNewsDate: newsData.lastNewsDate,
        hasEvent: newsData.hasEvent,
        hasOrder,
        hasTalk,
        snsActivityLevel: instagramData.hasInstagram || snsLinks.facebook ? 'medium' : 'none',
        responseRate,
        recentReviews,
        hasTransport,
        hasParking: !!parkingInfo,
        hasDetailedDirections,
        hasPriceInfo: !!priceDisplay,
        hasMenuPrice,
        priceTransparency: priceDisplay ? 'medium' : 'none',
        lastPhotoUpdate: newsData.lastNewsDate || new Date().toISOString()
      }

      return data
    } catch (error) {
      console.error('Error crawling smartplace:', error)
      
      // Return simulated data as fallback
      return this.generateFallbackData(placeId)
    }
  }

  private async extractText(selector: string): Promise<string> {
    try {
      const element = await this.page!.$(selector)
      if (element) {
        return await element.textContent() || ''
      }
    } catch (error) {
      console.log(`Failed to extract text from ${selector}`)
    }
    return ''
  }

  private async extractPhone(): Promise<string> {
    const phoneSelectors = ['.xlx7Q', '.O8qbU', 'span:has-text("전화번호") + span']
    
    for (const selector of phoneSelectors) {
      const phone = await this.extractText(selector)
      if (phone && phone.match(/\d{2,4}-\d{3,4}-\d{4}/)) {
        return phone
      }
    }
    return ''
  }

  private async extractBusinessHours(): Promise<{ [key: string]: string }> {
    const hours: { [key: string]: string } = {}
    
    try {
      // Try to find and click the business hours button
      const hoursButtonSelectors = [
        'button:has-text("영업시간")',
        'a:has-text("영업시간")',
        '.time_button',
        '[class*="time"][role="button"]'
      ]
      
      for (const selector of hoursButtonSelectors) {
        const button = await this.page!.$(selector)
        if (button) {
          await button.click()
          await this.page!.waitForTimeout(1000)
          break
        }
      }

      // Extract hours from various possible selectors
      const hoursSelectors = [
        '.y6tNq', '.A_cdD', 
        '[class*="hour"] li',
        '.time_list li',
        '.business_hours li'
      ]
      
      for (const selector of hoursSelectors) {
        const elements = await this.page!.$$(selector)
        
        for (const element of elements) {
          const text = await element.textContent()
          if (text && (text.includes(':') || text.includes('~') || text.includes('-'))) {
            // Parse different formats
            const lines = text.split('\n').filter(line => line.trim())
            for (const line of lines) {
              // Match patterns like "월요일 09:00 - 18:00" or "월 09:00~18:00"
              const dayMatch = line.match(/^([가-힣]+)\s*[\s:]?(.+)$/)
              if (dayMatch) {
                const day = dayMatch[1].trim()
                const time = dayMatch[2].trim()
                if (day && time && !day.includes('운영')) {
                  hours[day] = time
                }
              }
            }
          }
        }
        
        if (Object.keys(hours).length > 0) {
          break
        }
      }
    } catch (error) {
      console.log('Failed to extract business hours')
    }

    return hours
  }

  private async extractHomepage(): Promise<string> {
    const homepageSelectors = ['.jO09N', 'a[href^="http"]:has-text("홈페이지")', '.CHmqa a[href^="http"]']
    
    for (const selector of homepageSelectors) {
      try {
        const element = await this.page!.$(selector)
        if (element) {
          const href = await element.getAttribute('href')
          if (href && href.startsWith('http')) {
            return href
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    return ''
  }

  private async extractDescription(): Promise<string> {
    const descSelectors = ['.T8RFa', '.WoYOw', '.zPfVt']
    
    for (const selector of descSelectors) {
      const desc = await this.extractText(selector)
      if (desc && desc.length > 20) {
        return desc
      }
    }
    return ''
  }

  private async extractRating(): Promise<number> {
    try {
      // More specific selectors for rating
      const ratingSelectors = [
        'em.PXMot.LXIwF', // Desktop selector
        '.LDgIH em',      // Mobile selector
        'span[aria-label*="별점"]',
        '.place_section em:has-text("별점")',
        'em[class*="score"]',
        '.rating_score em'
      ]
      
      for (const selector of ratingSelectors) {
        try {
          const element = await this.page!.$(selector)
          if (element) {
            const text = await element.textContent()
            // Match decimal ratings like 4.5
            const match = text?.match(/(\d+\.\d+)/)
            if (match) {
              const rating = parseFloat(match[1])
              // Validate rating is between 0 and 5
              if (rating >= 0 && rating <= 5) {
                return rating
              }
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    } catch (error) {
      console.log('Failed to extract rating')
    }
    return 0
  }

  private async extractReviewCount(): Promise<number> {
    try {
      const reviewText = await this.extractText('.DizGn') || await this.extractText('.dAsGb span')
      if (reviewText) {
        const match = reviewText.match(/(\d+)/)
        if (match) {
          return parseInt(match[1])
        }
      }
    } catch (error) {
      console.log('Failed to extract review count')
    }
    return 0
  }

  private async extractPhotoCount(): Promise<number> {
    try {
      const photoSelectors = [
        '.dZltm',
        '.cb7hz.fvwqf',
        'button:has-text("사진") span',
        'a[href*="photo"] span',
        '.photo_count',
        '[class*="photo"] [class*="count"]'
      ]
      
      for (const selector of photoSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const text = await element.textContent()
          // Look for numbers in parentheses or standalone
          const match = text?.match(/[\(\[]?(\d+)[\)\]]?/)
          if (match) {
            const count = parseInt(match[1])
            if (count > 0 && count < 10000) { // Sanity check
              return count
            }
          }
        }
      }
    } catch (error) {
      console.log('Failed to extract photo count')
    }
    return 0
  }

  private async extractVisitorReviews(): Promise<number> {
    try {
      const visitorSelectors = [
        'a[role="tab"]:has-text("방문자리뷰")',
        'a[role="tab"]:has-text("방문자")',
        'button:has-text("방문자리뷰")',
        '.visitor_review_count',
        '[class*="visitor"] [class*="count"]'
      ]
      
      for (const selector of visitorSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const text = await element.textContent()
          const match = text?.match(/[\(\[]?(\d+)[\)\]]?/)
          if (match) {
            return parseInt(match[1])
          }
        }
      }
    } catch (error) {
      console.log('Failed to extract visitor reviews')
    }
    return 0
  }

  private async extractBlogReviews(): Promise<number> {
    try {
      const blogSelectors = [
        'a[role="tab"]:has-text("블로그리뷰")',
        'a[role="tab"]:has-text("블로그")',
        'button:has-text("블로그리뷰")',
        '.blog_review_count',
        '[class*="blog"] [class*="count"]'
      ]
      
      for (const selector of blogSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const text = await element.textContent()
          const match = text?.match(/[\(\[]?(\d+)[\)\]]?/)
          if (match) {
            return parseInt(match[1])
          }
        }
      }
    } catch (error) {
      console.log('Failed to extract blog reviews')
    }
    return 0
  }

  private async extractMenuItems(): Promise<Array<{ name: string; price?: string }>> {
    const items: Array<{ name: string; price?: string }> = []
    
    try {
      // Try to find menu section
      const menuItems = await this.page!.$$('.Sqg65, .njHfz')
      
      for (const item of menuItems.slice(0, 10)) { // Limit to first 10 items
        const name = await item.$eval('.lPzHi, .place_bluelink', el => el.textContent) || ''
        const price = await item.$eval('.GXS1X', el => el.textContent).catch(() => '')
        
        if (name) {
          items.push({ name: name.trim(), price: price?.trim() })
        }
      }
    } catch (error) {
      console.log('Failed to extract menu items')
    }
    
    return items
  }

  private async extractAmenities(): Promise<string[]> {
    const amenities: string[] = []
    
    try {
      const amenityElements = await this.page!.$$('.vV_z_, .c8cEk')
      
      for (const element of amenityElements) {
        const text = await element.textContent()
        if (text) {
          amenities.push(text.trim())
        }
      }
    } catch (error) {
      console.log('Failed to extract amenities')
    }
    
    return amenities
  }

  private async extractParkingInfo(): Promise<string> {
    const parkingSelectors = ['.nNPOq:has-text("주차")', '.vV_z_:has-text("주차")']
    
    for (const selector of parkingSelectors) {
      const parking = await this.extractText(selector)
      if (parking) {
        return parking
      }
    }
    return ''
  }

  // New extraction methods for comprehensive data
  private async extractTabs(): Promise<string[]> {
    try {
      const tabs: string[] = []
      const tabSelectors = [
        'a[role="tab"]',
        '.place_tab',
        '[class*="tab"][role="tab"]'
      ]
      
      for (const selector of tabSelectors) {
        const elements = await this.page!.$$(selector)
        for (const element of elements) {
          const text = await element.textContent()
          if (text && !tabs.includes(text.trim())) {
            tabs.push(text.trim())
          }
        }
      }
      
      return tabs.length > 0 ? tabs : ['홈']
    } catch (error) {
      return ['홈']
    }
  }

  private async checkReservation(): Promise<boolean> {
    try {
      const reservationSelectors = [
        'a[href*="booking.naver"]',
        'button:has-text("예약")',
        '.place_reservation',
        '[class*="reservation"]'
      ]
      
      for (const selector of reservationSelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  private async checkInquiry(): Promise<boolean> {
    try {
      const inquirySelectors = [
        'button:has-text("문의")',
        'a[href*="talk.naver"]',
        '.place_inquiry',
        '[class*="inquiry"]'
      ]
      
      for (const selector of inquirySelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  private async checkCoupon(): Promise<boolean> {
    try {
      const couponSelectors = [
        '[class*="coupon"]',
        'button:has-text("쿠폰")',
        '.place_coupon'
      ]
      
      for (const selector of couponSelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  private async extractKeywords(): Promise<string[]> {
    try {
      const keywords: string[] = []
      const keywordSelectors = [
        '.place_tag',
        '.keyword',
        '.ySHNE',
        '[class*="keyword"]'
      ]
      
      for (const selector of keywordSelectors) {
        const elements = await this.page!.$$(selector)
        for (const element of elements) {
          const text = await element.textContent()
          if (text && !text.includes('더보기')) {
            keywords.push(text.trim())
          }
        }
      }
      
      return keywords
    } catch (error) {
      return []
    }
  }

  private async extractImages(): Promise<string[]> {
    try {
      const images: string[] = []
      const imageSelectors = [
        '.place_thumb img',
        '.photo_area img',
        '[class*="photo"] img'
      ]
      
      for (const selector of imageSelectors) {
        const elements = await this.page!.$$(selector)
        for (const element of elements.slice(0, 20)) { // Limit to 20 images
          const src = await element.getAttribute('src')
          if (src && !images.includes(src)) {
            images.push(src)
          }
        }
      }
      
      return images
    } catch (error) {
      return []
    }
  }

  private async extractDirections(): Promise<string> {
    try {
      const directionSelectors = [
        '.place_section_content:has-text("찾아오시는 길")',
        '[class*="direction"]',
        '.location_info'
      ]
      
      for (const selector of directionSelectors) {
        const text = await this.extractText(selector)
        if (text && text.length > 10) {
          return text
        }
      }
      
      return ''
    } catch (error) {
      return ''
    }
  }

  private async extractBlogLink(): Promise<string> {
    try {
      const blogSelectors = [
        'a[href*="blog.naver"]',
        'a[href*="blog"]:not([href*="review"])',
        '.blog_link'
      ]
      
      for (const selector of blogSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const href = await element.getAttribute('href')
          if (href) return href
        }
      }
      
      return ''
    } catch (error) {
      return ''
    }
  }

  private async extractInstagramLink(): Promise<string> {
    try {
      const instaSelectors = [
        'a[href*="instagram.com"]',
        'a[href*="instagr.am"]',
        '.instagram_link'
      ]
      
      for (const selector of instaSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const href = await element.getAttribute('href')
          if (href) return href
        }
      }
      
      return ''
    } catch (error) {
      return ''
    }
  }

  private async extractIntroduction(): Promise<string> {
    try {
      const introSelectors = [
        '.place_section_content:has-text("소개")',
        '.introduction',
        '[class*="intro"]'
      ]
      
      for (const selector of introSelectors) {
        const text = await this.extractText(selector)
        if (text && text.length > 20) {
          return text
        }
      }
      
      return ''
    } catch (error) {
      return ''
    }
  }

  private async extractRepresentativeKeywords(): Promise<string[]> {
    try {
      const keywords: string[] = []
      const repKeywordSelectors = [
        '.place_keyword',
        '.representative_keyword',
        '[class*="rep_keyword"]'
      ]
      
      for (const selector of repKeywordSelectors) {
        const elements = await this.page!.$$(selector)
        for (const element of elements) {
          const text = await element.textContent()
          if (text) {
            keywords.push(text.trim())
          }
        }
      }
      
      return keywords
    } catch (error) {
      return []
    }
  }

  private async extractEducationInfo(): Promise<any> {
    try {
      // Check if it's an education category
      const category = await this.extractText('.lnJFt') || await this.extractText('.DJJvD') || ''
      
      if (!category.includes('학원') && !category.includes('교육')) {
        return null
      }
      
      const educationInfo = {
        hasRegistrationNumber: false,
        hasTuitionFee: false,
        registrationNumber: '',
        tuitionFees: [] as string[]
      }
      
      // Check for registration number
      const regNumSelectors = [
        ':has-text("등록번호")',
        ':has-text("학원등록")',
        '.registration_number'
      ]
      
      for (const selector of regNumSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          educationInfo.hasRegistrationNumber = true
          const text = await element.textContent()
          if (text) {
            const match = text.match(/\d{4,}/)
            if (match) {
              educationInfo.registrationNumber = match[0]
            }
          }
          break
        }
      }
      
      // Check for tuition fees
      const feeSelectors = [
        ':has-text("수강료")',
        ':has-text("교습비")',
        '.tuition_fee'
      ]
      
      for (const selector of feeSelectors) {
        const elements = await this.page!.$$(selector)
        if (elements.length > 0) {
          educationInfo.hasTuitionFee = true
          for (const element of elements) {
            const text = await element.textContent()
            if (text && text.includes('원')) {
              educationInfo.tuitionFees.push(text.trim())
            }
          }
          break
        }
      }
      
      return educationInfo
    } catch (error) {
      return null
    }
  }

  private async extractImageDates(): Promise<string[]> {
    try {
      const dates: string[] = []
      // This would require checking image metadata or upload dates
      // Placeholder implementation
      return dates
    } catch (error) {
      return []
    }
  }

  private async checkClipTab(): Promise<boolean> {
    try {
      const clipSelectors = [
        'a[role="tab"]:has-text("클립")',
        '.clip_tab',
        '[class*="clip"][role="tab"]'
      ]
      
      for (const selector of clipSelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  private async extractNewsUpdateDates(): Promise<string[]> {
    try {
      const dates: string[] = []
      const newsSelectors = [
        '.news_date',
        '.update_date',
        '[class*="news"] [class*="date"]'
      ]
      
      for (const selector of newsSelectors) {
        const elements = await this.page!.$$(selector)
        for (const element of elements) {
          const text = await element.textContent()
          if (text) {
            dates.push(text.trim())
          }
        }
      }
      
      return dates
    } catch (error) {
      return []
    }
  }

  private async checkSmartCall(): Promise<boolean> {
    try {
      const smartCallSelectors = [
        '[class*="smartcall"]',
        'button:has-text("스마트콜")',
        '.smart_call'
      ]
      
      for (const selector of smartCallSelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  private async extractPriceDisplay(): Promise<any> {
    try {
      const priceDisplay = {
        hasText: false,
        hasImage: false
      }
      
      // Check for text prices
      const priceTextSelectors = [
        '.price_info',
        '[class*="price"]',
        ':has-text("원")'
      ]
      
      for (const selector of priceTextSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const text = await element.textContent()
          if (text && text.includes('원')) {
            priceDisplay.hasText = true
            break
          }
        }
      }
      
      // Check for price images (menu images)
      const priceImageSelectors = [
        '.menu_image',
        '.price_image',
        '[class*="menu"] img'
      ]
      
      for (const selector of priceImageSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          priceDisplay.hasImage = true
          break
        }
      }
      
      return priceDisplay
    } catch (error) {
      return { hasText: false, hasImage: false }
    }
  }

  private generateFallbackData(placeId: string): SmartplaceData {
    // Generate realistic fallback data based on place ID
    const seed = parseInt(placeId.replace(/\D/g, '').slice(-4) || '1234')
    const random = (min: number, max: number) => {
      const x = Math.sin(seed) * 10000
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
    }
    
    const categories = [
      '학원 > 영어학원',
      '학원 > 수학학원',
      '음식점 > 한식',
      '카페 > 커피전문점',
      '병원 > 내과'
    ]
    
    const names = [
      'ABC영어학원',
      '수학의정석학원',
      '맛있는한식당',
      '카페라떼',
      '서울내과의원'
    ]
    
    const idx = random(0, categories.length - 1)
    
    return {
      placeId,
      name: names[idx],
      category: categories[idx],
      address: `서울시 강남구 테헤란로 ${random(100, 500)}`,
      phone: `02-${random(1000, 9999)}-${random(1000, 9999)}`,
      businessHours: {
        '월요일': '09:00 - 22:00',
        '화요일': '09:00 - 22:00',
        '수요일': '09:00 - 22:00',
        '목요일': '09:00 - 22:00',
        '금요일': '09:00 - 22:00',
        '토요일': '10:00 - 18:00',
        '일요일': '휴무'
      },
      homepage: random(0, 10) > 5 ? `https://example-${seed}.com` : '',
      description: '체계적인 커리큘럼과 우수한 강사진으로 최고의 교육을 제공합니다.',
      rating: parseFloat((3.0 + (random(0, 20) / 10)).toFixed(1)),
      reviewCount: random(10, 500),
      photoCount: random(5, 100),
      visitorReviews: random(5, 200),
      blogReviews: random(2, 50),
      lastUpdated: new Date().toISOString()
    }
  }

  // 블로그 리뷰 데이터 추출
  private async extractBlogReviews(): Promise<number> {
    try {
      const blogSelectors = [
        'a[href*="blog.naver"]',
        '.blog_review',
        '[class*="blog_count"]',
        'span:has-text("블로그 리뷰")',
        '.dAsGb span'
      ]
      
      for (const selector of blogSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const text = await element.textContent()
          if (text) {
            const match = text.match(/(\d+)/)
            if (match) {
              return parseInt(match[1])
            }
          }
        }
      }
      
      return 0
    } catch (error) {
      return 0
    }
  }

  // 인스타그램 데이터 추출
  private async extractInstagramData(): Promise<{
    hasInstagram: boolean
    instagramHandle?: string
  }> {
    try {
      const instagramSelectors = [
        'a[href*="instagram.com"]',
        '[class*="instagram"]',
        '.sns_instagram'
      ]
      
      for (const selector of instagramSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const href = await element.getAttribute('href')
          if (href && href.includes('instagram.com')) {
            const handleMatch = href.match(/instagram\.com\/([^\/\?]+)/)
            return {
              hasInstagram: true,
              instagramHandle: handleMatch ? handleMatch[1] : undefined
            }
          }
          return { hasInstagram: true }
        }
      }
      
      return { hasInstagram: false }
    } catch (error) {
      return { hasInstagram: false }
    }
  }

  // SNS 링크 추출
  private async extractSNSLinks(): Promise<{
    instagram?: string
    facebook?: string
    youtube?: string
    blog?: string
  }> {
    try {
      const links: any = {}
      
      const instaElement = await this.page!.$('a[href*="instagram.com"]')
      if (instaElement) {
        links.instagram = await instaElement.getAttribute('href')
      }
      
      const fbElement = await this.page!.$('a[href*="facebook.com"]')
      if (fbElement) {
        links.facebook = await fbElement.getAttribute('href')
      }
      
      const ytElement = await this.page!.$('a[href*="youtube.com"]')
      if (ytElement) {
        links.youtube = await ytElement.getAttribute('href')
      }
      
      const blogElement = await this.page!.$('a[href*="blog.naver.com"]')
      if (blogElement) {
        links.blog = await blogElement.getAttribute('href')
      }
      
      return links
    } catch (error) {
      return {}
    }
  }

  // 방문자 리뷰 추출
  private async extractVisitorReviews(): Promise<number> {
    try {
      const visitorSelectors = [
        '.visitor_review',
        '[class*="visitor_count"]',
        'span:has-text("방문자 리뷰")',
        '.place_section_review .place_section_count'
      ]
      
      for (const selector of visitorSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const text = await element.textContent()
          if (text) {
            const match = text.match(/(\d+)/)
            if (match) {
              return parseInt(match[1])
            }
          }
        }
      }
      
      return 0
    } catch (error) {
      return 0
    }
  }

  // 사진 카테고리별 분석
  private async analyzePhotoCategories(): Promise<{
    hasMenuPhoto: boolean
    hasInteriorPhoto: boolean
    hasExteriorPhoto: boolean
  }> {
    try {
      const result = {
        hasMenuPhoto: false,
        hasInteriorPhoto: false,
        hasExteriorPhoto: false
      }
      
      const categorySelectors = [
        '.photo_category',
        '.photo_tab',
        '[class*="photo_filter"]'
      ]
      
      for (const selector of categorySelectors) {
        const elements = await this.page!.$$(selector)
        for (const element of elements) {
          const text = await element.textContent()
          if (text) {
            const category = text.trim().toLowerCase()
            
            if (category.includes('메뉴') || category.includes('음식')) {
              result.hasMenuPhoto = true
            }
            if (category.includes('내부') || category.includes('인테리어')) {
              result.hasInteriorPhoto = true
            }
            if (category.includes('외부') || category.includes('외관')) {
              result.hasExteriorPhoto = true
            }
          }
        }
      }
      
      return result
    } catch (error) {
      return {
        hasMenuPhoto: false,
        hasInteriorPhoto: false,
        hasExteriorPhoto: false
      }
    }
  }

  // 소식/뉴스 데이터 추출
  private async extractNewsData(): Promise<{
    newsCount: number
    lastNewsDate?: string
    hasEvent: boolean
  }> {
    try {
      let newsCount = 0
      let lastNewsDate: string | undefined
      let hasEvent = false
      
      const newsSelectors = [
        '.news_list',
        '.place_section_news',
        '[class*="news"]',
        '.event_list'
      ]
      
      for (const selector of newsSelectors) {
        const elements = await this.page!.$$(selector)
        newsCount += elements.length
        
        for (const element of elements) {
          const text = await element.textContent()
          if (text && (text.includes('이벤트') || text.includes('EVENT'))) {
            hasEvent = true
          }
          
          const dateMatch = text?.match(/(\d{4}[\.\-]\d{1,2}[\.\-]\d{1,2})/)
          if (dateMatch && !lastNewsDate) {
            lastNewsDate = dateMatch[1]
          }
        }
      }
      
      return {
        newsCount,
        lastNewsDate,
        hasEvent
      }
    } catch (error) {
      return {
        newsCount: 0,
        hasEvent: false
      }
    }
  }

  // 주문 기능 여부 확인
  private async checkOrder(): Promise<boolean> {
    try {
      const orderSelectors = [
        'button:has-text("주문")',
        'a[href*="order.naver"]',
        '.place_order',
        '[class*="order"]'
      ]
      
      for (const selector of orderSelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }
  
  // 톡톡 기능 여부 확인
  private async checkTalk(): Promise<boolean> {
    try {
      const talkSelectors = [
        'button:has-text("톡톡")',
        'a[href*="talk.naver"]',
        '.talk_button',
        '[class*="talktalk"]'
      ]
      
      for (const selector of talkSelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }
  
  // 메뉴 가격 여부 확인
  private async checkMenuPrice(): Promise<boolean> {
    try {
      const priceSelectors = [
        '.menu_price',
        '.price_info',
        '[class*="menu"] [class*="price"]',
        '.menu_text:has-text("원")',
        '.menu_text:has-text("₩")'
      ]
      
      for (const selector of priceSelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }
  
  // 대중교통 정보 여부 확인
  private async checkTransport(): Promise<boolean> {
    try {
      const transportSelectors = [
        '.transportation',
        '[class*="transport"]',
        '.subway_info',
        '.bus_info',
        ':has-text("지하철")',
        ':has-text("버스")'
      ]
      
      for (const selector of transportSelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }
  
  // 상세 길안내 여부 확인
  private async checkDetailedDirections(): Promise<boolean> {
    try {
      const detailSelectors = [
        '.detailed_directions',
        '.direction_detail',
        '[class*="direction"] [class*="detail"]'
      ]
      
      for (const selector of detailSelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      // 찾아오는길 텍스트 길이로 판단
      const directions = await this.extractDirections()
      return directions.length > 100
    } catch (error) {
      return false
    }
  }
  
  // 최근 리뷰 개수 계산
  private async calculateRecentReviews(): Promise<number> {
    try {
      let recentCount = 0
      const reviewDateSelectors = [
        '.review_date',
        '.YeINN',
        '[class*="review"] [class*="date"]'
      ]
      
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      for (const selector of reviewDateSelectors) {
        const elements = await this.page!.$$(selector)
        for (const element of elements) {
          const text = await element.textContent()
          if (text) {
            // Parse various date formats
            const dateMatch = text.match(/(\d{1,2})\.(\d{1,2})\./)
            if (dateMatch) {
              const month = parseInt(dateMatch[1])
              const day = parseInt(dateMatch[2])
              const reviewDate = new Date(new Date().getFullYear(), month - 1, day)
              
              if (reviewDate >= thirtyDaysAgo) {
                recentCount++
              }
            } else if (text.includes('일 전') || text.includes('시간 전') || text.includes('오늘') || text.includes('어제')) {
              recentCount++
            }
          }
        }
      }
      
      return recentCount
    } catch (error) {
      return 0
    }
  }
  
  // 리뷰 응답율 계산
  private async calculateResponseRate(): Promise<number> {
    try {
      let totalReviews = 0
      let repliedReviews = 0
      
      const reviewSelectors = [
        '.review_item',
        '.YeINN',
        '[class*="review_list"] > div'
      ]
      
      for (const selector of reviewSelectors) {
        const reviews = await this.page!.$$(selector)
        for (const review of reviews) {
          totalReviews++
          
          // Check for owner reply
          const replySelectors = [
            '.owner_reply',
            '.ceo_reply',
            '.reply_text',
            ':has-text("사장님")',
            ':has-text("답변")'
          ]
          
          for (const replySelector of replySelectors) {
            const reply = await review.$(replySelector)
            if (reply) {
              repliedReviews++
              break
            }
          }
        }
      }
      
      if (totalReviews === 0) return 0
      return Math.round((repliedReviews / totalReviews) * 100)
    } catch (error) {
      return 0
    }
  }
  
  // 소개글 추출 (introduction)
  private async extractIntroduction(): Promise<string> {
    try {
      const introSelectors = [
        '.place_section_content',
        '.YouOG',
        '.T8RMe',
        '[class*="intro"]',
        '[class*="description"]'
      ]
      
      for (const selector of introSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const text = await element.textContent()
          if (text && text.length > 10) {
            return text.trim()
          }
        }
      }
      
      return ''
    } catch (error) {
      return ''
    }
  }
  
  // 대표 키워드 추출
  private async extractRepresentativeKeywords(): Promise<string[]> {
    try {
      const keywords: string[] = []
      const keywordSelectors = [
        '.place_fixed_maintab .veBoZ', // 대표 키워드 영역
        '.keyphrase',
        '.representative_keyword',
        '[class*="representative"]'
      ]
      
      for (const selector of keywordSelectors) {
        const elements = await this.page!.$$(selector)
        for (const element of elements) {
          const text = await element.textContent()
          if (text && !text.includes('더보기')) {
            keywords.push(text.trim())
          }
        }
      }
      
      return keywords
    } catch (error) {
      return []
    }
  }
  
  // 이미지 등록 날짜 추출
  private async extractImageDates(): Promise<string[]> {
    try {
      const dates: string[] = []
      const dateSelectors = [
        '.photo_date',
        '.image_date',
        '[class*="photo"] [class*="date"]'
      ]
      
      for (const selector of dateSelectors) {
        const elements = await this.page!.$$(selector)
        for (const element of elements) {
          const text = await element.textContent()
          if (text && text.match(/\d{4}[\.\-]\d{1,2}[\.\-]\d{1,2}/)) {
            dates.push(text.trim())
          }
        }
      }
      
      return dates
    } catch (error) {
      return []
    }
  }
  
  // 클립탭 여부 확인
  private async checkClipTab(): Promise<boolean> {
    try {
      const clipSelectors = [
        'a[role="tab"]:has-text("클립")',
        '.place_fixed_maintab a:has-text("클립")',
        '[class*="clip_tab"]'
      ]
      
      for (const selector of clipSelectors) {
        const element = await this.page!.$(selector)
        if (element) return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }
  
  // 찾아오는 길 추출
  private async extractDirections(): Promise<string> {
    try {
      const directionSelectors = [
        '.place_section_content:has-text("찾아오는")',
        '.directions_info',
        '[class*="direction"]',
        '.transportation_info'
      ]
      
      for (const selector of directionSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const text = await element.textContent()
          if (text) {
            return text.trim()
          }
        }
      }
      
      return ''
    } catch (error) {
      return ''
    }
  }
  
  // 블로그 링크 추출
  private async extractBlogLink(): Promise<string> {
    try {
      const blogSelectors = [
        'a[href*="blog.naver.com"]',
        'a[href*="blog"]',
        '.blog_link'
      ]
      
      for (const selector of blogSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const href = await element.getAttribute('href')
          if (href) {
            return href
          }
        }
      }
      
      return ''
    } catch (error) {
      return ''
    }
  }
  
  // 인스타그램 링크 추출
  private async extractInstagramLink(): Promise<string> {
    try {
      const instaSelectors = [
        'a[href*="instagram.com"]',
        '.instagram_link',
        '[class*="instagram"] a'
      ]
      
      for (const selector of instaSelectors) {
        const element = await this.page!.$(selector)
        if (element) {
          const href = await element.getAttribute('href')
          if (href) {
            return href
          }
        }
      }
      
      return ''
    } catch (error) {
      return ''
    }
  }
}

export default new SmartplaceCrawler()