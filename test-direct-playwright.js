const { chromium } = require('playwright');

async function testDirectExtraction() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== DIRECT PLAYWRIGHT TEST ===\n');
  
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
    
    // Click on info tab
    const infoTab = await iframe.$('a[role="tab"]:has-text("정보")');
    if (infoTab) {
      await infoTab.click();
      await page.waitForTimeout(3000);
      console.log('Clicked on 정보 tab\n');
    }

    // Get the full text of the info section
    console.log('EXTRACTING FULL INFO SECTION TEXT:');
    console.log('=====================================');
    const infoSection = await iframe.$('.place_section_content');
    if (infoSection) {
      const fullText = await infoSection.textContent();
      
      // Parse the information
      console.log('\nPARSING INFORMATION:');
      console.log('-------------------');
      
      // 1. Extract business hours
      const hoursMatch = fullText.match(/영업시간([^●]*)/);
      if (hoursMatch) {
        const hoursText = hoursMatch[1].trim();
        const dayPattern = /([월화수목금토일])\s*(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/g;
        let businessHours = [];
        let match;
        while ((match = dayPattern.exec(hoursText)) !== null) {
          businessHours.push(`${match[1]} ${match[2]} ~ ${match[3]}`);
        }
        console.log('Business Hours:', businessHours.join(', '));
      }
      
      // 2. Extract address
      const addressMatch = fullText.match(/도로명 주소\s*:\s*([^●\n]*)/);
      if (addressMatch) {
        console.log('Address:', addressMatch[1].trim());
      }
      
      // 3. Extract options (amenities)
      const optionsMatch = fullText.match(/옵션사항\s*:\s*\[([^\]]+)\]/);
      if (optionsMatch) {
        const options = optionsMatch[1].split(',').map(o => o.trim().replace(/'/g, ''));
        console.log('Amenities:', options);
        console.log('  - Parking:', options.some(o => o.includes('주차')) ? 'YES' : 'NO');
        console.log('  - WiFi:', options.some(o => o.includes('무선 인터넷')) ? 'YES' : 'NO');
        console.log('  - Waiting Room:', options.some(o => o.includes('대기공간')) ? 'YES' : 'NO');
        console.log('  - Toilet:', options.some(o => o.includes('화장실')) ? 'YES' : 'NO');
        console.log('  - Vehicle:', options.some(o => o.includes('차량운행')) ? 'YES' : 'NO');
      }
      
      // 4. Extract prices
      const pricePattern = /(\d+\.\s*[^:]+)\s*:\s*(\d+)원/g;
      const prices = [];
      let priceMatch;
      while ((priceMatch = pricePattern.exec(fullText)) !== null) {
        prices.push(`${priceMatch[1].trim()}: ${priceMatch[2]}원`);
      }
      if (prices.length > 0) {
        console.log('Prices Found:', prices.length);
        console.log('Sample Prices:', prices.slice(0, 3));
      }
      
      // 5. Extract keywords
      const keywordSection = await iframe.$$('.x8JmK');
      if (keywordSection.length > 0) {
        const keywords = [];
        for (const el of keywordSection) {
          const text = await el.textContent();
          if (text && !text.includes('더보기')) {
            keywords.push(text.trim());
          }
        }
        console.log('Keywords:', keywords.length > 0 ? keywords : 'NOT FOUND');
      }
    }

    console.log('\n=== TEST COMPLETE ===');

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

testDirectExtraction();