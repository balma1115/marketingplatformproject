/**
 * Lambda Function: Blog Ranking Tracker
 * 블로그 순위를 추적하는 Lambda 함수
 */

import { SQSEvent, Context } from 'aws-lambda'
import chromium from '@sparticuz/chromium-min'
import * as puppeteer from 'puppeteer-core'
import { PrismaClient } from '@prisma/client'
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'

const prisma = new PrismaClient()
const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION || 'ap-northeast-2' })

interface BlogTrackingMessage {
  type: 'BLOG_TRACKING'
  keywordId: number
  keyword: string
  blogUrl: string
  userId: number
  projectId: number
}

interface BlogRankingResult {
  mainTabExposed: boolean
  mainTabRank: number | null
  blogTabRank: number | null
  viewTabRank: number | null
  adRank: number | null
  found: boolean
  url: string | null
}

/**
 * 한국 시간(KST) 기준 날짜 생성
 */
function getKSTDate(): Date {
  const now = new Date()
  const kstOffset = 9 * 60 // KST는 UTC+9
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utcTime + (kstOffset * 60000))
}

/**
 * URL 정규화
 */
function normalizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/^(m\.|www\.)/, '')
    .toLowerCase()
}

/**
 * 블로그 ID 추출
 */
function extractBlogId(blogUrl: string): string | null {
  // Handle various Naver blog URL formats
  const patterns = [
    /blog\.naver\.com\/([^/?]+)/,  // https://blog.naver.com/blogid
    /blog\.naver\.com\/PostView\.naver\?blogId=([^&]+)/,  // Old format with blogId parameter
    /m\.blog\.naver\.com\/([^/?]+)/,  // Mobile blog URL
    /blog\.naver\.com\/.*blogId=([^&]+)/  // Any format with blogId parameter
  ]

  for (const pattern of patterns) {
    const match = blogUrl.match(pattern)
    if (match) {
      return match[1]
    }
  }

  // If no pattern matches, try to extract from the URL path
  try {
    const url = new URL(blogUrl)
    const pathParts = url.pathname.split('/').filter(part => part)
    if (pathParts.length > 0 && pathParts[0] !== 'PostView.naver') {
      return pathParts[0]
    }
  } catch (error) {
    console.error('Failed to parse blog URL:', error)
  }

  return null
}

/**
 * 블로그 순위 추출 함수
 */
