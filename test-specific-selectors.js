const { chromium } = require('playwright');

async function testSpecificSelectors() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== TESTING SPECIFIC SELECTORS FOR 영업시간 AND 가격이미지 ===\n');
  
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
    
    // 1. TEST BUSINESS HOURS WITH EXACT SELECTOR
    console.log('1. TESTING 영업시간 (BUSINESS HOURS):');
    console.log('=====================================');
    
    try {
      // First check if the expand button exists
      const hoursExpandSelector = '#app-root > div > div > div:nth-child(7) > div > div:nth-child(2) > div.place_section_content > div > div.O8qbU.pSavy > div > a > div.w9QyJ.vI8SM.DzD3b > div > span';
      console.log('Looking for expand button with selector:', hoursExpandSelector);
      
      const hoursExpandButton = await iframe.$(hoursExpandSelector);
      if (hoursExpandButton) {
        console.log('✅ Expand button found! Clicking...');
        await hoursExpandButton.click();
        await page.waitForTimeout(1500);
        console.log('   Button clicked, waiting for expansion...');
      } else {
        console.log('❌ Expand button NOT found');
        
        // Try alternative selectors
        console.log('\nTrying alternative selectors:');
        const altSelectors = [
          '.O8qbU.pSavy button',
          '.O8qbU.pSavy a',
          '.place_section_content button:has-text("영업시간")',
          '.w9QyJ.vI8SM.DzD3b'
        ];
        
        for (const selector of altSelectors) {
          const element = await iframe.$(selector);
          if (element) {
            console.log(`  Found with selector: ${selector}`);
            const text = await element.textContent();
            console.log(`  Text: ${text}`);
          }
        }
      }
      
      // Now get the business hours section
      const hoursSelector = '#app-root > div > div > div:nth-child(7) > div > div:nth-child(2) > div.place_section_content > div > div.O8qbU.pSavy > div';
      console.log('\nLooking for hours section with selector:', hoursSelector);
      
      const hoursSection = await iframe.$(hoursSelector);
      if (hoursSection) {
        const hoursText = await hoursSection.textContent();
        console.log('✅ Hours section found!');
        console.log('   Content:', hoursText ? hoursText.substring(0, 200) + '...' : 'empty');
        
        // Extract operating hours pattern
        if (hoursText) {
          if (hoursText.includes('운영 중')) {
            console.log('   ✅ Contains "운영 중"');
          }
          if (hoursText.includes('영업시간')) {
            console.log('   ✅ Contains "영업시간"');
          }
          
          // Look for time patterns
          const timePattern = /\d{1,2}:\d{2}/g;
          const times = hoursText.match(timePattern);
          if (times) {
            console.log('   ✅ Time patterns found:', times);
          }
        }
      } else {
        console.log('❌ Hours section NOT found');
      }
    } catch (e) {
      console.log('Error testing business hours:', e.message);
    }
    
    console.log('\n');
    
    // 2. TEST PRICE IMAGE WITH EXACT SELECTOR  
    console.log('2. TESTING 가격 이미지 (PRICE IMAGE):');
    console.log('=====================================');
    
    try {
      const priceImageSelector = '#app-root > div > div > div:nth-child(7) > div > div:nth-child(2) > div.place_section_content > div > div.O8qbU.tXI2c > div > div';
      console.log('Looking for price image section with selector:', priceImageSelector);
      
      const priceImageSection = await iframe.$(priceImageSelector);
      if (priceImageSection) {
        console.log('✅ Price image section FOUND!');
        const content = await priceImageSection.textContent();
        console.log('   Content:', content ? content.substring(0, 100) : 'empty or image');
        
        // Check if it contains images
        const images = await priceImageSection.$$('img');
        console.log(`   Contains ${images.length} image(s)`);
        
        // Check for any child elements
        const children = await priceImageSection.$$('*');
        console.log(`   Contains ${children.length} child element(s)`);
      } else {
        console.log('❌ Price image section NOT found');
        
        // Try alternative selectors
        console.log('\nTrying alternative selectors:');
        const altSelectors = [
          '.O8qbU.tXI2c',
          '.place_section_content .tXI2c',
          'div.tXI2c',
          '[class*="tXI2c"]'
        ];
        
        for (const selector of altSelectors) {
          const element = await iframe.$(selector);
          if (element) {
            console.log(`  ✅ Found with selector: ${selector}`);
            const hasImages = await element.$$('img');
            console.log(`     Has ${hasImages.length} images`);
          }
        }
      }
      
      // Also check if we're on the right tab
      console.log('\nChecking current tab...');
      const activeTab = await iframe.$('a[role="tab"][aria-selected="true"]');
      if (activeTab) {
        const tabName = await activeTab.textContent();
        console.log('Current active tab:', tabName);
        
        // If not on 정보 tab, click it
        if (tabName !== '정보') {
          console.log('Switching to 정보 tab...');
          const infoTab = await iframe.$('a[role="tab"]:has-text("정보")');
          if (infoTab) {
            await infoTab.click();
            await page.waitForTimeout(2000);
            
            // Try price image selector again
            const priceImageSection2 = await iframe.$(priceImageSelector);
            if (priceImageSection2) {
              console.log('✅ Price image section found after switching to 정보 tab!');
            }
          }
        }
      }
    } catch (e) {
      console.log('Error testing price image:', e.message);
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Keeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

testSpecificSelectors();