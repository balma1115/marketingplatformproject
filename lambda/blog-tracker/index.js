/**
 * AWS Lambda Function for Blog Keyword Tracking
 * This function processes SQS messages to track blog rankings on Naver Search
 */

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

/**
 * Track a single blog keyword
 */
async function trackBlogKeyword(keyword, targetBlogUrl, keywordId) {
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

    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate to Naver search
    const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
    console.log(`Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Initialize results
    const results = {
      mainTabExposed: false,
      mainTabRank: null,
      blogTabRank: null,
      viewTabRank: null,
      adRank: null,
      found: false,
      url: null
    };

    // Function to extract blog domain from URL
    const extractBlogDomain = (url) => {
      if (!url) return '';
      if (url.includes('blog.naver.com')) {
        const match = url.match(/blog\.naver\.com\/([^/?]+)/);
        return match ? match[1] : '';
      }
      return url;
    };

    const targetDomain = extractBlogDomain(targetBlogUrl);

    // Check main tab (통합검색)
    const mainTabResults = await page.evaluate(() => {
      const blogItems = [];

      // Check PowerLink ads
      const adItems = document.querySelectorAll('.sp_nreview_blog_wrap .sp_blog_item');
      adItems.forEach((item, index) => {
        const linkEl = item.querySelector('a.link');
        if (linkEl) {
          blogItems.push({
            url: linkEl.href,
            isAd: true,
            rank: index + 1
          });
        }
      });

      // Check organic blog results
      const organicItems = document.querySelectorAll('.view_group_blog .total_item, .blog_area .total_item');
      organicItems.forEach((item, index) => {
        const linkEl = item.querySelector('a.link');
        if (linkEl) {
          blogItems.push({
            url: linkEl.href,
            isAd: false,
            rank: index + 1
          });
        }
      });

      return blogItems;
    });

    // Check main tab results
    for (const item of mainTabResults) {
      const itemDomain = extractBlogDomain(item.url);
      if (itemDomain === targetDomain || item.url.includes(targetDomain)) {
        results.mainTabExposed = true;
        if (item.isAd && !results.adRank) {
          results.adRank = item.rank;
        } else if (!item.isAd && !results.mainTabRank) {
          results.mainTabRank = item.rank;
        }
        results.found = true;
        results.url = item.url;
      }
    }

    // Navigate to Blog tab
    const blogTabLink = await page.$('a[href*="view=blog"]');
    if (blogTabLink) {
      await blogTabLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Check blog tab results
      const blogTabResults = await page.evaluate(() => {
        const items = [];
        const blogItems = document.querySelectorAll('.lst_total .total_item');

        blogItems.forEach((item, index) => {
          const linkEl = item.querySelector('a.link');
          if (linkEl) {
            items.push({
              url: linkEl.href,
              rank: index + 1
            });
          }
        });

        return items;
      });

      // Check blog tab results
      for (const item of blogTabResults) {
        const itemDomain = extractBlogDomain(item.url);
        if (itemDomain === targetDomain || item.url.includes(targetDomain)) {
          results.blogTabRank = item.rank;
          results.found = true;
          if (!results.url) {
            results.url = item.url;
          }
        }
      }
    }

    // Navigate to View tab (if exists)
    const viewTabLink = await page.$('a[href*="where=view"]');
    if (viewTabLink) {
      await viewTabLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Check view tab results
      const viewTabResults = await page.evaluate(() => {
        const items = [];
        const viewItems = document.querySelectorAll('.lst_total .total_item');

        viewItems.forEach((item, index) => {
          const linkEl = item.querySelector('a.link');
          if (linkEl) {
            items.push({
              url: linkEl.href,
              rank: index + 1
            });
          }
        });

        return items;
      });

      // Check view tab results
      for (const item of viewTabResults) {
        const itemDomain = extractBlogDomain(item.url);
        if (itemDomain === targetDomain || item.url.includes(targetDomain)) {
          results.viewTabRank = item.rank;
          results.found = true;
          if (!results.url) {
            results.url = item.url;
          }
        }
      }
    }

    console.log(`Tracking result - Keyword: ${keyword}, Main: ${results.mainTabRank}, Blog: ${results.blogTabRank}, View: ${results.viewTabRank}, Ad: ${results.adRank}`);

    return results;

  } catch (error) {
    console.error(`Error tracking blog keyword ${keyword}:`, error);
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
      const { keywordId, keyword, blogUrl, userId } = message;

      console.log(`Processing blog keyword: ${keyword} (ID: ${keywordId})`);

      // Track the keyword
      const trackingResult = await trackBlogKeyword(keyword, blogUrl, keywordId);

      // Save to database
      await prisma.blogTrackingResult.create({
        data: {
          keywordId: parseInt(keywordId),
          trackingDate: new Date(),
          mainTabExposed: trackingResult.mainTabExposed,
          mainTabRank: trackingResult.mainTabRank,
          blogTabRank: trackingResult.blogTabRank,
          viewTabRank: trackingResult.viewTabRank,
          adRank: trackingResult.adRank,
          found: trackingResult.found,
          url: trackingResult.url
        }
      });

      results.push({
        keywordId,
        keyword,
        success: true,
        ...trackingResult
      });

      console.log(`Successfully tracked blog keyword: ${keyword}`);

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
      message: `Processed ${results.length} blog keywords successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined
    })
  };

  console.log('Lambda execution completed:', response);
  return response;
};