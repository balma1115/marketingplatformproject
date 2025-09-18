#!/bin/bash

echo "EC2 배포 시작..."

# 1. Git에서 최신 코드 pull
echo "Step 1: Git pull..."
git pull origin main

# 2. 의존성 설치 (새로운 패키지가 있을 경우)
echo "Step 2: Installing dependencies..."
npm install

# 3. Prisma 마이그레이션 실행
echo "Step 3: Running Prisma migrations..."
npx prisma migrate deploy

# 4. Prisma 클라이언트 재생성
echo "Step 4: Generating Prisma client..."
npx prisma generate

# 5. Next.js 빌드
echo "Step 5: Building Next.js..."
npm run build

# 6. PM2로 앱 재시작
echo "Step 6: Restarting PM2..."
pm2 restart all

# 7. 상태 확인
echo "Step 7: Checking status..."
pm2 status

echo "배포 완료!"
echo "사이트 확인: https://miraenad.com"
echo ""
echo "로그 확인 명령어:"
echo "  pm2 logs     - 모든 로그 보기"
echo "  pm2 logs 0   - 특정 프로세스 로그 보기"