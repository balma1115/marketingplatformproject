# CLAUDE.md - MarketingPlat Next.js 프로젝트 가이드

This file provides comprehensive guidance to Claude Code for the MarketingPlat project with AWS deployment considerations.

## 🎯 프로젝트 개요

MarketingPlat은 AI 기반 학원 마케팅 플랫폼으로 Next.js 15 (App Router)를 사용하여 구축됩니다. AWS 배포를 전제로 설계되었습니다.

### 핵심 기능
- **AI 콘텐츠 생성**: Google Gemini API를 활용한 블로그 제목 및 콘텐츠 생성
- **이미지 생성**: Flux API를 통한 AI 이미지 생성
- **네이버 생태계 통합**: 스마트플레이스 순위 추적, 블로그 분석
- **키워드 관리**: 중점 키워드 및 블로그 키워드 관리
- **진단 도구**: 스마트플레이스, 블로그, 인스타그램 진단

## ⚠️ 중요 개발 규칙

### 🚫 목업 데이터 절대 금지 정책 (매우 중요)
**절대로 어떠한 경우에도 임의의 목업/가짜/시뮬레이션 데이터를 생성하지 마세요.** 
**테스트 목적이라도 절대 금지입니다.**
모든 데이터는 실제 추적이나 API 호출을 통해서만 수집해야 합니다.

#### ❌ 절대 금지 사항:
- seed 스크립트에 가짜 순위 데이터 생성
- 임의의 추세 데이터 생성  
- 테스트용 더미 데이터 삽입
- 시뮬레이션 데이터 생성
- 하드코딩된 순위나 통계 값
- 날짜를 조작한 가짜 과거 데이터 생성
- simulate-trend-data.ts 같은 스크립트 작성 금지

#### ✅ 올바른 방법:
- 실제 네이버 스크래핑으로만 데이터 수집
- 사용자가 직접 추적 실행한 데이터만 사용
- 실제 API 응답 데이터만 저장
- 데이터가 없을 때는 명확히 "데이터 없음" 표시
- 개발 환경에서도 실제 추적으로 데이터 생성

### 📅 날짜 기반 데이터 표시 원칙
- **오늘 날짜의 데이터만** 현재 순위로 표시
- 과거 데이터는 반드시 날짜와 함께 표시
- `lastUpdated` 필드 정확히 업데이트
- 추적하지 않은 날은 순위 표시 안함
- 마지막 추적 날짜 명확히 표시

## 🏗️ 기술 스택 (AWS 최적화)

### Frontend
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    "axios": "^1.7.0",
    "framer-motion": "^11.0.0"
  }
}
```

### ⚠️ Next.js 15 중요 변경사항 (절대 변경 금지)
**Next.js 15부터 동적 라우트의 params가 Promise로 변경되었습니다.**
**이미 모든 API 라우트가 Next.js 15에 맞게 수정되어 있으므로 절대 변경하지 마세요.**

#### 올바른 사용법 (Next.js 15):
```typescript
// ✅ 올바른 방법 - params를 await으로 처리
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { id } = params
  // ...
}
```

#### 잘못된 사용법 (이전 버전):
```typescript
// ❌ 잘못된 방법 - Next.js 15에서 오류 발생
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params  // Error: params should be awaited
  // ...
}
```

### Backend & Database
```json
{
  "dependencies": {
    "@prisma/client": "^5.15.0",
    "prisma": "^5.15.0",
    "bcryptjs": "^2.4.0",
    "jsonwebtoken": "^9.0.0",
    "@google/generative-ai": "^0.24.0",
    "playwright": "^1.40.0",
    "cheerio": "^1.0.0",
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/client-ses": "^3.0.0",
    "@aws-sdk/client-secrets-manager": "^3.0.0"
  }
}
```

## 📐 프로젝트 구조

```
marketingplatformproject/
├── app/                        # Next.js App Router
│   ├── api/                   # API Routes
│   │   ├── auth/             # 인증 관련 API
│   │   ├── diagnosis/        # 진단 기능 API
│   │   ├── management/       # 관리 기능 API
│   │   ├── blog/            # 블로그 기능 API
│   │   └── ai/              # AI 생성 API
│   ├── dashboard/            # 대시보드 페이지
│   ├── diagnosis/            # 진단 페이지
│   ├── management/           # 관리 페이지
│   ├── blog/                # 블로그 페이지
│   └── layout.tsx           # 루트 레이아웃
├── components/               # React 컴포넌트
├── lib/                     # 유틸리티 및 설정
│   ├── db.ts               # Prisma 데이터베이스
│   ├── auth.ts             # 인증 헬퍼
│   └── services/           # 비즈니스 로직
├── prisma/                  # Prisma 스키마
│   └── schema.prisma       # 데이터베이스 스키마
├── public/                  # 정적 파일
└── types/                   # TypeScript 타입 정의
```

## 🔐 환경 변수 설정 (AWS 고려)

```env
# Database (개발: PostgreSQL Docker, 프로덕션: AWS RDS)
DATABASE_URL="postgresql://user:password@localhost:5432/marketingplat"

