const { chromium } = require('playwright');

async function testPriceTabFocus() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== FOCUSED TEST FOR PRICE IMAGE ON 정보 TAB ===\n');
  
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
    
    // Navigate directly to 정보 tab
    console.log('1. CLICKING 정보 TAB:');
    const infoTab = await iframe.$('a[role="tab"]:has-text("정보")');
    if (infoTab) {
      await infoTab.click();
      console.log('✅ 정보 tab clicked');
      
      // Wait longer for content to fully load
      console.log('Waiting for content to load...');
      await page.waitForTimeout(5000);
    }
    
    // Debug: Check what elements are present after loading
    console.log('\n2. CHECKING LOADED CONTENT:');
    
    // Check for place_section_content
    const sectionContent = await iframe.$$('.place_section_content');
    console.log(`Found ${sectionContent.length} place_section_content elements`);
    
    // List all sections with O8qbU class
    const o8qbuElements = await iframe.$$('.O8qbU');
    console.log(`\nFound ${o8qbuElements.length} elements with class O8qbU:`);
    
    for (let i = 0; i < o8qbuElements.length; i++) {
      const className = await o8qbuElements[i].getAttribute('class');
      const textContent = await o8qbuElements[i].textContent();
      console.log(`\nElement ${i + 1}:`);
      console.log(`  Classes: ${className}`);
      console.log(`  Text preview: ${textContent?.substring(0, 80)}...`);
      
      // Check if this element has images
      const images = await o8qbuElements[i].$$('img');
      if (images.length > 0) {
        console.log(`  ✅ HAS ${images.length} IMAGE(S)`);
      }
      
      // Check if this is the price section
      if (className && className.includes('tXI2c')) {
        console.log('  🎯 THIS IS THE PRICE SECTION (has tXI2c class)');
      }
    }
    
    // Try to find price section with exact selector from user
    console.log('\n3. TESTING USER\'S EXACT SELECTOR:');
    const userSelector = '#app-root > div > div > div:nth-child(7) > div > div:nth-child(2) > div.place_section_content > div > div.O8qbU.tXI2c > div > div';
    const userElement = await iframe.$(userSelector);
    if (userElement) {
      console.log('✅ Found element with user\'s exact selector!');
      const content = await userElement.textContent();
      console.log('Content:', content || 'No text (might be image)');
    } else {
      console.log('❌ User\'s exact selector not found');
      
      // Try partial selector
      const partialSelector = '.O8qbU.tXI2c';
      const partialElement = await iframe.$(partialSelector);
      if (partialElement) {
        console.log('✅ Found with partial selector .O8qbU.tXI2c');
      }
    }
    
    // Check all images on page
    console.log('\n4. ALL IMAGES ON PAGE:');
    const allImages = await iframe.$$('img');
    console.log(`Total images: ${allImages.length}`);
    
    // Check for price-related images
    let priceImageCount = 0;
    for (const img of allImages) {
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      if (src && (src.includes('phinf') || alt?.includes('가격') || alt?.includes('price'))) {
        priceImageCount++;
        console.log(`Price-related image ${priceImageCount}: ${src.substring(0, 60)}...`);
      }
    }
    
    if (priceImageCount === 0) {
      console.log('No obvious price-related images found');
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Browser will close in 15 seconds for inspection...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

testPriceTabFocus();