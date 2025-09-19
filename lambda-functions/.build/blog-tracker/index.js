"use strict";
/**
 * Lambda Function: Blog Ranking Tracker (Playwright AWS Lambda Version)
 * playwright-aws-lambda를 사용한 블로그 순위 추적
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_1 = require("@prisma/client");
const playwright = require('playwright-aws-lambda');
const prisma = new client_1.PrismaClient();
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
    }
    catch (error) {
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
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        // 메인 탭 블로그 섹션 확인 - 노출 여부만
        const mainTabInfo = await page.evaluate((blogId) => {
            const adSelectors = [
                '.link_ad', '.ad_label', '[class*="_ad"]', '[class*="splink_ad"]',
                '.power_link', '.brand_search'
            ];
            const blogLinks = document.querySelectorAll('a[href*="blog.naver.com"]');
            let isExposed = false;
            let firstUrl = '';
            blogLinks.forEach((link) => {
                const href = link.href || '';
                let isAd = false;
                const parent = link.closest('li, article, section');
                if (parent) {
                    for (const selector of adSelectors) {
                        if (parent.querySelector(selector) || parent.matches(selector)) {
                            isAd = true;
                            break;
                        }
                    }
                }
                if (!isAd && (href.includes(`/${blogId}/`) || href.includes(`/${blogId}?`) || href.includes(`blogId=${blogId}`))) {
                    isExposed = true;
                    if (!firstUrl)
                        firstUrl = href;
                }
            });
            return { exposed: isExposed, firstUrl: firstUrl };
        }, blogId);
        console.log(`Main tab (노출 여부) for ${blogId}:`, mainTabInfo.exposed);
        if (mainTabInfo.exposed) {
            result.mainTabExposed = true;
            result.found = true;
            result.url = mainTabInfo.firstUrl;
        }
        // 2. 블로그 탭에서 검색
        const blogTabUrl = `https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=${encodeURIComponent(keyword)}`;
        await page.goto(blogTabUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        // 블로그 탭에서 순위 찾기
        const blogTabInfo = await page.evaluate((blogId) => {
            let realRank = 0;
            let foundRank = null;
            let foundUrl = null;
            let totalItems = 0;
            // api_subject_bx 내의 블로그 아이템 처리
            const sections = document.querySelectorAll('#main_pack > section');
            sections.forEach(section => {
                const subjectBoxes = section.querySelectorAll('div.api_subject_bx');
                subjectBoxes.forEach(box => {
                    const listItems = box.querySelectorAll('ul > li');
                    listItems.forEach(item => {
                        totalItems++;
                        const isAd = item.querySelector('.link_ad') !== null ||
                            item.classList.contains('sp_nreview_ad');
                        if (!isAd) {
                            realRank++;
                            let currentBlogId = '';
                            // 작성자 링크에서 블로그 ID 추출
                            const authorLink = item.querySelector('.sub_txt.sub_name, .user_info > a, .user_box_inner a.name');
                            if (authorLink && authorLink.href) {
                                const match = authorLink.href.match(/blog\.naver\.com\/([^/?]+)/);
                                if (match) {
                                    currentBlogId = match[1];
                                }
                            }
                            // 폴백: 제목 링크에서 추출
                            if (!currentBlogId) {
                                const titleLink = item.querySelector('.api_txt_lines.total_tit, .total_tit');
                                if (titleLink && titleLink.href) {
                                    const match = titleLink.href.match(/blog\.naver\.com\/([^/?]+)/);
                                    if (match) {
                                        currentBlogId = match[1];
                                    }
                                }
                            }
                            // 타겟 블로그 확인
                            if (currentBlogId === blogId && !foundRank) {
                                foundRank = realRank;
                                const link = item.querySelector('a[href*="blog.naver.com"]');
                                if (link)
                                    foundUrl = link.href;
                            }
                        }
                    });
                });
            });
            // 일반 li.bx 아이템 처리
            const regularItems = document.querySelectorAll('li.bx');
            regularItems.forEach(item => {
                if (item.closest('div.api_subject_bx'))
                    return;
                totalItems++;
                const itemClass = item.className;
                const isAd = itemClass.includes('sp_nreview_ad') ||
                    itemClass.includes('splink') ||
                    item.querySelector('.link_ad') !== null;
                if (!isAd) {
                    realRank++;
                    let currentBlogId = '';
                    const authorLink = item.querySelector('.sub_txt.sub_name, .user_info > a, .user_box_inner a.name');
                    if (authorLink && authorLink.href) {
                        const match = authorLink.href.match(/blog\.naver\.com\/([^/?]+)/);
                        if (match) {
                            currentBlogId = match[1];
                        }
                    }
                    if (!currentBlogId) {
                        const titleLink = item.querySelector('a[href*="blog.naver.com"]');
                        if (titleLink && titleLink.href) {
                            const match = titleLink.href.match(/blog\.naver\.com\/([^/?]+)/);
                            if (match) {
                                currentBlogId = match[1];
                            }
                        }
                    }
                    if (currentBlogId === blogId && !foundRank) {
                        foundRank = realRank;
                        const link = item.querySelector('a[href*="blog.naver.com"]');
                        if (link)
                            foundUrl = link.href;
                    }
                }
            });
            return {
                rank: foundRank,
                url: foundUrl,
                totalItems: totalItems,
                realItemCount: realRank
            };
        }, blogId);
        console.log(`Blog tab results for ${blogId}:`, {
            rank: blogTabInfo.rank,
            totalItems: blogTabInfo.totalItems
        });
        if (blogTabInfo.rank) {
            result.blogTabRank = blogTabInfo.rank;
            result.found = true;
            result.url = result.url || blogTabInfo.url;
        }
    }
    catch (error) {
        console.error('Error extracting blog rankings:', error);
        throw error;
    }
    return result;
}
/**
 * 메인 핸들러 함수
 */
const handler = async (event, context) => {
    const startTime = Date.now();
    const results = [];
    for (const record of event.Records) {
        let browser = null;
        const message = JSON.parse(record.body);
        console.log(`Processing blog keyword: ${message.keyword} (ID: ${message.keywordId})`);
        try {
            // Playwright 브라우저 실행
            browser = await playwright.launchChromium();
            const context = await browser.newContext();
            const page = await context.newPage();
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
            // 키워드 최종 확인 시간 업데이트
            await prisma.blogTrackingKeyword.update({
                where: { id: message.keywordId },
                data: { /* lastChecked: trackingDate */}
            });
            const duration = (Date.now() - startTime) / 1000;
            results.push({
                keywordId: message.keywordId,
                success: true,
                mainTabRank: rankings.mainTabRank,
                blogTabRank: rankings.blogTabRank,
                viewTabRank: rankings.viewTabRank,
                duration
            });
            console.log(`Successfully tracked blog keyword ${message.keyword}:`, {
                mainTab: rankings.mainTabRank,
                blogTab: rankings.blogTabRank,
                viewTab: rankings.viewTabRank
            });
        }
        catch (error) {
            console.error(`Error tracking blog keyword ${message.keyword}:`, error);
            results.push({
                keywordId: message.keywordId,
                success: false,
                error: error.message
            });
            throw error;
        }
        finally {
            if (browser) {
                await browser.close();
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
exports.handler = handler;
//# sourceMappingURL=index.js.map