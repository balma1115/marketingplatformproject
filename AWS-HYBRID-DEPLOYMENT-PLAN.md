# 🚀 MarketingPlat AWS 하이브리드 배포 계획서
> EC2 + Lambda 동시 배포를 통한 고성능 아키텍처 구축

## 📅 배포 일정
- **작성일**: 2025년 1월 16일
- **목표 완료일**: D+3일
- **예상 소요시간**: 총 8-10시간

---

## 🏗️ 최종 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Route 53 (DNS)                        │
│                 marketingplat.com                        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                CloudFront (CDN) - 무료                   │
│              정적 자산 캐싱 + 전역 배포                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│            EC2 t2.micro (프리티어 - 무료)                 │
│          - Next.js 15 애플리케이션                        │
│          - 사용자 인터페이스                              │
│          - API 엔드포인트                                │
│          - 인증/세션 관리                                │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
    ┌─────────────────┐       ┌─────────────────┐
    │   SQS Queue     │       │  EventBridge    │
    │  (무료 1M/월)   │       │   (스케줄러)     │
    └─────────────────┘       └─────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
        ┌──────────────────────────────────────┐
        │         Lambda Functions              │
        │        (무료 1M 요청/월)              │
        ├────────────────────────────────────────┤
        │ • smartplace-tracker (순위 추적)      │
        │ • blog-tracker (블로그 추적)          │
        │ • scheduled-trigger (일일 실행)       │
        └────────────────────────────────────────┘
                            │
                            ▼
    ┌─────────────────────────────────────────────┐
    │      RDS PostgreSQL db.t3.micro              │
    │         (프리티어 - 무료)                     │
    │      - 20GB 스토리지                         │
    │      - 자동 백업                             │
    └─────────────────────────────────────────────┘
```

---

## 📋 Day 1: 인프라 구축 (4-5시간)

### 1️⃣ AWS 계정 및 IAM 설정 (30분)
```bash
# IAM 사용자 생성 및 정책 할당
- AdministratorAccess (초기 설정용)
- 나중에 최소 권한으로 변경
```

### 2️⃣ RDS PostgreSQL 생성 (30분)
```sql
-- RDS 설정
- Engine: PostgreSQL 15.x
- Instance: db.t3.micro (프리티어)
- Storage: 20GB SSD
- Multi-AZ: No (비용 절감)
- Backup: 1 day retention
- Security Group: 5432 포트 오픈 (EC2에서만)
```

### 3️⃣ EC2 인스턴스 생성 (30분)
```yaml
Instance Configuration:
  Type: t2.micro
  OS: Ubuntu 22.04 LTS
  Storage: 30GB gp3
  Security Group:
    - SSH (22): Your IP only
    - HTTP (80): 0.0.0.0/0
    - HTTPS (443): 0.0.0.0/0
    - App (3000): 0.0.0.0/0 (임시)
```

### 4️⃣ EC2 초기 환경 설정 (1시간)
```bash
#!/bin/bash
# ec2-setup.sh

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 20.x 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 필수 도구 설치
sudo apt install -y git nginx certbot python3-certbot-nginx

# PM2 설치 (프로세스 매니저)
sudo npm install -g pm2

# Playwright 의존성 설치
sudo npx playwright install-deps chromium

# Redis 설치 (선택사항)
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

### 5️⃣ S3 버킷 생성 (15분)
```yaml
Bucket Configuration:
  Name: marketingplat-assets
  Region: ap-northeast-2
  Versioning: Enabled
  Public Access: Block all (CloudFront only)
  Lifecycle:
    - Transition to IA after 30 days
    - Delete old versions after 90 days
```

### 6️⃣ SQS 큐 생성 (15분)
```yaml
Queue Configuration:
  - ranking-tracking-queue
    VisibilityTimeout: 300 seconds
    MessageRetention: 14 days
    DeadLetterQueue:
      MaxReceiveCount: 3
```

### 7️⃣ Lambda 레이어 준비 (1시간)
```bash
# Lambda Layer 생성 스크립트
mkdir -p lambda-layers/nodejs
cd lambda-layers

# Chromium Layer
npm install @sparticuz/chromium puppeteer-core
zip -r chromium-layer.zip nodejs

# Prisma Layer
npm install @prisma/client
npx prisma generate
zip -r prisma-layer.zip nodejs

# AWS CLI로 레이어 업로드
aws lambda publish-layer-version \
  --layer-name chromium-layer \
  --zip-file fileb://chromium-layer.zip \
  --compatible-runtimes nodejs18.x nodejs20.x

aws lambda publish-layer-version \
  --layer-name prisma-layer \
  --zip-file fileb://prisma-layer.zip \
  --compatible-runtimes nodejs18.x nodejs20.x
```

---

## 📋 Day 2: 애플리케이션 배포 및 보안 설정 (4-5시간)

### 🔒 보안 사전 준비 (필수! - 30분)

#### 강력한 자격 증명 생성
```bash
# 1. JWT Secret 생성 (64자 이상)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_SECRET: $JWT_SECRET"

# 2. DB 비밀번호 생성 (32자 이상)
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
echo "DB_PASSWORD: $DB_PASSWORD"

# 3. 생성된 값 안전한 곳에 저장
cat > ~/secure-credentials.txt << EOF
JWT_SECRET=$JWT_SECRET
DB_PASSWORD=$DB_PASSWORD
Created: $(date)
EOF

# 4. 파일 권한 설정
chmod 600 ~/secure-credentials.txt
```

