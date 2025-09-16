/**
 * 환경 감지 및 설정 유틸리티
 * 로컬과 프로덕션 환경을 구분하여 적절한 설정을 제공합니다.
 */

export const env = {
  // 기본 환경 확인
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isLocal: process.env.APP_ENV === 'local',
  isStaging: process.env.APP_ENV === 'staging',
  isServer: typeof window === 'undefined',
  isClient: typeof window !== 'undefined',

  // 기능별 플래그
  useLambdaTracking: process.env.USE_LAMBDA_TRACKING === 'true',
  debugMode: process.env.DEBUG_MODE === 'true',
  showErrorDetails: process.env.SHOW_ERROR_DETAILS === 'true',
  useRealCrawler: process.env.USE_REAL_CRAWLER === 'true',
  useMockScraper: process.env.USE_MOCK_SCRAPER === 'true',

  // 환경별 URL
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',

  // 추적 모드
  trackingMode: process.env.TRACKING_MODE as 'local' | 'lambda' | 'sqs',

  // AWS 설정
  awsRegion: process.env.AWS_REGION || 'ap-northeast-2',
  sqsQueueUrl: process.env.SQS_QUEUE_URL || '',

  // Redis 설정
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // 데이터베이스
  databaseUrl: process.env.DATABASE_URL || '',
}

/**
 * 환경변수 검증 함수
 * 필수 환경변수가 설정되어 있는지 확인합니다.
 */
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NEXT_PUBLIC_API_URL'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    if (env.isDevelopment) {
      console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`)
    } else {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
  }
}

/**
 * 환경별 설정 반환
 */
export function getEnvironmentConfig() {
  if (env.isProduction) {
    return {
      name: 'production',
      cors: {
        origin: ['https://marketingplat.com', 'https://www.marketingplat.com'],
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15분
        max: 100 // 요청 수
      },
      errorHandling: {
        showStack: false,
        logErrors: true,
        sendToSentry: true
      },
      tracking: {
        concurrency: 50,
        method: 'lambda'
      }
    }
  }

  if (env.isStaging) {
    return {
      name: 'staging',
      cors: {
        origin: ['https://staging.marketingplat.com'],
        credentials: true
      },
      rateLimit: {
        windowMs: 5 * 60 * 1000, // 5분
        max: 200
      },
      errorHandling: {
        showStack: true,
        logErrors: true,
        sendToSentry: true
      },
      tracking: {
        concurrency: 10,
        method: 'lambda'
      }
    }
  }

  // 로컬 개발 환경
  return {
    name: 'local',
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    },
    rateLimit: {
      windowMs: 60 * 1000, // 1분
      max: 1000
    },
    errorHandling: {
      showStack: true,
      logErrors: true,
      sendToSentry: false
    },
    tracking: {
      concurrency: 3,
      method: 'local'
    }
  }
}

/**
 * 디버그 로그 출력 함수
 */
export function debugLog(message: string, data?: any) {
  if (env.debugMode) {
    console.log(`[DEBUG] ${message}`, data || '')
  }
}

/**
 * 에러 로그 출력 함수
 */
export function errorLog(message: string, error?: any) {
  if (env.isDevelopment || env.debugMode) {
    console.error(`[ERROR] ${message}`, error || '')
    if (error?.stack && env.showErrorDetails) {
      console.error(error.stack)
    }
  } else {
    // 프로덕션에서는 간단한 에러만 기록
    console.error(`[ERROR] ${message}`)
  }
}

/**
 * 환경 정보 출력 함수 (디버깅용)
 */
export function printEnvironmentInfo() {
  if (env.debugMode) {
    console.log('=== Environment Information ===')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('APP_ENV:', process.env.APP_ENV)
    console.log('Is Local:', env.isLocal)
    console.log('Is Production:', env.isProduction)
    console.log('Tracking Mode:', env.trackingMode)
    console.log('Use Lambda:', env.useLambdaTracking)
    console.log('Debug Mode:', env.debugMode)
    console.log('API URL:', env.apiUrl)
    console.log('===============================')
  }
}