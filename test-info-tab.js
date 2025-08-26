const { chromium } = require('playwright');

async function testInfoTab() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== INFO TAB TEST FOR 영업시간 AND 가격이미지 ===\n');
  
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

    console.log('Successfully accessed iframe');
    
    // IMPORTANT: Navigate to 정보 tab first
    console.log('\nSwitching to 정보 tab...');
    const infoTab = await iframe.$('a[role="tab"]:has-text("정보")');
    if (infoTab) {
      await infoTab.click();
      await page.waitForTimeout(3000);
      console.log('✅ 정보 tab clicked, waiting for content to load...');
    }
    
    // 1. BUSINESS HOURS
    console.log('\n1. TESTING 영업시간:');
    console.log('====================');
    
    // Look for business hours section
    const businessSection = await iframe.$('.O8qbU.pSavy');
    if (businessSection) {
      const businessText = await businessSection.textContent();
      console.log('✅ Business hours section found');
      console.log('Content:', businessText);
      
      // Try to click expand if available
      const expandButton = await businessSection.$('a:has-text("펼쳐보기"), button:has-text("펼쳐보기")');
      if (expandButton) {
        console.log('Found expand button, clicking...');
        await expandButton.click();
        await page.waitForTimeout(1000);
        
        const expandedText = await businessSection.textContent();
        console.log('Expanded content:', expandedText);
      }
    } else {
      console.log('❌ Business hours section NOT found');
      
      // Try to find any element with 운영 중
      const operatingElement = await iframe.$('text=운영 중');
      if (operatingElement) {
        const parent = await operatingElement.$('..');
        if (parent) {
          const text = await parent.textContent();
          console.log('Found operating hours via text search:', text);
        }
      }
    }
    
    // 2. PRICE IMAGE
    console.log('\n2. TESTING 가격 이미지:');
    console.log('======================');
    
    // Check for price section
    const priceSection = await iframe.$('.O8qbU.tXI2c');
    if (priceSection) {
      console.log('✅ Price section found (.O8qbU.tXI2c)');
      
      // Check for child divs
      const childDivs = await priceSection.$$('div');
      console.log(`   Has ${childDivs.length} child divs`);
      
      // Check for images
      const images = await priceSection.$$('img');
      console.log(`   Has ${images.length} images`);
      
      // Check the structure
      const innerDiv = await priceSection.$('div > div');
      if (innerDiv) {
        console.log('   ✅ Has nested div structure (div > div)');
      }
      
      // Get all classes of child elements
      const children = await priceSection.$$('*');
      for (let i = 0; i < Math.min(3, children.length); i++) {
        const className = await children[i].getAttribute('class');
        console.log(`   Child ${i} class: ${className}`);
      }
    } else {
      console.log('❌ Price section NOT found');
    }
    
    // Check if there's a menu/price tab
    console.log('\nChecking for 가격/메뉴 tab...');
    const priceTab = await iframe.$('a[role="tab"]:has-text("가격"), a[role="tab"]:has-text("메뉴")');
    if (priceTab) {
      console.log('✅ Price/Menu tab found, clicking...');
      await priceTab.click();
      await page.waitForTimeout(2000);
      
      // Check for price content after clicking
      const priceContent = await iframe.$('.O8qbU.tXI2c, .tQX7D, .K0PDV');
      if (priceContent) {
        console.log('✅ Price content found after clicking price tab');
        const hasImages = await priceContent.$$('img');
        console.log(`   Has ${hasImages.length} images`);
      }
    } else {
      console.log('❌ No price/menu tab found');
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

testInfoTab();