const { chromium } = require('playwright');

async function testHoursAndPrice() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== TESTING ONLY 영업시간 AND 가격이미지 ===\n');
  
  try {
    const url = 'https://map.naver.com/p/entry/place/1616011574';
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const iframeElement = await page.waitForSelector('iframe#entryIframe', { timeout: 10000 });
    const iframe = await iframeElement.contentFrame();
    
    if (!iframe) {
      throw new Error('Could not access iframe');
    }

    console.log('Successfully accessed iframe\n');
    
    // 1. TEST BUSINESS HOURS (영업시간)
    console.log('1. TESTING 영업시간 (BUSINESS HOURS):');
    console.log('=====================================');
    
    // Test on home tab first
    const homeBusinessSection = await iframe.$('.O8qbU.pSavy');
    if (homeBusinessSection) {
      const businessText = await homeBusinessSection.textContent();
      console.log('✅ Business hours section found on HOME tab!');
      console.log('   Content:', businessText);
      
      // Check if expand button exists
      const expandButton = await homeBusinessSection.$('a, button');
      if (expandButton) {
        const buttonText = await expandButton.textContent();
        if (buttonText && buttonText.includes('펼쳐보기')) {
          console.log('   Found expand button, clicking...');
          await expandButton.click();
          await page.waitForTimeout(1500);
          
          const expandedText = await homeBusinessSection.textContent();
          console.log('   Expanded content:', expandedText);
        }
      }
    } else {
      console.log('❌ Business hours section NOT found on home tab');
    }
    
    // 2. Navigate to 정보 tab for price image
    console.log('\n2. NAVIGATING TO 정보 TAB:');
    console.log('=========================');
    
    const infoTab = await iframe.$('a[role="tab"]:has-text("정보")');
    if (infoTab) {
      console.log('Found 정보 tab, clicking...');
      await infoTab.click();
      await page.waitForTimeout(3000);
      console.log('✅ 정보 tab clicked, waiting for content...');
    } else {
      console.log('❌ 정보 tab not found');
    }
    
    // 3. TEST PRICE IMAGE (가격이미지) 
    console.log('\n3. TESTING 가격이미지 (PRICE IMAGE):');
    console.log('====================================');
    
    // Try multiple selectors
    const priceSelectors = [
      '.O8qbU.tXI2c',
      '.place_section_content .tXI2c',
      'div.tXI2c'
    ];
    
    let priceFound = false;
    for (const selector of priceSelectors) {
      const priceSection = await iframe.$(selector);
      if (priceSection) {
        console.log(`✅ Price section found with selector: ${selector}`);
        
        // Check for images
        const images = await priceSection.$$('img');
        console.log(`   Has ${images.length} image(s)`);
        
        // Check for text content
        const textContent = await priceSection.textContent();
        console.log(`   Has text: ${textContent ? 'YES' : 'NO'}`);
        
        // Check structure
        const hasNestedDiv = await priceSection.$('div > div');
        if (hasNestedDiv) {
          console.log('   ✅ Has nested div structure (image container)');
        }
        
        priceFound = true;
        break;
      }
    }
    
    if (!priceFound) {
      console.log('❌ Price section NOT found with any selector');
      
      // Debug: List all elements with O8qbU class
      console.log('\nDEBUG: Looking for all O8qbU elements...');
      const allO8qbU = await iframe.$$('.O8qbU');
      console.log(`Found ${allO8qbU.length} elements with class O8qbU`);
      
      for (let i = 0; i < Math.min(3, allO8qbU.length); i++) {
        const className = await allO8qbU[i].getAttribute('class');
        const text = await allO8qbU[i].textContent();
        console.log(`  Element ${i}: class="${className}", text="${text?.substring(0, 50)}..."`);
      }
    }
    
    // 4. Check business hours on 정보 tab as well
    console.log('\n4. RE-CHECKING 영업시간 ON 정보 TAB:');
    console.log('=====================================');
    
    const infoBusinessSection = await iframe.$('.O8qbU.pSavy');
    if (infoBusinessSection) {
      const businessText = await infoBusinessSection.textContent();
      console.log('✅ Business hours section found on 정보 tab!');
      console.log('   Content:', businessText?.substring(0, 200));
    } else {
      console.log('❌ Business hours section NOT found on 정보 tab');
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

testHoursAndPrice();