#### AWS Secrets Manager 설정
```bash
# scripts/setup-aws-secrets.sh 실행
bash scripts/setup-aws-secrets.sh

# 또는 수동으로 시크릿 생성
aws secretsmanager create-secret \
  --name marketingplat/jwt-secret \
  --secret-string "$JWT_SECRET" \
  --region ap-northeast-2

aws secretsmanager create-secret \
  --name marketingplat/database-url \
  --secret-string "postgresql://marketingplat:$DB_PASSWORD@your-rds-endpoint:5432/marketingplat" \
  --region ap-northeast-2
```

### 1️⃣ 데이터베이스 마이그레이션 (30분)

#### RDS 보안 설정
```bash
# RDS 생성 시 필수 설정
# - Master username: marketingplat
# - Master password: 위에서 생성한 $DB_PASSWORD 사용
# - Public accessibility: No
# - Security group: EC2에서만 5432 포트 접근 허용
```

#### 마이그레이션 실행
```bash
# 로컬에서 PostgreSQL 스키마 준비
# schema.prisma는 이미 PostgreSQL로 설정됨

# 안전한 DATABASE_URL 설정 (EC2에서)
export DATABASE_URL="postgresql://marketingplat:$(aws secretsmanager get-secret-value \
  --secret-id marketingplat/db-password \
  --query SecretString \
  --output text)@your-rds-endpoint:5432/marketingplat"

# 마이그레이션 실행
npx prisma migrate deploy

# 초기 데이터 시딩 (테스트 계정 생성)
npx prisma db seed
```

### 2️⃣ 환경변수 파일 준비 (보안 강화 - 45분)

#### .env.production 생성 (템플릿)
```bash
# .env.production.example을 복사하여 사용
cp .env.production.example .env.production

# 실제 값으로 수정 (절대 Git에 커밋하지 마세요!)
nano .env.production
```

#### 보안 환경변수 설정
```bash
# .env.production (EC2에서만 생성)
NODE_ENV=production

# Secrets Manager에서 가져올 값들 (하드코딩 금지!)
DATABASE_URL="${AWS_SECRET:marketingplat/database-url}"
JWT_SECRET="${AWS_SECRET:marketingplat/jwt-secret}"

# AWS 설정 (IAM Role 사용 권장)
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=marketingplat-assets
SQS_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/YOUR_ACCOUNT/ranking-tracking-queue

# API Keys - Secrets Manager에 저장
GEMINI_API_KEY="${AWS_SECRET:marketingplat/gemini-api-key}"
NAVER_CLIENT_ID="${AWS_SECRET:marketingplat/naver-client-id}"
NAVER_CLIENT_SECRET="${AWS_SECRET:marketingplat/naver-client-secret}"
NAVER_ADS_API_KEY="${AWS_SECRET:marketingplat/naver-ads-api-key}"
NAVER_ADS_SECRET_KEY="${AWS_SECRET:marketingplat/naver-ads-secret-key}"
NAVER_ADS_CUSTOMER_ID="${AWS_SECRET:marketingplat/naver-ads-customer-id}"

# Redis (로컬 또는 ElastiCache)
REDIS_URL=redis://localhost:6379

# 보안 설정
RATE_LIMIT_ENABLED=true
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_DURATION=900000  # 15분

# 크롤러 설정
USE_REAL_CRAWLER=true
USE_MOCK_SCRAPER=false
ENABLE_SCHEDULER=true

# 로깅 설정 (프로덕션에서는 최소화)
LOG_LEVEL=error
DEBUG_MODE=false
SHOW_ERROR_DETAILS=false
```

#### EC2에서 Secrets Manager 값 로드
```bash
# EC2 시작 스크립트에 추가
cat > ~/load-secrets.sh << 'EOF'
#!/bin/bash

# JWT Secret 로드
export JWT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id marketingplat/jwt-secret \
  --query SecretString \
  --output text \
  --region ap-northeast-2)

# Database URL 로드
export DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id marketingplat/database-url \
  --query SecretString \
  --output text \
  --region ap-northeast-2)

# API Keys 로드
export GEMINI_API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id marketingplat/gemini-api-key \
  --query SecretString \
  --output text \
  --region ap-northeast-2 2>/dev/null || echo "")

echo "Secrets loaded successfully"
EOF

chmod +x ~/load-secrets.sh
source ~/load-secrets.sh
```

### 3️⃣ 보안 미들웨어 및 설정 적용 (30분)

#### 보안 파일 확인
```bash
# middleware.ts가 생성되었는지 확인
ls -la middleware.ts

# rate-limiter가 생성되었는지 확인
ls -la lib/rate-limiter.ts

# 로그인 API 보안 확인
grep -n "isDevelopment" app/api/auth/login/route.ts
```

#### Git에서 민감한 정보 제거
```bash
# Git 히스토리에서 .env 파일 제거
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env* SECURE-CREDENTIALS.md" \
  --prune-empty --tag-name-filter cat -- --all

# .gitignore 확인
cat .gitignore | grep -E "env|credentials|secrets"
```

