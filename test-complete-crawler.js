const { chromium } = require('playwright');

async function completeDataExtraction() {
  const browser = await chromium.launch({
    headless: false,
    devtools: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  
  try {
    const placeId = '1616011574';
    const url = `https://map.naver.com/p/entry/place/${placeId}`;
    
    console.log('=== COMPLETE DATA EXTRACTION TEST ===');
    console.log('URL:', url);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    // 충분한 로딩 대기
    await page.waitForTimeout(5000);
    
    // iframe 접근
    const entryIframe = await page.$('#entryIframe');
    let workingPage = page;
    
    if (entryIframe) {
      const frame = await entryIframe.contentFrame();
      if (frame) {
        console.log('✅ Working inside iframe');
        workingPage = frame;
      }
    }
    
    // 데이터 수집 객체
    const collectedData = {
      name: '',
      category: '',
      phone: '',
      address: '',
      businessHours: '',
      tabs: [],
      hasReservation: false,
      hasInquiry: false,
      hasCoupon: false,
      hasOrder: false,
      hasTalk: false,
      hasSmartCall: false,
      introduction: '',
      directions: '',
      amenities: [],
      keywords: [],
      blogLink: '',
      instagramLink: '',
      images: [],
      visitorReviewCount: 0,
      blogReviewCount: 0,
      reviewScore: 0,
      priceDisplay: { hasText: false, hasImage: false },
      educationInfo: { hasRegistrationNumber: false, hasTuitionFee: false },
      newsCount: 0,
      hasEvent: false,
      hasNotice: false
    };
    
    // ========== 홈 탭에서 기본 정보 수집 ==========
    console.log('\n=== COLLECTING BASIC INFO FROM HOME TAB ===');
    
    // 1. 업체명
    const nameElement = await workingPage.$('#_title span.GHAhO, .GHAhO');
    if (nameElement) {
      collectedData.name = await workingPage.evaluate(el => el.textContent?.trim() || '', nameElement);
      console.log('✅ Name:', collectedData.name);
    }
    
    // 2. 카테고리
    const categoryElement = await workingPage.$('.DJJvD');
    if (categoryElement) {
      collectedData.category = await workingPage.evaluate(el => el.textContent?.trim() || '', categoryElement);
      console.log('✅ Category:', collectedData.category);
    }
    
    // 3. 전화번호 - 여러 선택자 시도
    let phoneFound = false;
    const phoneSelectors = ['.xlx7Q', '.xiLah', '.O8qbU.pSavy'];
    for (const selector of phoneSelectors) {
      if (!phoneFound) {
        const phoneEl = await workingPage.$(selector);
        if (phoneEl) {
          const text = await workingPage.evaluate(el => el.textContent?.trim() || '', phoneEl);
          if (text && (text.includes('0507') || text.match(/\d{2,4}-\d{3,4}-\d{4}/))) {
            collectedData.phone = text.match(/[\d-]+/)?.[0] || text;
            console.log('✅ Phone:', collectedData.phone);
            phoneFound = true;
          }
        }
      }
    }
    
    // 4. 주소
    const addressElement = await workingPage.$('.PkgBl');
    if (addressElement) {
      collectedData.address = await workingPage.evaluate(el => el.textContent?.trim() || '', addressElement);
      console.log('✅ Address:', collectedData.address);
    }
    
    // 5. 영업시간
    const hoursElement = await workingPage.$('.MxgIj');
    if (hoursElement) {
      collectedData.businessHours = await workingPage.evaluate(el => el.textContent?.trim() || '', hoursElement);
      console.log('✅ Business Hours:', collectedData.businessHours);
    }
    
    // 6. 탭 목록
    const tabElements = await workingPage.$$('.veBoZ');
    for (const tab of tabElements) {
      const tabText = await workingPage.evaluate(el => el.textContent?.trim() || '', tab);
      if (tabText) {
        collectedData.tabs.push(tabText);
      }
    }
    console.log('✅ Tabs:', collectedData.tabs);
    
    // 7. 액션 버튼들
    collectedData.hasReservation = !!(await workingPage.$('[data-nclicks-area-code="btp"]'));
    collectedData.hasInquiry = !!(await workingPage.$('[data-nclicks-area-code="qna"]'));
    collectedData.hasOrder = !!(await workingPage.$('[data-nclicks-area-code="ord"]'));
    collectedData.hasTalk = !!(await workingPage.$('[data-nclicks-area-code="tlk"]'));
    console.log('✅ Buttons - Reservation:', collectedData.hasReservation, 'Inquiry:', collectedData.hasInquiry);
    
    // 8. SNS 링크
    const blogLink = await workingPage.$('a[href*="blog.naver.com"]');
    if (blogLink) {
      collectedData.blogLink = await workingPage.evaluate(el => el.href, blogLink);
      console.log('✅ Blog Link:', collectedData.blogLink);
    }
    
    const instaLink = await workingPage.$('a[href*="instagram.com"]');
    if (instaLink) {
      collectedData.instagramLink = await workingPage.evaluate(el => el.href, instaLink);
      console.log('✅ Instagram Link:', collectedData.instagramLink);
    }
    
    // 9. 이미지 개수
    const imageElements = await workingPage.$$('.K0PDV');
    collectedData.images = new Array(imageElements.length).fill('image');
    console.log('✅ Images:', collectedData.images.length);
    
    // 10. 리뷰 정보
    const visitorReviewEl = await workingPage.$('.dAsGb .YwYLL');
    if (visitorReviewEl) {
      const text = await workingPage.evaluate(el => el.textContent, visitorReviewEl);
      const match = text?.match(/\d+/);
      if (match) {
        collectedData.visitorReviewCount = parseInt(match[0]);
      }
    }
    
    const blogReviewEl = await workingPage.$('.ugMJl .YwYLL');
    if (blogReviewEl) {
      const text = await workingPage.evaluate(el => el.textContent, blogReviewEl);
      const match = text?.match(/\d+/);
      if (match) {
        collectedData.blogReviewCount = parseInt(match[0]);
      }
    }
    
    const ratingEl = await workingPage.$('.PXMot');
    if (ratingEl) {
      const text = await workingPage.evaluate(el => el.textContent, ratingEl);
      const match = text?.match(/[\d.]+/);
      if (match) {
        collectedData.reviewScore = parseFloat(match[0]);
      }
    }
    console.log('✅ Reviews - Visitor:', collectedData.visitorReviewCount, 'Blog:', collectedData.blogReviewCount, 'Score:', collectedData.reviewScore);
    
    // ========== 정보 탭 클릭 및 데이터 수집 ==========
    console.log('\n=== CLICKING INFO TAB ===');
    
    // 정보 탭 찾기 - 여러 방법 시도
    let infoTabClicked = false;
    
    // 방법 1: 텍스트로 직접 찾기
    const allLinks = await workingPage.$$('a');
    for (const link of allLinks) {
      const text = await workingPage.evaluate(el => el.textContent?.trim(), link);
      if (text === '정보') {
        console.log('Found 정보 tab via text search');
        await link.click();
        infoTabClicked = true;
        break;
      }
    }
    
    if (infoTabClicked) {
      console.log('✅ Clicked 정보 tab, waiting for content...');
      await workingPage.waitForTimeout(3000);
      
      // 소개글 찾기
      console.log('\n=== EXTRACTING INFO TAB DATA ===');
      
      // 방법 1: .zPfVt 선택자
      let introElement = await workingPage.$('.zPfVt');
      if (introElement) {
        collectedData.introduction = await workingPage.evaluate(el => el.textContent?.trim() || '', introElement);
        console.log('✅ Introduction (.zPfVt):', collectedData.introduction.substring(0, 50));
      }
      
      // 방법 2: place_section_content에서 긴 텍스트 찾기
      if (!collectedData.introduction) {
        const sections = await workingPage.$$('.place_section_content');
        for (const section of sections) {
          const text = await workingPage.evaluate(el => el.textContent?.trim() || '', section);
          if (text.length > 100 && !text.includes('소비쿠폰') && !text.includes('화장실')) {
            collectedData.introduction = text;
            console.log('✅ Introduction (section):', text.substring(0, 50));
            break;
          }
        }
      }
      
      // 찾아오는길/주차 정보
      const allSections = await workingPage.$$('.place_section_content');
      for (const section of allSections) {
        const text = await workingPage.evaluate(el => el.textContent?.trim() || '', section);
        if (text.includes('주차') || text.includes('CU편의점') || text.includes('찾아오')) {
          collectedData.directions = text;
          console.log('✅ Directions:', text.substring(0, 50));
          break;
        }
      }
      
      // 편의시설
      for (const section of allSections) {
        const text = await workingPage.evaluate(el => el.textContent?.trim() || '', section);
        if (text.includes('대기공간') || text.includes('화장실') || text.includes('무선 인터넷')) {
          // 편의시설 파싱
          const items = text.split(/(?=[가-힣]+(?:공간|화장실|인터넷|예약|차량|운행))/);
          collectedData.amenities = items.filter(item => item.trim().length > 0);
          console.log('✅ Amenities:', collectedData.amenities);
          break;
        }
      }
      
      // 대표 키워드
      for (const section of allSections) {
        const text = await workingPage.evaluate(el => el.textContent?.trim() || '', section);
        if (text.includes('초등') || text.includes('중등') || text.includes('영어') || text.includes('수학')) {
          // 키워드 추출
          const keywords = text.match(/[가-힣0-9]+(?:초|중|고|영어|수학|학원|동)/g) || [];
          collectedData.keywords = [...new Set(keywords)];
          console.log('✅ Keywords:', collectedData.keywords);
          break;
        }
      }
      
      // 교육청 정보 (학원인 경우)
      if (collectedData.category && collectedData.category.includes('학원')) {
        const pageText = await workingPage.evaluate(() => document.body.innerText);
        
        // 등록번호
        const regMatch = pageText.match(/등록번호[：\s]*([^\n]+)/);
        if (regMatch) {
          collectedData.educationInfo.hasRegistrationNumber = true;
          console.log('✅ Registration Number:', regMatch[1]);
        }
        
        // 교습비
        const tuitionMatch = pageText.match(/교습비[：\s]*([^\n]+)/);
        if (tuitionMatch) {
          collectedData.educationInfo.hasTuitionFee = true;
          console.log('✅ Tuition Fee:', tuitionMatch[1]);
        }
      }
    }
    
    // ========== 가격 탭 확인 ==========
    console.log('\n=== CHECKING PRICE TAB ===');
    
    // 홈 탭으로 돌아가기
    const homeTab = await workingPage.$('a:has-text("홈")');
    if (homeTab) {
      await homeTab.click();
      await workingPage.waitForTimeout(2000);
    }
    
    // 가격 탭 찾기
    const priceTab = await workingPage.$('a:has-text("가격")');
    if (priceTab) {
      console.log('✅ Found 가격 tab');
      await priceTab.click();
      await workingPage.waitForTimeout(2000);
      
      collectedData.priceDisplay.hasText = !!(await workingPage.$('.E2jtL, .price_text'));
      collectedData.priceDisplay.hasImage = !!(await workingPage.$('img[alt*="가격"], img[alt*="메뉴"]'));
      console.log('✅ Price - Text:', collectedData.priceDisplay.hasText, 'Image:', collectedData.priceDisplay.hasImage);
    } else {
      console.log('❌ No 가격 tab');
    }
    
    // ========== 쿠폰 탭 확인 ==========
    collectedData.hasCoupon = collectedData.tabs.includes('쿠폰');
    console.log('✅ Has Coupon Tab:', collectedData.hasCoupon);
    
    // ========== 소식 탭 확인 ==========
    if (collectedData.tabs.includes('소식')) {
      console.log('\n=== CHECKING NEWS TAB ===');
      const newsTab = await workingPage.$('a:has-text("소식")');
      if (newsTab) {
        await newsTab.click();
        await workingPage.waitForTimeout(2000);
        
        const newsElements = await workingPage.$$('.place_section_content');
        collectedData.newsCount = newsElements.length;
        
        collectedData.hasEvent = !!(await workingPage.$('[class*="event"]'));
        collectedData.hasNotice = !!(await workingPage.$('[class*="notice"]'));
        
        console.log('✅ News Count:', collectedData.newsCount, 'Event:', collectedData.hasEvent, 'Notice:', collectedData.hasNotice);
      }
    }
    
    // ========== 스마트콜 확인 ==========
    collectedData.hasSmartCall = collectedData.phone.includes('0507');
    console.log('✅ Has SmartCall:', collectedData.hasSmartCall);
    
    // ========== 최종 결과 출력 ==========
    console.log('\n=== FINAL COLLECTED DATA ===');
    console.log(JSON.stringify(collectedData, null, 2));
    
    // 누락된 데이터 체크
    console.log('\n=== MISSING DATA CHECK ===');
    if (!collectedData.introduction) console.log('❌ Missing: introduction');
    if (!collectedData.directions) console.log('❌ Missing: directions');
    if (collectedData.amenities.length === 0) console.log('❌ Missing: amenities');
    if (collectedData.keywords.length === 0) console.log('❌ Missing: keywords');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\n=== TEST COMPLETE ===');
    console.log('Browser will remain open for inspection...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
}

completeDataExtraction();