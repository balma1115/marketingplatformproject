#!/bin/bash
# fix-ssl-deploy.sh - SSL 프로토콜 오류 완전 해결 스크립트

echo "🔧 SSL 프로토콜 오류 해결 배포 시작..."

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. 프로젝트 디렉토리로 이동
cd /home/ubuntu/marketingplatformproject

# 2. 최신 코드 가져오기
echo -e "${BLUE}📥 최신 코드 가져오기...${NC}"
git pull origin main

# 3. .env.production 파일 생성
echo -e "${BLUE}📝 환경변수 파일 생성...${NC}"
cat > .env.production << 'EOF'
# PostgreSQL Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/marketingplat_dev"

# Authentication
JWT_SECRET="dev-jwt-secret-change-in-production"
JWT_EXPIRES_IN="7d"

# Next.js - HTTPS로 설정 (중요!)
NEXT_PUBLIC_API_URL="https://www.marekplace.co.kr"
NEXT_PUBLIC_BASE_URL="https://www.marekplace.co.kr"

# Google Gemini API
GEMINI_API_KEY="AIzaSyDKlt6UMB2ha4ZISbOYjxU-qR8EUBwME_0"

# Naver API
NAVER_CLIENT_ID="otHAAADUXSdFg1Ih7f_J"
NAVER_CLIENT_SECRET="eSbnPqUt_q"

# Naver Ads API
NAVER_ADS_API_KEY="0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af"
NAVER_ADS_SECRET_KEY="AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A=="
NAVER_ADS_CUSTOMER_ID="1632045"

# Flux API
FLUX_API_KEY="d3cb7f68-c880-4248-9c7b-1dea7ec00394"

# Instagram API
INSTAGRAM_ACCESS_TOKEN=""
INSTAGRAM_USER_ID=""

# AWS
AWS_REGION="ap-northeast-2"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_S3_BUCKET=""

# Email
EMAIL_FROM="noreply@marketingplat.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""

# TossPayments
NEXT_PUBLIC_TOSS_CLIENT_KEY="test_ck_DnyRpQWGrN5yB4vDG7LrKwv1M9EN"
TOSS_SECRET_KEY="test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R"

# Environment Configuration
NODE_ENV="production"
APP_ENV="production"
NEXT_PUBLIC_APP_ENV="production"

# Smartplace Crawler
USE_REAL_CRAWLER="true"
USE_MOCK_SCRAPER="false"

# Redis
REDIS_URL="redis://localhost:6379"

# Tracking Service
USE_LAMBDA_TRACKING="false"
TRACKING_MODE="local"
SQS_QUEUE_URL=""

# Debug Mode
DEBUG_MODE="false"
SHOW_ERROR_DETAILS="false"

# Scheduler
ENABLE_SCHEDULER="true"
AUTO_SCHEDULER="true"

# Application
PORT="3000"
HOSTNAME="0.0.0.0"
EOF

# 4. 의존성 설치
echo -e "${BLUE}📦 의존성 설치...${NC}"
npm ci --production=false

# 5. Prisma 클라이언트 생성
echo -e "${BLUE}🗄️ Prisma 클라이언트 생성...${NC}"
npx prisma generate

# 6. .next 폴더 삭제 후 새로 빌드
echo -e "${BLUE}🧹 이전 빌드 삭제...${NC}"
rm -rf .next

# 7. 프로덕션 빌드
echo -e "${BLUE}🔨 프로덕션 빌드...${NC}"
NODE_ENV=production npm run build

# 8. PM2 재시작
echo -e "${BLUE}🔄 PM2 재시작...${NC}"
pm2 delete marketingplat 2>/dev/null || true
pm2 start ecosystem.config.js --name marketingplat
pm2 save

# 9. Nginx 설정 업데이트 (필요한 경우)
echo -e "${BLUE}🌐 Nginx 설정 확인...${NC}"
if [ -f "/etc/nginx/sites-available/marketingplat" ]; then
    echo -e "${YELLOW}Nginx 설정이 있습니다. 업데이트가 필요한 경우 수동으로 진행하세요.${NC}"
    echo "sudo nano /etc/nginx/sites-available/marketingplat"
    echo "sudo nginx -t"
    echo "sudo systemctl reload nginx"
fi

# 10. 상태 확인
echo -e "${BLUE}✅ 배포 상태 확인...${NC}"
pm2 status

# 11. 테스트
echo -e "${BLUE}🧪 연결 테스트...${NC}"
sleep 5
echo "HTTP -> HTTPS 리디렉션 테스트:"
curl -I -s http://www.marekplace.co.kr | head -n 1
echo ""
echo "HTTPS 연결 테스트:"
curl -I -s https://www.marekplace.co.kr | head -n 1

echo -e "${GREEN}✨ SSL 수정 배포 완료!${NC}"
echo -e "${YELLOW}브라우저 캐시를 삭제하고 https://www.marekplace.co.kr 로 접속하세요.${NC}"