### 4️⃣ Next.js 프로덕션 빌드 (보안 강화 - 30분)
```bash
# EC2에서 실행
git clone https://github.com/your-repo/marketingplatformproject.git
cd marketingplatformproject

# 보안 브랜치 체크아웃 (보안 수정사항이 있는 경우)
git checkout production

# Secrets 로드
source ~/load-secrets.sh

# 환경변수 설정 (하드코딩된 값 사용 금지!)
cp .env.production.example .env.local
# 실제 값은 환경변수로 주입

# 의존성 설치 및 빌드
npm ci --production
npm run build

# 빌드 성공 확인
if [ $? -eq 0 ]; then
  echo "Build successful"
else
  echo "Build failed - check security settings"
  exit 1
fi
```

### 5️⃣ PM2 설정 (보안 강화 - 15분)
```javascript
// ecosystem.config.js (업데이트된 버전)
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

    // 환경변수 (Secrets Manager에서 로드)
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // Secrets는 load-secrets.sh로 로드
    },

    // 로그 설정
    error_file: '/home/ubuntu/logs/marketingplat-err.log',
    out_file: '/home/ubuntu/logs/marketingplat-out.log',
    log_file: '/home/ubuntu/logs/marketingplat-combined.log',
    time: true,

    // 보안 설정
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 5000,

    // 에러 처리
    max_restarts: 10,
    min_uptime: 10000,
  }]
}
```

#### PM2 시작 (보안 환경변수 포함)
```bash
# Secrets 로드 후 PM2 시작
source ~/load-secrets.sh
pm2 start ecosystem.config.js --env production

# PM2 시작 스크립트 등록
pm2 save
pm2 startup

# 로그 확인
pm2 logs marketingplat --lines 50
```

### 6️⃣ Lambda 함수 배포 (보안 강화 - 1시간)

#### Lambda 보안 설정
```bash
# Lambda 함수 IAM 역할 생성
aws iam create-role --role-name marketingplat-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# 필요한 권한 정책 연결
aws iam attach-role-policy --role-name marketingplat-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole

# Secrets Manager 접근 권한 추가
aws iam put-role-policy --role-name marketingplat-lambda-role \
  --policy-name SecretsManagerAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:ap-northeast-2:*:secret:marketingplat/*"
    }]
  }'
```

#### Lambda 함수 코드 (보안 강화)
```typescript
// lambda/smartplace-tracker/index.ts
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import { SQSEvent } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

// Secrets Manager 클라이언트
const secretsClient = new SecretsManagerClient({ region: 'ap-northeast-2' });

// 시크릿 로드 함수
async function getSecret(secretId: string): Promise<string> {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await secretsClient.send(command);
    return response.SecretString || '';
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretId}`);
    throw error;
  }
}

// 환경변수 로드 (Lambda 시작 시)
let DATABASE_URL: string;

const initializeSecrets = async () => {
  if (!DATABASE_URL) {
    DATABASE_URL = await getSecret('marketingplat/database-url');
    // 민감한 정보는 로그에 출력하지 않음
    console.log('Secrets loaded successfully');
  }
};

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

export const handler = async (event: SQSEvent) => {
  // 시크릿 초기화
  await initializeSecrets();

  const promises = event.Records.map(async (record) => {
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

      // 네이버 지도 검색
      await page.goto(
        `https://map.naver.com/v5/search/${encodeURIComponent(keyword)}`,
        { waitUntil: 'networkidle2', timeout: 30000 }
      );

      // 검색 결과 대기
      await page.waitForSelector('div.CHC5F', { timeout: 10000 });

      // 순위 추출 로직
      const rankings = await page.evaluate(() => {
        // 기존 improved-scraper-v3.ts 로직 재사용
        const results = [];
        const items = document.querySelectorAll('div.CHC5F');

        items.forEach((item, index) => {
          const nameEl = item.querySelector('span.YwYLL');
          const isAd = !!item.querySelector('div.iqAyT.JKKhR > a.gU6bV._DHlh');

          if (nameEl) {
            results.push({
              rank: index + 1,
              name: nameEl.textContent.trim(),
              isAd
            });
          }
        });

        return results;
      });

      // DB 저장
      await prisma.smartPlaceRanking.create({
        data: {
          keywordId,
          checkDate: new Date(),
          organicRank: rankings.find(r => !r.isAd)?.rank || null,
          adRank: rankings.find(r => r.isAd)?.rank || null,
          topTenPlaces: JSON.stringify(rankings.slice(0, 10))
        }
      });

      console.log(`Successfully tracked keyword: ${keyword}`);
    } catch (error) {
      console.error(`Error tracking keyword ${keyword}:`, error);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  });

  await Promise.all(promises);
  return { statusCode: 200, body: 'Success' };
};
```

      // 오류 로깅 (민감한 정보 제외)
      console.error(`Error tracking keyword ${keyword}:`, error.message);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  });

  await Promise.all(promises);
  return { statusCode: 200, body: 'Success' };
};
```

