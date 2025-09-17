# 🚀 MarketingPlat AWS 완전 배포 가이드 (통합본)

## 📅 작성일: 2025년 1월 16일
## 🎯 목적: AWS 초기 배포부터 운영까지 완벽 가이드

---

# 📋 목차
1. [사전 준비 - 로컬 검증](#1-사전-준비---로컬-검증)
2. [AWS 인프라 구축](#2-aws-인프라-구축)
3. [애플리케이션 배포](#3-애플리케이션-배포)
4. [Lambda 함수 설정](#4-lambda-함수-설정)
5. [보안 및 모니터링](#5-보안-및-모니터링)
6. [문제 해결 가이드](#6-문제-해결-가이드)

---

# 1. 사전 준비 - 로컬 검증

## 🔍 로컬 문제 해결 (AWS 배포 전 필수)

### 1.1 코드 수정 사항

#### ❌ **문제 1: AWS SDK 누락**
```bash
# 로컬에서 즉시 설치
npm install @aws-sdk/client-sqs @aws-sdk/client-s3 @aws-sdk/client-lambda @aws-sdk/client-secrets-manager @aws-sdk/client-cloudwatch

# package.json 확인
npm list | grep aws-sdk
```

#### ❌ **문제 2: next.config.mjs 경로 하드코딩**
```javascript
// next.config.mjs 수정
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const nextConfig = {
  // 이 라인 삭제 또는 수정
  // outputFileTracingRoot: 'C:/Users/User/Documents/GitHub/marketingplatformproject',
  outputFileTracingRoot: process.cwd(), // 동적 경로로 변경

  serverExternalPackages: ['playwright', 'playwright-core', 'playwright-chromium'],

  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals.push('playwright', 'playwright-core', 'playwright-chromium')
    }

    if (dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        minimize: false,
        minimizer: [],
      }
      config.parallelism = 1
    }

    return config
  },

  poweredByHeader: false,
  compress: true,

  images: {
    domains: ['localhost', 'marketingplat.com'],
  },

  typescript: {
    ignoreBuildErrors: false, // 프로덕션에서는 타입 체크 활성화
  },
  eslint: {
    ignoreDuringBuilds: false, // 프로덕션에서는 린트 체크 활성화
  },
}

export default nextConfig
```

### 1.2 로컬 테스트 스크립트

#### **local-test.sh** (로컬 배포 시뮬레이션)
```bash
#!/bin/bash
# local-test.sh - AWS 배포 전 로컬 검증

echo "🔍 Starting local deployment test..."

# 1. 환경 변수 검증
echo "1️⃣ Checking environment variables..."
required_vars=("DATABASE_URL" "JWT_SECRET" "NEXT_PUBLIC_API_URL")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
    exit 1
  else
    echo "✅ Found: $var"
  fi
done

# 2. 타입 체크
echo "2️⃣ Running type check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found"
  exit 1
fi

# 3. 린트 체크
echo "3️⃣ Running lint check..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Lint errors found"
  exit 1
fi

# 4. 보안 체크
echo "4️⃣ Security check..."
# 하드코딩된 키 검사
if grep -r "AKIA\|AIza\|ya29\|GOCSPX" --exclude-dir=node_modules .; then
  echo "❌ Hardcoded credentials found!"
  exit 1
fi

# .env 파일 체크
if [ -f ".env.production" ]; then
  echo "⚠️ Warning: .env.production should not be committed"
fi

# 5. 프로덕션 빌드
echo "5️⃣ Building production..."
NODE_ENV=production npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# 6. 의존성 감사
echo "6️⃣ Running security audit..."
npm audit --audit-level=high
if [ $? -ne 0 ]; then
  echo "⚠️ Security vulnerabilities found"
fi

echo "✅ Local test completed successfully!"
```

### 1.3 환경 변수 템플릿

#### **.env.production.template**
```env
# ⚠️ 실제 배포 시 값 변경 필수!

# Database (RDS PostgreSQL)
DATABASE_URL="postgresql://marketingplat:CHANGE_ME@your-rds-endpoint.amazonaws.com:5432/marketingplat"

# Security - 반드시 변경!
JWT_SECRET="GENERATE_NEW_64_CHAR_RANDOM_STRING_HERE"
JWT_EXPIRES_IN="7d"

# Application URLs
NEXT_PUBLIC_API_URL="https://marketingplat.com"
NEXT_PUBLIC_BASE_URL="https://marketingplat.com"

# AWS Configuration
AWS_REGION="ap-northeast-2"
AWS_ACCESS_KEY_ID=""  # IAM Role 사용 시 비워둠
AWS_SECRET_ACCESS_KEY=""  # IAM Role 사용 시 비워둠
AWS_S3_BUCKET="marketingplat-assets"
SQS_QUEUE_URL="https://sqs.ap-northeast-2.amazonaws.com/YOUR_ACCOUNT_ID/ranking-tracking-queue"

# API Keys (Secrets Manager 사용 권장)
GEMINI_API_KEY="AIzaSyDKlt6UMB2ha4ZISbOYjxU-qR8EUBwME_0"
NAVER_CLIENT_ID="otHAAADUXSdFg1Ih7f_J"
NAVER_CLIENT_SECRET="eSbnPqUt_q"
NAVER_ADS_API_KEY="0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af"
NAVER_ADS_SECRET_KEY="AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A=="
NAVER_ADS_CUSTOMER_ID="1632045"
FLUX_API_KEY="d3cb7f68-c880-4248-9c7b-1dea7ec00394"

# Redis (선택)
REDIS_URL="redis://localhost:6379"

# Environment Settings
NODE_ENV="production"
APP_ENV="production"
NEXT_PUBLIC_APP_ENV="production"

# Feature Flags
USE_REAL_CRAWLER="true"
USE_MOCK_SCRAPER="false"
ENABLE_SCHEDULER="true"
AUTO_SCHEDULER="false"  # 처음에는 false로 시작
DEBUG_MODE="false"
SHOW_ERROR_DETAILS="false"

# Tracking Settings
USE_LAMBDA_TRACKING="false"  # EC2만 사용 시 false
TRACKING_MODE="local"  # EC2만 사용 시 local
```

---

# 2. AWS 인프라 구축

## 2.1 AWS 계정 설정 (30분)

### IAM 사용자 생성
```bash
# AWS CLI 설치
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 자격 증명 설정
aws configure
# AWS Access Key ID: YOUR_KEY
# AWS Secret Access Key: YOUR_SECRET
# Default region: ap-northeast-2
# Default output format: json
```

## 2.2 RDS PostgreSQL 생성 (30분)

### AWS CLI로 RDS 생성
```bash
# 보안 그룹 생성 (RDS용)
aws ec2 create-security-group \
  --group-name marketingplat-rds-sg \
  --description "Security group for MarketingPlat RDS"

# RDS 서브넷 그룹 생성
aws rds create-db-subnet-group \
  --db-subnet-group-name marketingplat-subnet-group \
  --db-subnet-group-description "Subnet group for MarketingPlat" \
  --subnet-ids subnet-xxx subnet-yyy

# RDS 인스턴스 생성
aws rds create-db-instance \
  --db-instance-identifier marketingplat-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username marketingplat \
  --master-user-password "GENERATE_SECURE_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-subnet-group-name marketingplat-subnet-group \
  --vpc-security-group-ids sg-xxx \
  --backup-retention-period 7 \
  --preferred-backup-window "17:00-18:00" \
  --preferred-maintenance-window "sun:18:00-sun:19:00" \
  --no-publicly-accessible \
  --storage-encrypted
```

## 2.3 EC2 인스턴스 생성 및 설정 (1시간)

### EC2 초기 설정 스크립트
```bash
#!/bin/bash
# ec2-initial-setup.sh

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 스왑 메모리 설정 (t2.micro용)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 필수 도구 설치
sudo apt install -y git nginx certbot python3-certbot-nginx redis-server postgresql-client

# PM2 설치
sudo npm install -g pm2

# Playwright 의존성 설치
sudo apt-get install -y \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libxss1 \
  libasound2 libwayland-client0

# 디렉토리 생성
mkdir -p /home/ubuntu/marketingplatform
mkdir -p /home/ubuntu/logs
mkdir -p /home/ubuntu/backups

# 권한 설정
sudo chown -R ubuntu:ubuntu /home/ubuntu

echo "✅ EC2 초기 설정 완료!"
```

## 2.4 기타 AWS 서비스 설정

### S3 버킷 생성
```bash
# S3 버킷 생성
aws s3api create-bucket \
  --bucket marketingplat-assets \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

# 버킷 정책 설정
aws s3api put-bucket-policy \
  --bucket marketingplat-assets \
  --policy file://s3-bucket-policy.json
```

### SQS 큐 생성 (Lambda 사용 시)
```bash
# SQS 큐 생성
aws sqs create-queue \
  --queue-name ranking-tracking-queue \
  --attributes VisibilityTimeout=300,MessageRetentionPeriod=1209600

# Dead Letter Queue 생성
aws sqs create-queue \
  --queue-name ranking-tracking-dlq
```

---

# 3. 애플리케이션 배포

## 3.1 코드 배포 및 설정

### 배포 스크립트
```bash
#!/bin/bash
# deploy-app.sh

echo "🚀 Starting application deployment..."

# 1. 코드 가져오기
cd /home/ubuntu
git clone https://github.com/your-repo/marketingplatformproject.git
cd marketingplatformproject

# 2. 환경 변수 설정
cat > .env.production << 'EOF'
# 실제 값으로 변경 필요
DATABASE_URL="postgresql://marketingplat:password@rds-endpoint:5432/marketingplat"
JWT_SECRET="$(openssl rand -base64 64 | tr -d '\n')"
# ... 나머지 환경 변수
EOF

# 3. 의존성 설치
npm ci --production=false  # devDependencies도 설치 (빌드용)

# 4. Playwright 브라우저 설치
npx playwright install chromium
sudo npx playwright install-deps

# 5. Prisma 설정
npx prisma generate
npx prisma migrate deploy

# 6. 프로덕션 빌드
npm run build

# 7. PM2 설정 및 시작
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "✅ Application deployed successfully!"
```

### PM2 설정 파일
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'marketingplat',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/logs/error.log',
    out_file: '/home/ubuntu/logs/out.log',
    log_file: '/home/ubuntu/logs/combined.log',
    time: true,
    merge_logs: true,
    max_restarts: 10,
    min_uptime: 10000,
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
}
```

## 3.2 Nginx 설정

### Nginx 설정 파일
```nginx
# /etc/nginx/sites-available/marketingplat

# Rate limiting
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    listen 80;
    server_name marketingplat.com www.marketingplat.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name marketingplat.com www.marketingplat.com;

    # SSL 설정 (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/marketingplat.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/marketingplat.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 파일 업로드 크기
    client_max_body_size 10M;

    # DDoS 방어
    limit_conn addr 10;

    # 로그인 엔드포인트 Rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        include proxy_params;
    }

    # API Rate limiting
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://localhost:3000;
        include proxy_params;

        # SSE 지원
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 메인 애플리케이션
    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://localhost:3000;
        include proxy_params;
    }

    # 정적 파일 캐싱
    location /_next/static {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### proxy_params 파일
```nginx
# /etc/nginx/proxy_params
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_set_header Host $host;
proxy_cache_bypass $http_upgrade;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_connect_timeout 300;
proxy_send_timeout 300;
proxy_read_timeout 300;
```

---

# 4. Lambda 함수 설정 (선택사항)

## 4.1 Lambda Layer 생성

### Chromium Layer
```bash
mkdir -p lambda-layers/chromium/nodejs
cd lambda-layers/chromium

# package.json 생성
cat > package.json << 'EOF'
{
  "name": "chromium-layer",
  "version": "1.0.0",
  "dependencies": {
    "@sparticuz/chromium": "^119.0.2",
    "puppeteer-core": "^21.5.2"
  }
}
EOF

npm install
zip -r chromium-layer.zip nodejs

# AWS Lambda Layer 업로드
aws lambda publish-layer-version \
  --layer-name chromium-layer \
  --zip-file fileb://chromium-layer.zip \
  --compatible-runtimes nodejs18.x nodejs20.x
```

## 4.2 Lambda 함수 코드

### smartplace-tracker 함수
```typescript
// lambda/smartplace-tracker/index.ts
import { Handler, SQSEvent } from 'aws-lambda';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({ region: 'ap-northeast-2' });
let prisma: PrismaClient;

async function initPrisma() {
  if (!prisma) {
    const command = new GetSecretValueCommand({
      SecretId: 'marketingplat/database-url'
    });
    const response = await secretsClient.send(command);
    const DATABASE_URL = response.SecretString || '';

    prisma = new PrismaClient({
      datasources: {
        db: { url: DATABASE_URL }
      }
    });
  }
  return prisma;
}

export const handler: Handler = async (event: SQSEvent) => {
  const db = await initPrisma();

  const results = await Promise.all(
    event.Records.map(async (record) => {
      const message = JSON.parse(record.body);
      const { keywordId, keyword, userId } = message;

      let browser = null;
      try {
        browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.goto(
          `https://map.naver.com/v5/search/${encodeURIComponent(keyword)}`,
          { waitUntil: 'networkidle2', timeout: 30000 }
        );

        await page.waitForSelector('div.CHC5F', { timeout: 10000 });

        const rankings = await page.evaluate(() => {
          const results: any[] = [];
          const items = document.querySelectorAll('div.CHC5F');

          items.forEach((item, index) => {
            const nameEl = item.querySelector('span.YwYLL');
            const isAd = !!item.querySelector('div.iqAyT.JKKhR > a.gU6bV._DHlh');

            if (nameEl) {
              results.push({
                rank: index + 1,
                name: nameEl.textContent?.trim(),
                isAd
              });
            }
          });

          return results;
        });

        // 결과 저장
        await db.smartPlaceRanking.create({
          data: {
            keywordId,
            checkDate: new Date(),
            organicRank: rankings.find(r => !r.isAd)?.rank || null,
            adRank: rankings.find(r => r.isAd)?.rank || null,
            topTenPlaces: JSON.stringify(rankings.slice(0, 10))
          }
        });

        console.log(`Successfully tracked keyword: ${keyword}`);
        return { success: true, keywordId };

      } catch (error) {
        console.error(`Error tracking keyword ${keyword}:`, error);
        throw error;
      } finally {
        if (browser) await browser.close();
      }
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ results })
  };
};
```

## 4.3 Lambda 배포

### 배포 스크립트
```bash
#!/bin/bash
# deploy-lambda.sh

