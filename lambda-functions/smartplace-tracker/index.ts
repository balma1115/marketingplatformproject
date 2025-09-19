/**
 * Lambda Function: SmartPlace Ranking Tracker
 * 스마트플레이스 순위를 추적하는 Lambda 함수
 */

import { SQSEvent, Context } from 'aws-lambda'
import chromium from '@sparticuz/chromium'
import * as puppeteer from 'puppeteer-core'
import { PrismaClient } from '@prisma/client'
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'

const prisma = new PrismaClient()
const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION || 'ap-northeast-2' })

interface TrackingMessage {
  type: 'SMARTPLACE_TRACKING'
  keywordId: number
  keyword: string
  userId: number
  placeId: string
  placeName: string
}

interface RankingResult {
  organicRank: number | null
  adRank: number | null
  topTenPlaces: any[]
  found: boolean
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
 * 텍스트 정규화 함수
 */
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[^\w가-힣]/g, '')
    .toLowerCase()
}

/**
 * 순위 추출 함수
 */
async function extractRankings(
  page: any,
  targetPlaceName: string
): Promise<RankingResult> {
  const results = await page.evaluate((targetName) => {
    const normalizeInBrowser = (text: string) => {
      return text
        .replace(/\s+/g, '')
        .replace(/[^\w가-힣]/g, '')
        .toLowerCase()
    }

    const targetNormalized = normalizeInBrowser(targetName)
    const allItems: any[] = []
    let organicRank: number | null = null
    let adRank: number | null = null
    let found = false

    // 광고 업체 찾기
    const adItems = document.querySelectorAll('div.iqAyT.JKKhR > a.gU6bV._DHlh')
    adItems.forEach((item, index) => {
      const nameEl = item.querySelector('span.YwYLL')
      if (nameEl) {
        const name = nameEl.textContent || ''
        const normalized = normalizeInBrowser(name)

        if (normalized === targetNormalized && !adRank) {
          adRank = index + 1
          found = true
        }

        // 상위 10개 광고 업체 저장
        if (index < 10) {
          allItems.push({
            rank: index + 1,
            name,
            type: 'ad',
            address: item.querySelector('.hDv5V')?.textContent || ''
          })
        }
      }
    })

    // 일반 업체 찾기
    const organicItems = document.querySelectorAll('li.UEzoS:not(.Xc4qd) a.CHC5F')
    organicItems.forEach((item, index) => {
      const nameEl = item.querySelector('span.YwYLL')
      if (nameEl) {
        const name = nameEl.textContent || ''
        const normalized = normalizeInBrowser(name)

        if (normalized === targetNormalized && !organicRank) {
          organicRank = index + 1
          found = true
        }

        // 상위 10개 일반 업체 저장
        if (index < 10) {
          allItems.push({
            rank: index + 1,
            name,
            type: 'organic',
            address: item.querySelector('.zZfO1')?.textContent || ''
          })
        }
      }
    })

    return {
      organicRank,
      adRank,
      topTenPlaces: allItems.slice(0, 10),
      found
    }
  }, targetPlaceName)

  return results
}

/**
 * 메인 핸들러 함수
 */
export const handler = async (event: SQSEvent, context: Context) => {
  const startTime = Date.now()
  const results = []

  for (const record of event.Records) {
    let browser = null
    const message: TrackingMessage = JSON.parse(record.body)

    console.log(`Processing keyword: ${message.keyword} (ID: ${message.keywordId})`)

    try {
      // Chromium 브라우저 실행
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless as boolean
      })

      const page = await browser.newPage()

      // User-Agent 설정
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      )

      // 네이버 지도 검색
      const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(message.keyword)}`
      await page.goto(searchUrl, { waitUntil: 'networkidle0' })

      // 검색 결과 대기
      await page.waitForSelector('div.CHC5F', { timeout: 10000 })

      // 페이지 스크롤 (모든 결과 로딩)
      await page.evaluate(() => {
        const scrollElement = document.querySelector('#_pcmap_list_scroll_container')
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }
      })

      // 잠시 대기 (추가 결과 로딩)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 순위 추출
      const rankings = await extractRankings(page, message.placeName)

      // DB에 결과 저장
      const checkDate = getKSTDate()
      await prisma.smartPlaceRanking.create({
        data: {
          keywordId: String(message.keywordId),
          checkDate,
          organicRank: rankings.organicRank,
          adRank: rankings.adRank,
          topTenPlaces: rankings.topTenPlaces
          //found: rankings.found
        }
      })

      // 키워드 최종 확인 시간 업데이트
      await prisma.smartPlaceKeyword.update({
        where: { id: String(message.keywordId) },
        data: { lastChecked: checkDate }
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
            { Name: 'Type', Value: 'SmartPlace' },
            { Name: 'UserId', Value: String(message.userId) }
          ]
        }]
      }))

      results.push({
        keywordId: message.keywordId,
        success: true,
        organicRank: rankings.organicRank,
        adRank: rankings.adRank,
        duration
      })

      console.log(`Successfully tracked keyword ${message.keyword}: Organic=${rankings.organicRank}, Ad=${rankings.adRank}`)

    } catch (error) {
      console.error(`Error tracking keyword ${message.keyword}:`, error)

      // 에러 메트릭 전송
      await cloudwatch.send(new PutMetricDataCommand({
        Namespace: 'MarketingPlat/Tracking',
        MetricData: [{
          MetricName: 'TrackingErrors',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Type', Value: 'SmartPlace' },
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
      message: 'Tracking completed',
      results,
      totalDuration: (Date.now() - startTime) / 1000
    })
  }
}