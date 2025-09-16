/**
 * AWS Lambda Function for SmartPlace Keyword Tracking
 * This function processes SQS messages to track SmartPlace rankings on Naver Map
 */

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

/**
 * Normalize text for comparison
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, '')
    .replace(/[^\w가-힣]/g, '')
    .toLowerCase();
}

/**
 * Track a single keyword
 */
async function trackKeyword(keyword, targetPlace, keywordId) {
  let browser = null;

  try {
    // Launch browser with Chromium
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate to Naver Map search
    const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(keyword)}`;
    console.log(`Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for search results
    await page.waitForSelector('div.CHC5F', { timeout: 10000 });

    // Extract rankings
    const results = await page.evaluate(() => {
      const items = [];
      const elements = document.querySelectorAll('div.CHC5F');

      elements.forEach((element, index) => {
        // Get place name
        const nameEl = element.querySelector('span.YwYLL');
        const name = nameEl ? nameEl.textContent.trim() : '';

        // Check if it's an ad
        const isAd = !!element.querySelector('div.iqAyT.JKKhR > a.gU6bV._DHlh');

        // Get additional info
        const categoryEl = element.querySelector('span.KCMnt');
        const category = categoryEl ? categoryEl.textContent.trim() : '';

        const addressEl = element.querySelector('span.Pb6r6');
        const address = addressEl ? addressEl.textContent.trim() : '';

        if (name) {
          items.push({
            rank: index + 1,
            name,
            category,
            address,
            isAd
          });
        }
      });

      return items;
    });

    console.log(`Found ${results.length} results for keyword: ${keyword}`);

    // Find target place in results
    const targetNormalized = normalizeText(targetPlace);
    let organicRank = null;
    let adRank = null;
    let found = false;

    for (const result of results) {
      const resultNormalized = normalizeText(result.name);

      if (resultNormalized === targetNormalized || resultNormalized.includes(targetNormalized)) {
        found = true;
        if (result.isAd && !adRank) {
          adRank = result.rank;
        } else if (!result.isAd && !organicRank) {
          organicRank = result.rank;
        }
      }
    }

    // Prepare top 10 places data
    const topTenPlaces = results.slice(0, 10).map(r => ({
      rank: r.rank,
      name: r.name,
      category: r.category,
      address: r.address,
      isAd: r.isAd
    }));

    console.log(`Tracking result - Keyword: ${keyword}, Organic: ${organicRank}, Ad: ${adRank}, Found: ${found}`);

    return {
      organicRank,
      adRank,
      found,
      topTenPlaces
    };

  } catch (error) {
    console.error(`Error tracking keyword ${keyword}:`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Lambda function triggered with event:', JSON.stringify(event));

  const results = [];
  const errors = [];

  // Process each SQS message
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { keywordId, keyword, targetPlace, userId } = message;

      console.log(`Processing keyword: ${keyword} (ID: ${keywordId})`);

      // Track the keyword
      const trackingResult = await trackKeyword(keyword, targetPlace, keywordId);

      // Save to database
      await prisma.smartPlaceRanking.create({
        data: {
          keywordId: parseInt(keywordId),
          checkDate: new Date(),
          organicRank: trackingResult.organicRank,
          adRank: trackingResult.adRank,
          topTenPlaces: JSON.stringify(trackingResult.topTenPlaces)
        }
      });

      // Update last checked time
      await prisma.smartPlaceKeyword.update({
        where: { id: parseInt(keywordId) },
        data: { lastChecked: new Date() }
      });

      results.push({
        keywordId,
        keyword,
        success: true,
        ...trackingResult
      });

      console.log(`Successfully tracked keyword: ${keyword}`);

    } catch (error) {
      console.error(`Error processing record:`, error);
      errors.push({
        record: record.body,
        error: error.message
      });
    }
  }

  // Close Prisma connection
  await prisma.$disconnect();

  // Return response
  const response = {
    statusCode: errors.length === 0 ? 200 : 207,
    body: JSON.stringify({
      message: `Processed ${results.length} keywords successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined
    })
  };

  console.log('Lambda execution completed:', response);
  return response;
};