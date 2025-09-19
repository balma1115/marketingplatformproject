import { chromium, Browser, Page } from 'playwright'

interface PlaceDetail {
  name: string
  category: string
  address: string
  phone: string
  businessHours: string
  description: string
  tabs: string[]
  hasReservation: boolean
  hasInquiry: boolean
  hasCoupon?: boolean
  amenities: string[]
  keywords: string[]
  images: string[]
  visitorReviewCount?: number
  blogReviewCount?: number
  reviewScore?: number
  responseRate?: string
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
  visitorReviews?: Array<{
    date: string
    hasReply: boolean
    content?: string
  }>
  blogReviews?: Array<{
    date: string
    title?: string
    author?: string
  }>
  hasSmartCall?: boolean
  priceDisplay?: {
    hasText: boolean
    hasImage: boolean
    textContent?: string
  }
  hasMenuPhoto?: boolean
  hasInteriorPhoto?: boolean
  hasExteriorPhoto?: boolean
  lastPhotoUpdate?: string
  newsCount?: number
  lastNewsDate?: string
  hasEvent?: boolean
  hasNotice?: boolean
  hasOrder?: boolean
  hasTalk?: boolean
}

export class PlaywrightCrawlerService {
  private browser: Browser | null = null

  async initialize() {
    if (!this.browser) {
      console.log('Initializing Playwright browser...')
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      })
      console.log('Playwright browser initialized')
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetail> {
    await this.initialize()
    
    const context = await this.browser!.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })

    const page = await context.newPage()
    
    try {
      console.log(`Navigating to place ${placeId}...`)
      // Normalize URL - always start from home tab regardless of input URL
      const url = `https://map.naver.com/p/entry/place/${placeId}?placePath=/home`
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      })

      // Wait for page to load
      await page.waitForTimeout(5000)
      
      // Work with iframe
      let workingPage: Page | any = page
      const entryIframe = await page.$('#entryIframe')
      if (entryIframe) {
        const frame = await entryIframe.contentFrame()
        if (frame) {
          console.log('Working inside iframe')
          workingPage = frame
        }
      }

      // Initialize result object
      const placeDetail: PlaceDetail = {
        name: '',
        category: '',
        address: '',
        phone: '',
        businessHours: '',
        description: '',
        tabs: [],
        hasReservation: false,
        hasInquiry: false,
        hasCoupon: false,
        hasOrder: false,
        hasTalk: false,
        amenities: [],
        keywords: [],
        images: [],
        visitorReviewCount: 0,
        blogReviewCount: 0,
        reviewScore: 0,
        responseRate: '',
        directions: '',
        blogLink: '',
        instagramLink: '',
        introduction: '',
        representativeKeywords: [],
        educationInfo: {
          hasRegistrationNumber: false,
          hasTuitionFee: false
        },
        imageRegistrationDates: [],
        hasClipTab: false,
        newsUpdateDates: [],
        visitorReviews: [],
        blogReviews: [],
        hasSmartCall: false,
        priceDisplay: {
          hasText: false,
          hasImage: false
        },
        hasMenuPhoto: false,
        hasInteriorPhoto: false,
        hasExteriorPhoto: false,
        lastPhotoUpdate: '',
        newsCount: 0,
        lastNewsDate: '',
        hasEvent: false,
        hasNotice: false
      }

      console.log('Collecting basic info from home tab...')
      
      // Try to extract business hours from home tab first
      const homeBusinessSection = await workingPage.$('.O8qbU.pSavy')
      if (homeBusinessSection) {
        const businessText = await homeBusinessSection.textContent()
        if (businessText && businessText.includes('운영')) {
          let cleanHours = businessText.replace('펼쳐보기', '').replace('접기', '')
          if (businessText.includes('운영 중')) {
            if (businessText.includes('21:00') || businessText.includes('21시')) {
              placeDetail.businessHours = '운영 중, 21:00에 운영 종료'
            } else {
              placeDetail.businessHours = cleanHours.substring(0, 200)
            }
            console.log('Business hours found on home tab:', placeDetail.businessHours)
          }
        }
      }

      // Extract category - improved selector
      const categoryElement = await workingPage.$('span.lnJFt')
      if (categoryElement) {
        placeDetail.category = await categoryElement.textContent() || ''
        console.log('Category found:', placeDetail.category)
      }

      // Extract name
      const nameElement = await workingPage.$('.GHAhO')
      if (nameElement) {
        placeDetail.name = await nameElement.textContent() || ''
      }

      // Extract address - click expand button and get full address
      try {
        const addressExpandButton = await workingPage.$('#app-root > div > div > div:nth-child(6) > div > div:nth-child(2) > div.place_section_content > div > div.O8qbU.AZ9_F > div > div > a > span.rvCSr')
        if (addressExpandButton) {
          console.log('Clicking address expand button...')
          await addressExpandButton.click()
          await page.waitForTimeout(1000)
        }
        
        // Get address from the expanded section
        const addressSection = await workingPage.$('#app-root > div > div > div:nth-child(6) > div > div:nth-child(2) > div.place_section_content > div > div.O8qbU.AZ9_F > div')
        if (addressSection) {
          const addressText = await addressSection.textContent()
          if (addressText) {
            // Extract just the address part (remove '찾아오는길' label if present)
            const cleanAddress = addressText.replace('찾아오는길', '').trim()
            placeDetail.address = cleanAddress
            console.log('Address found from expanded section:', placeDetail.address)
          }
        }
      } catch (e) {
        console.log('Error extracting address:', e.message)
      }
      
      // If address not found, try to extract from business hours text if it contains address
      if (!placeDetail.address && placeDetail.businessHours) {
        const addressMatch = placeDetail.businessHours.match(/도로명 주소 : ([^●\n]*)/)
        if (addressMatch) {
          placeDetail.address = addressMatch[1].trim()
          console.log('Address extracted from business hours text:', placeDetail.address)
          
          // Clean up business hours to remove address
          const hoursOnlyMatch = placeDetail.businessHours.match(/영업시간[^●]*/)
          if (hoursOnlyMatch) {
            placeDetail.businessHours = hoursOnlyMatch[0].trim()
          }
        }
      }

      // Extract phone and check for SmartCall
      const phoneElement = await workingPage.$('.xlx7Q')
      if (phoneElement) {
        placeDetail.phone = await phoneElement.textContent() || ''
        // Check if it's a SmartCall number (starts with 0507, 0508, etc.)
        if (placeDetail.phone.startsWith('0507') || placeDetail.phone.startsWith('0508')) {
          placeDetail.hasSmartCall = true
          console.log('SmartCall detected:', placeDetail.phone)
        }
      }
      
      // Check for price image ON HOME TAB
      console.log('Checking for price image on home tab...')
      const homePriceSelectors = ['.O8qbU.tXI2c', '.place_section_content .tXI2c', 'div.tXI2c']
      for (const selector of homePriceSelectors) {
        const priceSection = await workingPage.$(selector)
        if (priceSection) {
          // Check if it has images or nested divs (usually means image content)
          const hasImages = await priceSection.$$('img')
          const hasNestedDiv = await priceSection.$('div > div')
          
          if (hasImages.length > 0 || hasNestedDiv) {
            placeDetail.priceDisplay!.hasImage = true
            console.log(`Price image found on HOME tab with selector: ${selector}`)
            break
          }
        }
      }

      // Check for reservation button
      const reservationButton = await workingPage.$('span:has-text("예약")')
      if (reservationButton) {
        placeDetail.hasReservation = true
        console.log('Reservation button found')
      }

      // Check for inquiry button
      const inquiryButton = await workingPage.$('span:has-text("문의")')
      if (inquiryButton) {
        placeDetail.hasInquiry = true
        console.log('Inquiry button found')
      }

      // Extract tabs - filter out navigation items
      const tabElements = await workingPage.$$('.place_fixed_maintab a')
      for (const tab of tabElements) {
        const tabName = await tab.textContent()
        if (tabName && !['이전 페이지', '페이지 닫기', '이전', '다음'].includes(tabName.trim())) {
          placeDetail.tabs.push(tabName.trim())
        }
      }
      console.log('Tabs found:', placeDetail.tabs)

      // Check for coupon
      placeDetail.hasCoupon = placeDetail.tabs.includes('쿠폰')

      // Extract visitor and blog review counts
      const visitorReviewElement = await workingPage.$('span:has-text("방문자리뷰") > a, span:has-text("방문자 리뷰") > a')
      if (visitorReviewElement) {
        const text = await visitorReviewElement.textContent()
        const match = text?.match(/\d+/)
        if (match) {
          placeDetail.visitorReviewCount = parseInt(match[0])
          console.log('Visitor reviews count:', placeDetail.visitorReviewCount)
        }
      }

      const blogReviewElement = await workingPage.$('span:has-text("블로그리뷰") > a, span:has-text("블로그 리뷰") > a')
      if (blogReviewElement) {
        const text = await blogReviewElement.textContent()
        const match = text?.match(/\d+/)
        if (match) {
          placeDetail.blogReviewCount = parseInt(match[0])
          console.log('Blog reviews count:', placeDetail.blogReviewCount)
        }
      }

      // Click on info tab if exists
      console.log('Checking info tab...')
      const infoTabElement = await workingPage.$('a:has-text("정보")')
      if (infoTabElement) {
        await infoTabElement.click()
        await page.waitForTimeout(3000)
        
        // Click 더보기 button if exists
        const moreButton = await workingPage.$('a:has-text("더보기")')
        if (moreButton) {
          await moreButton.click()
          await page.waitForTimeout(1500)
        }
        
        // Get the full info text for parsing - use introduction element
        let fullInfoText = ''
        const introTextElement = await workingPage.$('.pvuWY')
        if (introTextElement) {
          fullInfoText = await introTextElement.textContent() || ''
          // If text is too long (probably got CSS), clear it
          if (fullInfoText.length > 10000) {
            console.log('Text too long, likely CSS content. Skipping.')
            fullInfoText = ''
          } else {
            console.log('Got full info text from intro, length:', fullInfoText.length)
          }
        }
        
        // Extract introduction
        const introElement = await workingPage.$('.pvuWY > div')
        if (introElement) {
          placeDetail.introduction = await introElement.textContent() || ''
          console.log('Introduction found, length:', placeDetail.introduction.length)
        }
        
        // Extract representative keywords with multiple selectors
        const keywordSelectors = ['.bgt3S span', '.x8JmK', 'span.x8JmK', '.dNaWM span']
        for (const selector of keywordSelectors) {
          const keywordElements = await workingPage.$$(selector)
          if (keywordElements.length > 0) {
            for (const element of keywordElements) {
              const keyword = await element.textContent()
              if (keyword && keyword.trim() && !keyword.includes('더보기') && keyword.length < 50) {
                placeDetail.representativeKeywords?.push(keyword.trim())
              }
            }
            if (placeDetail.representativeKeywords && placeDetail.representativeKeywords.length > 0) {
              console.log('Keywords found:', placeDetail.representativeKeywords)
              break
            }
          }
        }
        
        // Extract directions/address
        const directionsElement = await workingPage.$('[class*="directions"], [class*="location"]')
        if (directionsElement) {
          placeDetail.directions = await directionsElement.textContent() || ''
        }

        // Extract price information - check menu/price tab first
        const priceTabElement = await workingPage.$('a[role="tab"]:has-text("가격"), a[role="tab"]:has-text("메뉴")')
        if (priceTabElement) {
          await priceTabElement.click()
          await page.waitForTimeout(2000)
          
          // Check for price text
          const priceTextSelectors = ['.O8qbU.tQX7D', '.tQX7D', '.pSJyY', '.K7RXh', 'text=/원/']
          for (const selector of priceTextSelectors) {
            const element = await workingPage.$(selector)
            if (element) {
              const text = await element.textContent()
              if (text && (text.includes('원') || text.includes('수강') || text.includes('등록'))) {
                placeDetail.priceDisplay!.hasText = true
                placeDetail.priceDisplay!.textContent = text.trim().substring(0, 200)
                console.log('Price text found')
                break
              }
            }
          }
          
          // Note: Price images are checked on home tab, not here
          
          // Go back to info tab
          const infoTab2 = await workingPage.$('a[role="tab"]:has-text("정보")')
          if (infoTab2) {
            await infoTab2.click()
            await page.waitForTimeout(2000)
          }
        }
        
        // Also check if price info is in business hours text
        if (!placeDetail.priceDisplay?.hasText && placeDetail.businessHours && placeDetail.businessHours.includes('상품')) {
          const priceMatch = placeDetail.businessHours.match(/상품[^●]*/)
          if (priceMatch && priceMatch[0].includes('원')) {
            placeDetail.priceDisplay!.hasText = true
            placeDetail.priceDisplay!.textContent = priceMatch[0].substring(0, 200)
            console.log('Price found in business hours text')
          }
        }

        // Extract business hours - use more flexible selectors
        try {
          // Try to find and click expand button
          const hoursExpandButton = await workingPage.$('.O8qbU.pSavy a:has-text("펼쳐보기"), .O8qbU.pSavy button:has-text("펼쳐보기")')
          if (hoursExpandButton) {
            console.log('Clicking business hours expand button...')
            await hoursExpandButton.click()
            await page.waitForTimeout(1000)
          }
          
          // Get business hours from the section
          const hoursSection = await workingPage.$('.O8qbU.pSavy')
          if (hoursSection) {
            const hoursText = await hoursSection.textContent()
            if (hoursText && hoursText.includes('운영')) {
              // Clean up the text
              let cleanHours = hoursText
              // Remove expand/collapse buttons text
              cleanHours = cleanHours.replace('펼쳐보기', '').replace('접기', '')
              // Extract just the operating status and hours
              if (hoursText.includes('운영 중')) {
                const match = hoursText.match(/운영 중.*?(\d{1,2}:또는 \d{1,2}시).*?운영 종료/)
                if (match) {
                  placeDetail.businessHours = match[0]
                } else if (hoursText.includes('21:00') || hoursText.includes('21시')) {
                  placeDetail.businessHours = '운영 중, 21:00에 운영 종료'
                } else {
                  placeDetail.businessHours = cleanHours.substring(0, 200)
                }
              } else {
                placeDetail.businessHours = cleanHours.substring(0, 200)
              }
              console.log('Business hours found:', placeDetail.businessHours)
            }
          }
        } catch (e) {
          console.log('Error extracting business hours:', e.message)
        }
        
        // Fallback: Extract from fullInfoText if available
        if ((!placeDetail.businessHours || placeDetail.businessHours === '영업시간 정보 없음') && fullInfoText && fullInfoText.includes('영업시간')) {
          const hoursMatch = fullInfoText.match(/영업시간([^옵션상품]*)/)
          if (hoursMatch) {
            const hoursText = hoursMatch[1].trim()
            // Extract day and time patterns
            const dayPattern = /([월화수목금토일])\s*(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/g
            let businessHours = []
            let match
            while ((match = dayPattern.exec(hoursText)) !== null) {
              businessHours.push(`${match[1]} ${match[2]} ~ ${match[3]}`)
            }
            if (businessHours.length > 0) {
              placeDetail.businessHours = businessHours.join(', ')
              console.log('Business hours extracted from fullInfoText:', placeDetail.businessHours)
            }
          }
        }
        
        // Fallback to element selectors if not found
        if (!placeDetail.businessHours || placeDetail.businessHours === '영업시간 정보 없음') {
          const businessHoursSelectors = ['.O8qbU.pSavy .A_cdD .i8cJw .H3ua4', '.A_cdD .H3ua4', 'span.H3ua4']
          for (const selector of businessHoursSelectors) {
            const hoursElement = await workingPage.$(selector)
            if (hoursElement) {
              const hoursText = await hoursElement.textContent()
              if (hoursText && hoursText.includes(':')) {
                placeDetail.businessHours = hoursText.trim().substring(0, 200)
                console.log('Business hours found from element:', placeDetail.businessHours)
                break
              }
            }
          }
        }
        
        // Extract address from fullInfoText if not already found
        if (!placeDetail.address && fullInfoText) {
          const addressMatch = fullInfoText.match(/도로명 주소\s*:\s*([^영업\n]*)/)
          if (addressMatch) {
            placeDetail.address = addressMatch[1].trim()
            console.log('Address extracted from fullInfoText:', placeDetail.address)
          }
        }
        
        // Don't extract keywords from fullInfoText as it may contain CSS/HTML
        // Keywords should be extracted from specific elements only
        
        // Extract price info from fullInfoText or introduction
        if (!placeDetail.priceDisplay?.hasText) {
          if (placeDetail.introduction && placeDetail.introduction.includes('원')) {
            placeDetail.priceDisplay!.hasText = true
            const priceMatches = placeDetail.introduction.match(/(\d{3,})원/g)
            if (priceMatches && priceMatches.length > 0) {
              placeDetail.priceDisplay!.textContent = `가격 정보: ${priceMatches.slice(0, 3).join(', ')}`
              console.log('Price found in introduction:', placeDetail.priceDisplay!.textContent)
            }
          } else if (fullInfoText && fullInfoText.includes('원')) {
            placeDetail.priceDisplay!.hasText = true
            const priceMatches = fullInfoText.match(/(\d{3,})원/g)
            if (priceMatches && priceMatches.length > 0) {
              placeDetail.priceDisplay!.textContent = `가격 정보: ${priceMatches.slice(0, 3).join(', ')}`
              console.log('Price found in fullInfoText')
            }
          }
        }
      }

      // Extract image dates from photo tab
      console.log('Extracting image dates...')
      try {
        const photoTabElement = await workingPage.$('a:has-text("사진")')
        if (photoTabElement) {
          await photoTabElement.click()
          await page.waitForTimeout(2000)

          // Get first 5 images - don't navigate through gallery to avoid timeout
          const imgElements = await workingPage.$$('img[src*="phinf.naver.net"], img[src*="search.pstatic.net"]')
          const maxImages = Math.min(5, imgElements.length)

          for (let i = 0; i < maxImages; i++) {
            const src = await imgElements[i].getAttribute('src')
            if (src) {
              // Extract date from URL (format: YYYYMMDD)
              const dateMatch = src.match(/(\d{8})/)
              if (dateMatch) {
                const dateStr = dateMatch[1]
                const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
                placeDetail.imageRegistrationDates?.push(formattedDate)
              } else {
                placeDetail.imageRegistrationDates?.push('날짜 정보 없음')
              }
            }
          }
          console.log('Image dates extracted:', placeDetail.imageRegistrationDates)
        }
      } catch (photoError) {
        console.log('Error extracting photo dates, continuing:', photoError.message)
      }

      // Extract review details
      console.log('Checking review tab...')
      const reviewTabElement = await workingPage.$('a:has-text("리뷰")')
      if (reviewTabElement) {
        await reviewTabElement.click()
        await page.waitForTimeout(3000)
        
        // Click visitor reviews sub-tab
        const visitorReviewTab = await workingPage.$('a:has-text("방문자")')
        if (visitorReviewTab) {
          await visitorReviewTab.click()
          await page.waitForTimeout(2000)
          
          // Extract visitor reviews (up to 5)
          const reviewItems = await workingPage.$$('#_review_list > li')
          const maxReviews = Math.min(5, reviewItems.length)
          
          for (let i = 0; i < maxReviews; i++) {
            const review = reviewItems[i]
            
            // Extract date - look for date pattern
            const dateElement = await review.$('[class*="date"], span:has-text("년"), span:has-text("월")')
            let date = ''
            if (dateElement) {
              const dateText = await dateElement.textContent()
              // Extract date in format YYYY-MM-DD
              const yearMatch = dateText?.match(/(\d{4})년/)
              const monthMatch = dateText?.match(/(\d{1,2})월/)
              const dayMatch = dateText?.match(/(\d{1,2})일/)
              
              if (yearMatch && monthMatch && dayMatch) {
                const year = yearMatch[1]
                const month = monthMatch[1].padStart(2, '0')
                const day = dayMatch[1].padStart(2, '0')
                date = `${year}-${month}-${day}`
              } else {
                date = dateText || ''
              }
            }
            
            // Check for owner reply - more accurate selector
            const replyElement = await review.$('.pui__GbW8H7, [class*="reply"], [class*="owner"], [class*="answer"]')
            const hasReply = !!replyElement
            
            placeDetail.visitorReviews?.push({
              date: date.trim(),
              hasReply
            })
          }
          console.log('Visitor reviews extracted:', placeDetail.visitorReviews)
        }
        
        // Click blog reviews sub-tab
        const blogReviewTab = await workingPage.$('a:has-text("블로그")')
        if (blogReviewTab) {
          await blogReviewTab.click()
          await page.waitForTimeout(2000)
          
          // Click latest sort if available
          const latestSortButton = await workingPage.$('a:has-text("최신순")')
          if (latestSortButton) {
            await latestSortButton.click()
            await page.waitForTimeout(1500)
          }
          
          // Navigate to blog reviews subtab
          console.log('Clicking blog review subtab...')
          const blogReviewSubtab = await workingPage.$('#_subtab_view > div > a:nth-child(2)')
          if (blogReviewSubtab) {
            await blogReviewSubtab.click()
            await page.waitForTimeout(2000)
            
            // Click on "최신순" (latest) sorting option
            console.log('Clicking latest sort option...')
            const latestSortButton = await workingPage.$('#app-root > div > div > div:nth-child(7) > div:nth-child(3) > div > div.place_section_content > div > div > div.fHbwT > div > a:nth-child(2)')
            if (latestSortButton) {
              await latestSortButton.click()
              await page.waitForTimeout(2000)
            }
            
            // Extract blog review dates from the list
            const blogReviewList = await workingPage.$('#app-root > div > div > div:nth-child(7) > div:nth-child(3) > div > div.place_section_content > ul')
            if (blogReviewList) {
              // Get all list items
              const listItems = await blogReviewList.$$('li')
              const maxReviews = Math.min(5, listItems.length)
              
              for (let i = 0; i < maxReviews; i++) {
                // Extract date from each review item
                const dateSelector = `li:nth-child(${i + 1}) > a > div.pui__ohfV4v > div.pui__K2Boyb > div.u5XwJ > span > span`
                const dateElement = await blogReviewList.$(dateSelector)
                
                if (dateElement) {
                  const dateText = await dateElement.textContent()
                  if (dateText) {
                    // Format: YYYY년 M월 D일 요일 -> YYYY-MM-DD
                    const fullDateMatch = dateText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
                    if (fullDateMatch) {
                      const year = fullDateMatch[1]
                      const month = fullDateMatch[2].padStart(2, '0')
                      const day = fullDateMatch[3].padStart(2, '0')
                      const formattedDate = `${year}-${month}-${day}`
                      
                      placeDetail.blogReviews?.push({
                        date: formattedDate,
                        title: '',
                        author: ''
                      })
                    } else {
                      // Fallback: YY.MM.DD. -> YYYY-MM-DD
                      const dateMatch = dateText.match(/(\d{2})\.(\d{2})\.(\d{2})/)
                      if (dateMatch) {
                        const year = '20' + dateMatch[1]
                        const month = dateMatch[2]
                        const day = dateMatch[3]
                        const formattedDate = `${year}-${month}-${day}`
                        
                        placeDetail.blogReviews?.push({
                          date: formattedDate,
                          title: '',
                          author: ''
                        })
                      }
                    }
                  }
                }
              }
              
              if (placeDetail.blogReviews && placeDetail.blogReviews.length > 0) {
                console.log('Blog review dates extracted:', placeDetail.blogReviews.map(r => typeof r === 'string' ? r : r.date))
              }
            }
          } else {
            console.log('Blog review subtab not found')
          }
          console.log('Blog reviews extracted:', placeDetail.blogReviews)
        }
      }

      // Go back to info tab for social links
      console.log('Going back to info tab for social links...')
      const infoTabForLinks = await workingPage.$('a[role="tab"]:has-text("정보")')
      if (infoTabForLinks) {
        await infoTabForLinks.click()
        await page.waitForTimeout(2000)
      }
      
      // Extract social links
      const blogLinkElement = await workingPage.$('a[href*="blog.naver.com"]')
      if (blogLinkElement) {
        placeDetail.blogLink = await blogLinkElement.getAttribute('href') || ''
        console.log('Blog link found:', placeDetail.blogLink)
      }

      // Extract Instagram link - check all possible locations
      const instagramSelectors = [
        'a[href*="instagram.com"]',
        'a[href*="instagram"]',
        '[class*="instagram"] a',
        'a:has-text("인스타그램")',
        '.place_section a[href*="instagram"]'
      ]
      
      for (const selector of instagramSelectors) {
        try {
          const instagramLinkElement = await workingPage.$(selector)
          if (instagramLinkElement) {
            const href = await instagramLinkElement.getAttribute('href')
            if (href && href.includes('instagram')) {
              placeDetail.instagramLink = href
              console.log('Instagram link found:', placeDetail.instagramLink)
              break
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // If not found, check all links on page
      if (!placeDetail.instagramLink) {
        const allLinks = await workingPage.$$('a')
        for (const link of allLinks) {
          const href = await link.getAttribute('href')
          if (href && href.includes('instagram')) {
            placeDetail.instagramLink = href
            console.log('Instagram link found in all links:', placeDetail.instagramLink)
            break
          }
        }
      }

      console.log('=== EXTRACTION COMPLETE ===')
      console.log('Extracted data summary:', {
        name: placeDetail.name,
        category: placeDetail.category,
        phone: placeDetail.phone,
        hasSmartCall: placeDetail.hasSmartCall,
        hasReservation: placeDetail.hasReservation,
        hasInquiry: placeDetail.hasInquiry,
        hasCoupon: placeDetail.hasCoupon,
        introduction: placeDetail.introduction?.substring(0, 100),
        representativeKeywords: placeDetail.representativeKeywords,
        visitorReviews: placeDetail.visitorReviews,
        blogReviews: placeDetail.blogReviews,
        imageRegistrationDates: placeDetail.imageRegistrationDates,
        priceInfo: placeDetail.priceDisplay,
        instagramLink: placeDetail.instagramLink
      })

      await context.close()
      return placeDetail

    } catch (error) {
      console.error('Error during crawling:', error)
      await context.close()

      // Return partial data instead of throwing error
      if (placeDetail && placeDetail.name) {
        console.log('Returning partial data due to error')
        return placeDetail
      }

      throw error
    }
  }
}

export const playwrightCrawlerService = new PlaywrightCrawlerService()