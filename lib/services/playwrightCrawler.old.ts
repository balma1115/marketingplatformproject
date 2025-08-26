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
  }>
  blogReviews?: string[]
  hasSmartCall?: boolean
  priceDisplay?: {
    hasText: boolean
    hasImage: boolean
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
          '--no-sandbox'
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
      const url = `https://map.naver.com/p/entry/place/${placeId}`
      
      console.log('URL:', url)
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      })

      // 페이지가 완전히 로드될 때까지 대기
      await page.waitForTimeout(5000)
      
      // iframe 찾기 로직
      console.log(`\n=== SEARCHING FOR TARGET IFRAME ===`)
      let workingPage: Page | any = null
      let placeName = ''
      
      try {
        // 1. 먼저 #entryIframe으로 정확한 iframe 찾기
        console.log('🔍 entryIframe 찾기 시작...')
        const entryIframe = await page.$('#entryIframe')
        if (entryIframe) {
          const entryFrame = await entryIframe.contentFrame()
          if (entryFrame) {
            console.log('✅ entryIframe 발견 및 접근 성공')
            workingPage = entryFrame
          }
        }
      } catch (error: any) {
        console.log('entryIframe 접근 오류:', error.message)
      }
      
      // 2. entryIframe에서 찾지 못한 경우 모든 iframe 검색
      if (!workingPage) {
        console.log('\n🔍 대체 iframe 검색 시작...')
        const iframes = await page.$$('iframe')
        console.log(`총 ${iframes.length}개의 iframe 발견`)
        
        for (let i = 0; i < iframes.length; i++) {
          try {
            const frame = await iframes[i].contentFrame()
            if (frame) {
              const titleElement = await frame.$('#_title > div > span.GHAhO')
              if (titleElement) {
                placeName = await frame.evaluate(el => el.textContent, titleElement) || ''
                if (placeName.trim()) {
                  workingPage = frame
                  console.log(`*** 업체명 찾음 (iframe ${i}) ***`)
                  console.log('업체명:', placeName)
                  break
                }
              }
            }
          } catch (error) {
            // iframe 접근 실패 시 다음 iframe으로
            continue
          }
        }
      }

      // 작업할 페이지가 없으면 메인 페이지 사용
      if (!workingPage) {
        console.log('iframe을 찾을 수 없어 메인 페이지 사용')
        workingPage = page
      }

      // 정보 추출
      const placeDetail: PlaceDetail = await this.extractPlaceInfo(workingPage, placeId)
      
      return placeDetail
      
    } finally {
      await context.close()
    }
  }

  private async extractPlaceInfo(page: any, placeId: string): Promise<PlaceDetail> {
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

    try {
      // 업체명
      const nameElement = await page.$('#_title > div > span.GHAhO')
      if (nameElement) {
        placeDetail.name = await page.evaluate((el: any) => el.textContent, nameElement) || ''
      }

      // 카테고리
      const categoryElement = await page.$('.DJJvD')
      if (categoryElement) {
        placeDetail.category = await page.evaluate((el: any) => el.textContent, categoryElement) || ''
      }

      // 주소
      const addressElement = await page.$('.PkgBl')
      if (addressElement) {
        placeDetail.address = await page.evaluate((el: any) => el.textContent, addressElement) || ''
      }

      // 전화번호 - 개선된 선택자
      const phoneElement = await page.$('.xlx7Q')
      if (phoneElement) {
        placeDetail.phone = await page.evaluate((el: any) => el.textContent, phoneElement) || ''
      } else {
        // 대체 방법: 전화번호 패턴 검색
        const phoneText = await page.evaluate(() => {
          const spans = document.querySelectorAll('span')
          for (const span of spans) {
            const text = span.textContent || ''
            if (text.match(/\d{2,4}-\d{3,4}-\d{4}/) || text.includes('0507')) {
              return text.trim()
            }
          }
          return ''
        })
        placeDetail.phone = phoneText
      }

      // 영업시간
      const hoursElement = await page.$('.MxgIj')
      if (hoursElement) {
        placeDetail.businessHours = await page.evaluate((el: any) => el.textContent, hoursElement) || ''
      }

      // 탭 목록
      const tabElements = await page.$$('.veBoZ')
      for (const tab of tabElements) {
        const tabText = await page.evaluate((el: any) => el.textContent, tab)
        if (tabText) {
          placeDetail.tabs.push(tabText)
        }
      }

      // 예약/문의/주문/톡톡 버튼 확인
      const reservationButton = await page.$('[data-nclicks-area-code="btp"]')
      placeDetail.hasReservation = !!reservationButton
      
      const inquiryButton = await page.$('[data-nclicks-area-code="qna"]')
      placeDetail.hasInquiry = !!inquiryButton

      const orderButton = await page.$('[data-nclicks-area-code="ord"]')
      placeDetail.hasOrder = !!orderButton

      const talkButton = await page.$('[data-nclicks-area-code="tlk"]')
      placeDetail.hasTalk = !!talkButton

      // 이미지 개수 및 타입 분석
      const imageElements = await page.$$('.K0PDV')
      placeDetail.images = new Array(imageElements.length).fill('image')
      
      // 메뉴/내부/외부 사진 확인 (이미지 alt 텍스트나 주변 텍스트로 판단)
      const menuPhotoEl = await page.$('[alt*="메뉴"]')
      placeDetail.hasMenuPhoto = !!menuPhotoEl
      
      const interiorPhotoEl = await page.$('[alt*="내부"], [alt*="인테리어"]')
      placeDetail.hasInteriorPhoto = !!interiorPhotoEl
      
      const exteriorPhotoEl = await page.$('[alt*="외부"], [alt*="외관"]')
      placeDetail.hasExteriorPhoto = !!exteriorPhotoEl

      // 리뷰 정보
      const visitorReviewElement = await page.$('.dAsGb .YwYLL')
      if (visitorReviewElement) {
        const reviewText = await page.evaluate((el: any) => el.textContent, visitorReviewElement)
        const match = reviewText?.match(/\d+/)
        if (match) {
          placeDetail.visitorReviewCount = parseInt(match[0])
        }
      }

      // 블로그 리뷰 개수
      const blogReviewElement = await page.$('.ugMJl .YwYLL')
      if (blogReviewElement) {
        const reviewText = await page.evaluate((el: any) => el.textContent, blogReviewElement)
        const match = reviewText?.match(/\d+/)
        if (match) {
          placeDetail.blogReviewCount = parseInt(match[0])
        }
      }

      // 평점
      const ratingElement = await page.$('.PXMot')
      if (ratingElement) {
        const ratingText = await page.evaluate((el: any) => el.textContent, ratingElement)
        const match = ratingText?.match(/[\d.]+/)
        if (match) {
          placeDetail.reviewScore = parseFloat(match[0])
        }
      }

      // SNS 링크
      const blogLinkElement = await page.$('a[href*="blog.naver.com"]')
      if (blogLinkElement) {
        placeDetail.blogLink = await page.evaluate((el: any) => el.href, blogLinkElement) || ''
      }

      const instagramLinkElement = await page.$('a[href*="instagram.com"]')
      if (instagramLinkElement) {
        placeDetail.instagramLink = await page.evaluate((el: any) => el.href, instagramLinkElement) || ''
      }

      // 정보 탭 클릭하여 추가 데이터 수집
      console.log('Looking for 정보 tab...')
      // 다양한 선택자 시도
      let infoTab = await page.$('a.veBoZ:has-text("정보")')
      if (!infoTab) {
        infoTab = await page.$('[role="tab"]:has-text("정보")')
      }
      if (!infoTab) {
        infoTab = await page.$('a:has-text("정보")')
      }
      if (!infoTab) {
        // 모든 탭 요소에서 정보 탭 찾기
        const allTabs = await page.$$('.veBoZ')
        for (const tab of allTabs) {
          const text = await page.evaluate((el: any) => el.textContent, tab)
          if (text && text.trim() === '정보') {
            infoTab = tab
            break
          }
        }
      }
      
      if (infoTab) {
        console.log('✅ Found 정보 tab, clicking...')
        await infoTab.click()
        await page.waitForTimeout(3000)
        
        // 소개글 찾기
        console.log('Looking for introduction...')
        const introElement = await page.$('.zPfVt')
        if (introElement) {
          placeDetail.introduction = await page.evaluate((el: any) => el.textContent, introElement) || ''
          console.log('✅ Found introduction:', placeDetail.introduction.substring(0, 50))
        } else {
          console.log('❌ Introduction not found with .zPfVt selector')
        }
        
        // 찾아오는길/주차 정보
        const directionData = await page.evaluate(() => {
          const sections = document.querySelectorAll('.place_section_content')
          for (const section of sections) {
            const text = section.textContent || ''
            if (text.includes('주차') || text.includes('찾아오') || text.includes('CU편의점')) {
              return text.trim()
            }
          }
          return ''
        })
        placeDetail.directions = directionData
        console.log('Directions found:', directionData ? directionData.substring(0, 50) : 'None')
        
        // 편의시설
        const amenityData = await page.evaluate(() => {
          const amenities: string[] = []
          const sections = document.querySelectorAll('.place_section_content')
          for (const section of sections) {
            const text = section.textContent || ''
            if (text.includes('대기공간') || text.includes('화장실') || text.includes('무선 인터넷')) {
              // 편의시설 텍스트 파싱
              const items = text.match(/[가-힣]+\s*[가-힣\s/]+(?=[가-힣]|$)/g)
              if (items) {
                items.forEach(item => {
                  const trimmed = item.trim()
                  if (trimmed && !amenities.includes(trimmed)) {
                    amenities.push(trimmed)
                  }
                })
              }
            }
          }
          return amenities
        })
        placeDetail.amenities = amenityData
        console.log('Amenities found:', amenityData.length, 'items')
        
        // 대표 키워드
        const keywordData = await page.evaluate(() => {
          const keywords: string[] = []
          const sections = document.querySelectorAll('.place_section_content')
          for (const section of sections) {
            const text = section.textContent || ''
            // 키워드처럼 보이는 연속된 단어들 찾기
            if (text.includes('초등수학') || text.includes('영어학원') || text.includes('탄벌동')) {
              const words = text.match(/[가-힣0-9]+(?:초|중|영어|수학|학원|동)/g)
              if (words) {
                words.forEach(word => {
                  if (word && !keywords.includes(word)) {
                    keywords.push(word)
                  }
                })
              }
            }
          }
          return keywords
        })
        placeDetail.representativeKeywords = keywordData
        console.log('Keywords found:', keywordData.length, 'items')
        
        // 교육청 정보 수집 (학원인 경우)
        if (placeDetail.category && placeDetail.category.includes('학원')) {
          const educationData = await page.evaluate(() => {
            const result = {
              hasRegistrationNumber: false,
              hasTuitionFee: false,
              registrationNumber: '',
              tuitionFees: [] as string[]
            }
            
            const allText = document.body.innerText
            
            // 등록번호 찾기
            const regMatch = allText.match(/등록번호[：\s]*([^\n]+)/)
            if (regMatch) {
              result.hasRegistrationNumber = true
              result.registrationNumber = regMatch[1].trim()
            }
            
            // 교습비 정보 찾기
            const tuitionMatches = allText.match(/교습비[：\s]*([^\n]+)/g)
            if (tuitionMatches) {
              result.hasTuitionFee = true
              tuitionMatches.forEach(match => {
                result.tuitionFees.push(match.replace(/교습비[：\s]*/, '').trim())
              })
            }
            
            return result
          })
          
          placeDetail.educationInfo = educationData
        }
        
        // 홈 탭으로 돌아가기
        const homeTab = await page.$('a.veBoZ:has-text("홈")')
        if (homeTab) {
          await homeTab.click()
          await page.waitForTimeout(1000)
        }
      } else {
        // 정보 탭이 없는 경우 기본 방법 시도
        const introElement = await page.$('.WoYOw')
        if (introElement) {
          placeDetail.introduction = await page.evaluate((el: any) => el.textContent, introElement) || ''
        }
        
        const directionsElement = await page.$('.nNPOq')
        if (directionsElement) {
          placeDetail.directions = await page.evaluate((el: any) => el.textContent, directionsElement) || ''
        }
        
        const keywordElements = await page.$$('.DUNfc')
        for (const keyword of keywordElements) {
          const keywordText = await page.evaluate((el: any) => el.textContent, keyword)
          if (keywordText) {
            placeDetail.representativeKeywords?.push(keywordText)
          }
        }
      }

      // 스마트콜 확인 (0507 번호)
      if (placeDetail.phone && placeDetail.phone.includes('0507')) {
        placeDetail.hasSmartCall = true
      }

      // 클립 탭 확인
      placeDetail.hasClipTab = placeDetail.tabs.includes('클립')

      // 쿠폰 탭 확인 - 탭 목록에 쿠폰이 있으면 true
      placeDetail.hasCoupon = placeDetail.tabs.includes('쿠폰')

      // 소식 개수 확인
      if (placeDetail.tabs.includes('소식')) {
        const newsElements = await page.$$('.place_section_content')
        placeDetail.newsCount = newsElements.length
        
        // 이벤트/공지 확인
        const eventElement = await page.$('[class*="event"]')
        placeDetail.hasEvent = !!eventElement
        
        const noticeElement = await page.$('[class*="notice"]')
        placeDetail.hasNotice = !!noticeElement
      }

      // 가격 탭 확인 및 정보 수집
      const priceTab = await page.$('a.veBoZ:has-text("가격")')
      if (priceTab) {
        console.log('Checking 가격 tab...')
        await priceTab.click()
        await page.waitForTimeout(2000)
        
        const priceData = await page.evaluate(() => {
          return {
            hasText: !!document.querySelector('.E2jtL, .price_text, [class*="price"]'),
            hasImage: !!document.querySelector('img[alt*="가격"], img[alt*="메뉴"], .menu_thumb')
          }
        })
        
        placeDetail.priceDisplay!.hasText = priceData.hasText
        placeDetail.priceDisplay!.hasImage = priceData.hasImage
        
        // 메뉴 사진 확인
        placeDetail.hasMenuPhoto = priceData.hasImage
        
        // 홈 탭으로 돌아가기
        const homeTab = await page.$('a.veBoZ:has-text("홈")')
        if (homeTab) {
          await homeTab.click()
          await page.waitForTimeout(1000)
        }
      } else {
        // 가격 탭이 없는 경우 기본 확인
        const priceTextElement = await page.$('.price_text')
        placeDetail.priceDisplay!.hasText = !!priceTextElement
        
        const priceImageElement = await page.$('.price_image')
        placeDetail.priceDisplay!.hasImage = !!priceImageElement
      }

    } catch (error) {
      console.error('Error extracting place info:', error)
    }

    // 기본값 설정
    if (!placeDetail.name) {
      placeDetail.name = `업체 (ID: ${placeId})`
    }
    if (!placeDetail.category) {
      placeDetail.category = '분류 정보 없음'
    }

    return placeDetail
  }
}

export const playwrightCrawlerService = new PlaywrightCrawlerService()