# JWT Authentication
JWT_SECRET="your-secret-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# Google AI
GEMINI_API_KEY="your-gemini-api-key"

# AWS Configuration (프로덕션)
AWS_REGION="ap-northeast-2"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="marketingplat-assets"

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# Server Port
PORT=3000
```

## 🗄️ 데이터베이스 설정 (PostgreSQL + Prisma)

### 1. PostgreSQL 설치 및 설정

#### 개발 환경 (Docker 추천)
```bash
# Docker로 PostgreSQL 실행
docker run --name marketingplat-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=marketingplat \
  -e POSTGRES_DB=marketingplat \
  -p 5432:5432 \
  -d postgres:15-alpine
```

#### Windows 로컬 설치 (대안)
1. PostgreSQL 15 다운로드: https://www.postgresql.org/download/windows/
2. 설치 후 pgAdmin으로 데이터베이스 생성
3. 데이터베이스명: `marketingplat`

### 2. Prisma 설정
```bash
# Prisma 설치
npm install prisma @prisma/client

# Prisma 초기화
npx prisma init

# 스키마 생성 후 마이그레이션
npx prisma migrate dev --name init

# Prisma Client 생성
npx prisma generate

# Prisma Studio (데이터베이스 GUI)
npx prisma studio
```

### 3. Prisma 스키마 (`prisma/schema.prisma`)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  phone     String?
  role      String   @default("user")
  plan      String   @default("basic")
  coin      Decimal  @default(100.00)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  blogProjects BlogProject[]
  keywords     Keyword[]
  aiLogs       AIGenerationLog[]
}

model BlogProject {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  name        String
  targetUrl   String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  keywords    Keyword[]
  rankings    RankingResult[]
}

model Keyword {
  id          String   @id @default(cuid())
  userId      String
  projectId   String?
  keyword     String
  location    String?
  type        String   @default("general")
  
  user        User     @relation(fields: [userId], references: [id])
  project     BlogProject? @relation(fields: [projectId], references: [id])
  rankings    RankingResult[]
  
  createdAt   DateTime @default(now())
}

model RankingResult {
  id          String   @id @default(cuid())
  keywordId   String
  projectId   String?
  checkDate   DateTime
  rank        Int?
  found       Boolean  @default(false)
  url         String?
  
  keyword     Keyword  @relation(fields: [keywordId], references: [id])
  project     BlogProject? @relation(fields: [projectId], references: [id])
  
  createdAt   DateTime @default(now())
}

model AIGenerationLog {
  id          String   @id @default(cuid())
  userId      String
  serviceType String
  prompt      String?
  response    String?
  model       String?
  tokensUsed  Int?
  costInNyang Decimal?
  
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
}
```

## 🚀 개발 명령어

### 개발 환경
```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 개발 서버 시작 (포트 3000 고정)
npm run dev

# 타입 체크
npm run type-check

# 린트
npm run lint

# 테스트 실행 (tests 폴더 내 파일)
npx tsx tests/[test-file-name].ts
```

### 테스트 파일 작성 규칙
- **위치**: 모든 테스트 파일은 `/tests` 폴더에 작성
- **명명규칙**: `test-*.ts` 또는 `check-*.ts` 형식
- **실행방법**: `npx tsx tests/파일명.ts`
- **예시**:
  ```bash
  # 데이터 구조 확인
  npx tsx tests/check-blog-data-structure.ts
  
  # 스크래퍼 테스트
  npx tsx tests/test-real-tracking.ts
  ```

### 프로덕션 빌드
```bash
# 빌드
npm run build

# 프로덕션 마이그레이션
npx prisma migrate deploy

# 프로덕션 서버 시작
npm start
```

## 🌐 AWS 배포 전략

### 1. AWS 서비스 구성
- **Frontend & API**: AWS Amplify 또는 EC2 + ALB
- **Database**: RDS PostgreSQL (Multi-AZ)
- **File Storage**: S3
- **CDN**: CloudFront
- **Email**: SES
- **Secrets**: Secrets Manager
- **Monitoring**: CloudWatch

### 2. Infrastructure as Code (Terraform 권장)
```hcl
# terraform/main.tf
provider "aws" {
  region = "ap-northeast-2"
}

resource "aws_db_instance" "marketingplat" {
  identifier     = "marketingplat-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  
  db_name  = "marketingplat"
  username = "admin"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  deletion_protection = true
}
```

### 3. CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to AWS Amplify
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          npm install -g @aws-amplify/cli
          amplify push --yes
```

## 🔒 보안 Best Practices

### 1. 환경 변수 관리
- 개발: `.env.local` (git ignore)
- 프로덕션: AWS Secrets Manager

### 2. API 보안
```typescript
// lib/middleware/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})

