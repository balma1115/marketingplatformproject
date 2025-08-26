const { chromium } = require('playwright');

async function testDetailedExtraction() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== DETAILED EXTRACTION TEST FOR 미래엔영어수학 벌원학원 ===\n');
  
  try {
    // Navigate to the place
    const url = 'https://map.naver.com/p/entry/place/1616011574';
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Switch to iframe
    const iframeElement = await page.waitForSelector('iframe#entryIframe', { timeout: 10000 });
    const iframe = await iframeElement.contentFrame();
    
    if (!iframe) {
      throw new Error('Could not access iframe');
    }

    console.log('Successfully accessed iframe\n');
    await page.waitForTimeout(2000);

    // 1. TEST BUSINESS HOURS
    console.log('1. TESTING BUSINESS HOURS:');
    console.log('----------------------------');
    const businessHoursSelectors = [
      '.O8qbU.pSavy .A_cdD .i8cJw .H3ua4',
      '.place_section_content .O8qbU .A_cdD .i8cJw',
      'span.H3ua4',
      '.A_cdD .H3ua4',
      'div.O8qbU.pSavy span.H3ua4',
      '[class*="영업시간"]',
      'text=영업시간'
    ];

    let businessHours = null;
    for (const selector of businessHoursSelectors) {
      try {
        const element = await iframe.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.includes(':')) {
            businessHours = text.trim();
            console.log(`✅ Found with selector "${selector}": ${businessHours}`);
            break;
          }
        }
      } catch (e) {}
    }

    // Try clicking to expand business hours
    if (!businessHours) {
      try {
        const expandButton = await iframe.$('.A_cdD .gKP9i');
        if (expandButton) {
          await expandButton.click();
          await page.waitForTimeout(1000);
          const expanded = await iframe.$('.A_cdD .H3ua4');
          if (expanded) {
            businessHours = await expanded.textContent();
            console.log(`✅ Found after expanding: ${businessHours}`);
          }
        }
      } catch (e) {}
    }

    if (!businessHours) {
      console.log('❌ Business hours not found');
    }
    console.log();

    // 2. TEST ADDRESS
    console.log('2. TESTING ADDRESS:');
    console.log('----------------------------');
    const addressSelectors = [
      '.O8qbU.dXdMx .PkgBl',
      '.place_section_content .O8qbU.dXdMx span.PkgBl',
      'span.PkgBl',
      '.dXdMx .PkgBl',
      '[class*="주소"] + span',
      'text=경기 성남시'
    ];

    let address = null;
    for (const selector of addressSelectors) {
      try {
        const element = await iframe.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && (text.includes('경기') || text.includes('서울') || text.includes('시') || text.includes('구'))) {
            address = text.trim();
            console.log(`✅ Found with selector "${selector}": ${address}`);
            break;
          }
        }
      } catch (e) {}
    }

    if (!address) {
      console.log('❌ Address not found');
    }
    console.log();

    // 3. TEST PRICE INFORMATION
    console.log('3. TESTING PRICE INFORMATION:');
    console.log('----------------------------');
    
    // First, check if there's a price/menu tab and click it
    try {
      const priceTab = await iframe.$('a[role="tab"]:has-text("가격")');
      if (!priceTab) {
        const menuTab = await iframe.$('a[role="tab"]:has-text("메뉴")');
        if (menuTab) {
          await menuTab.click();
          await page.waitForTimeout(2000);
        }
      } else {
        await priceTab.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {}

    const priceTextSelectors = [
      '.O8qbU.tQX7D',
      '.place_section_content .tQX7D',
      'div[class*="price"]',
      'div[class*="가격"]',
      '.pSJyY',
      '.K7RXh',
      'text=수강료',
      'text=등록비'
    ];

    let priceText = false;
    for (const selector of priceTextSelectors) {
      try {
        const element = await iframe.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && (text.includes('원') || text.includes('수강') || text.includes('등록') || text.includes('가격'))) {
            priceText = true;
            console.log(`✅ Price text found with selector "${selector}": ${text.substring(0, 50)}...`);
            break;
          }
        }
      } catch (e) {}
    }

    // Check for price images
    const priceImageSelectors = [
      '.K0PDV._div',
      '.place_section_content img[src*="phinf"]',
      'img[alt*="가격"]',
      'img[alt*="메뉴"]',
      '.tQX7D img'
    ];

    let priceImage = false;
    for (const selector of priceImageSelectors) {
      try {
        const element = await iframe.$(selector);
        if (element) {
          priceImage = true;
          console.log(`✅ Price image found with selector "${selector}"`);
          break;
        }
      } catch (e) {}
    }

    if (!priceText && !priceImage) {
      console.log('❌ No price information found');
    }
    console.log();

    // Go back to home tab
    try {
      const homeTab = await iframe.$('a[role="tab"]:has-text("홈")');
      if (homeTab) {
        await homeTab.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {}

    // 4. TEST REPRESENTATIVE KEYWORDS
    console.log('4. TESTING REPRESENTATIVE KEYWORDS:');
    console.log('----------------------------');
    const keywordSelectors = [
      '.bgt3S .x8JmK',
      '.x8JmK',
      '.place_section_content .x8JmK',
      'span.x8JmK',
      '.bgt3S span',
      '[class*="keyword"]',
      '.dNaWM span'
    ];

    const keywords = [];
    for (const selector of keywordSelectors) {
      try {
        const elements = await iframe.$$(selector);
        for (const element of elements) {
          const text = await element.textContent();
          if (text && text.trim() && !text.includes('더보기')) {
            keywords.push(text.trim());
          }
        }
        if (keywords.length > 0) {
          console.log(`✅ Found ${keywords.length} keywords with selector "${selector}":`, keywords);
          break;
        }
      } catch (e) {}
    }

    if (keywords.length === 0) {
      console.log('❌ No keywords found');
    }
    console.log();

    // 5. TEST AMENITIES
    console.log('5. TESTING AMENITIES:');
    console.log('----------------------------');
    const amenityKeywords = {
      parking: ['주차', '주차장', '파킹'],
      wifi: ['와이파이', 'wifi', 'wi-fi', '무선인터넷'],
      waitingRoom: ['대기실', '대기공간', '휴게실'],
      toilet: ['화장실', '남녀화장실'],
      wheelchair: ['휠체어', '장애인'],
      vehicle: ['운송', '차량', '셔틀']
    };

    const foundAmenities = {};
    
    // Try to find amenities section
    const amenitiesSelectors = [
      '.O8qbU.CwDfQ',
      '.place_section_content .CwDfQ',
      '.fi6gy',
      '[class*="편의"]'
    ];

    for (const selector of amenitiesSelectors) {
      try {
        const element = await iframe.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text) {
            console.log(`Found amenities section with selector "${selector}": ${text.substring(0, 100)}...`);
            
            for (const [key, keywords] of Object.entries(amenityKeywords)) {
              for (const keyword of keywords) {
                if (text.includes(keyword)) {
                  foundAmenities[key] = true;
                  console.log(`✅ ${key}: Found`);
                  break;
                }
              }
            }
            break;
          }
        }
      } catch (e) {}
    }

    console.log('Amenities found:', foundAmenities);
    console.log();

    // 6. TEST BLOG REVIEWS
    console.log('6. TESTING BLOG REVIEWS:');
    console.log('----------------------------');
    
    // Click on review tab if available
    try {
      const reviewTab = await iframe.$('a[role="tab"]:has-text("리뷰")');
      if (reviewTab) {
        await reviewTab.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {}

    const blogReviewSelectors = [
      '.zPfVt',
      '.YkrAu',
      '.sa6We',
      '.place_section.k1QQ5 .zPfVt',
      '[class*="blog_review"]',
      'a[href*="blog.naver.com"]'
    ];

    const blogReviews = [];
    for (const selector of blogReviewSelectors) {
      try {
        const elements = await iframe.$$(selector);
        console.log(`Checking selector "${selector}": found ${elements.length} elements`);
        
        for (const element of elements.slice(0, 5)) {
          // Look for dates
          const dateElement = await element.$('.vcV_R, .YtHU9, time, .date');
          if (dateElement) {
            const dateText = await dateElement.textContent();
            if (dateText) {
              blogReviews.push(dateText.trim());
            }
          }
          
          // Also check the element itself for date patterns
          const text = await element.textContent();
          const dateMatch = text.match(/\d{4}\.\d{1,2}\.\d{1,2}|\d{4}년\s*\d{1,2}월\s*\d{1,2}일/);
          if (dateMatch && !blogReviews.includes(dateMatch[0])) {
            blogReviews.push(dateMatch[0]);
          }
        }
        
        if (blogReviews.length > 0) {
          console.log(`✅ Found ${blogReviews.length} blog reviews:`, blogReviews);
          break;
        }
      } catch (e) {
        console.log(`Error with selector "${selector}":`, e.message);
      }
    }

    // Check blog review count
    try {
      const countElement = await iframe.$('.dAsGb span.place_section_count');
      if (countElement) {
        const countText = await countElement.textContent();
        console.log(`Blog review count from tab: ${countText}`);
      }
    } catch (e) {}

    if (blogReviews.length === 0) {
      console.log('❌ No blog reviews found');
    }
    console.log();

    // SUMMARY
    console.log('\n=== EXTRACTION SUMMARY ===');
    console.log('1. Business Hours:', businessHours || 'NOT FOUND');
    console.log('2. Address:', address || 'NOT FOUND');
    console.log('3. Price Text:', priceText ? 'FOUND' : 'NOT FOUND');
    console.log('4. Price Image:', priceImage ? 'FOUND' : 'NOT FOUND');
    console.log('5. Keywords:', keywords.length > 0 ? keywords.join(', ') : 'NOT FOUND');
    console.log('6. Amenities:', Object.keys(foundAmenities).length > 0 ? foundAmenities : 'NOT FOUND');
    console.log('7. Blog Reviews:', blogReviews.length > 0 ? `${blogReviews.length} found` : 'NOT FOUND');

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

testDetailedExtraction();