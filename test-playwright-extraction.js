const { chromium } = require('playwright');

/**
 * Test script to verify Playwright extraction for Naver Map place ID 1616011574
 * (미래엔영어수학 벌원학원)
 * 
 * This script tests all extraction elements with proper selectors and logs
 * detailed debugging information.
 */

async function testPlaywrightExtraction() {
  const placeId = '1616011574';
  const url = `https://map.naver.com/p/entry/place/${placeId}`;
  
  console.log('🚀 Starting Playwright extraction test...');
  console.log(`📍 Place ID: ${placeId}`);
  console.log(`🔗 URL: ${url}`);
  console.log('=' * 80);

  let browser = null;
  let context = null;
  let page = null;

  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: false, // Set to false for debugging
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    page = await context.newPage();
    
    console.log('📄 Navigating to page...');
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    // Wait for page to load
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Work with iframe
    let workingPage = page;
    console.log('🔍 Checking for iframe...');
    const entryIframe = await page.$('#entryIframe');
    if (entryIframe) {
      const frame = await entryIframe.contentFrame();
      if (frame) {
        console.log('✅ Working inside iframe');
        workingPage = frame;
      } else {
        console.log('❌ Iframe found but no content frame');
      }
    } else {
      console.log('ℹ️ No iframe found, working with main page');
    }

    // Initialize test results
    const testResults = {
      category: { success: false, value: '', selector: 'span.lnJFt' },
      reservationButton: { success: false, value: '', selector: 'reservation button selectors' },
      inquiryButton: { success: false, value: '', selector: 'inquiry button selectors' },
      couponButton: { success: false, value: '', selector: 'coupon section selectors' },
      priceInformation: { success: false, value: '', selector: 'price display selectors' },
      introduction: { success: false, value: '', selector: '.pvuWY > div' },
      keywords: { success: false, value: [], selector: '.bgt3S .rUWaa' },
      imageDates: { success: false, value: [], selector: 'image src URLs' },
      visitorReviews: { success: false, value: [], selector: 'visitor review selectors' },
      blogReviews: { success: false, value: [], selector: 'blog review selectors' }
    };

    console.log('\n🔬 === STARTING EXTRACTION TESTS ===\n');

    // Test 1: Extract category from span.lnJFt
    console.log('1️⃣ Testing category extraction...');
    try {
      const categoryElement = await workingPage.$('#_title > div > span.lnJFt');
      if (categoryElement) {
        const categoryText = await categoryElement.textContent();
        testResults.category.success = true;
        testResults.category.value = categoryText?.trim() || '';
        console.log(`   ✅ Category: "${testResults.category.value}"`);
      } else {
        console.log('   ❌ Category element not found');
        // Try alternative selector
        const altCategoryElement = await workingPage.$('span.lnJFt');
        if (altCategoryElement) {
          const categoryText = await altCategoryElement.textContent();
          testResults.category.success = true;
          testResults.category.value = categoryText?.trim() || '';
          console.log(`   ✅ Category (alt selector): "${testResults.category.value}"`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error extracting category: ${error.message}`);
    }

    // Test 2: Check reservation button
    console.log('\n2️⃣ Testing reservation button...');
    try {
      const reservationSelectors = [
        '#app-root > div > div > div.place_section.no_margin.OP4V8 > div.UoIF_ > div > span:nth-child(1)',
        '.UoIF_ span:has-text("예약")',
        'span:has-text("예약")'
      ];

      for (const selector of reservationSelectors) {
        try {
          const reservationButton = await workingPage.$(selector);
          if (reservationButton) {
            const text = await reservationButton.textContent();
            const hasReservation = text?.includes('예약') || false;
            testResults.reservationButton.success = true;
            testResults.reservationButton.value = `${text} (has reservation: ${hasReservation})`;
            console.log(`   ✅ Reservation button found: "${text}" (selector: ${selector})`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!testResults.reservationButton.success) {
        console.log('   ❌ Reservation button not found with any selector');
      }
    } catch (error) {
      console.log(`   ❌ Error checking reservation button: ${error.message}`);
    }

    // Test 3: Check inquiry button
    console.log('\n3️⃣ Testing inquiry button...');
    try {
      const inquirySelectors = [
        '#app-root > div > div > div.place_section.no_margin.OP4V8 > div.UoIF_ > div > span.yxkiA.oGuDI',
        'span:has-text("문의")',
        '.yxkiA span:has-text("문의")'
      ];

      for (const selector of inquirySelectors) {
        try {
          const inquiryButton = await workingPage.$(selector);
          if (inquiryButton) {
            const text = await inquiryButton.textContent();
            const hasInquiry = text?.includes('문의') || false;
            testResults.inquiryButton.success = true;
            testResults.inquiryButton.value = `${text} (has inquiry: ${hasInquiry})`;
            console.log(`   ✅ Inquiry button found: "${text}" (selector: ${selector})`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!testResults.inquiryButton.success) {
        console.log('   ❌ Inquiry button not found with any selector');
      }
    } catch (error) {
      console.log(`   ❌ Error checking inquiry button: ${error.message}`);
    }

    // Test 4: Check coupon section
    console.log('\n4️⃣ Testing coupon section...');
    try {
      // Check tab first
      const tabElements = await workingPage.$$('.place_fixed_maintab a');
      let hasCouponTab = false;
      for (const tab of tabElements) {
        const tabName = await tab.textContent();
        if (tabName && tabName.includes('쿠폰')) {
          hasCouponTab = true;
          break;
        }
      }
      
      // Check coupon section
      const couponSection = await workingPage.$('#app-root > div > div > div:nth-child(6) > div > div.place_section.no_margin.l__qc');
      const hasCouponSection = !!couponSection;
      
      testResults.couponButton.success = hasCouponTab || hasCouponSection;
      testResults.couponButton.value = `Tab: ${hasCouponTab}, Section: ${hasCouponSection}`;
      console.log(`   ✅ Coupon check: Tab found: ${hasCouponTab}, Section found: ${hasCouponSection}`);
    } catch (error) {
      console.log(`   ❌ Error checking coupon: ${error.message}`);
    }

    // Test 5: Navigate to info tab and extract introduction and keywords
    console.log('\n5️⃣ Testing info tab extraction...');
    try {
      const infoTab = await workingPage.$('a:has-text("정보")');
      if (infoTab) {
        console.log('   📍 Clicking info tab...');
        await infoTab.click();
        await page.waitForTimeout(3000);
        
        // Check for "더보기" button
        const moreButton = await workingPage.$('a:has-text("더보기")');
        if (moreButton) {
          console.log('   📍 Clicking 더보기 button...');
          await moreButton.click();
          await page.waitForTimeout(2000);
        }
        
        // Extract introduction
        const introElement = await workingPage.$('.pvuWY > div');
        if (introElement) {
          const introText = await introElement.textContent();
          testResults.introduction.success = true;
          testResults.introduction.value = introText?.trim() || '';
          console.log(`   ✅ Introduction: "${testResults.introduction.value.substring(0, 100)}..."`);
        } else {
          console.log('   ❌ Introduction element not found');
        }
        
        // Extract keywords
        const keywordElements = await workingPage.$$('.bgt3S .rUWaa');
        if (keywordElements.length > 0) {
          testResults.keywords.success = true;
          for (const element of keywordElements) {
            const keyword = await element.textContent();
            if (keyword) {
              testResults.keywords.value.push(keyword.trim());
            }
          }
          console.log(`   ✅ Keywords (${testResults.keywords.value.length}): [${testResults.keywords.value.join(', ')}]`);
        } else {
          console.log('   ❌ No keywords found');
        }

        // Test price information
        const priceTextElement = await workingPage.$('#app-root > div > div > div:nth-child(7) > div > div:nth-child(2) > div.place_section_content > div > div.O8qbU.tXI2c > div');
        const priceImageElement = await workingPage.$('#app-root > div > div > div:nth-child(7) > div > div:nth-child(2) > div.place_section_content > div > div.O8qbU.tXI2c > div > div > a');
        
        let priceInfo = '';
        if (priceTextElement) {
          const priceText = await priceTextElement.textContent();
          priceInfo += `Text: "${priceText}" `;
        }
        if (priceImageElement) {
          priceInfo += `Image: found `;
        }
        
        if (priceInfo) {
          testResults.priceInformation.success = true;
          testResults.priceInformation.value = priceInfo;
          console.log(`   ✅ Price information: ${priceInfo}`);
        } else {
          console.log('   ❌ No price information found');
        }
      } else {
        console.log('   ❌ Info tab not found');
      }
    } catch (error) {
      console.log(`   ❌ Error in info tab: ${error.message}`);
    }

    // Test 6: Extract image dates from photo URLs
    console.log('\n6️⃣ Testing image date extraction...');
    try {
      // Go back to home tab first
      const homeTab = await workingPage.$('a:has-text("홈")');
      if (homeTab) {
        await homeTab.click();
        await page.waitForTimeout(2000);
      }

      const imageSelectors = [
        '#app-root > div > div > div.CB8aP > div > div:nth-child(1) img',
        '#app-root > div > div > div.CB8aP > div > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) img',
        '#app-root > div > div > div.CB8aP > div > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) img',
        '#app-root > div > div > div.CB8aP > div > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) img',
        '#app-root > div > div > div.CB8aP > div > div:nth-child(2) > div:nth-child(2) > div:nth-child(2) img'
      ];

      let foundImages = 0;
      for (let i = 0; i < imageSelectors.length; i++) {
        const imgElement = await workingPage.$(imageSelectors[i]);
        if (imgElement) {
          foundImages++;
          const src = await imgElement.getAttribute('src');
          if (src) {
            console.log(`   🖼️ Image ${i + 1} URL: ${src}`);
            // Extract date from URL (format: YYYYMMDD)
            const dateMatch = src.match(/(\d{8})/);
            if (dateMatch) {
              const dateStr = dateMatch[1];
              const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
              testResults.imageDates.value.push(formattedDate);
              console.log(`   📅 Extracted date: ${formattedDate}`);
            } else {
              testResults.imageDates.value.push('No date info');
              console.log(`   ❓ No date pattern found in URL`);
            }
          }
        }
      }

      if (foundImages > 0) {
        testResults.imageDates.success = true;
        console.log(`   ✅ Found ${foundImages} images with dates: [${testResults.imageDates.value.join(', ')}]`);
      } else {
        console.log('   ❌ No images found with any selector');
      }
    } catch (error) {
      console.log(`   ❌ Error extracting image dates: ${error.message}`);
    }

    // Test 7: Extract visitor reviews
    console.log('\n7️⃣ Testing visitor reviews extraction...');
    try {
      const reviewTab = await workingPage.$('a:has-text("리뷰")');
      if (reviewTab) {
        console.log('   📍 Clicking review tab...');
        await reviewTab.click();
        await page.waitForTimeout(3000);
        
        // Click visitor reviews sub-tab
        const visitorReviewTab = await workingPage.$('a:has-text("방문자")');
        if (visitorReviewTab) {
          console.log('   📍 Clicking visitor reviews sub-tab...');
          await visitorReviewTab.click();
          await page.waitForTimeout(3000);
          
          // Extract visitor reviews
          const reviewItems = await workingPage.$$('#_review_list > li');
          console.log(`   📊 Found ${reviewItems.length} visitor review items`);
          
          for (let i = 0; i < Math.min(5, reviewItems.length); i++) {
            const review = reviewItems[i];
            
            // Extract date
            const dateElement = await review.$('.Vk05k span:nth-child(1) > span:nth-child(3)');
            const date = dateElement ? await dateElement.textContent() : '';
            
            // Check for reply
            const replyElement = await review.$('.pui__GbW8H7.pui__BDGQvd');
            const hasReply = !!replyElement;
            
            const reviewData = {
              index: i + 1,
              date: date?.trim() || 'No date',
              hasReply
            };
            
            testResults.visitorReviews.value.push(reviewData);
            console.log(`   📝 Review ${i + 1}: Date="${reviewData.date}", Reply=${hasReply}`);
          }
          
          if (testResults.visitorReviews.value.length > 0) {
            testResults.visitorReviews.success = true;
            console.log(`   ✅ Extracted ${testResults.visitorReviews.value.length} visitor reviews`);
          }
        } else {
          console.log('   ❌ Visitor review sub-tab not found');
        }
      } else {
        console.log('   ❌ Review tab not found');
      }
    } catch (error) {
      console.log(`   ❌ Error extracting visitor reviews: ${error.message}`);
    }

    // Test 8: Extract blog reviews
    console.log('\n8️⃣ Testing blog reviews extraction...');
    try {
      // Click blog reviews sub-tab
      const blogReviewTab = await workingPage.$('#_subtab_view > div > a:nth-child(2)');
      if (blogReviewTab) {
        console.log('   📍 Clicking blog reviews sub-tab...');
        await blogReviewTab.click();
        await page.waitForTimeout(3000);
        
        // Click latest sort
        const latestSortButton = await workingPage.$('a:has-text("최신순")');
        if (latestSortButton) {
          console.log('   📍 Clicking latest sort...');
          await latestSortButton.click();
          await page.waitForTimeout(2000);
        }
        
        // Extract blog reviews
        const blogReviewItems = await workingPage.$$('#app-root > div > div > div:nth-child(7) > div:nth-child(3) > div > div.place_section_content > ul > li');
        console.log(`   📊 Found ${blogReviewItems.length} blog review items`);
        
        for (let i = 0; i < Math.min(5, blogReviewItems.length); i++) {
          const review = blogReviewItems[i];
          
          // Extract date
          const dateElement = await review.$('.u5XwJ > span > span');
          const date = dateElement ? await dateElement.textContent() : '';
          
          if (date) {
            testResults.blogReviews.value.push(date.trim());
            console.log(`   📝 Blog review ${i + 1}: Date="${date.trim()}"`);
          }
        }
        
        if (testResults.blogReviews.value.length > 0) {
          testResults.blogReviews.success = true;
          console.log(`   ✅ Extracted ${testResults.blogReviews.value.length} blog review dates`);
        }
      } else {
        console.log('   ❌ Blog review sub-tab not found');
      }
    } catch (error) {
      console.log(`   ❌ Error extracting blog reviews: ${error.message}`);
    }

    // Generate test summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 === TEST RESULTS SUMMARY ===');
    console.log('='.repeat(80));

    let successCount = 0;
    const totalTests = Object.keys(testResults).length;

    for (const [testName, result] of Object.entries(testResults)) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const value = Array.isArray(result.value) ? `[${result.value.length} items]` : `"${String(result.value).substring(0, 50)}${String(result.value).length > 50 ? '...' : ''}"`;
      
      console.log(`${status} ${testName.padEnd(20)} | ${result.selector.padEnd(30)} | ${value}`);
      
      if (result.success) successCount++;
    }

    console.log('='.repeat(80));
    console.log(`🎯 Success Rate: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`);
    console.log('='.repeat(80));

    // Detailed results
    console.log('\n📊 === DETAILED EXTRACTION RESULTS ===\n');
    
    console.log('🏷️ Category:', testResults.category.value || 'Not found');
    console.log('📞 Reservation:', testResults.reservationButton.value || 'Not found');
    console.log('💬 Inquiry:', testResults.inquiryButton.value || 'Not found');  
    console.log('🎟️ Coupon:', testResults.couponButton.value || 'Not found');
    console.log('💰 Price Info:', testResults.priceInformation.value || 'Not found');
    console.log('📝 Introduction:', testResults.introduction.value ? `"${testResults.introduction.value.substring(0, 200)}..."` : 'Not found');
    console.log('🏷️ Keywords:', testResults.keywords.value.length > 0 ? testResults.keywords.value.join(', ') : 'Not found');
    console.log('📅 Image Dates:', testResults.imageDates.value.length > 0 ? testResults.imageDates.value.join(', ') : 'Not found');
    console.log('👥 Visitor Reviews:', testResults.visitorReviews.value.length > 0 ? `${testResults.visitorReviews.value.length} reviews found` : 'Not found');
    console.log('📚 Blog Reviews:', testResults.blogReviews.value.length > 0 ? testResults.blogReviews.value.join(', ') : 'Not found');

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('💥 Fatal error during test:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
    console.log('✅ Cleanup completed');
  }
}

// Run the test
if (require.main === module) {
  testPlaywrightExtraction().catch(console.error);
}

module.exports = { testPlaywrightExtraction };