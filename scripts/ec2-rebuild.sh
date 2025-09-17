#!/bin/bash
# EC2 완전 재빌드 스크립트

set -e

echo "🔧 MarketingPlat EC2 완전 재빌드 시작..."
echo "========================================"
echo ""

# 프로젝트 디렉토리로 이동
cd ~/marketingplatformproject

# 1. PM2 정지
echo "⏹️  PM2 정지 중..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo "✅ PM2 정지 완료"
echo ""

# 2. 빌드 파일 정리
echo "🧹 빌드 파일 정리 중..."
rm -rf .next
rm -rf node_modules/.cache
echo "✅ 빌드 파일 정리 완료"
echo ""

# 3. 환경변수 확인
echo "🔍 환경변수 확인..."
if grep -q "localhost:5432" .env; then
    echo "⚠️  WARNING: localhost:5432 발견!"
    echo "DATABASE_URL을 AWS RDS로 변경 필요"

    # 백업
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

    # 자동 수정
    sed -i 's|DATABASE_URL="postgresql://[^"]*"|DATABASE_URL="postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"|' .env
    echo "✅ DATABASE_URL 수정 완료"
else
    echo "✅ DATABASE_URL 정상"
fi

# NODE_ENV 확인
if ! grep -q "NODE_ENV=production" .env; then
    echo "NODE_ENV=production" >> .env
    echo "✅ NODE_ENV 추가"
fi
echo ""

# 4. 의존성 설치
echo "📦 의존성 설치 중..."
npm install --production=false
echo "✅ 의존성 설치 완료"
echo ""

# 5. Prisma 클라이언트 생성
echo "🔨 Prisma 클라이언트 생성 중..."
npx prisma generate
echo "✅ Prisma 클라이언트 생성 완료"
echo ""

# 6. Next.js 빌드
echo "🏗️  Next.js 빌드 중... (시간이 걸릴 수 있습니다)"
npm run build
echo "✅ Next.js 빌드 완료"
echo ""

# 7. PM2로 시작
echo "🚀 PM2로 앱 시작 중..."
pm2 start npm --name "marketingplat" -- start
pm2 save
echo "✅ PM2 시작 완료"
echo ""

# 8. 상태 확인
echo "📊 현재 상태:"
pm2 status
echo ""

echo "✨ 재빌드 완료!"
echo ""
echo "📝 다음 명령어로 확인:"
echo "  - 로그 확인: pm2 logs marketingplat"
echo "  - 상태 확인: pm2 status"
echo "  - 웹사이트: https://marketingplat.shop"
echo ""
echo "🔐 테스트 계정:"
echo "  admin@marketingplat.com / admin123"