#### Lambda 배포 스크립트 (보안 강화)
```bash
#!/bin/bash
# deploy-lambda.sh

# 보안 검증
echo "Security check: Verifying no hardcoded credentials..."
if grep -r "AKIA\|aws_access_key_id\|aws_secret_access_key" lambda/; then
  echo "ERROR: Hardcoded AWS credentials found!"
  exit 1
fi

if grep -r "AIza\|ya29\|GOCSPX" lambda/; then
  echo "ERROR: Hardcoded API keys found!"
  exit 1
fi

# 함수 압축 (민감한 파일 제외)
cd lambda/smartplace-tracker
zip -r function.zip index.js node_modules \
  -x "*.env*" \
  -x "*credentials*" \
  -x "*.pem" \
  -x "*.key"

# Lambda 함수 생성/업데이트 (환경변수 제외)
aws lambda create-function \
  --function-name marketingplat-smartplace-tracker \
  --runtime nodejs20.x \
  --role arn:aws:iam::ACCOUNT:role/marketingplat-lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 120 \
  --memory-size 1024 \
  --layers \
    arn:aws:lambda:ap-northeast-2:ACCOUNT:layer:chromium-layer:1 \
    arn:aws:lambda:ap-northeast-2:ACCOUNT:layer:prisma-layer:1 \
  --vpc-config SubnetIds=subnet-xxx,SecurityGroupIds=sg-xxx \
  --environment Variables="{
    NODE_ENV=production,
    SECRETS_PREFIX=marketingplat/
  }"

# SQS 트리거 추가 (Dead Letter Queue 포함)
aws lambda create-event-source-mapping \
  --function-name marketingplat-smartplace-tracker \
  --event-source-arn arn:aws:sqs:ap-northeast-2:ACCOUNT:ranking-tracking-queue \
  --batch-size 5 \
  --maximum-batching-window-in-seconds 20

# Lambda 함수 권한 설정
aws lambda put-function-concurrency \
  --function-name marketingplat-smartplace-tracker \
  --reserved-concurrent-executions 10

echo "Lambda function deployed with security enhancements"
```

### 7️⃣ Nginx 설정 (보안 강화 - 30분)

#### Nginx 보안 설정
```nginx
# /etc/nginx/sites-available/marketingplat

# 보안 설정
server_tokens off;
client_body_buffer_size 1K;
client_header_buffer_size 1k;
large_client_header_buffers 2 1k;

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

# DDoS 방어
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    listen 80;
    server_name marketingplat.com www.marketingplat.com;

    # HTTPS로 리다이렉트 (SSL 설정 후)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name marketingplat.com www.marketingplat.com;

    # SSL 인증서 (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/marketingplat.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/marketingplat.com/privkey.pem;

    # SSL 보안 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';" always;

    # 파일 업로드 크기 제한
    client_max_body_size 10M;
    client_body_timeout 12;
    client_header_timeout 12;

    # DDoS 방어
    limit_conn addr 10;

    # 로깅 (민감한 정보 제외)
    access_log /var/log/nginx/marketingplat-access.log combined buffer=32k flush=5s;
    error_log /var/log/nginx/marketingplat-error.log warn;

    # 특정 User-Agent 차단
    if ($http_user_agent ~* (bot|crawler|spider|scraper)) {
        return 403;
    }

    # 로그인 엔드포인트 Rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        limit_req_status 429;

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

    # API 엔드포인트 Rate limiting
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        limit_req_status 429;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 타임아웃 설정 (크롤링 작업용)
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }

    # 일반 요청
    location / {
        limit_req zone=general burst=20 nodelay;

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

    # 정적 파일 캐싱
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable, max-age=31536000";

        # 정적 파일 보안
        add_header X-Content-Type-Options "nosniff" always;
    }

    # 차단할 경로들
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ /\.env {
        deny all;
        return 404;
    }

    location ~ \.(sql|db|sqlite)$ {
        deny all;
        return 404;
    }
}
```

---

## 📋 Day 3: 최적화 및 모니터링 (2시간)

### 1️⃣ SSL 인증서 설정 (30분)
```bash
# Let's Encrypt SSL 설정
sudo certbot --nginx -d marketingplat.com -d www.marketingplat.com

# 자동 갱신 설정
sudo certbot renew --dry-run
```

### 2️⃣ CloudWatch 모니터링 (보안 메트릭 포함 - 30분)

#### 보안 모니터링 설정
```javascript
// lib/monitoring.ts
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatchClient({ region: 'ap-northeast-2' });

export async function recordMetric(
  metricName: string,
  value: number,
  unit: string = 'Count',
  dimensions?: { Name: string; Value: string }[]
) {
  try {
    const command = new PutMetricDataCommand({
      Namespace: 'MarketingPlat',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: dimensions
      }]
    });

    await cloudwatch.send(command);
  } catch (error) {
    // 로그 에러 (민감한 정보 제외)
    console.error('Metric recording failed:', metricName);
  }
}

// 보안 메트릭 기록
export async function recordSecurityMetric(event: string, success: boolean) {
  await recordMetric(`Security/${event}`, 1, 'Count', [
    { Name: 'Status', Value: success ? 'Success' : 'Failed' }
  ]);
}

// 사용 예시
await recordSecurityMetric('LoginAttempt', true);
await recordSecurityMetric('RateLimitHit', false);
await recordMetric('FailedLogins', 1);
await recordMetric('SuspiciousActivity', 1);
```

#### CloudWatch 대시보드 설정
```bash
# 보안 대시보드 생성
aws cloudwatch put-dashboard --dashboard-name MarketingPlatSecurity \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "metrics": [
            ["MarketingPlat", "Security/LoginAttempt", {"stat": "Sum"}],
            [".", "FailedLogins", {"stat": "Sum"}],
            [".", "RateLimitHit", {"stat": "Sum"}],
            [".", "SuspiciousActivity", {"stat": "Sum"}]
          ],
          "period": 300,
          "stat": "Sum",
          "region": "ap-northeast-2",
          "title": "Security Metrics"
        }
      }
    ]
  }'
```

