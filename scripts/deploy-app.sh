#!/bin/bash
# deploy-app.sh - 애플리케이션 배포 스크립트

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
JWT_EXPIRES_IN="7d"

# Application URLs
NEXT_PUBLIC_API_URL="https://marketingplat.com"
NEXT_PUBLIC_BASE_URL="https://marketingplat.com"

# AWS Configuration
AWS_REGION="ap-northeast-2"
AWS_S3_BUCKET="marketingplat-assets"
SQS_QUEUE_URL="https://sqs.ap-northeast-2.amazonaws.com/YOUR_ACCOUNT_ID/ranking-tracking-queue"

# API Keys
GEMINI_API_KEY="AIzaSyDKlt6UMB2ha4ZISbOYjxU-qR8EUBwME_0"
NAVER_CLIENT_ID="otHAAADUXSdFg1Ih7f_J"
NAVER_CLIENT_SECRET="eSbnPqUt_q"
NAVER_ADS_API_KEY="0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af"
NAVER_ADS_SECRET_KEY="AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A=="
NAVER_ADS_CUSTOMER_ID="1632045"
FLUX_API_KEY="d3cb7f68-c880-4248-9c7b-1dea7ec00394"

# Environment Settings
NODE_ENV="production"
APP_ENV="production"
NEXT_PUBLIC_APP_ENV="production"

# Feature Flags
USE_REAL_CRAWLER="true"
USE_MOCK_SCRAPER="false"
ENABLE_SCHEDULER="true"
AUTO_SCHEDULER="false"
DEBUG_MODE="false"
SHOW_ERROR_DETAILS="false"

# Tracking Settings
USE_LAMBDA_TRACKING="false"
TRACKING_MODE="local"
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