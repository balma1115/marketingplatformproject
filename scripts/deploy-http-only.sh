#!/bin/bash
# deploy-http-only.sh - HTTP 전용 배포 (도메인 없는 환경)

echo "🔧 HTTP 전용 배포 시작 (도메인 없는 환경)..."

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# EC2 IP 주소 (수정 필요)
EC2_IP="13.125.39.37"

# 1. 프로젝트 디렉토리로 이동
cd /home/ubuntu/marketingplatformproject

# 2. 최신 코드 가져오기
echo -e "${BLUE}📥 최신 코드 가져오기...${NC}"
git pull origin main

# 3. .env.production 파일 생성 (HTTP 버전)
echo -e "${BLUE}📝 환경변수 파일 생성 (HTTP)...${NC}"
cat > .env.production << EOF
# PostgreSQL Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/marketingplat_dev"

# Authentication
JWT_SECRET="dev-jwt-secret-change-in-production"
JWT_EXPIRES_IN="7d"

# Next.js - HTTP와 IP 주소 사용
NEXT_PUBLIC_API_URL="http://${EC2_IP}"
NEXT_PUBLIC_BASE_URL="http://${EC2_IP}"

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

# 9. Nginx 설정 업데이트
echo -e "${BLUE}🌐 Nginx 설정 업데이트...${NC}"
sudo tee /etc/nginx/sites-available/marketingplat > /dev/null << 'NGINX_CONFIG'
server {
    listen 80;
    server_name ${EC2_IP};

    client_max_body_size 10M;

    location /_next/static {
        alias /home/ubuntu/marketingplatformproject/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }
}
NGINX_CONFIG

# 10. Nginx 재시작
echo -e "${BLUE}🔄 Nginx 재시작...${NC}"
sudo ln -sf /etc/nginx/sites-available/marketingplat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 11. 상태 확인
echo -e "${BLUE}✅ 배포 상태 확인...${NC}"
pm2 status

# 12. 테스트
echo -e "${BLUE}🧪 연결 테스트...${NC}"
sleep 5
echo "HTTP 연결 테스트:"
curl -I -s http://${EC2_IP} | head -n 1

echo -e "${GREEN}✨ HTTP 전용 배포 완료!${NC}"
echo -e "${YELLOW}브라우저에서 http://${EC2_IP} 로 접속하세요.${NC}"
echo -e "${YELLOW}⚠️  주의: HTTP는 보안되지 않은 연결입니다. 테스트 환경에서만 사용하세요.${NC}"