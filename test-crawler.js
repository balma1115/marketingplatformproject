const { chromium } = require('playwright');

async function testCrawler() {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  
  try {
    console.log('=== NAVER PLACE CRAWLER TEST ===');
    const placeId = '1616011574';
    const url = `https://map.naver.com/p/entry/place/${placeId}?c=15.00,0,0,0,dh`;
    
    console.log('Navigating to:', url);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    // 페이지 로딩 대기
    await page.waitForTimeout(5000);
    
    // iframe 찾기
    console.log('\n=== SEARCHING FOR IFRAME ===');
    const entryIframe = await page.$('#entryIframe');
    let workingPage = page;
    
    if (entryIframe) {
      const frame = await entryIframe.contentFrame();
      if (frame) {
        console.log('✅ Found entryIframe');
        workingPage = frame;
      }
    }
    
    // 모든 탭 확인
    console.log('\n=== CHECKING TABS ===');
    const tabs = await workingPage.$$eval('.veBoZ', elements => 
      elements.map(el => el.textContent?.trim())
    );
    console.log('Available tabs:', tabs);
    
    // 기본 정보 수집
    console.log('\n=== COLLECTING BASIC INFO ===');
    
    // 전화번호 찾기 - 다양한 선택자 시도
    const phoneSelectors = [
      '.xiLah',
      '.O8qbU.pSavy',
      '[class*="phone"]',
      '[class*="tel"]',
      'span:has-text("0507")',
      'span:has-text("02-")',
      'span:has-text("031-")'
    ];
    
    let phone = '';
    for (const selector of phoneSelectors) {
      try {
        const element = await workingPage.$(selector);
        if (element) {
          phone = await workingPage.evaluate(el => el.textContent, element) || '';
          if (phone) {
            console.log(`Phone found with selector "${selector}": ${phone}`);
            break;
          }
        }
      } catch (e) {
        // continue
      }
    }
    
    if (!phone) {
      console.log('❌ Phone number not found');
    }
    
    // 정보 탭 클릭
    console.log('\n=== CLICKING INFO TAB ===');
    const infoTab = await workingPage.$('a.veBoZ:has-text("정보")');
    if (infoTab) {
      await infoTab.click();
      console.log('Clicked 정보 tab');
      await workingPage.waitForTimeout(2000);
      
      // 정보 탭에서 데이터 수집
      console.log('\n=== COLLECTING FROM INFO TAB ===');
      
      // 소개글 찾기
      const introSelectors = [
        '.WoYOw',
        '.zPfVt',
        '[class*="intro"]',
        '[class*="description"]'
      ];
      
      let introduction = '';
      for (const selector of introSelectors) {
        try {
          const element = await workingPage.$(selector);
          if (element) {
            introduction = await workingPage.evaluate(el => el.textContent, element) || '';
            if (introduction) {
              console.log(`Introduction found with selector "${selector}": ${introduction.substring(0, 50)}...`);
              break;
            }
          }
        } catch (e) {
          // continue
        }
      }
      
      // 찾아오는길
      const directionSelectors = [
        '.nNPOq',
        '[class*="direction"]',
        '.CHC5F._U0nq'
      ];
      
      let directions = '';
      for (const selector of directionSelectors) {
        try {
          const element = await workingPage.$(selector);
          if (element) {
            directions = await workingPage.evaluate(el => el.textContent, element) || '';
            if (directions) {
              console.log(`Directions found with selector "${selector}": ${directions.substring(0, 50)}...`);
              break;
            }
          }
        } catch (e) {
          // continue
        }
      }
      
      // 대표 키워드
      const keywordElements = await workingPage.$$('.DUNfc');
      const keywords = [];
      for (const element of keywordElements) {
        const text = await workingPage.evaluate(el => el.textContent, element);
        if (text) keywords.push(text.trim());
      }
      console.log('Keywords found:', keywords);
      
      // 편의시설
      const amenityElements = await workingPage.$$('.Xltjb');
      const amenities = [];
      for (const element of amenityElements) {
        const text = await workingPage.evaluate(el => el.textContent, element);
        if (text) amenities.push(text.trim());
      }
      console.log('Amenities found:', amenities);
    }
    
    // 가격 탭 확인
    console.log('\n=== CHECKING PRICE TAB ===');
    const priceTab = await workingPage.$('a.veBoZ:has-text("가격")');
    if (priceTab) {
      await priceTab.click();
      console.log('Clicked 가격 tab');
      await workingPage.waitForTimeout(2000);
      
      // 가격 정보 확인
      const priceText = await workingPage.$('.price_text, .E2jtL');
      const priceImage = await workingPage.$('.price_image, img[alt*="가격"], img[alt*="메뉴"]');
      
      console.log('Has price text:', !!priceText);
      console.log('Has price image:', !!priceImage);
    }
    
    // 쿠폰 탭 확인
    console.log('\n=== CHECKING COUPON ===');
    const couponTab = await workingPage.$('a.veBoZ:has-text("쿠폰")');
    console.log('Has coupon tab:', !!couponTab);
    
    // 교육청 정보 (학원인 경우)
    console.log('\n=== CHECKING EDUCATION INFO ===');
    const categoryEl = await workingPage.$('.DJJvD');
    const category = categoryEl ? await workingPage.evaluate(el => el.textContent, categoryEl) : '';
    
    if (category && category.includes('학원')) {
      console.log('This is an academy, checking education compliance...');
      
      // 교습비 정보
      const tuitionElements = await workingPage.$$('[class*="tuition"], [class*="교습비"]');
      console.log('Tuition info elements found:', tuitionElements.length);
      
      // 등록번호
      const regNumberElements = await workingPage.$$('[class*="registration"], [class*="등록번호"]');
      console.log('Registration number elements found:', regNumberElements.length);
    }
    
    // HTML 출력 (디버깅용)
    console.log('\n=== PAGE HTML SAMPLE ===');
    const html = await workingPage.content();
    console.log('Total HTML length:', html.length);
    
    // 주요 클래스명 추출
    const classNames = html.match(/class="[^"]+"/g);
    const uniqueClasses = new Set();
    if (classNames) {
      classNames.forEach(cn => {
        const classes = cn.replace('class="', '').replace('"', '').split(' ');
        classes.forEach(c => uniqueClasses.add(c));
      });
    }
    
    console.log('\n=== UNIQUE CLASS NAMES (sample) ===');
    const classArray = Array.from(uniqueClasses).slice(0, 50);
    console.log(classArray);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\n=== TEST COMPLETE ===');
    console.log('Browser will remain open for inspection...');
    // 브라우저를 열어둠
    await page.waitForTimeout(60000);
    await browser.close();
  }
}

testCrawler();