FUNCTION_NAME="marketingplat-smartplace-tracker"

# 1. 코드 빌드
cd lambda/smartplace-tracker
npm install
npm run build

# 2. 패키징
zip -r function.zip dist node_modules \
  -x "*.ts" \
  -x "*.map" \
  -x "node_modules/aws-sdk/*"

# 3. Lambda 함수 생성 또는 업데이트
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime nodejs20.x \
  --role arn:aws:iam::ACCOUNT:role/marketingplat-lambda-role \
  --handler dist/index.handler \
  --zip-file fileb://function.zip \
  --timeout 120 \
  --memory-size 1024 \
  --layers \
    arn:aws:lambda:ap-northeast-2:ACCOUNT:layer:chromium-layer:1 \
  --environment Variables="{NODE_ENV=production}" \
  || aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip

# 4. SQS 트리거 추가
aws lambda create-event-source-mapping \
  --function-name $FUNCTION_NAME \
  --event-source-arn arn:aws:sqs:ap-northeast-2:ACCOUNT:ranking-tracking-queue \
  --batch-size 1 \
  --maximum-batching-window-in-seconds 0

echo "✅ Lambda function deployed!"
```

---

# 5. 보안 및 모니터링

## 5.1 AWS Secrets Manager 설정

### 시크릿 생성
```bash
#!/bin/bash
# setup-secrets.sh

