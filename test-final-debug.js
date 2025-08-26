const { chromium } = require('playwright');

async function finalDebug() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== FINAL DEBUG TEST ===\n');
  
  try {
    const url = 'https://map.naver.com/p/entry/place/1616011574';
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const iframeElement = await page.waitForSelector('iframe#entryIframe');
    const iframe = await iframeElement.contentFrame();
    
    if (!iframe) {
      throw new Error('Could not access iframe');
    }

    // 1. BUSINESS HOURS - More specific extraction
    console.log('1. BUSINESS HOURS EXTRACTION:');
    console.log('==============================');
    
    // Look for the exact element that contains business hours
    const businessElement = await iframe.$('.place_section_content');
    if (businessElement) {
      const businessText = await businessElement.textContent();
      
      // Try to find 운영 중 and closing time
      if (businessText.includes('운영 중') && businessText.includes('운영 종료')) {
        const match = businessText.match(/운영 중.*?(\d{1,2}:\d{2}).*?운영 종료/);
        if (match) {
          console.log(`✅ Operating hours found: 운영 중, ${match[1]}에 운영 종료`);
        }
      }
      
      // Try to find detailed hours
      const hoursPattern = /([월화수목금토일])\s*(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/g;
      const hours = [];
      let hoursMatch;
      while ((hoursMatch = hoursPattern.exec(businessText)) !== null) {
        hours.push(`${hoursMatch[1]} ${hoursMatch[2]} ~ ${hoursMatch[3]}`);
      }
      if (hours.length > 0) {
        console.log('✅ Detailed hours:', hours.join(', '));
      }
    }
    
    // 2. INSTAGRAM - Check all link elements
    console.log('\n2. INSTAGRAM LINK:');
    console.log('==================');
    
    // Click info tab to ensure we're on the right section
    const infoTab = await iframe.$('a[role="tab"]:has-text("정보")');
    if (infoTab) {
      await infoTab.click();
      await page.waitForTimeout(2000);
    }
    
    // Get ALL links and check each one
    const allLinks = await iframe.$$('a');
    console.log(`Total links found: ${allLinks.length}`);
    
    let instagramFound = false;
    for (const link of allLinks) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      
      if (href && (href.includes('instagram') || text === '인스타그램')) {
        console.log(`✅ Instagram link found: ${href}`);
        console.log(`   Link text: ${text}`);
        instagramFound = true;
        break;
      }
    }
    
    if (!instagramFound) {
      console.log('❌ No Instagram link found among all links');
    }
    
    // 3. AMENITIES - Check introduction text
    console.log('\n3. AMENITIES:');
    console.log('=============');
    
    // Click 더보기 to expand full text
    const moreButton = await iframe.$('button:has-text("더보기"), a:has-text("더보기")');
    if (moreButton) {
      await moreButton.click();
      await page.waitForTimeout(1500);
    }
    
    const introElement = await iframe.$('.pvuWY');
    if (introElement) {
      const introText = await introElement.textContent();
      
      // Check for amenity keywords
      const amenities = {
        parking: introText.includes('주차'),
        wifi: introText.includes('무선 인터넷') || introText.includes('WiFi'),
        waitingRoom: introText.includes('대기공간') || introText.includes('대기실'),
        toilet: introText.includes('화장실'),
        vehicle: introText.includes('차량운행') || introText.includes('차량')
      };
      
      console.log('Amenities found in introduction:');
      for (const [key, value] of Object.entries(amenities)) {
        if (value) {
          console.log(`  ✅ ${key}: YES`);
        }
      }
    }
    
    // 4. KEYWORDS
    console.log('\n4. KEYWORDS:');
    console.log('============');
    
    const keywordSelectors = [
      '.x8JmK',
      '.bgt3S span',
      '[class*="keyword"]',
      '.dNaWM span'
    ];
    
    for (const selector of keywordSelectors) {
      const elements = await iframe.$$(selector);
      if (elements.length > 0) {
        console.log(`Selector "${selector}" found ${elements.length} elements:`);
        for (let i = 0; i < Math.min(5, elements.length); i++) {
          const text = await elements[i].textContent();
          if (text && !text.includes('더보기')) {
            console.log(`  - ${text}`);
          }
        }
        break;
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

finalDebug();