export async function rateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier)
  return { success, limit, reset, remaining }
}
```

### 3. 입력 검증
```typescript
// lib/validation/schemas.ts
import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export const keywordSchema = z.object({
  keyword: z.string().min(1).max(100),
  location: z.string().optional()
})
```

## 📊 모니터링 및 로깅

### 1. 에러 트래킹 (Sentry)
```typescript
// lib/monitoring/sentry.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})
```

### 2. 로깅 (Winston)
```typescript
// lib/logging/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})
```

## 🚦 API 엔드포인트 구현 가이드

### 인증 API
```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )
    
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        coin: user.coin.toString()
      }
    })
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## 🎨 UI/UX 디자인 시스템

### 색상 시스템
```css
:root {
  --brand-navy: #1A1F3F;
  --accent-blue: #556AF9;
  --secondary-blue: #8896FF;
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
}
```

### Tailwind 설정
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-navy': '#1A1F3F',
        'accent-blue': '#556AF9',
        'secondary-blue': '#8896FF',
      }
    }
  }
}
```

## 📋 개발 체크리스트

### Phase 1: 환경 설정 ✅
- [x] Next.js 14 프로젝트 초기화
- [x] TypeScript 설정
- [x] Tailwind CSS 설정
- [x] PostgreSQL + Prisma 설정
- [ ] AWS 계정 및 서비스 설정

### Phase 2: 인증 시스템 🚧
- [x] 사용자 모델 정의
- [x] JWT 인증 구현
- [x] 로그인/회원가입 API
- [ ] 권한 미들웨어

### Phase 3: 핵심 기능 구현 🚧
- [ ] 스마트플레이스 진단
- [ ] 블로그 진단
- [ ] 키워드 관리
- [ ] AI 콘텐츠 생성
- [ ] 순위 추적

### Phase 4: 배포 준비
- [ ] 환경 변수 분리
- [ ] 프로덕션 빌드 최적화
- [ ] AWS 인프라 구성
- [ ] CI/CD 파이프라인
- [ ] 모니터링 설정

## 🐛 트러블슈팅

### 일반적인 문제 해결

#### PostgreSQL 연결 오류
```bash
# Docker 컨테이너 상태 확인
docker ps

# 컨테이너 재시작
docker restart marketingplat-db

# 로그 확인
docker logs marketingplat-db
```

#### Prisma 마이그레이션 오류
```bash
# 스키마 동기화
npx prisma db push

# 마이그레이션 리셋 (주의: 데이터 삭제됨)
npx prisma migrate reset
```

#### 포트 충돌
```bash
# Windows에서 포트 사용 프로세스 확인
netstat -ano | findstr :3000

# 프로세스 종료
taskkill /PID <PID> /F
```

#### Next.js 15 및 Jest Worker 오류 해결 (2025년 1월)
```bash
# Jest worker 컴파일 오류 발생 시
1. .next 캐시 삭제
rm -rf .next

2. 포트 종료 및 서버 재시작
npx kill-port 3000
npm run dev
```

**Next.js 15 동적 라우트 파라미터 처리**
```typescript
// ❌ 잘못된 방법 (Next.js 14)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id // 직접 접근
}

// ✅ 올바른 방법 (Next.js 15)
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params // Promise await 필요
  const id = params.id
}
```

**Multiple Package-lock.json 경고 해결**
```javascript
// next.config.mjs
const nextConfig = {
  // 작업 공간 루트를 명확히 지정
  outputFileTracingRoot: 'C:/Users/User/Documents/GitHub/marketingplatformproject',
  
  // Jest worker 오류 해결을 위한 webpack 설정
  webpack: (config, { isServer, dev }) => {
    if (dev) {
      config.optimization = {
        splitChunks: false,
        minimize: false,
        minimizer: [],
      }
      config.parallelism = 1
    }
    return config
  }
}
```

## 🔄 네이버 광고 API 연동 (2025년 1월)

### API 자격 증명 필드
```typescript
// 사용자에 따라 다른 필드명 사용
// 1. 새로운 필드 (naverAds* 접두사)
naverAdsAccessKey
naverAdsSecretKey
naverAdsCustomerId

// 2. 기존 필드 (naverAd* 접두사)
naverAdApiKey
naverAdSecret
naverAdCustomerId

// API 사용 시 두 가지 모두 체크
const accessKey = user.naverAdsAccessKey || user.naverAdApiKey
const secretKey = user.naverAdsSecretKey || user.naverAdSecret
const customerId = user.naverAdsCustomerId || user.naverAdCustomerId
```

### Signature 생성 주의사항
```typescript
// HMAC-SHA256 서명 생성 시 쿼리 파라미터 제외
private getAuthHeaders(method: string, uri: string): Record<string, string> {
  const timestamp = Date.now().toString()
  // 서명용 경로에서 쿼리 파라미터 제거
  const pathOnly = uri.split('?')[0]
  const signature = this.generateSignature(method, pathOnly, timestamp)
  // 실제 요청은 전체 URI 사용
  return {
    'X-Timestamp': timestamp,
    'X-API-KEY': this.accessKey,
    'X-Customer': this.customerId,
    'X-Signature': signature
  }
}
```

### 통계 계산 로직
```typescript
// 합계가 필요한 항목: 노출수, 클릭수, 총비용, 하루예산
const totals = {
  impCnt: campaigns.reduce((sum, c) => sum + c.stats.impCnt, 0),
  clkCnt: campaigns.reduce((sum, c) => sum + c.stats.clkCnt, 0),
  salesAmt: campaigns.reduce((sum, c) => sum + c.stats.salesAmt, 0),
  dailyBudget: campaigns.reduce((sum, c) => sum + c.dailyBudget, 0)
}

// 평균이 필요한 항목: 재계산된 비율
const averages = {
  // 전체 클릭률 = 전체 클릭수 / 전체 노출수
  ctr: totals.impCnt > 0 ? (totals.clkCnt / totals.impCnt * 100) : 0,
  // 평균 클릭비용 = 총비용 / 전체 클릭수
  cpc: totals.clkCnt > 0 ? Math.round(totals.salesAmt / totals.clkCnt) : 0
}
```

## 📝 페이지 레이아웃 가이드

### 모든 페이지 필수 구조
**중요**: 모든 페이지는 반드시 Header 컴포넌트를 포함해야 합니다.

```tsx
import Header from '@/components/navigation/Header'

export default function PageName() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-6 max-w-7xl mx-auto">
        {/* 페이지 콘텐츠 */}
      </div>
    </div>
  )
}
```

### 페이지 생성 체크리스트
- [ ] Header 컴포넌트 import
- [ ] min-h-screen bg-gray-50 컨테이너
- [ ] Header 컴포넌트 렌더링
- [ ] p-6 max-w-7xl mx-auto 콘텐츠 래퍼

## 🔍 스마트플레이스 순위 추적 로직 (최종 확정 - 2025년 1월)

### ⚠️ 매우 중요: 절대 변경 금지
**이 섹션의 스크래퍼 로직은 2025년 1월에 완벽하게 테스트되어 100% 정확도를 달성했습니다.**
**절대로 수정하지 마세요. 특히 이름 매칭 로직을 변경하면 안됩니다.**

### 검증된 구현: ImprovedNaverScraperV3 (최신)
**파일**: `lib/services/improved-scraper-v3.ts`
**정확도**: 100% (모든 테스트 케이스 통과)
**성능**: Queue 방식으로 동시 3개 키워드 처리, 평균 8.2초/키워드
**특징**: 
- 페이지네이션 지원 (최대 3페이지, 210개 결과)
- 상위 10개 업체 추적 (실제 순위 상위 10개)
- Null 값 정확한 기록

#### 1. 핵심 기술 사양
```typescript
// 기술 스택
- Playwright: 브라우저 자동화
- p-queue: 동시성 제어 (concurrency: 3)
- Singleton Pattern: BrowserManager로 리소스 관리

// 브라우저 설정 (절대 변경 금지)
{
  headless: false,  // 네이버 봇 감지 방지 필수
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1920,1080',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  ]
}
```

#### 2. 검색 및 로딩 방식
```typescript
// URL 형식
const searchUrl = `https://map.naver.com/p/search/${encodeURIComponent(keyword)}`

// iframe 탐지 (필수)
const frame = frames.find(f => f.url().includes('pcmap.place.naver.com'))

// 210개 결과 로딩 (모든 키워드 동일)
- 목표: 210개 (70개 × 3페이지)
- 스크롤 + "더보기" 버튼 클릭
- 최대 10회 시도
```

#### 3. 이름 매칭 로직 (절대 변경 금지)
```typescript
// ⚠️ 중요: 키워드 추출 금지, 오직 정확한 매칭만 허용
private extractKeywords(placeName: string): string[] {
  // 오직 전체 이름만 사용 (추출 없음)
  return [this.normalizeName(placeName)]
}

private normalizeName(name: string): string {
  return name
    .replace(/\s+/g, '')           // 모든 공백 제거
    .replace(/[^\p{L}\p{N}]/gu, '') // 문자와 숫자만 (유니코드)
    .toLowerCase()
}

// 정확한 매칭만 허용 (부분 매칭 금지)
const isMatch = resultNormalized === targetNormalized
```

#### 4. 광고 판별 (검증된 선택자)
```typescript
// 광고 판별 기준 (OR 조건)
1. CSS 선택자: div.iqAyT.JKKhR > a.gU6bV._DHlh
2. HTML에 '광고' 텍스트 포함
3. data-laim-exp-id 속성이 '*e'로 끝남
```

#### 5. 순위 계산 로직
```typescript
// 각각 별도 카운터 관리
let organicCount = 0  // 오가닉 순위
let adCount = 0       // 광고 순위

// 광고인 경우
if (isAd) {
  adCount++
  item.adRank = adCount
}
// 오가닉인 경우
else {
  organicCount++
  item.organicRank = organicCount  
}

// 한 업체가 광고와 오가닉 둘 다 나올 수 있음
// 첫 번째 매칭에서 멈추지 않고 계속 검색
```

#### 6. 검증된 테스트 결과 (2025년 1월)
**테스트 대상**: 미래엔영어수학 벌원학원 (Place ID: 1616011574)

| 키워드 | 기대값 | 실제 결과 | 상태 |
|--------|--------|-----------|------|
| 벌원학원 | Organic: 1 | Organic: 1 | ✅ PASS |
| 탄벌동 영어학원 | Ad: 1, Organic: 1 | Ad: 1, Organic: 1 | ✅ PASS |
| 벌원초 영어학원 | Organic: 1 | Organic: 1 | ✅ PASS |
| 탄벌중 영어학원 | Organic: 28 | Organic: 28 | ✅ PASS |
| 동탄 초등영어 | Not found | Not found | ✅ 정확 |
| 화성 영어학원 | Not found | Not found | ✅ 정확 |

**성공률**: 100% (모든 테스트 통과)
**평균 처리 시간**: 8.2초/키워드 (Queue 동시 처리)

### API 통합
```typescript
// app/api/smartplace-keywords/track-all/route.ts
import { ImprovedNaverScraperV3 } from '@/lib/services/improved-scraper-v3'

// 스크래퍼 초기화
const scraper = new ImprovedNaverScraperV3()

// Queue 방식으로 모든 키워드 동시 처리
const results = await scraper.trackMultipleKeywords(keywordData, {
  placeId: place.placeId,
  placeName: place.placeName  // 정확한 등록명 사용
})

// 상위 10개 업체 데이터 포함
// - 실제 순위 1-10위 업체만 포함
// - topTenPlaces 필드에 JSON으로 저장
```

### 테스트 스크립트
- `test-v2-scraper.ts`: Queue 처리 및 정확도 검증
- `test-final-v2.ts`: 전체 키워드 통합 테스트

### ⚠️ 절대 수정 금지 사항
1. **이름 매칭 로직** - 정확한 매칭만 허용, 키워드 추출 금지
2. **브라우저 설정** - headless: false 필수
3. **광고 선택자** - div.iqAyT.JKKhR > a.gU6bV._DHlh
4. **210개 로딩** - 모든 키워드 동일하게 적용
5. **Queue 동시성** - 3개 키워드 동시 처리

### 문제 발생 시
1. 절대 스크래퍼 로직을 수정하지 마세요
2. 네이버 UI가 변경된 경우만 선택자 업데이트
3. 테스트 스크립트로 먼저 검증 후 수정

## 📋 2024년 12월 27일 구현 완료 사항

### ✅ 완료된 작업
1. **목업 데이터 완전 제거**
   - `clean-database.js` - 모든 가짜 데이터 삭제 스크립트
   - `seed-academy-clean.js` - 순위 데이터 없이 계정과 키워드만 생성
   - 7일간 추세 데이터 생성 코드 제거

2. **날짜 기반 데이터 표시**
   - `app/api/smartplace-keywords/list/route.ts` - 오늘 날짜 데이터만 표시
   - 과거 데이터는 마지막 추적 날짜만 표시
   - lastUpdated 필드 정확히 업데이트

3. **추세 페이지 개선**
   - `app/smartplace/keywords/trend/[keywordId]/page.tsx` 완전 재작성
   - 막대 그래프 제거
   - 상위 10개 업체 순위 추이 꺾은선 그래프 구현
   - 최대 5개 업체 선택 기능
   - 내 업체 강조 표시 (🏆 아이콘)

4. **실제 네이버 스크래핑**
   - Mock 스크래퍼 비활성화 (USE_MOCK_SCRAPER=false)
   - `lib/services/real-naver-scraper.ts` 수정
   - iframe URL 'pcmap.place.naver.com' 지원 추가
   - 광고와 오가닉 각각 체크 로직 구현

5. **광고 순위 추적 개선**
   - 탄벌동 영어학원 광고 1위 정확히 추적
   - 한 업체가 광고와 오가닉 둘 다 나올 때 모두 추적

### 🔧 현재 작동 상태 (2025년 1월 업데이트)
- **로그인**: 정상 작동 ✅
- **전체 추적 실행**: 정상 작동 ✅
- **데이터 수집**: **완벽 작동** ✅ (광고 + 오가닉 모두)
- **추세 페이지**: 정상 작동 ✅
- **월간 데이터**: 정상 작동 ✅
- **헤더 유지**: 모든 페이지 정상 ✅
- **Queue 처리**: 동시 3개 키워드 처리 ✅
- **정확도**: 100% (모든 테스트 케이스 통과) ✅

### 📝 구현 체크리스트 (Context 초과 시)

#### 1. 환경 설정
```bash
# .env.local 설정
USE_MOCK_SCRAPER="false"  # 실제 스크래핑 사용
USE_REAL_CRAWLER="true"
```

#### 2. 데이터베이스 초기화
```bash
# 모든 목업 데이터 제거
node clean-database.js

# 학원 계정만 생성 (데이터 없이)
node seed-academy-clean.js
```

#### 3. 주요 파일 확인사항
- [x] `lib/services/improved-scraper-v2.ts` ✅ **최종 버전 사용**
  - Singleton BrowserManager로 리소스 관리
  - p-queue로 동시 3개 키워드 처리
  - 210개 결과 로딩 (스크롤 + 더보기)
  - 정확한 이름 매칭만 허용
  
- [x] `app/api/smartplace-keywords/track-all/route.ts`
  - ImprovedNaverScraperV2 사용
  - Queue 방식 키워드 처리
  - 오늘 날짜 데이터만 순위 표시
  
- [x] `app/smartplace/keywords/trend/[keywordId]/page.tsx`
  - 상위 10개 업체 추이 그래프
  - 체크박스로 5개까지 선택
  - 내 업체 🏆 표시

#### 4. 테스트 계정
```
Email: academy@marketingplat.com
Password: academy123
학원명: 미래엔영어수학 벌원학원
Place ID: 1616011574
```

#### 5. 테스트 스크립트
- `test-v2-scraper.ts` - **Queue 처리 및 정확도 검증 (100% 통과)**
- `test-final-v2.ts` - **전체 키워드 통합 테스트**
- `test-academy-account.js` - 기본 테스트
- `test-full-tracking.js` - 전체 추적 테스트

## 📂 프로덕션 코드 파일 맵 (2025년 1월 최종 버전)

### 🚀 핵심 기능별 사용 파일

#### 1. 스마트플레이스 순위 추적
- **메인 스크래퍼**: `lib/services/improved-scraper-v3.ts` ✅ (최종 버전, 100% 정확도)
- **추적 API**: `app/api/smartplace-keywords/track-all/route.ts`
- **목록 API**: `app/api/smartplace-keywords/list/route.ts`
- **키워드 관리 API**: 
  - `app/api/smartplace-keywords/[keywordId]/route.ts`
  - `app/api/smartplace-keywords/[keywordId]/toggle/route.ts`
  - `app/api/smartplace-keywords/register-place/route.ts`
- **추세 분석 API**: `app/api/smartplace-keywords/[keywordId]/trend/route.ts`
- **월간 데이터 API**: `app/api/smartplace-keywords/monthly-data/route.ts`
- **UI 페이지**:
  - `app/smartplace/keywords/page.tsx` - 메인 대시보드
  - `app/smartplace/keywords/trend/[keywordId]/page.tsx` - 추세 분석
  - `app/smartplace/keywords/monthly/page.tsx` - 월간 통계
- **유틸리티**: `lib/services/playwrightCrawler.ts` - 업체 상세정보 수집

#### 2. 블로그 순위 추적
- **메인 스크래퍼**: `lib/services/naver-blog-scraper-v2.ts` ✅ (최종 버전)
- **추적 API**: `app/api/blog-keywords/track-all/route.ts`
- **목록 API**: `app/api/blog-keywords/list/route.ts`
- **UI 페이지**: `app/blog/keywords/page.tsx`

#### 3. 인증 및 사용자 관리
- **인증 미들웨어**: `lib/auth-middleware.ts`
- **인증 API**:
  - `app/api/auth/login/route.ts`
  - `app/api/auth/me/route.ts`
- **사용자 API**: `app/api/user/route.ts`
- **설정 API**: `app/api/settings/route.ts`
- **UI 페이지**:
  - `app/login/page.tsx`
  - `app/mypage/page.tsx`

#### 4. 대시보드
- **관리자**: `app/dashboard/user/page.tsx`
- **학원**: `app/dashboard/academy/page.tsx`
- **요금제**: `app/dashboard/plan/page.tsx`

#### 5. 관리 기능
- **통합 관리**: `app/management/page.tsx`
- **키워드 관리**: `app/management/keywords/page.tsx`

#### 6. 유틸리티
- **시간대 처리**: `lib/utils/timezone.ts`
- **데이터베이스**: `lib/db.ts`

### 🗑️ 정리 대상 파일 (개발 완료 후 삭제)

#### 테스트 파일들
```
# 루트 디렉토리의 모든 test-*.ts, test-*.js 파일
test-*.ts
test-*.js
check-*.ts
check-*.js
clean-*.js
seed-*.js
create-*.ts
delete-*.ts
safe-*.ts
upgrade-*.ts

# 특정 파일 목록
- check-data.ts
- check-database.ts
- check-duplicates.ts
- clean-database.js
- clean-null-data.ts
- create-academy-user.ts
- create-test-user.ts
- delete-simulation-data.ts
- seed-academy-clean.js
- seed-academy-data.js
- seed-test-data.js
- test-academy-account.js
- test-ad-detection.ts
- test-blog-reviews.js
- test-bulwon-top10.ts
- test-direct-scraping.js
- test-final-ui.js
- test-final-v2.ts
- test-full-tracking.js
- test-improved-scraper.ts
- test-kst-data.ts
- test-mock-tracking.js
- test-naver-detailed.ts
- test-naver-search.ts
- test-pagination.ts
- test-playwright-scraping.js
- test-playwright-scraping.ts
- test-real-smartplace.ts
- test-real-tracking.ts
- test-scraper.ts
- test-smartplace-tracking.ts
- test-top10-collection.ts
- test-tracking-system.js
- test-ui-rendering.js
- test-v2-scraper.ts
- test-v3-pagination.ts
- upgrade-academy-plan.ts
```

#### 스크린샷 파일
```
*.png
test-*.png
```

#### 임시 파일
```
cookies.txt
nul
```

#### 사용하지 않는 스크래퍼 버전들
```
lib/services/improved-naver-scraper.ts  # V1 버전
lib/services/improved-scraper-v2.ts     # V2 버전 (V3가 최종)
lib/services/real-naver-scraper.ts      # 구버전
lib/services/stable-naver-scraper.ts    # 구버전
lib/services/working-naver-scraper.ts   # 구버전
lib/services/simple-smartplace-scraper.ts # 구버전
lib/services/naver-smartplace-scraper.ts  # 구버전
lib/services/mock-scraper.ts            # 목업용 (프로덕션에서 제거)
lib/services/test-blog-ranking.ts       # 테스트용
lib/services/naver-ranking-checker.ts   # 구버전
lib/services/naver-blog-scraper.ts      # V1 버전 (V2가 최종)
```

#### tests 폴더
```
tests/  # 전체 폴더 삭제
```

#### 문서 폴더 (필요시 보관)
```
docs/           # 개발 문서 (보관 또는 삭제)
References/     # 참고 문서 (보관 또는 삭제)
MODULE_EXPORTS/ # 모듈 추출 (보관 또는 삭제)
```

### 📌 중요 참고사항

1. **절대 수정 금지 파일**
   - `lib/services/improved-scraper-v3.ts` - 100% 정확도 달성, 수정 금지
   - `lib/services/naver-blog-scraper-v2.ts` - 안정적으로 작동 중

2. **환경 변수 확인**
   ```bash
   USE_MOCK_SCRAPER=false  # 프로덕션에서 필수
   USE_REAL_CRAWLER=true   # 프로덕션에서 필수
   ```

3. **테스트 계정 정보**
   ```
   Email: academy@marketingplat.com
   Password: academy123
   Place ID: 1616011574
   ```

4. **배포 전 체크리스트**
   - [ ] 모든 테스트 파일 삭제
   - [ ] 환경 변수 프로덕션 설정
   - [ ] 목업 스크래퍼 제거
   - [ ] 불필요한 console.log 제거
   - [ ] 빌드 테스트 완료

## 📊 네이버 광고 데이터 연동 (2025년 1월 확정)

### 광고 데이터 가져오기 로직
네이버 광고 데이터는 StatReport API를 통해 실시간으로 가져옵니다.

#### 1. API 구조
- **파일**: `lib/services/naver-ads-api.ts`
- **엔드포인트**: `/dashboard/ads`
- **API Route**: `app/api/ads/stats/route.ts`

#### 2. 데이터 구조
```typescript
interface NaverAdsStats {
  impCnt: number      // 노출수
  clkCnt: number      // 클릭수
  salesAmt: number    // 광고비 (비용)
  ctr: number         // 클릭률 (%)
  cpc: number         // 평균 클릭비용
  avgRnk: number      // 평균 순위
  ccnt?: number       // 전환수
}
```

#### 3. 통계 계산 로직
**합계 항목** (모든 캠페인의 값을 더함):
- 노출수 (impressions): 전체 캠페인 impCnt 합계
- 클릭수 (clicks): 전체 캠페인 clkCnt 합계
- 총비용 (cost): 전체 캠페인 salesAmt 합계
- 일일예산 (dailyBudget): 전체 캠페인 dailyBudget 합계

**계산된 평균 항목** (합계 기반 재계산):
- 클릭률 (CTR): (전체 클릭수 ÷ 전체 노출수) × 100
- 평균 클릭비용 (CPC): 총비용 ÷ 전체 클릭수

#### 4. 실제 작동 확인된 API 연동
```typescript
// StatReport API를 통한 실시간 데이터 조회
const stats = await api.getStatReports({
  reportTp: 'AD',
  dateRange: { since: dateFrom, until: dateTo }
});

// 캠페인별 상세 데이터 매핑
campaigns.forEach(campaign => {
  const statReport = statReports.find(report => 
    report.id === campaign.nccCampaignId
  );
  if (statReport) {
    campaign.stats = {
      impressions: statReport.impCnt,
      clicks: statReport.clkCnt,
      cost: statReport.salesAmt,
      ctr: statReport.ctr,
      cpc: statReport.cpc
    };
  }
});
```

#### 5. 통계 집계 구현
- **위치**: `/dashboard/ads` 페이지 하단
- **형식**: 별도의 "통계" 섹션으로 표시
- **업데이트**: 페이지 로드 시 자동 계산

### 중요 참고사항
- 네이버 광고 API는 실제 광고주 계정의 유효한 API 키가 필요
- 테스트 키나 목업 데이터 사용 금지
- StatReport API는 최대 31일간의 데이터만 조회 가능

## 📊 네이버 광고 키워드 데이터 솔루션 (2025년 9월 완성)

### TSV 리포트와 캠페인 데이터 차이점
네이버 광고 API는 두 가지 방식으로 데이터를 제공합니다:

#### 1. TSV 리포트 (AD Report 형식)
```typescript
// TSV 컬럼 구조 (실제 테스트로 확인)
// [0] Date (YYYYMMDD)
// [1] Customer ID
// [2] Campaign ID
// [3] Ad Group ID
// [4] Keyword ID ← 키워드별 데이터 추출 핵심
// [5] Ad ID
// [9] Average Rank (평균 순위)
// [10] Clicks (클릭수)
// [11] Cost (비용 - 원 단위)
// [12] Impressions (노출수)
```

#### 2. 캠페인 API 직접 조회
- `/campaigns` 엔드포인트는 캠페인 정보만 반환
- 통계 데이터는 별도로 Stats API나 StatReport API를 통해 조회 필요

### 키워드 통계 구현 방법
```typescript
// lib/services/naver-ads-api.ts
async getMultipleKeywordStats(
  keywordIds: string[],
  dateFrom?: string,
  dateTo?: string
): Promise<Record<string, NaverStatsResponse>>

// 1. 날짜별 리포트 생성
const reportResponse = await this.request('POST', '/stat-reports', {
  reportTp: 'AD',
  statDt: `${date}T00:00:00.000Z`
})

// 2. TSV 다운로드 및 파싱
const lines = downloadResponse.data.split('\n')
for (const line of lines) {
  const cells = line.split('\t')
  const keywordId = cells[4] // 키워드 ID는 컬럼 4
  const impressions = parseInt(cells[12])
  const clicks = parseInt(cells[10])
  const cost = parseFloat(cells[11])
}
```

### API 엔드포인트
- **GET /api/ads/keywords/stats**: 간단한 키워드 통계 조회
- **POST /api/ads/keywords/stats**: 상세한 키워드 통계와 요약 정보

### ✅ 데이터 교차 검증 완료 (2025년 9월)
2025년 8월 데이터를 대상으로 Stats API와 TSV 리포트 간 교차 검증 완료:

#### 검증 결과 요약
| 기간 | 날짜 범위 | 노출수 | 클릭수 | 비용(원) | 상태 |
|------|----------|--------|--------|----------|------|
| 1일 | 2025-08-01 | 3 | 0 | 0 | ✅ 일치 |
| 1주 | 2025-08-01 ~ 08-07 | 94 | 1 | 77 | ✅ 일치 |
| 2주 | 2025-08-01 ~ 08-14 | 174 | 2 | 220 | ✅ 일치 |
| 1달 | 2025-08-01 ~ 08-31 | 526 | 9 | 1518 | ✅ 일치 |

#### 검증 스크립트
- `test-simple-validation.ts`: 간단한 기간별 검증
- `test-august-validation.ts`: 8월 전체 데이터 검증
- `test-data-cross-validation.ts`: 포괄적 교차 검증
- `test-keyword-stats.ts`: 키워드 통계 API 테스트

### 데이터 검증 시 주의사항
1. **날짜 범위 제한**: StatReport API는 최대 31일
2. **리포트 생성 시간**: 비동기 처리로 2-3초 대기 필요
3. **키워드 ID 매칭**: TSV 컬럼 4번에서 정확히 추출
4. **비용 계산**: TSV의 비용 데이터는 이미 원 단위
5. **데이터 일관성**: Stats API와 TSV 리포트 데이터는 100% 일치함을 확인

## 📚 참고 문서

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [AWS Best Practices](https://aws.amazon.com/architecture/well-architected/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Naver Ads API Documentation](https://developers.searchad.naver.com)

---

**문서 작성일**: 2025년 1월
**마지막 업데이트**: 2025년 9월 5일 - Next.js 15 및 광고 관리 기능 완성
  - Next.js 15 동적 라우트 파라미터 처리 방법 추가 (Promise 기반)
  - Jest worker 컴파일 오류 해결 방법 문서화
  - Multiple package-lock.json 경고 해결
  - 네이버 광고 API 서명 생성 주의사항 추가
  - 광고그룹 상세 페이지 구현 (캠페인 타입별 탭 구성)
  - nokyang 사용자 우선 인증 로직 구현
**작성자**: Claude Code AI Assistant

이 가이드를 따라 MarketingPlat을 AWS에 배포 가능한 프로덕션 레벨 애플리케이션으로 개발하시기 바랍니다.