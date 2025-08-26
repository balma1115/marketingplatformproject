const axios = require('axios');

async function testAPIExtraction() {
  console.log('=== TESTING API EXTRACTION FOR 미래엔영어수학 벌원학원 ===\n');
  
  try {
    const placeId = '1616011574';
    const apiUrl = `http://localhost:3000/api/smartplace/info/${placeId}`;
    
    console.log('Fetching data from API:', apiUrl);
    console.log('This will use the server\'s Playwright crawler...\n');
    
    const response = await axios.get(apiUrl);
    
    if (response.data.success) {
      const data = response.data.data;
      
      console.log('=== EXTRACTION RESULTS ===\n');
      
      console.log('1. BASIC INFORMATION:');
      console.log('   Name:', data.name || 'NOT FOUND');
      console.log('   Category:', data.category || 'NOT FOUND');
      console.log('   Phone:', data.phone || 'NOT FOUND');
      console.log('   Business Hours:', data.businessHours || 'NOT FOUND');
      console.log('   Address:', data.address || 'NOT FOUND');
      console.log();
      
      console.log('2. PRICE INFORMATION:');
      if (data.priceDisplay) {
        console.log('   Price Text:', data.priceDisplay.hasText ? 'YES' : 'NO');
        console.log('   Price Image:', data.priceDisplay.hasImage ? 'YES' : 'NO');
        if (data.priceDisplay.textContent) {
          console.log('   Text Content:', data.priceDisplay.textContent.substring(0, 100) + '...');
        }
      } else {
        console.log('   NO PRICE INFORMATION');
      }
      console.log();
      
      console.log('3. KEYWORDS:');
      if (data.representativeKeywords && data.representativeKeywords.length > 0) {
        console.log('   Keywords:', data.representativeKeywords.join(', '));
      } else {
        console.log('   NO KEYWORDS FOUND');
      }
      console.log();
      
      
      console.log('4. REVIEWS:');
      console.log('   Visitor Review Count:', data.visitorReviewCount || 0);
      console.log('   Blog Review Count:', data.blogReviewCount || 0);
      if (data.visitorReviews && data.visitorReviews.length > 0) {
        console.log('   Latest Visitor Reviews:');
        data.visitorReviews.slice(0, 3).forEach((review, i) => {
          console.log(`     ${i+1}. ${review.date} - Reply: ${review.hasReply ? 'YES' : 'NO'}`);
        });
      }
      if (data.blogReviews && data.blogReviews.length > 0) {
        console.log('   Latest Blog Reviews:');
        data.blogReviews.slice(0, 3).forEach((review, i) => {
          const dateStr = typeof review === 'string' ? review : review.date;
          console.log(`     ${i+1}. ${dateStr}`);
        });
      }
      console.log();
      
      console.log('5. SOCIAL MEDIA:');
      console.log('   Blog Link:', data.blogLink || 'NOT FOUND');
      console.log('   Instagram Link:', data.instagramLink || 'NOT FOUND');
      console.log();
      
      console.log('6. SMART FEATURES:');
      console.log('   Smart Call:', data.hasSmartCall ? 'YES' : 'NO');
      console.log('   Reservation:', data.hasReservation ? 'YES' : 'NO');
      console.log('   Inquiry:', data.hasInquiry ? 'YES' : 'NO');
      console.log('   Coupon:', data.hasCoupon ? 'YES' : 'NO');
      console.log();
      
      console.log('7. TABS:');
      if (data.tabs && data.tabs.length > 0) {
        console.log('   Active Tabs:', data.tabs.join(', '));
      } else {
        console.log('   NO TABS FOUND');
      }
      
      console.log('\n=== ISSUES TO FIX ===');
      const issues = [];
      if (!data.businessHours || data.businessHours === '영업시간 정보 없음') issues.push('Business Hours not extracted');
      if (!data.address || data.address === '') issues.push('Address not extracted');
      if (!data.priceDisplay || (!data.priceDisplay.hasText && !data.priceDisplay.hasImage)) issues.push('Price information not extracted');
      if (!data.representativeKeywords || data.representativeKeywords.length === 0) issues.push('Keywords not extracted');
      if (!data.blogReviewCount || data.blogReviewCount === 0) issues.push('Blog reviews not counted');
      
      if (issues.length > 0) {
        issues.forEach((issue, i) => {
          console.log(`${i+1}. ${issue}`);
        });
      } else {
        console.log('All data extracted successfully!');
      }
      
    } else {
      console.error('API Error:', response.data.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testAPIExtraction();