### 3️⃣ 보안 알림 설정 (15분)
```yaml
CloudWatch Security Alarms:
  - FailedLoginSpike:
      MetricName: FailedLogins
      Threshold: 10
      Period: 5 minutes
      ComparisonOperator: GreaterThanThreshold
      Action: SNS Critical Alert

  - RateLimitExceeded:
      MetricName: RateLimitHit
      Threshold: 100
      Period: 1 minute
      ComparisonOperator: GreaterThanThreshold
      Action: SNS Alert + Auto-scaling

  - SuspiciousActivityDetected:
      MetricName: SuspiciousActivity
      Threshold: 1
      Period: 1 minute
      ComparisonOperator: GreaterThanThreshold
      Action: SNS Security Team Alert

  - UnauthorizedAccessAttempt:
      MetricName: Security/UnauthorizedAccess
      Threshold: 5
      Period: 5 minutes
      ComparisonOperator: GreaterThanThreshold
      Action: SNS + Lambda (Block IP)

Cost Alarms:
  - BillingAlarm:
      Threshold: $10
      Period: Daily
      Action: SNS Email Alert

Performance Alarms:
  - LambdaErrorRate:
      Threshold: 1%
      Period: 5 minutes
      Action: SNS Alert

  - EC2CPUUtilization:
      Threshold: 80%
      Period: 5 minutes
      Action: SNS Alert
```

#### 알림 구성 스크립트
```bash
# 보안 알림 생성
aws cloudwatch put-metric-alarm \
  --alarm-name "MarketingPlat-FailedLogins" \
  --alarm-description "Too many failed login attempts" \
  --metric-name FailedLogins \
  --namespace MarketingPlat \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:ap-northeast-2:ACCOUNT:security-alerts

# Rate Limit 알림
aws cloudwatch put-metric-alarm \
  --alarm-name "MarketingPlat-RateLimit" \
  --alarm-description "Rate limit exceeded" \
  --metric-name RateLimitHit \
  --namespace MarketingPlat \
  --statistic Sum \
  --period 60 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:ap-northeast-2:ACCOUNT:ops-alerts
```

### 4️⃣ 백업 전략 (보안 강화 - 30분)

#### 자동화된 보안 백업
```bash
#!/bin/bash
# secure-backup.sh

# 보안 설정
set -euo pipefail
umask 077

# 환경변수 로드 (Secrets Manager에서)
source ~/load-secrets.sh

# 백업 디렉토리
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ENCRYPTION_KEY=$(aws secretsmanager get-secret-value \
  --secret-id marketingplat/backup-encryption-key \
  --query SecretString --output text)

# 로그 시작
echo "[$(date)] Starting secure backup..." >> /var/log/marketingplat-backup.log

# 1. 데이터베이스 백업 (암호화)
pg_dump $DATABASE_URL | gzip | openssl enc -aes-256-cbc \
  -salt -pass pass:$ENCRYPTION_KEY \
  > $BACKUP_DIR/db-$TIMESTAMP.sql.gz.enc

# 2. 애플리케이션 백업 (민감한 파일 제외)
tar --exclude='.env*' \
    --exclude='*.pem' \
    --exclude='*.key' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    -czf - /home/ubuntu/marketingplatformproject | \
    openssl enc -aes-256-cbc -salt -pass pass:$ENCRYPTION_KEY \
    > $BACKUP_DIR/app-$TIMESTAMP.tar.gz.enc

# 3. S3 업로드 (서버 사이드 암호화)
aws s3 cp $BACKUP_DIR/db-$TIMESTAMP.sql.gz.enc \
  s3://marketingplat-backups/db/ \
  --sse aws:kms \
  --sse-kms-key-id arn:aws:kms:ap-northeast-2:ACCOUNT:key/KEY-ID

aws s3 cp $BACKUP_DIR/app-$TIMESTAMP.tar.gz.enc \
  s3://marketingplat-backups/app/ \
  --sse aws:kms \
  --sse-kms-key-id arn:aws:kms:ap-northeast-2:ACCOUNT:key/KEY-ID

# 4. 로컬 백업 정리 (3일 이상)
find $BACKUP_DIR -name "*.enc" -mtime +3 -delete

# 5. S3 백업 라이프사이클 (30일 후 Glacier)
aws s3api put-bucket-lifecycle-configuration \
  --bucket marketingplat-backups \
  --lifecycle-configuration file://backup-lifecycle.json

# 6. 백업 검증
if [ $? -eq 0 ]; then
  echo "[$(date)] Backup completed successfully" >> /var/log/marketingplat-backup.log

  # 성공 메트릭 전송
  aws cloudwatch put-metric-data \
    --namespace MarketingPlat \
    --metric-name BackupSuccess \
    --value 1 \
    --unit Count
else
  echo "[$(date)] Backup failed!" >> /var/log/marketingplat-backup.log

  # 실패 알림
  aws sns publish \
    --topic-arn arn:aws:sns:ap-northeast-2:ACCOUNT:backup-alerts \
    --subject "MarketingPlat Backup Failed" \
    --message "Backup failed at $(date)"
fi
```

