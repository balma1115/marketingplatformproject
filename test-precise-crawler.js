const { chromium } = require('playwright');

async function preciseDataExtraction() {
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
    
    console.log('=== PRECISE DATA EXTRACTION TEST ===');
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
        console.log('✅ Working inside iframe');
        workingPage = frame;
      }
    }
    
    // ========== 홈 탭에서 기본 정보 수집 ==========
    console.log('\n=== HOME TAB DATA ===');
    
    // 방문자 리뷰 정확한 수집
    console.log('\n📊 REVIEW COUNTS:');
    
    // 방문자 리뷰 개수 (영수증 리뷰 포함)
    const visitorReviewSection = await workingPage.$('.dAsGb');
    if (visitorReviewSection) {
      const reviewText = await workingPage.evaluate(el => {
        const spans = el.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent || '';
          if (text.includes('영수증리뷰') || text.includes('방문자리뷰')) {
            const nextSpan = span.nextElementSibling;
            if (nextSpan) {
              return nextSpan.textContent;
            }
          }
        }
        return null;
      }, visitorReviewSection);
      console.log('Visitor Review Count:', reviewText);
    }
    
    // 블로그 리뷰 개수
    const blogReviewSection = await workingPage.$('.ugMJl');
    if (blogReviewSection) {
      const reviewText = await workingPage.evaluate(el => {
        const spans = el.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent || '';
          if (text.includes('블로그리뷰')) {
            const nextSpan = span.nextElementSibling;
            if (nextSpan) {
              return nextSpan.textContent;
            }
          }
        }
        return null;
      }, blogReviewSection);
      console.log('Blog Review Count:', reviewText);
    }
    
    // ========== 정보 탭 클릭 ==========
    console.log('\n=== CLICKING INFO TAB ===');
    
    const infoTabLink = await workingPage.$('a[role="tab"]:has-text("정보"), a.veBoZ:has-text("정보")');
    if (infoTabLink) {
      await infoTabLink.click();
      console.log('✅ Clicked 정보 tab');
      await workingPage.waitForTimeout(3000);
      
      // 1. 소개글 찾기 (정보 탭의 상단 소개글)
      console.log('\n📝 INTRODUCTION IN INFO TAB:');
      
      // 정보 탭의 소개 섹션 찾기
      const introSections = await workingPage.$$('.place_section');
      for (const section of introSections) {
        const titleEl = await section.$('.place_section_title');
        if (titleEl) {
          const title = await workingPage.evaluate(el => el.textContent, titleEl);
          if (title && title.includes('소개')) {
            const contentEl = await section.$('.zPfVt, .WoYOw');
            if (contentEl) {
              const intro = await workingPage.evaluate(el => el.textContent?.trim(), contentEl);
              console.log('✅ Introduction:', intro);
              break;
            }
          }
        }
      }
      
      // 2. 찾아오는길 (더보기 클릭 필요)
      console.log('\n🗺️ DIRECTIONS WITH MORE BUTTON:');
      
      const directionSections = await workingPage.$$('.place_section');
      for (const section of directionSections) {
        const content = await workingPage.evaluate(el => el.textContent, section);
        if (content && content.includes('주차')) {
          // 더보기 버튼 찾기
          const moreButton = await section.$('button:has-text("더보기"), .zPfVt + button');
          if (moreButton) {
            console.log('Found 더보기 button, clicking...');
            await moreButton.click();
            await workingPage.waitForTimeout(1000);
          }
          
          // 전체 텍스트 가져오기
          const fullDirections = await section.evaluate(el => {
            const textEl = el.querySelector('.zPfVt, .nNPOq');
            return textEl ? textEl.textContent?.trim() : '';
          });
          console.log('✅ Full Directions:', fullDirections);
          break;
        }
      }
      
      // 3. 대표 키워드 정확히 5개 가져오기
      console.log('\n🏷️ REPRESENTATIVE KEYWORDS (5):');
      
      const keywords = await workingPage.evaluate(() => {
        const keywordElements = document.querySelectorAll('.DUNfc');
        const keywords = [];
        keywordElements.forEach(el => {
          const text = el.textContent?.trim();
          if (text) keywords.push(text);
        });
        return keywords.slice(0, 5); // 최대 5개만
      });
      console.log('✅ Keywords:', keywords);
      
      // 4. 편의시설 정확히 가져오기
      console.log('\n🏢 AMENITIES:');
      
      const amenities = await workingPage.evaluate(() => {
        const items = [];
        // 편의시설 섹션 찾기
        const sections = document.querySelectorAll('.place_section_content');
        sections.forEach(section => {
          const text = section.textContent || '';
          if (text.includes('대기공간') || text.includes('화장실') || text.includes('무선 인터넷')) {
            // 개별 편의시설 추출
            const amenityItems = section.querySelectorAll('li, span');
            amenityItems.forEach(item => {
              const itemText = item.textContent?.trim();
              if (itemText && itemText.length > 0 && itemText.length < 30) {
                items.push(itemText);
              }
            });
          }
        });
        return items;
      });
      console.log('✅ Amenities:', amenities);
    }
    
    // ========== 리뷰 탭 확인 ==========
    console.log('\n=== CHECKING REVIEW TAB ===');
    
    // 홈 탭으로 돌아가기
    const homeTab = await workingPage.$('a[role="tab"]:has-text("홈")');
    if (homeTab) {
      await homeTab.click();
      await workingPage.waitForTimeout(2000);
    }
    
    // 리뷰 탭 클릭
    const reviewTab = await workingPage.$('a[role="tab"]:has-text("리뷰")');
    if (reviewTab) {
      await reviewTab.click();
      console.log('✅ Clicked 리뷰 tab');
      await workingPage.waitForTimeout(3000);
      
      // 방문자 리뷰 상세 정보
      console.log('\n📝 VISITOR REVIEWS DETAIL:');
      
      const visitorReviews = await workingPage.$$('.pui__X35jYm.EjjAW');
      console.log(`Found ${visitorReviews.length} visitor reviews`);
      
      const reviewDetails = [];
      for (let i = 0; i < Math.min(5, visitorReviews.length); i++) {
        const review = visitorReviews[i];
        const dateEl = await review.$('.pui__QKE5Pr');
        const replyEl = await review.$('.pui__AXWmhf');
        
        const date = dateEl ? await workingPage.evaluate(el => el.textContent, dateEl) : '';
        const hasReply = !!replyEl;
        
        reviewDetails.push({ date, hasReply });
      }
      console.log('Review Details:', reviewDetails);
    }
    
    // ========== 사진 탭 확인 ==========
    console.log('\n=== CHECKING PHOTO TAB ===');
    
    // 홈 탭으로 돌아가기
    const homeTab2 = await workingPage.$('a[role="tab"]:has-text("홈")');
    if (homeTab2) {
      await homeTab2.click();
      await workingPage.waitForTimeout(2000);
    }
    
    // 사진 탭 클릭
    const photoTab = await workingPage.$('a[role="tab"]:has-text("사진")');
    if (photoTab) {
      await photoTab.click();
      console.log('✅ Clicked 사진 tab');
      await workingPage.waitForTimeout(3000);
      
      // 사진 카테고리 확인
      console.log('\n📸 PHOTO CATEGORIES:');
      
      const photoCategories = await workingPage.evaluate(() => {
        const categories = {
          hasMenuPhoto: false,
          hasInteriorPhoto: false,
          hasExteriorPhoto: false,
          totalPhotos: 0
        };
        
        // 카테고리 버튼들 확인
        const categoryButtons = document.querySelectorAll('.flicking-camera span');
        categoryButtons.forEach(btn => {
          const text = btn.textContent || '';
          if (text.includes('메뉴')) categories.hasMenuPhoto = true;
          if (text.includes('내부') || text.includes('인테리어')) categories.hasInteriorPhoto = true;
          if (text.includes('외부') || text.includes('외관')) categories.hasExteriorPhoto = true;
        });
        
        // 전체 사진 개수
        const photoElements = document.querySelectorAll('.K0PDV, img[class*="photo"]');
        categories.totalPhotos = photoElements.length;
        
        return categories;
      });
      console.log('Photo Categories:', photoCategories);
      
      // 마지막 사진 업데이트 날짜
      const photoDateElements = await workingPage.$$('.CB8aP');
      if (photoDateElements.length > 0) {
        const lastDate = await workingPage.evaluate(el => el.textContent, photoDateElements[0]);
        console.log('Last Photo Update:', lastDate);
      }
    }
    
    // ========== 소식 탭 상세 확인 ==========
    console.log('\n=== CHECKING NEWS TAB DETAIL ===');
    
    const newsTab = await workingPage.$('a[role="tab"]:has-text("소식")');
    if (newsTab) {
      await newsTab.click();
      console.log('✅ Clicked 소식 tab');
      await workingPage.waitForTimeout(2000);
      
      const newsData = await workingPage.evaluate(() => {
        const result = {
          newsCount: 0,
          hasEvent: false,
          hasNotice: false,
          lastNewsDate: ''
        };
        
        // 소식 아이템들
        const newsItems = document.querySelectorAll('.place_section_content');
        result.newsCount = newsItems.length;
        
        // 이벤트/공지 확인
        newsItems.forEach(item => {
          const text = item.textContent || '';
          if (text.includes('이벤트')) result.hasEvent = true;
          if (text.includes('공지')) result.hasNotice = true;
        });
        
        // 최신 날짜
        const dateElements = document.querySelectorAll('.place_section_content time, .date');
        if (dateElements.length > 0) {
          result.lastNewsDate = dateElements[0].textContent || '';
        }
        
        return result;
      });
      console.log('News Data:', newsData);
    }
    
    console.log('\n=== EXTRACTION COMPLETE ===');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\nBrowser will remain open for inspection...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
}

preciseDataExtraction();