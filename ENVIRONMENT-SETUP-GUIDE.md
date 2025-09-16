# 로컬과 프로덕션 환경 구분 가이드

## 📋 목차
1. [환경변수 설정](#1-환경변수-설정)
2. [코드에서 환경 구분](#2-코드에서-환경-구분)
3. [실제 적용 예시](#3-실제-적용-예시)
4. [배포 시 체크리스트](#4-배포-시-체크리스트)

## 1. 환경변수 설정

### 📁 환경변수 파일 구조
```
프로젝트 루트/
├── .env.local          # 로컬 개발용 (Git 무시)
├── .env.development     # 개발 환경 기본값
├── .env.production      # 프로덕션 환경 기본값
├── .env.example         # 환경변수 템플릿 (Git 포함)
└── .gitignore          # .env.local 제외
```

### 🔧 .env.local (로컬 개발)
```env
# 환경 구분
NODE_ENV=development
APP_ENV=local
NEXT_PUBLIC_APP_ENV=local

# 데이터베이스
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketingplat_dev

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# 추적 서비스 설정
USE_LAMBDA_TRACKING=false  # 로컬에서는 직접 실행
TRACKING_MODE=local        # local | lambda | sqs

# 디버그 모드
DEBUG_MODE=true
SHOW_ERROR_DETAILS=true

# 네이버 API (테스트용)
NAVER_ADS_CUSTOMER_ID=test_customer
```

### 🚀 .env.production (프로덕션)
```env
# 환경 구분
NODE_ENV=production
APP_ENV=production
NEXT_PUBLIC_APP_ENV=production

# 데이터베이스 (AWS RDS)
DATABASE_URL=postgresql://user:pass@rds-endpoint.amazonaws.com:5432/marketingplat

# API URL
NEXT_PUBLIC_API_URL=https://api.marketingplat.com
NEXT_PUBLIC_BASE_URL=https://marketingplat.com

# 추적 서비스 설정
USE_LAMBDA_TRACKING=true   # Lambda 사용
TRACKING_MODE=lambda        # Lambda로 실행
SQS_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/xxx/tracking-queue

# 디버그 모드
DEBUG_MODE=false
SHOW_ERROR_DETAILS=false

# AWS 설정
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
```

### 📝 .env.example (템플릿)
```env
# 환경 설정
NODE_ENV=
APP_ENV=
NEXT_PUBLIC_APP_ENV=

# 데이터베이스
DATABASE_URL=

# API 설정
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_BASE_URL=

# 추적 서비스
USE_LAMBDA_TRACKING=
TRACKING_MODE=
SQS_QUEUE_URL=

# 네이버 API
NAVER_ADS_CUSTOMER_ID=
NAVER_ADS_ACCESS_KEY=
NAVER_ADS_SECRET_KEY=
```

## 2. 코드에서 환경 구분

### 🎯 환경 감지 유틸리티
```typescript
// lib/utils/environment.ts
export const env = {
  // 기본 환경 확인
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isLocal: process.env.APP_ENV === 'local',
  isServer: typeof window === 'undefined',
  isClient: typeof window !== 'undefined',

  // 기능별 플래그
  useLambdaTracking: process.env.USE_LAMBDA_TRACKING === 'true',
  debugMode: process.env.DEBUG_MODE === 'true',

  // 환경별 URL
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',

  // 추적 모드
  trackingMode: process.env.TRACKING_MODE as 'local' | 'lambda' | 'sqs'
}

// 타입 안전성을 위한 환경변수 검증
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_API_URL',
    'TRACKING_MODE'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }
}
```

### 🔀 조건부 서비스 선택
```typescript
// lib/services/tracking-service.ts
import { env } from '@/lib/utils/environment'
import { LocalTracker } from './local-tracker'
import { LambdaTracker } from './lambda-tracker'

export function getTrackingService() {
  if (env.useLambdaTracking) {
    return new LambdaTracker()
  }
  return new LocalTracker()
}

// 사용 예시
export async function trackKeywords(keywords: string[]) {
  const tracker = getTrackingService()

  if (env.isDevelopment) {
    console.log('추적 모드:', env.trackingMode)
    console.log('키워드 수:', keywords.length)
  }

  return await tracker.track(keywords)
}
```

## 3. 실제 적용 예시

### 📍 스마트플레이스 추적 API
```typescript
// app/api/smartplace-keywords/track-all/route.ts
import { env } from '@/lib/utils/environment'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

export async function POST(req: NextRequest) {
  const keywords = await prisma.smartPlaceKeyword.findMany({
    where: { isActive: true }
  })

  // 환경에 따라 다른 처리
  if (env.useLambdaTracking) {
    // 프로덕션: SQS로 메시지 전송
    const sqs = new SQSClient({ region: process.env.AWS_REGION })

    for (const keyword of keywords) {
      await sqs.send(new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          type: 'SMARTPLACE_TRACKING',
          keywordId: keyword.id,
          keyword: keyword.keyword
        })
      }))
    }

    return NextResponse.json({
      mode: 'lambda',
      message: `${keywords.length}개 키워드 Lambda 처리 시작`
    })

  } else {
    // 로컬: 직접 실행
    const { ImprovedScraperV3 } = await import('@/lib/services/improved-scraper-v3')
    const scraper = new ImprovedScraperV3()

    // Queue로 처리
    const queue = new PQueue({ concurrency: 3 })
    const results = await Promise.all(
      keywords.map(kw =>
        queue.add(() => scraper.trackKeyword(kw))
      )
    )

    return NextResponse.json({
      mode: 'local',
      message: `${keywords.length}개 키워드 로컬 처리 완료`,
      results: env.debugMode ? results : undefined
    })
  }
}
```

### 🌐 클라이언트 컴포넌트
```typescript
// components/TrackingButton.tsx
'use client'

import { env } from '@/lib/utils/environment'

export function TrackingButton() {
  const [isTracking, setIsTracking] = useState(false)

  const handleTrack = async () => {
    setIsTracking(true)

    try {
      const response = await fetch('/api/smartplace-keywords/track-all', {
        method: 'POST'
      })

      const data = await response.json()

      // 환경별 다른 UI 표시
      if (env.isLocal) {
        toast({
          title: '로컬 추적 완료',
          description: `처리 모드: ${data.mode}`,
          duration: 5000
        })
      } else {
        toast({
          title: '추적 작업 시작됨',
          description: 'Lambda에서 처리 중입니다. 잠시 후 결과를 확인하세요.'
        })
      }

    } catch (error) {
      // 개발 환경에서만 상세 에러 표시
      if (env.isDevelopment) {
        console.error('Tracking error:', error)
        toast({
          title: '에러 발생',
          description: error.message,
          variant: 'destructive'
        })
      } else {
        toast({
          title: '추적 실패',
          description: '잠시 후 다시 시도해주세요.',
          variant: 'destructive'
        })
      }
    } finally {
      setIsTracking(false)
    }
  }

  return (
    <Button onClick={handleTrack} disabled={isTracking}>
      {isTracking ? '추적 중...' : '순위 추적 시작'}
      {env.isLocal && <Badge className="ml-2">로컬</Badge>}
    </Button>
  )
}
```

### 🔒 보안 설정 분리
```typescript
// lib/config/security.ts
import { env } from '@/lib/utils/environment'

export const securityConfig = {
  // CORS 설정
  cors: {
    origin: env.isProduction
      ? ['https://marketingplat.com']
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  },

  // Rate Limiting
  rateLimit: {
    windowMs: env.isProduction ? 15 * 60 * 1000 : 60 * 1000,
    max: env.isProduction ? 100 : 1000
  },

  // 에러 처리
  errorHandling: {
    showStack: !env.isProduction,
    logErrors: true,
    sendToSentry: env.isProduction
  }
}
```

## 4. 배포 시 체크리스트

### ✅ 로컬 개발 체크리스트
```bash
# 1. 환경변수 확인
cat .env.local | grep APP_ENV
# 출력: APP_ENV=local

# 2. 데이터베이스 확인
psql postgresql://localhost:5432/marketingplat_dev

# 3. 개발 서버 실행
npm run dev

# 4. 환경 확인 (브라우저 콘솔)
console.log(process.env.NEXT_PUBLIC_APP_ENV) // "local"
```

### ✅ 프로덕션 배포 체크리스트
```bash
# 1. 환경변수 설정 (AWS Systems Manager)
aws ssm put-parameter \
  --name "/marketingplat/prod/DATABASE_URL" \
  --value "postgresql://..." \
  --type SecureString

# 2. 빌드 확인
npm run build
npm run start

# 3. 환경변수 검증
node -e "require('./lib/utils/environment').validateEnv()"

# 4. Lambda 함수 배포
serverless deploy --stage production

# 5. 헬스체크
curl https://api.marketingplat.com/health
```

### 🔄 환경별 실행 스크립트
```json
// package.json
{
  "scripts": {
    "dev": "NODE_ENV=development APP_ENV=local next dev",
    "dev:staging": "NODE_ENV=development APP_ENV=staging next dev",
    "build": "next build",
    "build:prod": "NODE_ENV=production APP_ENV=production next build",
    "start": "NODE_ENV=production next start",
    "start:local": "NODE_ENV=production APP_ENV=local next start",

    // 환경별 테스트
    "test:local": "APP_ENV=local jest",
    "test:prod": "APP_ENV=production jest --ci",

    // 환경 확인
    "env:check": "node scripts/check-env.js"
  }
}
```

### 🐳 Docker 환경 분리
```dockerfile
# Dockerfile
ARG APP_ENV=production

FROM node:18-alpine AS base

# 빌드 단계
FROM base AS builder
ARG APP_ENV
ENV APP_ENV=${APP_ENV}

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:${APP_ENV}

# 실행 단계
FROM base AS runner
ARG APP_ENV
ENV APP_ENV=${APP_ENV}
ENV NODE_ENV=production

WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

RUN npm ci --production

EXPOSE 3000
CMD ["npm", "start"]
```

### 🚀 GitHub Actions 배포
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set Environment
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "APP_ENV=production" >> $GITHUB_ENV
          else
            echo "APP_ENV=staging" >> $GITHUB_ENV
          fi

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2

      - name: Deploy to AWS
        run: |
          npm run build:prod
          npm run deploy:${{ env.APP_ENV }}
```

## 📊 환경별 차이 요약

| 항목 | 로컬 (local) | 프로덕션 (production) |
|------|-------------|---------------------|
| **DATABASE_URL** | localhost:5432 | AWS RDS |
| **추적 방식** | 로컬 Playwright | AWS Lambda |
| **동시 처리** | 3개 | 50개 |
| **에러 표시** | 상세 정보 | 간략한 메시지 |
| **로깅** | 콘솔 출력 | CloudWatch |
| **캐싱** | 없음 | Redis/CloudFront |
| **인증** | 간소화 | 완전한 검증 |
| **API 제한** | 없음 | Rate Limiting |

## 🔍 디버깅 팁

### 환경 확인 API 엔드포인트
```typescript
// app/api/debug/env/route.ts
import { NextResponse } from 'next/server'
import { env } from '@/lib/utils/environment'

export async function GET() {
  // 프로덕션에서는 접근 제한
  if (env.isProduction && !isAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      APP_ENV: process.env.APP_ENV,
      TRACKING_MODE: process.env.TRACKING_MODE,
      USE_LAMBDA: process.env.USE_LAMBDA_TRACKING,
      DATABASE_HOST: new URL(process.env.DATABASE_URL!).hostname,
      IS_LOCAL: env.isLocal,
      IS_PRODUCTION: env.isProduction
    }
  })
}
```

이 설정을 통해 로컬과 프로덕션 환경을 명확히 구분하고, 각 환경에 맞는 최적의 설정을 적용할 수 있습니다.