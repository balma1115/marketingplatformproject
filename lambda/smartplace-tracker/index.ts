// lambda/smartplace-tracker/index.ts
// AWS Lambda function for SmartPlace ranking tracking

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import { SQSEvent, Context } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

// Initialize AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });

// Cache for secrets to avoid repeated fetches
let secretsCache: { [key: string]: string } = {};
let prisma: PrismaClient;

// Function to get secret from AWS Secrets Manager
async function getSecret(secretId: string): Promise<string> {
  // Check cache first
  if (secretsCache[secretId]) {
    return secretsCache[secretId];
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await secretsClient.send(command);
    const secretValue = response.SecretString || '';

    // Cache the secret
    secretsCache[secretId] = secretValue;
    return secretValue;
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretId}:`, error);
    throw error;
  }
}

// Initialize Prisma with database URL from Secrets Manager
async function initializePrisma() {
  if (!prisma) {
    const databaseUrl = await getSecret('marketingplat/database-url');
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    });
  }
  return prisma;
}

// Main Lambda handler
export const handler = async (event: SQSEvent, context: Context) => {
  console.log(`Processing ${event.Records.length} messages`);

  // Initialize Prisma connection
  await initializePrisma();

  // Process each SQS message
  const results = await Promise.allSettled(
    event.Records.map(async (record) => {
      const message = JSON.parse(record.body);
      const { keywordId, keyword, userId } = message;

      console.log(`Tracking keyword: ${keyword} (ID: ${keywordId})`);

      let browser = null;
      try {
        // Launch Puppeteer with Chromium
        browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        });

        const page = await browser.newPage();

        // Set user agent to avoid detection
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Navigate to Naver Map search
        const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(keyword)}`;
        await page.goto(searchUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for search results
        await page.waitForSelector('div.CHC5F', { timeout: 10000 });

        // Extract ranking data
        const rankings = await page.evaluate(() => {
          const results: Array<{
            rank: number;
            name: string;
            isAd: boolean;
            category?: string;
            address?: string;
          }> = [];

          const items = document.querySelectorAll('div.CHC5F');

          items.forEach((item, index) => {
            const nameEl = item.querySelector('span.YwYLL');
            const categoryEl = item.querySelector('span.KCMnt');
            const addressEl = item.querySelector('span.Pb0WU');
            const isAd = !!item.querySelector('div.iqAyT.JKKhR > a.gU6bV._DHlh');

            if (nameEl) {
              results.push({
                rank: index + 1,
                name: nameEl.textContent?.trim() || '',
                isAd,
                category: categoryEl?.textContent?.trim(),
                address: addressEl?.textContent?.trim()
              });
            }
          });

          return results;
        });

        // Find my place ranking
        const myPlace = await prisma.smartPlaceKeyword.findUnique({
          where: { id: keywordId },
          include: {
            smartPlace: true
          }
        });

        const myPlaceName = myPlace?.smartPlace.placeName || '';
        const myRanking = rankings.find(r =>
          r.name.includes(myPlaceName) || myPlaceName.includes(r.name)
        );

        // Save ranking result
        await prisma.smartPlaceRanking.create({
          data: {
            keywordId,
            checkDate: new Date(),
            organicRank: myRanking && !myRanking.isAd ? myRanking.rank : null,
            adRank: myRanking && myRanking.isAd ? myRanking.rank : null,
            topTenPlaces: JSON.stringify(rankings.slice(0, 10))
          }
        });

        // Update last checked time
        await prisma.smartPlaceKeyword.update({
          where: { id: keywordId },
          data: { lastChecked: new Date() }
        });

        console.log(`✅ Successfully tracked keyword: ${keyword}`);
        return { success: true, keyword, rankings: rankings.length };

      } catch (error) {
        console.error(`❌ Error tracking keyword ${keyword}:`, error);

        // Log error to database
        await prisma.smartPlaceRanking.create({
          data: {
            keywordId,
            checkDate: new Date(),
            organicRank: null,
            adRank: null,
            topTenPlaces: JSON.stringify({ error: error.message })
          }
        });

        throw error;
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    })
  );

  // Analyze results
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`Completed: ${successful} successful, ${failed} failed`);

  // Disconnect Prisma client
  await prisma.$disconnect();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Tracking completed',
      successful,
      failed,
      total: event.Records.length
    })
  };
};

// Cleanup function for local testing
if (process.env.NODE_ENV === 'development') {
  process.on('SIGINT', async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    process.exit();
  });
}