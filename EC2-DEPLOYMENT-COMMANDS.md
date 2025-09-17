# 🚀 EC2 서버 배포 명령어 가이드

## 1️⃣ EC2 접속 및 프로젝트 디렉토리 이동
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/marketingplatformproject
```

## 2️⃣ 최신 코드 가져오기
```bash
git pull origin main
```

## 3️⃣ .env.production 파일 생성/수정
```bash
# 기존 파일 백업 (있는 경우)
cp .env.production .env.production.backup 2>/dev/null || true

# 새로운 환경변수 파일 생성
cat > .env.production << 'EOF'
# PostgreSQL Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/marketingplat_dev"

# Authentication
JWT_SECRET="dev-jwt-secret-change-in-production"
JWT_EXPIRES_IN="7d"

# Next.js - HTTPS로 설정 (SSL 오류 수정의 핵심!)
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

# Environment Configuration - 프로덕션 설정
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

# Debug Mode - 프로덕션에서는 false
DEBUG_MODE="false"
SHOW_ERROR_DETAILS="false"

# Scheduler - 프로덕션에서 자동 실행
ENABLE_SCHEDULER="true"
AUTO_SCHEDULER="true"

# Application Settings
PORT="3000"
HOSTNAME="0.0.0.0"
EOF
```

## 4️⃣ 의존성 설치 및 빌드
```bash
# 의존성 설치
npm ci --production=false

# Prisma 클라이언트 생성
npx prisma generate

# 프로덕션 빌드
npm run build
```

## 5️⃣ PM2 재시작
```bash
# PM2 프로세스 재시작
pm2 restart marketingplat

# 변경사항 저장
pm2 save

# 상태 확인
pm2 status
pm2 logs marketingplat --lines 20
```

## 6️⃣ Nginx 재시작 (필요한 경우)
```bash
# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl reload nginx
```

## 7️⃣ 배포 확인
```bash
# HTTPS 리디렉션 확인
curl -I http://www.marekplace.co.kr
# 301 Moved Permanently가 나와야 함

# HTTPS 연결 확인
curl -I https://www.marekplace.co.kr
# 200 OK가 나와야 함

# 프로세스 확인
pm2 status

# 에러 로그 확인 (문제가 있는 경우)
pm2 logs marketingplat --err --lines 50
```

## ⚠️ 주의사항
1. **NEXT_PUBLIC_API_URL**과 **NEXT_PUBLIC_BASE_URL**이 반드시 `https://www.marekplace.co.kr`로 설정되어야 합니다.
2. NODE_ENV는 반드시 "production"으로 설정해야 합니다.
3. 빌드 후 PM2 재시작이 필수입니다.

## 🔧 문제 해결
만약 여전히 SSL 오류가 발생한다면:

1. 브라우저 캐시 삭제
2. Nginx SSL 인증서 확인:
   ```bash
   sudo certbot certificates
   ```
3. Nginx 에러 로그 확인:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```