async function extractBlogRankings(
  page: any,
  targetBlogUrl: string,
  keyword: string
): Promise<BlogRankingResult> {
  const blogId = extractBlogId(targetBlogUrl)
  if (!blogId) {
    console.error('Invalid blog URL:', targetBlogUrl)
    throw new Error('Invalid blog URL')
  }

  console.log(`Checking ranking for blog ${blogId} with keyword: ${keyword}`)

  let result: BlogRankingResult = {
    mainTabExposed: false,
    mainTabRank: null,
    blogTabRank: null,
    viewTabRank: null,
    adRank: null,
    found: false,
    url: null
  }

  try {
    // 1. 메인 통합검색 탭에서 검색
    const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`
    await page.goto(searchUrl, { waitUntil: 'networkidle0' })

    // 메인 탭 블로그 섹션 확인 - 노출 여부만 확인
    const mainTabInfo = await page.evaluate((blogId: string) => {
      // 광고 필터링을 위한 셀렉터들
      const adSelectors = [
        '.link_ad', '.ad_label', '[class*="_ad"]', '[class*="splink_ad"]',
        '.power_link', '.brand_search', '[data-cr-area*="bad"]',
        '[class*="_fds"]', '[class*="featured"]'
      ]

      // 비디오, 쇼핑 등 특수 영역 제외
      const excludeSections = ['video', 'shop', 'news', 'image']

      // 모든 블로그 링크 찾기
      const blogLinks = document.querySelectorAll('a[href*="blog.naver.com"]')
      let isExposed = false
      let firstUrl = ''

      blogLinks.forEach((link: any) => {
        const href = link.href || ''

        // 광고 체크
        let isAd = false
        const parent = link.closest('li, article, section')
        if (parent) {
          for (const selector of adSelectors) {
            if (parent.querySelector(selector) || parent.matches(selector)) {
              isAd = true
              break
            }
          }
        }

        // 특수 섹션 제외
        const section = link.closest('section')
        if (section) {
          const sectionClass = section.className.toLowerCase()
          for (const exclude of excludeSections) {
            if (sectionClass.includes(exclude)) {
              isAd = true
              break
            }
          }
        }

        // 광고가 아니고 해당 블로그의 게시물이면 노출로 표시
        if (!isAd && (href.includes(`/${blogId}/`) || href.includes(`/${blogId}?`) || href.includes(`blogId=${blogId}`))) {
          isExposed = true
          if (!firstUrl) firstUrl = href
        }
      })

      return {
        exposed: isExposed,
        firstUrl: firstUrl
      }
    }, blogId)

    console.log(`Main tab (노출 여부) for ${blogId}:`, mainTabInfo.exposed)

    if (mainTabInfo.exposed) {
      result.mainTabExposed = true
      result.found = true
      result.url = mainTabInfo.firstUrl
    }

    // 2. 블로그 탭에서 검색 (개선된 로직)
    const blogTabUrl = `https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=${encodeURIComponent(keyword)}`
    await page.goto(blogTabUrl, { waitUntil: 'networkidle0' })
    await page.waitForTimeout(3000)

    // 블로그 탭에서 순위 찾기 - 정확한 셀렉터 사용
    const blogTabInfo = await page.evaluate((blogId: string) => {
      let realRank = 0
      let foundRank = null
      let foundUrl = null
      let totalItems = 0

      // 1. api_subject_bx 내의 블로그 아이템 처리 (상위 노출 영역)
      const sections = document.querySelectorAll('#main_pack > section')
      sections.forEach(section => {
        const subjectBoxes = section.querySelectorAll('div.api_subject_bx')
        subjectBoxes.forEach(box => {
          const listItems = box.querySelectorAll('ul > li')
          listItems.forEach(item => {
            totalItems++

            // 광고 체크
            const isAd = item.querySelector('.link_ad') !== null ||
                        item.classList.contains('sp_nreview_ad')

            if (!isAd) {
              realRank++

              // 블로그 ID 추출 - 여러 셀렉터 시도
              let currentBlogId = ''

              // 작성자 링크에서 블로그 ID 추출 (가장 정확)
              const authorLink = item.querySelector('.sub_txt.sub_name, .user_info > a, .user_box_inner a.name') as HTMLAnchorElement
              if (authorLink && authorLink.href) {
                const match = authorLink.href.match(/blog\.naver\.com\/([^/?]+)/)
                if (match) {
                  currentBlogId = match[1]
                }
              }

              // 폴백: 제목 링크에서 추출
              if (!currentBlogId) {
                const titleLink = item.querySelector('.api_txt_lines.total_tit, .total_tit') as HTMLAnchorElement
                if (titleLink && titleLink.href) {
                  const match = titleLink.href.match(/blog\.naver\.com\/([^/?]+)/)
                  if (match) {
                    currentBlogId = match[1]
                  }
                }
              }

              // 타겟 블로그 확인
              if (currentBlogId === blogId && !foundRank) {
                foundRank = realRank
                const link = item.querySelector('a[href*="blog.naver.com"]') as HTMLAnchorElement
                if (link) foundUrl = link.href
              }
            }
          })
        })
      })

      // 2. 일반 li.bx 아이템 처리 (api_subject_bx에 속하지 않은 것만)
      const regularItems = document.querySelectorAll('li.bx')
      regularItems.forEach(item => {
        // 이미 api_subject_bx에서 처리된 것은 제외
        if (item.closest('div.api_subject_bx')) return

        totalItems++

        // 광고 체크
        const itemClass = item.className
        const isAd = itemClass.includes('sp_nreview_ad') ||
                     itemClass.includes('splink') ||
                     item.querySelector('.link_ad') !== null

        if (!isAd) {
          realRank++

          // 블로그 ID 추출
          let currentBlogId = ''
          const authorLink = item.querySelector('.sub_txt.sub_name, .user_info > a, .user_box_inner a.name') as HTMLAnchorElement
          if (authorLink && authorLink.href) {
            const match = authorLink.href.match(/blog\.naver\.com\/([^/?]+)/)
            if (match) {
              currentBlogId = match[1]
            }
          }

          // 폴백: 제목 링크에서 추출
          if (!currentBlogId) {
            const titleLink = item.querySelector('a[href*="blog.naver.com"]') as HTMLAnchorElement
            if (titleLink && titleLink.href) {
              const match = titleLink.href.match(/blog\.naver\.com\/([^/?]+)/)
              if (match) {
                currentBlogId = match[1]
              }
            }
          }

          // 타겟 블로그 확인
          if (currentBlogId === blogId && !foundRank) {
            foundRank = realRank
            const link = item.querySelector('a[href*="blog.naver.com"]') as HTMLAnchorElement
            if (link) foundUrl = link.href
          }
        }
      })

      return {
        rank: foundRank,
        url: foundUrl,
        totalItems: totalItems,
        realItemCount: realRank
      }
    }, blogId)

    console.log(`Blog tab results for ${blogId}:`, {
      rank: blogTabInfo.rank,
      totalItems: blogTabInfo.totalItems
    })

    if (blogTabInfo.rank) {
      result.blogTabRank = blogTabInfo.rank
      result.found = true
      result.url = result.url || blogTabInfo.url
    }

    // 3. View 탭에서 검색 (Optional - 현재는 생략)
    // View 탭은 필요 시 추가 구현

  } catch (error) {
    console.error('Error extracting blog rankings:', error)
    throw error
  }

  return result
}

/**
 * 메인 핸들러 함수
 */
export const handler = async (event: SQSEvent, context: Context) => {
  const startTime = Date.now()
  const results = []

  for (const record of event.Records) {
    let browser = null
    const message: BlogTrackingMessage = JSON.parse(record.body)

    console.log(`Processing blog keyword: ${message.keyword} (ID: ${message.keywordId})`)

    try {
      // Chromium 브라우저 실행
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.tar'),
        headless: chromium.headless as boolean
      })

      const page = await browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36')

      // 블로그 순위 추출
      const rankings = await extractBlogRankings(page, message.blogUrl, message.keyword)

      // DB에 결과 저장
      const trackingDate = getKSTDate()
      await prisma.blogTrackingResult.create({
        data: {
          keywordId: message.keywordId,
          trackingDate,
          mainTabExposed: rankings.mainTabExposed,
          mainTabRank: rankings.mainTabRank,
          blogTabRank: rankings.blogTabRank,
          viewTabRank: rankings.viewTabRank,
          adRank: rankings.adRank,
          //found: rankings.found,
          //url: rankings.url
        }
      })

      // 키워드 최종 확인 시간 업데이트
      await prisma.blogTrackingKeyword.update({
        where: { id: message.keywordId },
        data: { /* lastChecked: trackingDate */ }
      })

      // CloudWatch 메트릭 전송
      const duration = (Date.now() - startTime) / 1000
      await cloudwatch.send(new PutMetricDataCommand({
        Namespace: 'MarketingPlat/Tracking',
        MetricData: [{
          MetricName: 'TrackingDuration',
          Value: duration,
          Unit: 'Seconds',
          Dimensions: [
            { Name: 'Type', Value: 'Blog' },
            { Name: 'UserId', Value: String(message.userId) }
          ]
        }]
      }))

      results.push({
        keywordId: message.keywordId,
        success: true,
        mainTabRank: rankings.mainTabRank,
        blogTabRank: rankings.blogTabRank,
        viewTabRank: rankings.viewTabRank,
        duration
      })

      console.log(`Successfully tracked blog keyword ${message.keyword}:`, {
        mainTab: rankings.mainTabRank,
        blogTab: rankings.blogTabRank,
        viewTab: rankings.viewTabRank
      })

    } catch (error) {
      console.error(`Error tracking blog keyword ${message.keyword}:`, error)

      // 에러 메트릭 전송
      await cloudwatch.send(new PutMetricDataCommand({
        Namespace: 'MarketingPlat/Tracking',
        MetricData: [{
          MetricName: 'TrackingErrors',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Type', Value: 'Blog' },
            { Name: 'UserId', Value: String(message.userId) }
          ]
        }]
      }))

      results.push({
        keywordId: message.keywordId,
        success: false,
        error: error.message
      })

      // 에러 발생 시 SQS 메시지를 DLQ로 보내기 위해 에러 throw
      throw error

    } finally {
      if (browser) {
        await browser.close()
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
  }
}