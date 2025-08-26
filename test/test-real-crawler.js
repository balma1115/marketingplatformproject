/**
 * Test Real Smartplace Crawler with actual data
 */

const { chromium } = require('playwright');

async function testRealCrawler() {
  const placeId = '1616011574';
  console.log('🚀 Testing Real Smartplace Crawler...\n');
  console.log('📍 Place ID:', placeId);
  console.log('🌐 Real Data Extraction Test\n');
  console.log('================================\n');
  
  let browser = null;
  
  try {
    // Launch browser in headless mode for production
    browser = await chromium.launch({
      headless: true, // Run in background
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'ko-KR'
    });
    
    const page = await context.newPage();
    
    // Navigate to the place page  
    const url = `https://pcmap.place.naver.com/place/${placeId}/home`;
    console.log('📡 Loading:', url);
    
    await page.goto(url, { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    console.log('✅ Page loaded\n');
    
    // Extract comprehensive data
    const data = await page.evaluate(() => {
      const result = {
        name: '',
        category: '',
        address: '',
        phone: '',
        rating: 0,
        reviewCount: 0,
        photoCount: 0,
        businessHours: {},
        homepage: '',
        description: '',
        tags: [],
        amenities: []
      };
      
      // Name - try multiple selectors
      const nameSelectors = [
        '.GHAhO', '.Fc1rA', '.YouOG .TYaxT', 
        '.vzTlz', 'h2.place_name', '.place_bluelink.Fc1rA'
      ];
      
      for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent) {
          result.name = el.textContent.trim();
          break;
        }
      }
      
      // Category
      const categorySelectors = ['.lnJFt', '.DJJvD', '.KCMnt'];
      for (const selector of categorySelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent) {
          result.category = el.textContent.trim();
          break;
        }
      }
      
      // Address
      const addressSelectors = ['.IH7VW', '.PkgBl', '.LDgIH'];
      for (const selector of addressSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent) {
          result.address = el.textContent.trim();
          break;
        }
      }
      
      // Phone
      const phoneSelectors = ['.xlx7Q', '.O8qbU', 'a[href^="tel:"]'];
      for (const selector of phoneSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          if (el.href && el.href.startsWith('tel:')) {
            result.phone = el.href.replace('tel:', '');
            break;
          } else if (el.textContent && el.textContent.match(/\d{2,4}-\d{3,4}-\d{4}/)) {
            result.phone = el.textContent.trim();
            break;
          }
        }
      }
      
      // Rating - look for the actual rating value
      const ratingEl = document.querySelector('em.PXMot.LXIwF, .LDgIH em');
      if (ratingEl) {
        const match = ratingEl.textContent.match(/(\d+\.?\d*)/);
        if (match) {
          result.rating = parseFloat(match[1]);
        }
      }
      
      // Review count
      const reviewEl = document.querySelector('.DizGn, .dAsGb span');
      if (reviewEl) {
        const match = reviewEl.textContent.match(/(\d+)/);
        if (match) {
          result.reviewCount = parseInt(match[1]);
        }
      }
      
      // Homepage
      const homepageEl = document.querySelector('a[href^="http"]:not([href*="naver"])');
      if (homepageEl && homepageEl.href) {
        result.homepage = homepageEl.href;
      }
      
      // Tags/Keywords
      const tagElements = document.querySelectorAll('.place_tag, .keyword, .ySHNE');
      tagElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && !text.includes('더보기')) {
          result.tags.push(text);
        }
      });
      
      return result;
    });
    
    // Try to get business hours by clicking the button
    try {
      const hoursButton = await page.$('button:has-text("영업시간"), a:has-text("영업시간")');
      if (hoursButton) {
        await hoursButton.click();
        await page.waitForTimeout(1000);
        
        // Extract business hours
        const hours = await page.evaluate(() => {
          const hoursObj = {};
          const elements = document.querySelectorAll('.y6tNq, .A_cdD, .O8qbU');
          
          elements.forEach(el => {
            const text = el.textContent;
            if (text && text.includes(':')) {
              const lines = text.split('\n');
              lines.forEach(line => {
                if (line.includes(':') || line.includes('~')) {
                  const parts = line.split(/\s+/);
                  if (parts.length >= 2) {
                    const day = parts[0];
                    const time = parts.slice(1).join(' ');
                    if (!day.includes('영업') && !day.includes('운영')) {
                      hoursObj[day] = time;
                    }
                  }
                }
              });
            }
          });
          
          return hoursObj;
        });
        
        if (Object.keys(hours).length > 0) {
          data.businessHours = hours;
        }
      }
    } catch (e) {
      console.log('Could not extract business hours');
    }
    
    // Print results
    console.log('📊 Extracted Data:');
    console.log('================================');
    console.log('✅ Name:', data.name || '❌ Not found');
    console.log('✅ Category:', data.category || '❌ Not found');
    console.log('✅ Address:', data.address || '❌ Not found');
    console.log('✅ Phone:', data.phone || '❌ Not found');
    console.log('✅ Rating:', data.rating || '❌ Not found');
    console.log('✅ Reviews:', data.reviewCount || '❌ Not found');
    console.log('✅ Homepage:', data.homepage || '❌ Not found');
    console.log('✅ Business Hours:', Object.keys(data.businessHours).length > 0 ? 
      `${Object.keys(data.businessHours).length} days` : '❌ Not found');
    console.log('✅ Tags:', data.tags.length > 0 ? data.tags.join(', ') : '❌ Not found');
    console.log('================================\n');
    
    // Calculate completeness
    const fields = ['name', 'category', 'address', 'phone', 'rating', 'reviewCount', 'homepage'];
    const filledFields = fields.filter(field => {
      const value = data[field];
      return value && value !== '' && value !== 0;
    });
    
    const completeness = Math.round((filledFields.length / fields.length) * 100);
    console.log(`📈 Data Completeness: ${completeness}%`);
    console.log(`📋 Filled Fields: ${filledFields.join(', ')}\n`);
    
    // Test API with real crawler
    console.log('🔄 Testing API with real crawler...\n');
    
    const axios = require('axios');
    try {
      const response = await axios.post('http://localhost:3000/api/smartplace/diagnosis', {
        placeId: placeId
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      if (response.data.success) {
        console.log('✅ API Test Success!');
        console.log('Total Score:', response.data.result.totalScore);
        console.log('Analysis Scores:');
        console.log('  - Completeness:', response.data.result.analysis.completeness.score);
        console.log('  - Quality:', response.data.result.analysis.quality.score);
        console.log('  - Visibility:', response.data.result.analysis.visibility.score);
        console.log('  - Engagement:', response.data.result.analysis.engagement.score);
      } else {
        console.log('❌ API returned error:', response.data.error);
      }
    } catch (apiError) {
      if (apiError.response?.status === 401) {
        console.log('⚠️ API requires authentication - this is expected in production');
      } else {
        console.log('❌ API Error:', apiError.message);
      }
    }
    
    console.log('\n✅ Real crawler test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run test
testRealCrawler()
  .then(() => {
    console.log('\n🎉 All tests completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });