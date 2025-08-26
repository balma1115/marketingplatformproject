/**
 * Smartplace Crawler Test
 * Tests the actual crawling functionality with real Naver Place data
 */

const { chromium } = require('playwright');

async function testSmartplaceCrawler() {
  const placeId = '1616011574'; // Test place ID from user
  let browser = null;
  
  try {
    console.log('🚀 Starting Smartplace Crawler Test...\n');
    
    // Launch browser
    browser = await chromium.launch({
      headless: false, // Set to true in production
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'ko-KR'
    });
    
    const page = await context.newPage();
    
    // Test different URL formats
    const testUrls = [
      `https://pcmap.place.naver.com/place/${placeId}/home`,
      `https://map.naver.com/p/entry/place/${placeId}`,
      `https://m.place.naver.com/place/${placeId}`
    ];
    
    let successUrl = null;
    let data = {
      placeId: placeId,
      name: '',
      category: '',
      address: '',
      phone: '',
      businessHours: {},
      homepage: '',
      description: '',
      rating: 0,
      reviewCount: 0,
      photoCount: 0,
      visitorReviews: 0,
      blogReviews: 0,
      tags: [],
      amenities: []
    };
    
    // Try each URL format
    for (const url of testUrls) {
      console.log(`📍 Testing URL: ${url}`);
      
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle', 
          timeout: 30000 
        });
        
        // Wait a bit for content to load
        await page.waitForTimeout(2000);
        
        // Check if page loaded successfully
        const hasContent = await page.$('.place_section, .PkgBl, [class*="place"], [class*="Place"]');
        
        if (hasContent) {
          console.log('✅ Page loaded successfully\n');
          successUrl = url;
          break;
        }
      } catch (error) {
        console.log(`❌ Failed to load: ${error.message}\n`);
      }
    }
    
    if (!successUrl) {
      throw new Error('Could not load any place URL format');
    }
    
    console.log('🔍 Extracting place information...\n');
    
    // Extract data using multiple selector strategies
    // Name
    const nameSelectors = [
      '.GHAhO', '.Fc1rA', '.place_name', 
      'h2[class*="name"]', 'span[class*="name"]',
      '.YouOG .TYaxT', '.vzTlz'
    ];
    
    for (const selector of nameSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim()) {
            data.name = text.trim();
            console.log(`✓ Name: ${data.name}`);
            break;
          }
        }
      } catch (e) {}
    }
    
    // Category
    const categorySelectors = [
      '.lnJFt', '.DJJvD', '.place_type',
      'span[class*="category"]', '.KCMnt'
    ];
    
    for (const selector of categorySelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim()) {
            data.category = text.trim();
            console.log(`✓ Category: ${data.category}`);
            break;
          }
        }
      } catch (e) {}
    }
    
    // Address
    const addressSelectors = [
      '.IH7VW', '.PkgBl', 'span[class*="addr"]',
      '.place_section_content span:has-text("주소")',
      '.txt_address', '.LDgIH'
    ];
    
    for (const selector of addressSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim() && text.includes('서울') || text.includes('경기') || text.includes('부산')) {
            data.address = text.trim();
            console.log(`✓ Address: ${data.address}`);
            break;
          }
        }
      } catch (e) {}
    }
    
    // Phone
    const phoneSelectors = [
      '.xlx7Q', '.O8qbU', 'span:has-text("전화") + span',
      'a[href^="tel:"]', '.phone', '.contact'
    ];
    
    for (const selector of phoneSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          const href = await element.getAttribute('href');
          
          if (href && href.startsWith('tel:')) {
            data.phone = href.replace('tel:', '');
            console.log(`✓ Phone: ${data.phone}`);
            break;
          } else if (text && text.match(/\d{2,4}-\d{3,4}-\d{4}/)) {
            data.phone = text.trim();
            console.log(`✓ Phone: ${data.phone}`);
            break;
          }
        }
      } catch (e) {}
    }
    
    // Rating
    try {
      const ratingSelectors = [
        '.PXMot.LXIwF', '.LDgIH', 'em[class*="score"]',
        '.place_section em:has-text("별점")',
        'span[class*="rating"]'
      ];
      
      for (const selector of ratingSelectors) {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          const match = text?.match(/(\d+\.?\d*)/);
          if (match) {
            data.rating = parseFloat(match[1]);
            console.log(`✓ Rating: ${data.rating}`);
            break;
          }
        }
      }
    } catch (e) {}
    
    // Review Count
    try {
      const reviewSelectors = [
        '.DizGn', '.dAsGb span', 'span:has-text("리뷰")',
        'a[href*="review"] span', '.review_count'
      ];
      
      for (const selector of reviewSelectors) {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          const match = text?.match(/(\d+)/);
          if (match) {
            data.reviewCount = parseInt(match[1]);
            console.log(`✓ Review Count: ${data.reviewCount}`);
            break;
          }
        }
      }
    } catch (e) {}
    
    // Business Hours - Try to expand and extract
    try {
      // Look for business hours button and click it
      const hoursButton = await page.$('button:has-text("영업시간"), a:has-text("영업시간"), [class*="time"]');
      if (hoursButton) {
        await hoursButton.click();
        await page.waitForTimeout(500);
      }
      
      // Extract hours
      const hoursElements = await page.$$('.y6tNq, .A_cdD, [class*="hour"], [class*="time"] li');
      
      for (const element of hoursElements) {
        const text = await element.textContent();
        if (text && text.includes(':')) {
          const parts = text.split(/\s+/);
          if (parts.length >= 2) {
            const day = parts[0];
            const time = parts.slice(1).join(' ');
            data.businessHours[day] = time;
          }
        }
      }
      
      if (Object.keys(data.businessHours).length > 0) {
        console.log(`✓ Business Hours: ${Object.keys(data.businessHours).length} days`);
      }
    } catch (e) {}
    
    // Homepage
    try {
      const homepageSelectors = [
        'a[href^="http"]:has-text("홈페이지")',
        '.CHmqa a[href^="http"]',
        'a[class*="homepage"]',
        '.home_url'
      ];
      
      for (const selector of homepageSelectors) {
        const element = await page.$(selector);
        if (element) {
          const href = await element.getAttribute('href');
          if (href && href.startsWith('http')) {
            data.homepage = href;
            console.log(`✓ Homepage: ${data.homepage}`);
            break;
          }
        }
      }
    } catch (e) {}
    
    // Photo Count
    try {
      const photoSelectors = [
        '.dZltm', '.cb7hz.fvwqf', 'button:has-text("사진") span',
        'a[href*="photo"] span'
      ];
      
      for (const selector of photoSelectors) {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          const match = text?.match(/(\d+)/);
          if (match) {
            data.photoCount = parseInt(match[1]);
            console.log(`✓ Photo Count: ${data.photoCount}`);
            break;
          }
        }
      }
    } catch (e) {}
    
    // Visitor Reviews
    try {
      const visitorTab = await page.$('a[role="tab"]:has-text("방문자리뷰"), button:has-text("방문자")');
      if (visitorTab) {
        const text = await visitorTab.textContent();
        const match = text?.match(/(\d+)/);
        if (match) {
          data.visitorReviews = parseInt(match[1]);
          console.log(`✓ Visitor Reviews: ${data.visitorReviews}`);
        }
      }
    } catch (e) {}
    
    // Blog Reviews
    try {
      const blogTab = await page.$('a[role="tab"]:has-text("블로그리뷰"), button:has-text("블로그")');
      if (blogTab) {
        const text = await blogTab.textContent();
        const match = text?.match(/(\d+)/);
        if (match) {
          data.blogReviews = parseInt(match[1]);
          console.log(`✓ Blog Reviews: ${data.blogReviews}`);
        }
      }
    } catch (e) {}
    
    // Tags
    try {
      const tagElements = await page.$$('.place_tag, [class*="tag"] span, .keyword');
      for (const element of tagElements) {
        const text = await element.textContent();
        if (text && text.trim() && !text.includes('더보기')) {
          data.tags.push(text.trim());
        }
      }
      if (data.tags.length > 0) {
        console.log(`✓ Tags: ${data.tags.join(', ')}`);
      }
    } catch (e) {}
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: 'smartplace-test.png',
      fullPage: false 
    });
    console.log('\n📸 Screenshot saved as smartplace-test.png');
    
    // Print final data
    console.log('\n📊 Final Extracted Data:');
    console.log('================================');
    console.log(JSON.stringify(data, null, 2));
    console.log('================================\n');
    
    // Analyze data completeness
    const filledFields = Object.entries(data).filter(([key, value]) => {
      if (typeof value === 'object') {
        return Object.keys(value).length > 0;
      }
      return value && value !== '' && value !== 0;
    });
    
    const totalFields = Object.keys(data).length;
    const completeness = Math.round((filledFields.length / totalFields) * 100);
    
    console.log(`📈 Data Completeness: ${completeness}% (${filledFields.length}/${totalFields} fields)`);
    
    // Test result
    if (completeness >= 50) {
      console.log('\n✅ Test PASSED - Data extraction successful!');
    } else {
      console.log('\n⚠️ Test WARNING - Low data completeness, may need selector updates');
    }
    
  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔚 Browser closed');
    }
  }
}

// Run the test
testSmartplaceCrawler()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });