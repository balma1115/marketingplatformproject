# CLAUDE.md - MarketingPlat Next.js 프로젝트 가이드

This file provides comprehensive guidance to Claude Code for the MarketingPlat project with AWS deployment considerations.

## 🎯 프로젝트 개요

MarketingPlat은 AI 기반 학원 마케팅 플랫폼으로 Next.js 14 (App Router)를 사용하여 구축됩니다. AWS 배포를 전제로 설계되었습니다.

### 핵심 기능
- **AI 콘텐츠 생성**: Google Gemini API를 활용한 블로그 제목 및 콘텐츠 생성
- **이미지 생성**: Flux API를 통한 AI 이미지 생성
- **네이버 생태계 통합**: 스마트플레이스 순위 추적, 블로그 분석
- **키워드 관리**: 중점 키워드 및 블로그 키워드 관리
- **진단 도구**: 스마트플레이스, 블로그, 인스타그램 진단

## 🏗️ 기술 스택 (AWS 최적화)

### Frontend
```json
{
  "dependencies": {
    "next": "^14.2.0",
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

## 📚 참고 문서

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [AWS Best Practices](https://aws.amazon.com/architecture/well-architected/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**문서 작성일**: 2025년 1월
**마지막 업데이트**: AWS 배포 고려사항 추가
**작성자**: Claude Code AI Assistant

이 가이드를 따라 MarketingPlat을 AWS에 배포 가능한 프로덕션 레벨 애플리케이션으로 개발하시기 바랍니다.