# JWT Secret 생성
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
aws secretsmanager create-secret \
  --name marketingplat/jwt-secret \
  --secret-string "$JWT_SECRET"

# Database URL 생성
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
aws secretsmanager create-secret \
  --name marketingplat/database-url \
  --secret-string "postgresql://marketingplat:$DB_PASSWORD@your-rds-endpoint:5432/marketingplat"

# API Keys 저장
aws secretsmanager create-secret \
  --name marketingplat/api-keys \
  --secret-string '{
    "GEMINI_API_KEY": "your-key",
    "NAVER_CLIENT_ID": "your-id",
    "NAVER_CLIENT_SECRET": "your-secret"
  }'

echo "✅ Secrets created successfully!"
```

## 5.2 CloudWatch 모니터링

### 알람 설정
```bash
# CPU 사용률 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "marketingplat-cpu-high" \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-xxx

# RDS 연결 수 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "marketingplat-db-connections" \
  --alarm-description "Alert when DB connections exceed 40" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 40 \
  --comparison-operator GreaterThanThreshold
```

## 5.3 백업 설정

### 자동 백업 스크립트
```bash
#!/bin/bash
# backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"

# 1. 데이터베이스 백업
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/db-$TIMESTAMP.sql.gz

# 2. 애플리케이션 백업
tar -czf $BACKUP_DIR/app-$TIMESTAMP.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.env* \
  /home/ubuntu/marketingplatformproject