#### Cron 설정 (자동 백업)
```bash
# 백업 스케줄 설정
sudo crontab -e

# 매일 새벽 3시 백업 실행
0 3 * * * /home/ubuntu/secure-backup.sh >> /var/log/cron-backup.log 2>&1

# 백업 로그 로테이션
sudo tee /etc/logrotate.d/marketingplat-backup << EOF
/var/log/marketingplat-backup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF
```

### 5️⃣ CI/CD 파이프라인 (보안 강화 - 15분)

#### GitHub Actions 보안 설정
```yaml
# .github/workflows/deploy.yml
name: Secure Deploy to AWS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: ap-northeast-2
  ECR_REPOSITORY: marketingplat

permissions:
  id-token: write
  contents: read

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Run security scan
      run: |
        # 의존성 취약점 검사
        npm audit --audit-level=high

        # 민감한 정보 검사
        if grep -r "AKIA\|aws_access_key\|AIza\|ya29" --exclude-dir=node_modules .; then
          echo "ERROR: Hardcoded credentials detected!"
          exit 1
        fi

        # .env 파일 체크
        if [ -f ".env" ] || [ -f ".env.production" ]; then
          echo "ERROR: Environment files should not be committed!"
          exit 1
        fi

    - name: Run SAST scan
      uses: github/super-linter@v4
      env:
        DEFAULT_BRANCH: main
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        VALIDATE_JAVASCRIPT_ES: true
        VALIDATE_TYPESCRIPT_ES: true

  test:
    runs-on: ubuntu-latest
    needs: security-scan
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Run build
      run: npm run build

  deploy:
    runs-on: ubuntu-latest
    needs: [security-scan, test]
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
    - uses: actions/checkout@v3

    - name: Configure AWS credentials (OIDC)
      uses: aws-actions/configure-aws-credentials@v2
      with:
        role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
        aws-region: ap-northeast-2

    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.EC2_HOST }}
        username: ubuntu
        key: ${{ secrets.EC2_SSH_KEY }}
        script: |
          # 배포 전 보안 체크
          cd /home/ubuntu/marketingplatformproject

          # 백업 생성
          ./secure-backup.sh

          # 코드 업데이트
          git fetch origin main
          git reset --hard origin/main

          # Secrets 로드
          source ~/load-secrets.sh

          # 의존성 설치 및 빌드
          npm ci --production
          npm run build

          # Health check
          if npm run health-check; then
            pm2 reload marketingplat
          else
            echo "Health check failed, rolling back..."
            git reset --hard HEAD~1
            npm ci --production
            npm run build
            pm2 reload marketingplat
            exit 1
          fi

    - name: Deploy Lambda
      run: |
        # 보안 검증
        cd lambda/smartplace-tracker
        if grep -r "console.log" .; then
          echo "WARNING: console.log found in Lambda code"
        fi

        # 패키징
        zip -r function.zip index.js node_modules \
          -x "*.env*" -x "*.pem" -x "*.key"

        # Lambda 업데이트
        aws lambda update-function-code \
          --function-name marketingplat-smartplace-tracker \
          --zip-file fileb://function.zip

        # 함수 설정 업데이트
        aws lambda update-function-configuration \
          --function-name marketingplat-smartplace-tracker \
          --environment "Variables={NODE_ENV=production,SECRETS_PREFIX=marketingplat/}"

    - name: Verify deployment
      run: |
        # Health check API
        response=$(curl -s -o /dev/null -w "%{http_code}" https://marketingplat.com/api/health)
        if [ $response -eq 200 ]; then
          echo "Deployment successful!"

          # 성공 메트릭 전송
          aws cloudwatch put-metric-data \
            --namespace MarketingPlat \
            --metric-name DeploymentSuccess \
            --value 1
        else
          echo "Deployment verification failed!"
          exit 1
        fi

    - name: Notify deployment
      if: always()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: 'Deployment ${{ job.status }} for ${{ github.sha }}'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 💰 예상 비용 (월간)

### 프리티어 기간 (첫 12개월)
| 서비스 | 사용량 | 프리티어 | 비용 |
|--------|--------|----------|------|
| EC2 t2.micro | 720시간 | 750시간 | $0 |
| RDS db.t3.micro | 720시간 | 750시간 | $0 |
| Lambda | 150,000 요청 | 1M 요청 | $0 |
| S3 | 1GB | 5GB | $0 |
| CloudFront | 100GB | 1TB | $0 |
| SQS | 150,000 메시지 | 1M 메시지 | $0 |
| **총계** | | | **$0-5** |

### 프리티어 종료 후
| 서비스 | 월 비용 |
|--------|---------|
| EC2 t2.micro | $8.50 |
| RDS db.t3.micro | $13.00 |
| Lambda | $2.00 |
| S3 + CloudFront | $5.00 |
| **총계** | **$28.50** |

---

## 🔒 최종 보안 체크리스트

### 배포 전 필수 보안 검증 항목

#### 1. 자격 증명 관리 ✅
- [ ] **JWT Secret 생성 완료** (88자 이상)
- [ ] **DB Password 생성 완료** (44자 이상)
- [ ] **모든 API Key를 Secrets Manager에 저장**
- [ ] **하드코딩된 자격 증명 제거 확인**
- [ ] **.env 파일 Git에서 제거**
- [ ] **Git 히스토리 정리 완료**

#### 2. 애플리케이션 보안 ✅
- [ ] **Rate Limiting 구현 확인**
- [ ] **로그인 시도 제한 (5회)**
- [ ] **보안 헤더 미들웨어 적용**
- [ ] **프로덕션 console.log 제거**
- [ ] **SQL Injection 방지 (Prisma 사용)**
- [ ] **XSS 방지 헤더 설정**

#### 3. 인프라 보안 ✅
- [ ] **IAM 최소 권한 원칙 적용**
- [ ] **Security Group 최소 포트만 개방**
- [ ] **RDS 퍼블릭 액세스 차단**
- [ ] **S3 버킷 퍼블릭 액세스 차단**
- [ ] **CloudWatch 보안 알림 설정**
- [ ] **백업 암호화 설정**

#### 4. 네트워크 보안 ✅
- [ ] **HTTPS 강제 적용 (SSL/TLS)**
- [ ] **Nginx Rate Limiting 설정**
- [ ] **DDoS 방어 설정**
- [ ] **WAF 규칙 설정 (선택사항)**
- [ ] **VPC 보안 그룹 설정**

#### 5. 모니터링 및 감사 ✅
- [ ] **보안 메트릭 대시보드 생성**
- [ ] **실패한 로그인 알림 설정**
- [ ] **Rate Limit 초과 알림 설정**
- [ ] **비정상 활동 감지 알림**
- [ ] **AWS CloudTrail 활성화**
- [ ] **로그 로테이션 설정**

#### 6. CI/CD 보안 ✅
- [ ] **GitHub Secrets 설정**
- [ ] **보안 스캔 자동화**
- [ ] **의존성 취약점 검사**
- [ ] **SAST 스캔 설정**
- [ ] **배포 전 백업 자동화**

### 보안 테스트 명령어

```bash
# 1. 의존성 취약점 검사
npm audit

