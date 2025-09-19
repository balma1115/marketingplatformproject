/**
 * Lambda Function: Blog Ranking Tracker (Container Image Version)
 * Optimized for AWS Lambda Container with full Chrome support
 */

const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

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
 * 블로그 순위 추출 함수
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
    // 1. 메인 통합검색 탭에서 검색
    const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
    console.log('Navigating to main search:', searchUrl);

    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // 메인 탭 블로그 섹션 확인
    const mainTabInfo = await page.evaluate((blogId) => {
      const blogLinks = document.querySelectorAll('a[href*="blog.naver.com"]');
      let isExposed = false;
      let firstUrl = '';

      for (const link of blogLinks) {
        const href = link.href || '';
        const parent = link.closest('li, article, section');
        const isAd = parent && (
          parent.querySelector('.link_ad') ||
          parent.classList.contains('sp_nreview_ad')
        );

        if (!isAd && (
          href.includes(`/${blogId}/`) ||
          href.includes(`/${blogId}?`) ||
          href.includes(`blogId=${blogId}`)
        )) {
          isExposed = true;
          if (!firstUrl) firstUrl = href;
          break;
        }
      }

      return { exposed: isExposed, firstUrl: firstUrl };
    }, blogId);

    console.log(`Main tab exposed: ${mainTabInfo.exposed}`);

    if (mainTabInfo.exposed) {
      result.mainTabExposed = true;
      result.found = true;
      result.url = mainTabInfo.firstUrl;
    }

    // 2. 블로그 탭에서 검색
    const blogTabUrl = `https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=${encodeURIComponent(keyword)}`;
    console.log('Navigating to blog tab:', blogTabUrl);

    await page.goto(blogTabUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // 블로그 탭에서 순위 찾기
    const blogTabInfo = await page.evaluate((blogId) => {
      let realRank = 0;
      let foundRank = null;
      let foundUrl = null;

      // 모든 블로그 아이템 처리 - 더 포괄적인 선택자 사용
      const blogItems = document.querySelectorAll('li.bx, li[class*="sp_blog"], div.total_wrap, ul.lst_total > li, div.api_subject_bx li');

      // 만약 위 선택자로 못 찾으면 모든 블로그 링크를 찾아서 처리
      let processedItems = new Set();

      if (blogItems.length === 0) {
        // 대체 방법: 모든 블로그 링크를 찾아서 순위 계산
        const allLinks = document.querySelectorAll('a[href*="blog.naver.com"]');

        for (const link of allLinks) {
          const href = link.href;
          if (href.includes('MyBlog.naver')) continue; // 블로그 홈 링크 제외

          const match = href.match(/blog\.naver\.com\/([^/?]+)/);
          if (match) {
            const currentBlogId = match[1];

            // 중복 제거 - 같은 블로그 포스트의 여러 링크 중 첫 번째만 카운트
            const postUrl = href.split('?')[0];
            if (processedItems.has(postUrl)) continue;
            processedItems.add(postUrl);

            // 광고 여부 확인
            let isAd = false;
            let parent = link.parentElement;
            while (parent && parent !== document.body) {
              if (parent.querySelector('.link_ad') ||
                  parent.classList.contains('sp_nreview_ad') ||
                  parent.textContent.includes('광고')) {
                isAd = true;
                break;
              }
              parent = parent.parentElement;
            }

            if (!isAd) {
              realRank++;

              if (currentBlogId === blogId && !foundRank) {
                foundRank = realRank;
                foundUrl = href;
                break;
              }
            }
          }
        }
      } else {
        // 기존 방법 사용
        for (const item of blogItems) {
          const isAd = item.querySelector('.link_ad') ||
                       item.classList.contains('sp_nreview_ad');

          if (!isAd) {
            realRank++;

            // 블로그 ID 추출 시도
            let currentBlogId = '';

            // 작성자 링크에서 추출
            const authorLink = item.querySelector('.sub_txt.sub_name, .user_info > a');
            if (authorLink && authorLink.href) {
              const match = authorLink.href.match(/blog\.naver\.com\/([^/?]+)/);
              if (match) currentBlogId = match[1];
            }

            // 제목 링크에서 추출 (폴백)
            if (!currentBlogId) {
              const titleLink = item.querySelector('a[href*="blog.naver.com"]');
              if (titleLink && titleLink.href) {
                const match = titleLink.href.match(/blog\.naver\.com\/([^/?]+)/);
                if (match) currentBlogId = match[1];
              }
            }

            // 타겟 블로그 확인
            if (currentBlogId === blogId && !foundRank) {
              foundRank = realRank;
              const link = item.querySelector('a[href*="blog.naver.com"]');
              if (link) foundUrl = link.href;
              break;
            }
          }
        }
      }

      return {
        rank: foundRank,
        url: foundUrl,
        totalChecked: realRank
      };
    }, blogId);

    console.log(`Blog tab result: rank=${blogTabInfo.rank}, total=${blogTabInfo.totalChecked}`);

    if (blogTabInfo.rank) {
      result.blogTabRank = blogTabInfo.rank;
      result.found = true;
      result.url = result.url || blogTabInfo.url;
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
  let browser = null;

  console.log('Container Lambda function started');
  console.log('Event:', JSON.stringify(event));

  try {
    // 브라우저 실행 (@sparticuz/chromium 사용)
    console.log('Launching Chromium browser...');

    // Chromium 설정
    chromium.setHeadlessMode = true;
    chromium.setGraphicsMode = false;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true
    });

    console.log('Browser launched successfully');

    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      console.log(`Processing blog keyword: ${message.keyword} (ID: ${message.keywordId})`);

      try {
        const page = await browser.newPage();

        // User Agent 설정
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 뷰포트 설정
        await page.setViewport({ width: 1920, height: 1080 });

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

        // 페이지 닫기
        await page.close();

        const duration = (Date.now() - startTime) / 1000;

        results.push({
          keywordId: message.keywordId,
          success: true,
          mainTabExposed: rankings.mainTabExposed,
          blogTabRank: rankings.blogTabRank,
          duration
        });

        console.log(`Successfully tracked blog ${message.blogUrl}:`, {
          keyword: message.keyword,
          mainTab: rankings.mainTabExposed,
          blogTab: rankings.blogTabRank
        });

      } catch (error) {
        console.error(`Error tracking blog keyword ${message.keyword}:`, error);

        results.push({
          keywordId: message.keywordId,
          success: false,
          error: error.message
        });
      }
    }

  } catch (error) {
    console.error('Fatal error in Lambda handler:', error);
    throw error;

  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
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