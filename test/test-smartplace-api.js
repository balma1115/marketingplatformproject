/**
 * Test the Smartplace API with real crawler
 */

const axios = require('axios');

async function testSmartplaceAPI() {
  const testPlaceId = '1616011574'; // Test place ID
  const port = 3000; // Fixed port 3000
  const apiUrl = `http://localhost:${port}/api/smartplace/diagnosis`;
  
  console.log('🚀 Testing Smartplace API...\n');
  console.log('📍 Place ID:', testPlaceId);
  console.log('🔗 API URL:', apiUrl);
  console.log('================================\n');
  
  try {
    // First, set the environment to use real crawler
    process.env.USE_REAL_CRAWLER = 'true';
    
    // Make API request
    console.log('📤 Sending API request...');
    const startTime = Date.now();
    
    const response = await axios.post(apiUrl, {
      placeId: testPlaceId
    }, {
      headers: {
        'Content-Type': 'application/json',
        // Add mock auth if needed
        'Cookie': 'token=test-token'
      }
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Response received in ${duration}s\n`);
    
    // Check response structure
    const { data } = response;
    
    if (data.success) {
      console.log('📊 API Response:');
      console.log('================================');
      
      // Basic Info
      if (data.result?.info) {
        console.log('\n📋 Basic Information:');
        console.log(`  Name: ${data.result.info.name}`);
        console.log(`  Category: ${data.result.info.category}`);
        console.log(`  Address: ${data.result.info.address}`);
        console.log(`  Phone: ${data.result.info.phone}`);
        console.log(`  Rating: ${data.result.info.rating}`);
        console.log(`  Reviews: ${data.result.info.reviewCount}`);
        console.log(`  Photos: ${data.result.info.photoCount}`);
        
        if (data.result.info.visitorReviews !== undefined) {
          console.log(`  Visitor Reviews: ${data.result.info.visitorReviews}`);
        }
        if (data.result.info.blogReviews !== undefined) {
          console.log(`  Blog Reviews: ${data.result.info.blogReviews}`);
        }
      }
      
      // Analysis Scores
      if (data.result?.analysis) {
        console.log('\n📈 Analysis Scores:');
        console.log(`  Completeness: ${data.result.analysis.completeness.score}/100`);
        console.log(`  Quality: ${data.result.analysis.quality.score}/100`);
        console.log(`  Visibility: ${data.result.analysis.visibility.score}/100`);
        console.log(`  Engagement: ${data.result.analysis.engagement.score}/100`);
      }
      
      // Total Score
      if (data.result?.totalScore !== undefined) {
        console.log('\n🎯 Total Score:', data.result.totalScore + '/100');
      }
      
      // Recommendations
      if (data.result?.recommendations && data.result.recommendations.length > 0) {
        console.log('\n💡 Top Recommendations:');
        data.result.recommendations.slice(0, 3).forEach((rec, idx) => {
          console.log(`  ${idx + 1}. [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.issue}`);
        });
      }
      
      console.log('\n================================');
      console.log('✅ API Test PASSED!\n');
      
    } else {
      console.log('❌ API returned error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ API Test FAILED:\n');
    
    if (error.response) {
      // API responded with error
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      // No response received
      console.error('No response received from API');
      console.error('Is the development server running? (npm run dev)');
    } else {
      // Other error
      console.error('Error:', error.message);
    }
  }
}

// Check if server is running
async function checkServer() {
  const port = 3000; // Fixed port 3000
  try {
    await axios.get(`http://localhost:${port}`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if development server is running...\n');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('⚠️ Development server is not running!');
    console.log('Please run: npm run dev');
    console.log('Then run this test again.\n');
    process.exit(1);
  }
  
  console.log('✅ Server is running!\n');
  await testSmartplaceAPI();
}

main().catch(console.error);