# 2. 하드코딩된 자격 증명 검사
grep -r "AKIA\|AIza\|ya29\|GOCSPX" . --exclude-dir=node_modules

# 3. .env 파일 존재 확인
find . -name ".env*" -not -path "./node_modules/*"

# 4. SSL 인증서 검증
openssl s_client -connect marketingplat.com:443 -servername marketingplat.com

# 5. Rate Limiting 테스트
for i in {1..20}; do curl -X POST https://marketingplat.com/api/auth/login; done

# 6. 보안 헤더 확인
curl -I https://marketingplat.com | grep -E "Strict-Transport|X-Frame|X-Content|CSP"
```

## 🚨 주의사항 및 팁

### 1. 보안 (최우선)
- [ ] 모든 시크릿을 AWS Secrets Manager에 저장
- [ ] 최소 권한 IAM 정책 적용
- [ ] Security Group 규칙 최소화
- [ ] 정기적인 보안 패치
- [ ] 정기적인 보안 감사

### 2. 성능
- [ ] Lambda 콜드 스타트 최소화 (Provisioned Concurrency 고려)
- [ ] RDS 연결 풀링 설정
- [ ] CloudFront 캐싱 최적화

### 3. 모니터링
- [ ] 일일 비용 체크
- [ ] 성능 메트릭 대시보드
- [ ] 에러 알림 설정
- [ ] 보안 이벤트 모니터링

### 4. 백업
- [ ] RDS 자동 백업 활성화
- [ ] S3 버전 관리
- [ ] 코드 저장소 백업
- [ ] 백업 암호화 및 검증

---

## 🔄 배포 후 업데이트 가이드

### 코드 업데이트 시

#### 1. **Next.js 애플리케이션 업데이트**
```bash
# EC2 서버에서 실행
cd /home/ubuntu/marketingplatformproject

# 1. 코드 가져오기
git pull origin main

# 2. 의존성 업데이트
npm install

# 3. 빌드
npm run build

# 4. PM2 재시작 (무중단)
pm2 reload marketingplat

# 5. 로그 확인
pm2 logs marketingplat --lines 50
```

#### 2. **Lambda 함수 업데이트**
```bash
# 로컬에서 실행
cd lambda/smartplace-tracker

# 1. 코드 수정 후 압축
zip -r function.zip index.js node_modules

# 2. Lambda 함수 업데이트
aws lambda update-function-code \
  --function-name smartplace-tracker \
  --zip-file fileb://function.zip

# 3. 환경변수 업데이트 (필요시)
aws lambda update-function-configuration \
  --function-name smartplace-tracker \
  --environment Variables="{DATABASE_URL=$NEW_DATABASE_URL}"
```

#### 3. **데이터베이스 스키마 변경**
```bash
# 로컬에서 실행
# 1. schema.prisma 수정

# 2. 마이그레이션 생성
npx prisma migrate dev --name describe_your_change

# 3. 프로덕션 적용
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# 4. Prisma Client 재생성
npx prisma generate

# 5. 코드 배포
git add .
git commit -m "Update database schema"
git push origin main
```

### 새로운 기능 추가 시

#### 1. **새로운 API 엔드포인트**
```typescript
// app/api/new-feature/route.ts
export async function POST(req: NextRequest) {
  // 새 기능 구현
}
```

배포 절차:
1. 로컬 테스트
2. Git 커밋 & 푸시
3. EC2에서 pull & 빌드
4. PM2 재시작

#### 2. **새로운 Lambda 함수 추가**
```bash
# 1. 새 함수 디렉토리 생성
mkdir lambda/new-function
cd lambda/new-function

