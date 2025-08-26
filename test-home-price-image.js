const { chromium } = require('playwright');

async function testHomePriceImage() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== TESTING PRICE IMAGE ON HOME TAB ===\n');
  
  try {
    // Test with different URL formats
    const urls = [
      'https://map.naver.com/p/entry/place/1616011574',
      'https://map.naver.com/p/entry/place/1616011574?placePath=/information',
      'https://map.naver.com/p/entry/place/1616011574?placePath=/home'
    ];
    
    for (const originalUrl of urls) {
      console.log(`\nTesting with URL: ${originalUrl}`);
      console.log('=' .repeat(50));
      
      // Always normalize to home tab
      const normalizedUrl = originalUrl.split('?')[0] + '?placePath=/home';
      console.log(`Normalized URL: ${normalizedUrl}`);
      
      await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);

      const iframeElement = await page.waitForSelector('iframe#entryIframe', { timeout: 10000 });
      const iframe = await iframeElement.contentFrame();
      
      if (!iframe) {
        throw new Error('Could not access iframe');
      }

      console.log('✅ Successfully accessed iframe');
      
      // Verify we're on home tab
      const activeTab = await iframe.$('a[role="tab"][aria-selected="true"]');
      if (activeTab) {
        const tabName = await activeTab.textContent();
        console.log(`Current active tab: ${tabName}`);
      }
      
      // Check for price image on HOME tab
      console.log('\nChecking for price image on HOME tab:');
      const priceSelectors = ['.O8qbU.tXI2c', '.place_section_content .tXI2c', 'div.tXI2c'];
      
      let priceFound = false;
      for (const selector of priceSelectors) {
        const priceSection = await iframe.$(selector);
        if (priceSection) {
          const hasImages = await priceSection.$$('img');
          const hasNestedDiv = await priceSection.$('div > div');
          
          if (hasImages.length > 0 || hasNestedDiv) {
            console.log(`✅ Price image found with selector: ${selector}`);
            console.log(`   Has ${hasImages.length} image(s)`);
            console.log(`   Has nested div: ${hasNestedDiv ? 'YES' : 'NO'}`);
            priceFound = true;
            break;
          }
        }
      }
      
      if (!priceFound) {
        console.log('❌ No price image found on home tab');
      }
      
      // Also check business hours
      console.log('\nChecking business hours on HOME tab:');
      const businessSection = await iframe.$('.O8qbU.pSavy');
      if (businessSection) {
        const businessText = await businessSection.textContent();
        if (businessText && businessText.includes('운영')) {
          console.log('✅ Business hours found:', businessText.substring(0, 100) + '...');
        }
      } else {
        console.log('❌ Business hours not found');
      }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

testHomePriceImage();