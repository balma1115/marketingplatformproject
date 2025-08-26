const { chromium } = require('playwright');

async function analyzeDetailedStructure() {
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
    const placeId = '1616011574';
    const url = `https://map.naver.com/p/entry/place/${placeId}`;
    
    console.log('=== DETAILED STRUCTURE ANALYSIS ===');
    console.log('URL:', url);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    await page.waitForTimeout(5000);
    
    // iframe 접근
    const entryIframe = await page.$('#entryIframe');
    let workingPage = page;
    
    if (entryIframe) {
      const frame = await entryIframe.contentFrame();
      if (frame) {
        console.log('✅ Accessing iframe content');
        workingPage = frame;
      }
    }
    
    // 1. 홈 탭 데이터 수집
    console.log('\n=== HOME TAB DATA ===');
    
    // 전화번호 정확히 찾기
    console.log('\n📞 PHONE NUMBER SEARCH:');
    
    // 방법 1: 전화 아이콘 옆의 텍스트 찾기
    const phoneIcon = await workingPage.$('.xiLah');
    if (phoneIcon) {
      const phoneText = await workingPage.evaluate(el => {
        // 형제 요소나 부모 요소에서 전화번호 찾기
        const parent = el.parentElement;
        const spans = parent?.querySelectorAll('span');
        if (spans) {
          for (const span of spans) {
            const text = span.textContent || '';
            // 전화번호 패턴 매칭
            if (text.match(/\d{2,4}-\d{3,4}-\d{4}/) || text.includes('0507')) {
              return text;
            }
          }
        }
        return el.textContent;
      }, phoneIcon);
      console.log('Phone via icon:', phoneText);
    }
    
    // 방법 2: 직접 전화번호 패턴 검색
    const allTexts = await workingPage.evaluate(() => {
      const texts = [];
      const spans = document.querySelectorAll('span');
      spans.forEach(span => {
        const text = span.textContent || '';
        if (text.match(/\d{2,4}-\d{3,4}-\d{4}/) || text.includes('0507')) {
          texts.push({
            text: text.trim(),
            class: span.className
          });
        }
      });
      return texts;
    });
    console.log('Phone number patterns found:', allTexts);
    
    // 2. 정보 탭 클릭 및 데이터 수집
    console.log('\n=== INFO TAB ANALYSIS ===');
    
    const infoTab = await workingPage.$('a.veBoZ:has-text("정보"), [role="tab"]:has-text("정보")');
    if (infoTab) {
      await infoTab.click();
      console.log('✅ Clicked 정보 tab');
      await workingPage.waitForTimeout(3000);
      
      // 소개글 찾기
      console.log('\n📝 INTRODUCTION:');
      const introTexts = await workingPage.evaluate(() => {
        const results = [];
        
        // 다양한 선택자로 시도
        const selectors = [
          '.WoYOw',
          '.zPfVt', 
          '.place_section_content',
          '[class*="intro"]',
          '[class*="description"]',
          '.PIbes',
          '.vV_z_'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 10) {
              results.push({
                selector,
                text: text.substring(0, 100),
                fullLength: text.length
              });
            }
          });
        });
        
        return results;
      });
      console.log('Introduction candidates:', introTexts);
      
      // 찾아오는길
      console.log('\n🗺️ DIRECTIONS:');
      const directionTexts = await workingPage.evaluate(() => {
        const results = [];
        
        // 찾아오는길 관련 텍스트 찾기
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && (text.includes('찾아오는') || text.includes('오시는길') || text.includes('위치안내'))) {
            // 다음 형제 요소의 텍스트 가져오기
            const nextEl = el.nextElementSibling;
            if (nextEl) {
              results.push({
                label: text,
                content: nextEl.textContent?.trim().substring(0, 100),
                class: nextEl.className
              });
            }
          }
        });
        
        return results;
      });
      console.log('Direction texts:', directionTexts);
      
      // 편의시설
      console.log('\n🏢 AMENITIES:');
      const amenityData = await workingPage.evaluate(() => {
        const results = [];
        
        // 편의시설 섹션 찾기
        const sections = document.querySelectorAll('.place_section');
        sections.forEach(section => {
          const title = section.querySelector('.place_section_title');
          if (title && title.textContent?.includes('편의')) {
            const items = section.querySelectorAll('.Xltjb, .OXD\\+m, li');
            items.forEach(item => {
              results.push(item.textContent?.trim());
            });
          }
        });
        
        return results;
      });
      console.log('Amenities:', amenityData);
      
      // 대표 키워드
      console.log('\n🏷️ KEYWORDS:');
      const keywordData = await workingPage.evaluate(() => {
        const results = [];
        
        // 키워드/태그 관련 요소 찾기
        const selectors = ['.DUNfc', '.nWiXa', '[class*="keyword"]', '[class*="tag"]'];
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
              results.push({
                selector,
                text
              });
            }
          });
        });
        
        return results;
      });
      console.log('Keywords:', keywordData);
      
      // 교육청 정보 (학원)
      console.log('\n🎓 EDUCATION INFO:');
      const educationData = await workingPage.evaluate(() => {
        const results = {
          registrationNumber: null,
          tuitionFees: []
        };
        
        // 모든 텍스트에서 교습비/등록번호 찾기
        const allText = document.body.innerText;
        
        // 등록번호 패턴
        const regMatch = allText.match(/등록번호[：\s]*([^\n]+)/);
        if (regMatch) results.registrationNumber = regMatch[1].trim();
        
        // 교습비 패턴
        const tuitionMatches = allText.match(/교습비[：\s]*([^\n]+)/g);
        if (tuitionMatches) {
          tuitionMatches.forEach(match => {
            results.tuitionFees.push(match.replace(/교습비[：\s]*/, '').trim());
          });
        }
        
        return results;
      });
      console.log('Education data:', educationData);
    }
    
    // 3. 가격 탭 분석
    console.log('\n=== PRICE TAB ANALYSIS ===');
    
    // 홈 탭으로 돌아가기
    const homeTab = await workingPage.$('a.veBoZ:has-text("홈"), [role="tab"]:has-text("홈")');
    if (homeTab) {
      await homeTab.click();
      await workingPage.waitForTimeout(2000);
    }
    
    // 가격 탭 확인
    const priceTab = await workingPage.$('a.veBoZ:has-text("가격"), [role="tab"]:has-text("가격")');
    if (priceTab) {
      await priceTab.click();
      console.log('✅ Clicked 가격 tab');
      await workingPage.waitForTimeout(2000);
      
      const priceData = await workingPage.evaluate(() => {
        return {
          hasText: !!document.querySelector('.E2jtL, .price_text, [class*="price"]'),
          hasImage: !!document.querySelector('img[alt*="가격"], img[alt*="메뉴"], .menu_thumb'),
          content: document.querySelector('.place_section_content')?.textContent?.substring(0, 200)
        };
      });
      console.log('Price data:', priceData);
    } else {
      console.log('❌ No price tab found');
    }
    
    // 4. 쿠폰 탭 분석
    console.log('\n=== COUPON TAB ANALYSIS ===');
    
    const couponTab = await workingPage.$('a.veBoZ:has-text("쿠폰"), [role="tab"]:has-text("쿠폰")');
    if (couponTab) {
      console.log('✅ Coupon tab exists');
      await couponTab.click();
      await workingPage.waitForTimeout(2000);
      
      const couponData = await workingPage.evaluate(() => {
        const coupons = document.querySelectorAll('.coupon_item, [class*="coupon"]');
        return {
          count: coupons.length,
          hasCoupons: coupons.length > 0
        };
      });
      console.log('Coupon data:', couponData);
    } else {
      console.log('❌ No coupon tab');
    }
    
    // 5. 전체 HTML 구조 샘플링
    console.log('\n=== HTML STRUCTURE SAMPLE ===');
    const htmlSample = await workingPage.evaluate(() => {
      const container = document.querySelector('#app-root, #container, .place_detail_wrapper');
      if (container) {
        return container.innerHTML.substring(0, 1000);
      }
      return 'Container not found';
    });
    console.log('HTML Sample:', htmlSample.substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\n=== ANALYSIS COMPLETE ===');
    console.log('Browser will remain open for manual inspection...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
}

analyzeDetailedStructure();