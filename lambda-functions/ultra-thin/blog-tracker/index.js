/**
 * Lambda Function: Blog Ranking Tracker (Ultra-thin Fixed Version)
 */

const { PrismaClient } = require('@prisma/client');
const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

const prisma = new PrismaClient();

/**
 * 한국 시간(KST) 기준 날짜 생성
 */
function getKSTDate() {
  const now = new Date();
  const kstOffset = 9 * 60; // KST는 UTC+9
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (kstOffset * 60000));
}

/**
 * 블로그 ID 추출
 */
function extractBlogId(blogUrl) {
  const patterns = [
    /blog\.naver\.com\/([^/?]+)/,
    /blog\.naver\.com\/PostView\.naver\?blogId=([^&]+)/,
    /m\.blog\.naver\.com\/([^/?]+)/,
    /blog\.naver\.com\/.*blogId=([^&]+)/
  ];

  for (const pattern of patterns) {
    const match = blogUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }

  try {
    const url = new URL(blogUrl);
    const pathParts = url.pathname.split('/').filter(part => part);
    if (pathParts.length > 0 && pathParts[0] !== 'PostView.naver') {
      return pathParts[0];
    }
  } catch (error) {
    console.error('Failed to parse blog URL:', error);
  }

  return null;
}

/**
 * 블로그 순위 추출 함수 (간소화 버전)
 */
async function extractBlogRankings(page, targetBlogUrl, keyword) {
  const blogId = extractBlogId(targetBlogUrl);
  if (!blogId) {
    console.error('Invalid blog URL:', targetBlogUrl);
    throw new Error('Invalid blog URL');
  }

  console.log(`Checking ranking for blog ${blogId} with keyword: ${keyword}`);

  let result = {
    mainTabExposed: false,
    mainTabRank: null,
    blogTabRank: null,
    viewTabRank: null,
    adRank: null,
    found: false,
    url: null
  };

  try {
    // 블로그 탭에서 검색 (메인 탭은 시간 절약을 위해 생략)
    const blogTabUrl = `https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=${encodeURIComponent(keyword)}`;
    console.log('Navigating to:', blogTabUrl);

    await page.goto(blogTabUrl, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // 페이지 로드 대기
    await page.waitForTimeout(2000);

    // 간단한 블로그 탭 순위 찾기
    const blogTabInfo = await page.evaluate((blogId) => {
      let realRank = 0;
      let foundRank = null;

      // 모든 블로그 링크 찾기
      const blogLinks = document.querySelectorAll('a[href*="blog.naver.com"]');

      for (const link of blogLinks) {
        const href = link.href || '';

        // 광고인지 확인
        const parent = link.closest('li, article');
        const isAd = parent && (
          parent.querySelector('.link_ad') ||
          parent.classList.contains('sp_nreview_ad')
        );

        if (!isAd) {
          realRank++;

          if (href.includes(`/${blogId}/`) ||
              href.includes(`/${blogId}?`) ||
              href.includes(`blogId=${blogId}`)) {
            if (!foundRank) {
              foundRank = realRank;
              break;
            }
          }
        }
      }

      return {
        rank: foundRank,
        totalChecked: realRank
      };
    }, blogId);

    console.log(`Blog tab result:`, blogTabInfo);

    if (blogTabInfo.rank) {
      result.blogTabRank = blogTabInfo.rank;
      result.found = true;
    }

  } catch (error) {
    console.error('Error extracting blog rankings:', error);
    throw error;
  }

  return result;
}

/**
 * 메인 핸들러 함수
 */
exports.handler = async (event, context) => {
  const startTime = Date.now();
  const results = [];

  console.log('Lambda function started');
  console.log('Event:', JSON.stringify(event));

  for (const record of event.Records) {
    let browser = null;
    const message = JSON.parse(record.body);

    console.log(`Processing blog keyword: ${message.keyword} (ID: ${message.keywordId})`);

    try {
      // puppeteer-core로 브라우저 실행
      console.log('Launching Chromium...');
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true
      });

      console.log('Browser launched successfully');

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // 블로그 순위 추출
      const rankings = await extractBlogRankings(page, message.blogUrl, message.keyword);

      // DB에 결과 저장
      const trackingDate = getKSTDate();
      await prisma.blogTrackingResult.create({
        data: {
          keywordId: message.keywordId,
          trackingDate,
          mainTabExposed: rankings.mainTabExposed,
          mainTabRank: rankings.mainTabRank,
          blogTabRank: rankings.blogTabRank,
          viewTabRank: rankings.viewTabRank,
          adRank: rankings.adRank,
        }
      });

      const duration = (Date.now() - startTime) / 1000;

      results.push({
        keywordId: message.keywordId,
        success: true,
        blogTabRank: rankings.blogTabRank,
        duration
      });

      console.log(`Successfully tracked blog keyword ${message.keyword}:`, {
        blogTab: rankings.blogTabRank
      });

    } catch (error) {
      console.error(`Error tracking blog keyword ${message.keyword}:`, error);

      results.push({
        keywordId: message.keywordId,
        success: false,
        error: error.message
      });

      // 에러를 다시 던지지 않음 (부분 실패 허용)

    } finally {
      if (browser) {
        await browser.close();
        console.log('Browser closed');
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Blog tracking completed',
      results,
      totalDuration: (Date.now() - startTime) / 1000
    })
  };
};