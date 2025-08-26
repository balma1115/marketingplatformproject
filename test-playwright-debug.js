const { chromium } = require('playwright');

async function debugExtraction() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== PLAYWRIGHT DEBUG TEST FOR 미래엔영어수학 벌원학원 ===\n');
  
  try {
    const url = 'https://map.naver.com/p/entry/place/1616011574';
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Switch to iframe
    const iframeElement = await page.waitForSelector('iframe#entryIframe', { timeout: 10000 });
    const iframe = await iframeElement.contentFrame();
    
    if (!iframe) {
      throw new Error('Could not access iframe');
    }

    console.log('Successfully accessed iframe\n');
    
    // 1. TEST ADDRESS
    console.log('1. TESTING ADDRESS EXTRACTION:');
    console.log('================================');
    
    // Try multiple selectors for address
    const addressSelectors = [
      '.IH7VW',
      '.O8qbU.dXdMx .PkgBl',
      'span.PkgBl',
      '.dXdMx span',
      '.place_section_content span:has-text("경기")',
      'text=경기 성남시'
    ];
    
    let address = null;
    for (const selector of addressSelectors) {
      try {
        const element = await iframe.$(selector);
        if (element) {
          const text = await element.textContent();
          console.log(`  Selector "${selector}": ${text ? text.substring(0, 100) : 'empty'}`);
          if (text && (text.includes('경기') || text.includes('서울') || text.includes('성남'))) {
            address = text.trim();
            console.log(`  ✅ ADDRESS FOUND: ${address}`);
            break;
          }
        }
      } catch (e) {
        console.log(`  Selector "${selector}": error - ${e.message}`);
      }
    }
    
    if (!address) {
      console.log('  ❌ ADDRESS NOT FOUND - Checking info tab...');
      
      // Click info tab
      const infoTab = await iframe.$('a[role="tab"]:has-text("정보")');
      if (infoTab) {
        await infoTab.click();
        await page.waitForTimeout(2000);
        
        // Look for address in info section
        const infoSection = await iframe.$('.place_section_content');
        if (infoSection) {
          const infoText = await infoSection.textContent();
          if (infoText && infoText.includes('주소')) {
            const addressMatch = infoText.match(/주소[:\s]*([^●\n]*)/);
            if (addressMatch) {
              address = addressMatch[1].trim();
              console.log(`  ✅ ADDRESS FOUND IN INFO: ${address}`);
            }
          }
        }
      }
    }
    console.log();
    
    // 2. TEST BUSINESS HOURS
    console.log('2. TESTING BUSINESS HOURS:');
    console.log('================================');
    
    const businessHoursSelectors = [
      '.O8qbU.pSavy .A_cdD .i8cJw .H3ua4',
      '.A_cdD .H3ua4',
      'span.H3ua4',
      '.place_section_content:has-text("영업시간")',
      'text=10:00'
    ];
    
    let businessHours = null;
    for (const selector of businessHoursSelectors) {
      try {
        const element = await iframe.$(selector);
        if (element) {
          const text = await element.textContent();
          console.log(`  Selector "${selector}": ${text ? text.substring(0, 100) : 'empty'}`);
          if (text && text.includes(':')) {
            businessHours = text.trim();
            console.log(`  ✅ BUSINESS HOURS FOUND: ${businessHours.substring(0, 100)}`);
            break;
          }
        }
      } catch (e) {
        console.log(`  Selector "${selector}": error - ${e.message}`);
      }
    }
    
    // Try expanding business hours
    if (!businessHours) {
      const expandButton = await iframe.$('.A_cdD .gKP9i, button:has-text("더보기")');
      if (expandButton) {
        console.log('  Clicking expand button...');
        await expandButton.click();
        await page.waitForTimeout(1000);
        
        const expanded = await iframe.$('.A_cdD');
        if (expanded) {
          const text = await expanded.textContent();
          if (text && text.includes(':')) {
            businessHours = text.trim();
            console.log(`  ✅ BUSINESS HOURS AFTER EXPAND: ${businessHours.substring(0, 100)}`);
          }
        }
      }
    }
    console.log();
    
    // 3. TEST INSTAGRAM LINK
    console.log('3. TESTING INSTAGRAM LINK:');
    console.log('================================');
    
    const instagramSelectors = [
      'a[href*="instagram.com"]',
      'a[href*="instagram"]',
      '[class*="instagram"] a',
      'a:has-text("인스타그램")',
      '.place_section a[href*="instagram"]',
      '[aria-label*="인스타그램"]'
    ];
    
    let instagramLink = null;
    for (const selector of instagramSelectors) {
      try {
        const element = await iframe.$(selector);
        if (element) {
          const href = await element.getAttribute('href');
          const text = await element.textContent();
          console.log(`  Selector "${selector}": href="${href}", text="${text}"`);
          if (href && href.includes('instagram')) {
            instagramLink = href;
            console.log(`  ✅ INSTAGRAM LINK FOUND: ${instagramLink}`);
            break;
          }
        }
      } catch (e) {
        console.log(`  Selector "${selector}": not found`);
      }
    }
    
    // Check all links on the page
    if (!instagramLink) {
      console.log('  Checking all links on page...');
      const allLinks = await iframe.$$('a');
      for (const link of allLinks) {
        const href = await link.getAttribute('href');
        if (href && href.includes('instagram')) {
          instagramLink = href;
          console.log(`  ✅ INSTAGRAM LINK FOUND IN ALL LINKS: ${instagramLink}`);
          break;
        }
      }
    }
    console.log();
    
    // 4. TEST PRICE INFORMATION
    console.log('4. TESTING PRICE INFORMATION:');
    console.log('================================');
    
    // First check if there's a price/menu tab
    const priceTab = await iframe.$('a[role="tab"]:has-text("가격"), a[role="tab"]:has-text("메뉴")');
    if (priceTab) {
      console.log('  Clicking price/menu tab...');
      await priceTab.click();
      await page.waitForTimeout(2000);
    }
    
    const priceSelectors = [
      '.O8qbU.tQX7D',
      '.tQX7D',
      '.pSJyY',
      '.K7RXh',
      'text=원',
      '[class*="price"]',
      'div:has-text("수강료")',
      'div:has-text("등록")'
    ];
    
    let priceInfo = null;
    for (const selector of priceSelectors) {
      try {
        const element = await iframe.$(selector);
        if (element) {
          const text = await element.textContent();
          console.log(`  Selector "${selector}": ${text ? text.substring(0, 100) : 'empty'}`);
          if (text && text.includes('원')) {
            priceInfo = text.trim();
            console.log(`  ✅ PRICE INFO FOUND: ${priceInfo.substring(0, 100)}`);
            break;
          }
        }
      } catch (e) {
        console.log(`  Selector "${selector}": not found`);
      }
    }
    
    // Check for price images
    const priceImages = await iframe.$$('img[src*="phinf"], .K0PDV._div img');
    console.log(`  Price images found: ${priceImages.length}`);
    console.log();
    
    // 5. TEST BLOG REVIEWS
    console.log('5. TESTING BLOG REVIEWS:');
    console.log('================================');
    
    // Click review tab
    const reviewTab = await iframe.$('a[role="tab"]:has-text("리뷰")');
    if (reviewTab) {
      console.log('  Clicking review tab...');
      await reviewTab.click();
      await page.waitForTimeout(2000);
      
      // Click blog sub-tab
      const blogTab = await iframe.$('a:has-text("블로그")');
      if (blogTab) {
        console.log('  Clicking blog sub-tab...');
        await blogTab.click();
        await page.waitForTimeout(2000);
      }
    }
    
    const blogReviewSelectors = [
      '.zPfVt',
      '.YkrAu',
      '.sa6We',
      '.vcV_R',
      '.YtHU9',
      'time',
      '[class*="blog"] [class*="date"]',
      'span:has-text("2025")'
    ];
    
    const blogReviews = [];
    for (const selector of blogReviewSelectors) {
      try {
        const elements = await iframe.$$(selector);
        console.log(`  Selector "${selector}": found ${elements.length} elements`);
        
        if (elements.length > 0) {
          for (let i = 0; i < Math.min(3, elements.length); i++) {
            const text = await elements[i].textContent();
            if (text && (text.includes('2025') || text.includes('2024') || text.includes('.'))) {
              blogReviews.push(text.trim());
              console.log(`    Review ${i+1}: ${text.trim()}`);
            }
          }
          if (blogReviews.length > 0) break;
        }
      } catch (e) {
        console.log(`  Selector "${selector}": error`);
      }
    }
    
    if (blogReviews.length > 0) {
      console.log(`  ✅ BLOG REVIEWS FOUND: ${blogReviews.length} reviews`);
    } else {
      console.log('  ❌ NO BLOG REVIEWS FOUND');
    }
    console.log();
    
    // 6. GET FULL INFO TEXT
    console.log('6. CHECKING FULL INFO SECTION:');
    console.log('================================');
    
    // Go back to info tab
    const infoTabFinal = await iframe.$('a[role="tab"]:has-text("정보")');
    if (infoTabFinal) {
      await infoTabFinal.click();
      await page.waitForTimeout(2000);
    }
    
    // Click 더보기 if exists
    const moreButton = await iframe.$('a:has-text("더보기"), button:has-text("더보기")');
    if (moreButton) {
      console.log('  Clicking 더보기 button...');
      await moreButton.click();
      await page.waitForTimeout(1500);
    }
    
    // Get introduction text
    const introElement = await iframe.$('.pvuWY');
    if (introElement) {
      const introText = await introElement.textContent();
      console.log(`  Introduction text length: ${introText ? introText.length : 0}`);
      
      if (introText && introText.length < 5000) {
        // Check if it contains the info we need
        if (introText.includes('주소')) {
          console.log('  ✅ Contains address info');
        }
        if (introText.includes('영업시간')) {
          console.log('  ✅ Contains business hours');
        }
        if (introText.includes('원')) {
          console.log('  ✅ Contains price info');
        }
        if (introText.includes('옵션사항')) {
          console.log('  ✅ Contains amenities info');
        }
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('Address:', address || 'NOT FOUND');
    console.log('Business Hours:', businessHours ? 'FOUND' : 'NOT FOUND');
    console.log('Instagram:', instagramLink || 'NOT FOUND');
    console.log('Price Info:', priceInfo ? 'FOUND' : 'NOT FOUND');
    console.log('Blog Reviews:', blogReviews.length > 0 ? `${blogReviews.length} found` : 'NOT FOUND');

  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\nPress Ctrl+C to close browser...');
  await page.waitForTimeout(30000); // Keep browser open for inspection
  await browser.close();
}

debugExtraction();