# 3. S3 업로드
aws s3 cp $BACKUP_DIR/db-$TIMESTAMP.sql.gz s3://marketingplat-backups/db/
aws s3 cp $BACKUP_DIR/app-$TIMESTAMP.tar.gz s3://marketingplat-backups/app/

# 4. 오래된 백업 삭제 (7일 이상)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "✅ Backup completed!"
```

---

# 6. 문제 해결 가이드

## 6.1 일반적인 문제와 해결법

### 문제 1: Next.js 빌드 실패
```bash
# 해결법
rm -rf .next node_modules package-lock.json
npm install
npm run build

# 메모리 부족 시
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
```

### 문제 2: Prisma 연결 실패
```bash
# 연결 테스트
npx prisma db pull

# 연결 문자열 확인
echo $DATABASE_URL

# 보안 그룹 확인
aws ec2 describe-security-groups --group-ids sg-xxx
```

### 문제 3: PM2 프로세스 충돌
```bash
# PM2 재시작
pm2 kill
pm2 start ecosystem.config.js --env production

# 로그 확인
pm2 logs --lines 100
```

### 문제 4: Playwright 실행 오류
```bash
# 의존성 재설치
sudo apt-get update
sudo npx playwright install-deps
npx playwright install chromium

# 권한 확인
ls -la /home/ubuntu/.cache/ms-playwright/
```

## 6.2 성능 최적화

### 데이터베이스 최적화
```sql
-- 인덱스 생성
CREATE INDEX idx_smartplace_keywords_active ON "SmartPlaceKeyword"("isActive", "userId");
CREATE INDEX idx_smartplace_ranking_date ON "SmartPlaceRanking"("checkDate" DESC);
CREATE INDEX idx_blog_tracking_date ON "BlogTrackingResult"("trackingDate" DESC);