# 2. package.json 생성
npm init -y
npm install @prisma/client

# 3. 함수 코드 작성
# index.js

# 4. 배포
zip -r function.zip .
aws lambda create-function \
  --function-name new-function \
  --runtime nodejs20.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::ACCOUNT:role/lambda-execution-role
```

#### 3. **환경변수 추가/변경**
```bash
# EC2 환경변수
# 1. .env.local 수정
nano /home/ubuntu/marketingplatformproject/.env.local

# 2. PM2 재시작
pm2 restart marketingplat

# Lambda 환경변수
aws lambda update-function-configuration \
  --function-name smartplace-tracker \
  --environment Variables="{$(cat .env.production | tr '\n' ',')}"
```

### 무중단 배포 전략

#### Blue-Green 배포 (수동)
```bash
# 1. 새 버전 준비
cd /home/ubuntu
git clone https://github.com/your-repo/marketingplatformproject.git marketingplat-new
cd marketingplat-new
npm install
npm run build

# 2. 포트 변경하여 실행
PORT=3001 pm2 start npm --name marketingplat-new -- start

# 3. Nginx 설정 변경
sudo nano /etc/nginx/sites-available/marketingplat
# proxy_pass http://localhost:3001;

# 4. Nginx 리로드
sudo nginx -s reload

# 5. 이전 버전 중지
pm2 stop marketingplat
pm2 delete marketingplat

# 6. 이름 변경
pm2 restart marketingplat-new --name marketingplat
```

### 긴급 롤백 절차

#### 1. **코드 롤백**
```bash
# 이전 커밋으로 롤백
git log --oneline -5
git checkout <previous-commit-hash>
npm install
npm run build
pm2 restart marketingplat
```

#### 2. **Lambda 롤백**
```bash
# 이전 버전으로 롤백
aws lambda update-function-code \
  --function-name smartplace-tracker \
  --s3-bucket marketingplat-deployments \
  --s3-key lambda/smartplace-tracker-previous.zip
```

#### 3. **데이터베이스 롤백**
```bash
# RDS 스냅샷에서 복구
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier marketingplat-restored \
  --db-snapshot-identifier <snapshot-id>
```

### 모니터링 및 로그 확인

#### 1. **EC2 애플리케이션 로그**
```bash
# PM2 로그
pm2 logs marketingplat --lines 100

# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### 2. **Lambda 로그**
```bash
# CloudWatch 로그 확인
aws logs tail /aws/lambda/smartplace-tracker --follow

# 특정 시간대 로그
aws logs filter-log-events \
  --log-group-name /aws/lambda/smartplace-tracker \
  --start-time $(date -d '1 hour ago' +%s)000
```

#### 3. **RDS 로그**
```bash
# 슬로우 쿼리 로그
aws rds download-db-log-file-portion \
  --db-instance-identifier marketingplat-prod \
  --log-file-name postgres.log
```

### 자동화 스크립트

#### deploy.sh (EC2 배포 자동화)
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Starting deployment..."

# 코드 업데이트
git pull origin main

# 의존성 설치
npm install

# 빌드
npm run build

# 마이그레이션 실행
npx prisma migrate deploy

# PM2 무중단 재시작
pm2 reload marketingplat

echo "✅ Deployment complete!"
```

#### update-lambda.sh (Lambda 업데이트 자동화)
```bash
#!/bin/bash
# update-lambda.sh

FUNCTION_NAME=$1
FUNCTION_DIR="lambda/$FUNCTION_NAME"

if [ -z "$FUNCTION_NAME" ]; then
  echo "Usage: ./update-lambda.sh <function-name>"
  exit 1
fi

cd $FUNCTION_DIR

# 압축
zip -r function.zip . -x "*.git*"

# 업데이트
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://function.zip

echo "✅ Lambda function $FUNCTION_NAME updated!"
```

---

## 📞 문제 발생 시 체크리스트

1. **Lambda 실행 실패**
   - CloudWatch 로그 확인
   - 메모리/타임아웃 증가
   - Layer 버전 확인

2. **EC2 접속 불가**
   - Security Group 확인
   - 인스턴스 상태 확인
   - SSH 키 권한 확인

3. **RDS 연결 실패**
   - Security Group 규칙
   - 엔드포인트 확인
   - 사용자 권한

4. **높은 비용 발생**
   - Cost Explorer 확인
   - 불필요한 리소스 제거
   - Reserved Instance 고려

---

## ✅ 완료 체크리스트

### Day 1
- [ ] AWS 계정 설정
- [ ] RDS PostgreSQL 생성
- [ ] EC2 인스턴스 생성
- [ ] EC2 환경 설정
- [ ] S3 버킷 생성
- [ ] SQS 큐 생성
- [ ] Lambda 레이어 생성

### Day 2
- [ ] DB 마이그레이션
- [ ] 환경변수 설정
- [ ] Next.js 빌드 및 배포
- [ ] PM2 설정
- [ ] Lambda 함수 배포
- [ ] Nginx 설정

### Day 3
- [ ] SSL 인증서 설정
- [ ] CloudWatch 모니터링
- [ ] 비용 알림 설정
- [ ] 백업 전략 구현
- [ ] CI/CD 파이프라인 설정

---

**작성일**: 2025년 1월 16일
**작성자**: Claude Code Assistant
**프로젝트**: MarketingPlat AWS 하이브리드 배포