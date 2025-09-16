/**
 * Lambda Function: Blog Ranking Tracker
 * 블로그 순위를 추적하는 Lambda 함수
 */

import { SQSEvent, Context } from 'aws-lambda'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
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
 * 블로그 순위 추출 함수
 */
async function extractBlogRankings(
  page: puppeteer.Page,
  targetBlogUrl: string,
  keyword: string
): Promise<BlogRankingResult> {
  const targetNormalized = normalizeUrl(targetBlogUrl)

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

    // 메인 탭 블로그 섹션 확인
    const mainBlogSection = await page.$('section.sc_new.sp_nblog')
    if (mainBlogSection) {
      const mainBlogItems = await mainBlogSection.$$eval('li.bx', items => {
        return items.map((item, index) => {
          const linkEl = item.querySelector('a.api_txt_lines')
          const url = linkEl?.getAttribute('href') || ''
          return { url, rank: index + 1 }
        })
      })

      const foundInMain = mainBlogItems.find(item => {
        const normalized = normalizeUrl(item.url)
        return normalized.includes(targetNormalized) || targetNormalized.includes(normalized)
      })

      if (foundInMain) {
        result.mainTabExposed = true
        result.mainTabRank = foundInMain.rank
        result.found = true
        result.url = foundInMain.url
      }
    }

    // 2. 블로그 탭에서 검색
    const blogTabUrl = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}`
    await page.goto(blogTabUrl, { waitUntil: 'networkidle0' })

    // 블로그 탭 결과 확인
    const blogItems = await page.$$eval('li.bx', items => {
      return items.map((item, index) => {
        const linkEl = item.querySelector('a.api_txt_lines')
        const url = linkEl?.getAttribute('href') || ''

        // 광고 여부 확인
        const isAd = item.querySelector('.spblog_ad_label') !== null

        return { url, rank: index + 1, isAd }
      })
    })

    const foundInBlog = blogItems.find(item => {
      const normalized = normalizeUrl(item.url)
      return normalized.includes(targetNormalized) || targetNormalized.includes(normalized)
    })

    if (foundInBlog) {
      if (foundInBlog.isAd) {
        result.adRank = foundInBlog.rank
      } else {
        result.blogTabRank = foundInBlog.rank
      }
      result.found = true
      result.url = result.url || foundInBlog.url
    }

    // 3. View 탭에서 검색
    const viewTabUrl = `https://search.naver.com/search.naver?where=view&query=${encodeURIComponent(keyword)}`
    await page.goto(viewTabUrl, { waitUntil: 'networkidle0' })

    // View 탭 결과 확인
    const viewItems = await page.$$eval('li.bx', items => {
      return items.map((item, index) => {
        const linkEl = item.querySelector('a.api_txt_lines')
        const url = linkEl?.getAttribute('href') || ''
        return { url, rank: index + 1 }
      })
    })

    const foundInView = viewItems.find(item => {
      const normalized = normalizeUrl(item.url)
      return normalized.includes(targetNormalized) || targetNormalized.includes(normalized)
    })

    if (foundInView) {
      result.viewTabRank = foundInView.rank
      result.found = true
      result.url = result.url || foundInView.url
    }

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
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
      })

      const page = await browser.newPage()

      // User-Agent 설정
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      )

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
          found: rankings.found,
          url: rankings.url
        }
      })

      // 키워드 최종 확인 시간 업데이트
      await prisma.blogTrackingKeyword.update({
        where: { id: message.keywordId },
        data: { lastChecked: trackingDate }
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