-- 연결 풀 설정
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
```

### Next.js 최적화
```javascript
// next.config.mjs 추가 설정
const nextConfig = {
  // ... 기존 설정
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}
```

## 6.3 모니터링 명령어

### 시스템 상태 확인
```bash
# EC2 상태
top -b -n 1
df -h
free -m

# PM2 상태
pm2 status
pm2 monit

# Nginx 상태
sudo systemctl status nginx
sudo nginx -t

# 데이터베이스 연결
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 로그 확인
tail -f /home/ubuntu/logs/error.log
tail -f /var/log/nginx/error.log
```

---

# 📋 최종 체크리스트

## 배포 전 확인사항
- [ ] AWS SDK 패키지 설치 완료
- [ ] next.config.mjs 경로 수정 완료
- [ ] 환경 변수 파일 준비 완료
- [ ] 로컬 테스트 통과
- [ ] 타입 체크 통과
- [ ] 보안 검사 통과

## AWS 인프라
- [ ] RDS PostgreSQL 생성 완료
- [ ] EC2 인스턴스 생성 완료
- [ ] 보안 그룹 설정 완료
- [ ] S3 버킷 생성 완료 (선택)
- [ ] SQS 큐 생성 완료 (선택)

## 애플리케이션 배포
- [ ] 코드 배포 완료
- [ ] 의존성 설치 완료
- [ ] Prisma 마이그레이션 완료
- [ ] 프로덕션 빌드 성공
- [ ] PM2 시작 완료
- [ ] Nginx 설정 완료

## 보안 설정
- [ ] SSL 인증서 설치
- [ ] Secrets Manager 설정 (선택)
- [ ] IAM 권한 최소화
- [ ] 보안 헤더 적용
- [ ] Rate limiting 설정

## 모니터링
- [ ] CloudWatch 알람 설정
- [ ] 로그 로테이션 설정
- [ ] 백업 자동화 설정
- [ ] 헬스 체크 API 동작 확인

---

## 🚀 Quick Start (최소 설정)

```bash
# EC2에서 실행
wget https://raw.githubusercontent.com/your-repo/marketingplatform/main/scripts/quick-deploy.sh
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### quick-deploy.sh
```bash
#!/bin/bash
# quick-deploy.sh - 빠른 배포 스크립트

echo "🚀 MarketingPlat Quick Deploy Starting..."

# 기본 설정
REPO_URL="https://github.com/your-repo/marketingplatformproject.git"
APP_DIR="/home/ubuntu/marketingplatformproject"

# 1. 시스템 준비
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx postgresql-client
sudo npm install -g pm2

# 2. 코드 배포
git clone $REPO_URL $APP_DIR
cd $APP_DIR

# 3. 환경 변수 설정 (수동 입력 필요)
echo "Please edit .env.production file:"
cp .env.production.template .env.production
nano .env.production

# 4. 설치 및 빌드
npm install
npx playwright install chromium
sudo npx playwright install-deps
npx prisma generate
npx prisma migrate deploy
npm run build

# 5. PM2 시작
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 6. Nginx 설정
sudo cp nginx.conf /etc/nginx/sites-available/marketingplat
sudo ln -s /etc/nginx/sites-available/marketingplat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

echo "✅ Deployment completed!"
echo "🔗 Visit http://$(curl -s ifconfig.me):3000"
```

---

## 💰 예상 비용

### 최소 구성 (프리티어)
- EC2 t2.micro: $0 (프리티어)
- RDS db.t3.micro: $0 (프리티어)
- S3: $0 (5GB까지)
- **월 총액: $0-5**

### 표준 구성 (프리티어 종료 후)
- EC2 t3.small: $15
- RDS db.t3.micro: $13
- S3 + CloudFront: $5
- Lambda (선택): $5
- **월 총액: $30-40**

---

**작성일**: 2025년 1월 16일
**프로젝트**: MarketingPlat
**버전**: 1.0.0 (통합본)

## 📞 지원
- 문제 발생 시 AWS 로그 확인
- CloudWatch 메트릭 모니터링
- PM2 logs로 애플리케이션 로그 확인