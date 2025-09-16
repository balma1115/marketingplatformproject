# MarketingPlat AWS 배포 가이드

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [AWS 아키텍처](#aws-아키텍처)
3. [사전 준비 사항](#사전-준비-사항)
4. [환경 구성](#환경-구성)
5. [배포 절차](#배포-절차)
6. [롤백 절차](#롤백-절차)
7. [모니터링 및 유지보수](#모니터링-및-유지보수)

---

## 🎯 프로젝트 개요

### 기술 스택
- **Frontend/Backend**: Next.js 15.5.0 (App Router)
- **Database**: SQLite (개발) → PostgreSQL/MySQL (프로덕션 권장)
- **ORM**: Prisma 6.15.0
- **인증**: JWT 기반 자체 인증
- **크롤링**: Playwright
- **큐 시스템**: BullMQ + Redis

### 주요 기능
- 스마트플레이스 진단 및 순위 추적
- 블로그 순위 관리
- 네이버 광고 관리
- AI 기반 콘텐츠 생성 (Google Gemini)

---

## 🏗️ AWS 아키텍처

### 권장 아키텍처
```
┌─────────────────────────────────────────────────────────┐
│                     Route 53 (DNS)                       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 CloudFront (CDN)                         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│          Application Load Balancer (ALB)                 │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │   EC2/ECS    │        │   EC2/ECS    │
        │  (Next.js)   │        │  (Next.js)   │
        └──────────────┘        └──────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
        ┌─────────────────────────────────────┐
        │         RDS (PostgreSQL)            │
        │         ElastiCache (Redis)         │
        │         S3 (Static Assets)          │
        └─────────────────────────────────────┘
```

### 서비스 구성
- **컴퓨팅**: EC2 또는 ECS Fargate
- **데이터베이스**: RDS PostgreSQL
- **캐싱**: ElastiCache Redis
- **스토리지**: S3
- **CDN**: CloudFront
- **로드밸런싱**: Application Load Balancer

---

## ✅ 사전 준비 사항

### 1. AWS 계정 설정
```bash
# AWS CLI 설치 및 설정
aws configure
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, Region 설정
```

### 2. 필요한 도구 설치
```bash
# Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (프로세스 매니저)
npm install -g pm2

# Docker (선택사항)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 3. 도메인 및 SSL
- Route 53에서 도메인 설정
- ACM에서 SSL 인증서 발급

---

## 🔧 환경 구성

### 1. 환경 변수 설정

#### 개발 환경 (.env.development)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/marketingplat_dev"

# Authentication
JWT_SECRET="dev-jwt-secret-change-in-production"
JWT_EXPIRES_IN="7d"

# Next.js
NEXT_PUBLIC_API_URL="https://dev.marketingplat.com"

# AWS
AWS_REGION="ap-northeast-2"
AWS_ACCESS_KEY_ID="your-dev-access-key"
AWS_SECRET_ACCESS_KEY="your-dev-secret-key"
AWS_S3_BUCKET="marketingplat-dev"

# Redis
REDIS_URL="redis://localhost:6379"

# 외부 API Keys (암호화 필요)
GEMINI_API_KEY="your-gemini-api-key"
NAVER_CLIENT_ID="your-naver-client-id"
NAVER_CLIENT_SECRET="your-naver-client-secret"
NAVER_ADS_API_KEY="your-naver-ads-api-key"
NAVER_ADS_SECRET_KEY="your-naver-ads-secret"
NAVER_ADS_CUSTOMER_ID="your-customer-id"

# Environment
NODE_ENV="development"
```

#### 프로덕션 환경 (.env.production)
```env
# Database (RDS)
DATABASE_URL="postgresql://user:password@your-rds-endpoint:5432/marketingplat_prod"

# Authentication (강력한 시크릿 키 사용)
JWT_SECRET="production-jwt-secret-use-strong-random-string"
JWT_EXPIRES_IN="7d"

# Next.js
NEXT_PUBLIC_API_URL="https://api.marketingplat.com"

# AWS
AWS_REGION="ap-northeast-2"
AWS_ACCESS_KEY_ID="production-access-key"
AWS_SECRET_ACCESS_KEY="production-secret-key"
AWS_S3_BUCKET="marketingplat-prod"

# Redis (ElastiCache)
REDIS_URL="redis://your-elasticache-endpoint:6379"

# 외부 API Keys (AWS Secrets Manager 사용 권장)
GEMINI_API_KEY="${secrets:gemini-api-key}"
NAVER_CLIENT_ID="${secrets:naver-client-id}"
NAVER_CLIENT_SECRET="${secrets:naver-client-secret}"
NAVER_ADS_API_KEY="${secrets:naver-ads-api-key}"
NAVER_ADS_SECRET_KEY="${secrets:naver-ads-secret}"
NAVER_ADS_CUSTOMER_ID="${secrets:naver-customer-id}"

# Environment
NODE_ENV="production"

# 크롤러 설정
USE_REAL_CRAWLER="true"
USE_MOCK_SCRAPER="false"
```

### 2. 데이터베이스 마이그레이션

#### SQLite에서 PostgreSQL로 전환
```bash
# 1. PostgreSQL용 schema.prisma 수정
# datasource db {
#   provider = "postgresql"
#   url      = env("DATABASE_URL")
# }

# 2. 마이그레이션 실행
npx prisma migrate dev --name init
npx prisma generate

# 3. 기존 데이터 마이그레이션 (필요시)
npx prisma db seed
```

### 3. Next.js 프로덕션 설정

#### next.config.mjs 수정
```javascript
const nextConfig = {
  // 프로덕션 설정 추가
  output: 'standalone',

  // AWS 배포용 설정
  images: {
    domains: ['localhost', 'marketingplat.com', 's3.ap-northeast-2.amazonaws.com'],
  },

  // 환경별 설정
  env: {
    NEXT_PUBLIC_ENV: process.env.NODE_ENV,
  },

  // 기존 설정 유지
  serverExternalPackages: ['playwright', 'playwright-core', 'playwright-chromium'],
  // outputFileTracingRoot 제거 (프로덕션에서는 불필요)
}
```

---

## 🚀 배포 절차

### 1단계: EC2 인스턴스 설정

```bash
# EC2 인스턴스 생성 (Ubuntu 22.04 LTS, t3.large 이상 권장)
# 보안 그룹: 80, 443, 22, 3000 포트 오픈

# SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Git 설치
sudo apt install git -y

# Playwright 의존성 설치
sudo npx playwright install-deps
```

### 2단계: 애플리케이션 배포

```bash
# 코드 클론
git clone https://github.com/your-repo/marketingplatformproject.git
cd marketingplatformproject

# 의존성 설치
npm install

# Prisma 설정
npx prisma generate
npx prisma migrate deploy

# 빌드
npm run build

# PM2로 실행
pm2 start npm --name "marketingplat" -- start
pm2 save
pm2 startup
```

### 3단계: Nginx 리버스 프록시 설정

```bash
# Nginx 설치
sudo apt install nginx -y

# Nginx 설정
sudo nano /etc/nginx/sites-available/marketingplat
```

```nginx
server {
    listen 80;
    server_name marketingplat.com www.marketingplat.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 설정 활성화
sudo ln -s /etc/nginx/sites-available/marketingplat /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

### 4단계: SSL 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx -y

# SSL 인증서 발급
sudo certbot --nginx -d marketingplat.com -d www.marketingplat.com

# 자동 갱신 설정
sudo certbot renew --dry-run
```

### 5단계: CI/CD 파이프라인 (GitHub Actions)

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main, production]

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
      env:
        NODE_ENV: production

    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.EC2_HOST }}
        username: ubuntu
        key: ${{ secrets.EC2_SSH_KEY }}
        script: |
          cd /home/ubuntu/marketingplatformproject
          git pull origin main
          npm install --production
          npm run build
          pm2 restart marketingplat
```

---

## 🔄 롤백 절차

### 1. 빠른 롤백 (이전 버전으로 복구)

```bash
# 이전 커밋으로 롤백
git log --oneline -10  # 최근 10개 커밋 확인
git checkout <previous-commit-hash>

# 재빌드 및 재시작
npm install
npm run build
pm2 restart marketingplat
```

### 2. 데이터베이스 롤백

```bash
# Prisma 마이그레이션 롤백
npx prisma migrate resolve --rolled-back <migration-name>

# 백업에서 복구 (RDS 스냅샷 사용)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier marketingplat-restored \
  --db-snapshot-identifier marketingplat-backup-20240915
```

### 3. Blue-Green 배포 롤백

```bash
# ALB 타겟 그룹 전환
aws elbv2 modify-rule \
  --rule-arn <rule-arn> \
  --actions Type=forward,TargetGroupArn=<blue-target-group-arn>
```

---

## 📊 모니터링 및 유지보수

### 1. 헬스체크 엔드포인트

`app/api/health/route.ts`:
```typescript
export async function GET() {
  try {
    // DB 연결 확인
    await prisma.$queryRaw`SELECT 1`

    // Redis 연결 확인
    await redis.ping()

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    )
  }
}
```

### 2. CloudWatch 모니터링

```bash
# CloudWatch 에이전트 설치
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# 모니터링 메트릭
- CPU 사용률
- 메모리 사용률
- 디스크 사용률
- 네트워크 I/O
- 애플리케이션 로그
- 에러 발생률
```

### 3. 로그 관리

```bash
# PM2 로그 확인
pm2 logs marketingplat

# 로그 로테이션 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 4. 백업 전략

```bash
# RDS 자동 백업 설정
aws rds modify-db-instance \
  --db-instance-identifier marketingplat-prod \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"

# S3 버킷 버저닝 활성화
aws s3api put-bucket-versioning \
  --bucket marketingplat-prod \
  --versioning-configuration Status=Enabled
```

---

## 🔒 보안 체크리스트

### 배포 전 확인사항

- [ ] 모든 환경변수가 프로덕션용으로 설정되었는가?
- [ ] JWT_SECRET이 강력한 랜덤 문자열로 변경되었는가?
- [ ] 데이터베이스 비밀번호가 강력한가?
- [ ] API 키들이 AWS Secrets Manager에 저장되었는가?
- [ ] CORS 설정이 적절한가?
- [ ] Rate limiting이 설정되었는가?
- [ ] SQL Injection 방어가 되어있는가? (Prisma 사용으로 기본 방어)
- [ ] XSS 방어가 되어있는가?
- [ ] HTTPS가 강제되는가?
- [ ] 보안 헤더가 설정되었는가?

### 보안 헤더 설정

`middleware.ts`:
```typescript
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 보안 헤더 추가
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  )

  return response
}
```

---

## 🚨 트러블슈팅

### 일반적인 문제 해결

#### 1. Playwright 관련 오류
```bash
# Playwright 브라우저 재설치
npx playwright install chromium
sudo npx playwright install-deps
```

#### 2. 메모리 부족
```bash
# Node.js 메모리 제한 증가
export NODE_OPTIONS="--max-old-space-size=4096"

# PM2 설정
pm2 start npm --name "marketingplat" --node-args="--max-old-space-size=4096" -- start
```

#### 3. 포트 충돌
```bash
# 사용 중인 포트 확인
sudo lsof -i :3000
# 프로세스 종료
sudo kill -9 <PID>
```

---

## 📞 지원 및 연락처

- **긴급 이슈**: DevOps 팀 Slack 채널
- **일반 문의**: dev@marketingplat.com
- **모니터링 대시보드**: https://monitoring.marketingplat.com
- **문서**: https://docs.marketingplat.com

---

## 📝 버전 히스토리

- v1.0.0 (2024-09-15): 초기 배포 가이드 작성
- Next.js 15.5.0, Prisma 6.15.0 기준

---

**작성일**: 2024년 9월 15일
**작성자**: MarketingPlat DevOps Team