/**
 * Test Comprehensive Smartplace Crawler with 8-category analysis
 */

const axios = require('axios');

async function testComprehensiveCrawler() {
  const testUrl = 'https://map.naver.com/p/entry/place/1616011574';
  const placeId = '1616011574';
  
  console.log('🚀 Testing Comprehensive Smartplace Analysis System');
  console.log('================================================\n');
  console.log('📍 Test URL:', testUrl);
  console.log('🆔 Place ID:', placeId);
  console.log('📊 8-Category Analysis Test\n');
  
  try {
    // Test API endpoint
    console.log('📤 Sending diagnosis request to API...\n');
    const startTime = Date.now();
    
    const response = await axios.post('http://localhost:3000/api/smartplace/diagnosis', {
      placeId: placeId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'token=test-token' // Mock auth
      },
      timeout: 60000 // 60 second timeout for real crawling
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Response received in ${duration}s\n`);
    
    if (response.data.success) {
      const result = response.data.result;
      
      // Display basic info
      console.log('📋 Basic Information:');
      console.log('================================');
      console.log('Name:', result.info.name || '❌ Not found');
      console.log('Category:', result.info.category || '❌ Not found');
      console.log('Address:', result.info.address || '❌ Not found');
      console.log('Phone:', result.info.phone || '❌ Not found');
      console.log('Rating:', result.info.rating || '❌ Not found');
      console.log('Reviews:', result.info.reviewCount || '❌ Not found');
      console.log('Photos:', result.info.photoCount || '❌ Not found');
      console.log('');
      
      // Display 8-category analysis
      console.log('📊 8-Category Analysis Results:');
      console.log('================================');
      
      const categories = [
        { key: 'photo', name: '사진', emoji: '📸' },
        { key: 'news', name: '소식', emoji: '📰' },
        { key: 'directions', name: '찾아오는길', emoji: '🗺️' },
        { key: 'price', name: '가격정보', emoji: '💰' },
        { key: 'sns', name: 'SNS', emoji: '📱' },
        { key: 'review', name: '리뷰', emoji: '⭐' },
        { key: 'naverFeatures', name: '네이버기능', emoji: '🔧' },
        { key: 'basicInfo', name: '기본정보', emoji: '📋' }
      ];
      
      categories.forEach(cat => {
        const analysis = result.analysis[cat.key];
        if (analysis) {
          const percentage = Math.round((analysis.score / analysis.maxScore) * 100);
          const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
          
          console.log(`${cat.emoji} ${cat.name}: ${analysis.score}/${analysis.maxScore}점 (${percentage}%)`);
          console.log(`   [${bar}]`);
          
          // Show top 3 details
          if (analysis.details && analysis.details.length > 0) {
            analysis.details.slice(0, 3).forEach(detail => {
              const statusEmoji = detail.status === 'good' ? '✅' : 
                                 detail.status === 'medium' ? '⚠️' : '❌';
              console.log(`   ${statusEmoji} ${detail.item}: ${detail.value}`);
            });
          }
          console.log('');
        }
      });
      
      // Display total score
      console.log('🎯 Total Score:', result.totalScore + '/100');
      console.log('');
      
      // Display top recommendations
      console.log('💡 Top Recommendations:');
      console.log('================================');
      if (result.recommendations && result.recommendations.length > 0) {
        result.recommendations.slice(0, 5).forEach((rec, idx) => {
          const priorityEmoji = rec.priority === 'high' ? '🔴' : 
                               rec.priority === 'medium' ? '🟡' : '🔵';
          console.log(`${idx + 1}. ${priorityEmoji} [${rec.category}] ${rec.issue}`);
          console.log(`   → ${rec.action}`);
          console.log('');
        });
      }
      
      // Check crawled data
      if (result.crawledData) {
        console.log('📦 Enhanced Data Collection:');
        console.log('================================');
        console.log('Has Reservation:', result.crawledData.hasReservation ? '✅' : '❌');
        console.log('Has Order:', result.crawledData.hasOrder ? '✅' : '❌');
        console.log('Has Coupon:', result.crawledData.hasCoupon ? '✅' : '❌');
        console.log('Has Smart Call:', result.crawledData.hasSmartCall ? '✅' : '❌');
        console.log('Has Inquiry:', result.crawledData.hasInquiry ? '✅' : '❌');
        console.log('Keywords:', result.crawledData.keywords?.length || 0, 'keywords');
        console.log('Images:', result.crawledData.images?.length || 0, 'images');
        console.log('');
      }
      
      console.log('✅ Comprehensive test completed successfully!');
      
    } else {
      console.log('❌ API returned error:', response.data.error);
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status);
      console.error('Message:', error.response.data?.error || error.response.data);
      
      if (error.response.status === 401) {
        console.log('\n⚠️ Note: Authentication required. In production, proper login would be needed.');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server!');
      console.error('Please ensure the development server is running: npm run dev');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get('http://localhost:3000');
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking development server...\n');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('⚠️ Development server is not running!');
    console.log('Please run: npm run dev');
    console.log('Then run this test again.\n');
    process.exit(1);
  }
  
  console.log('✅ Server is running!\n');
  await testComprehensiveCrawler();
}

main()
  .then(() => {
    console.log('\n🎉 All tests completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });