#!/bin/bash
# 즉시 실행용 데이터베이스 수정 스크립트

echo "🔧 데이터베이스 비밀번호 수정 적용"
echo "======================================"
echo "비밀번호: Asungmini77A (올바른 비밀번호)"
echo ""

cd ~/marketingplatformproject

# Git 최신 코드
git pull origin main

# PM2 중지
pm2 stop miraenad 2>/dev/null || true

# .env 파일 수정
cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
NEXTAUTH_URL=https://miraenad.com
JWT_SECRET=MiraenAdProductionJWTSecretKey2025SuperSecure
NEXTAUTH_SECRET=MiraenAdProductionNextAuthSecretKey2025SuperSecure
NAVER_ADS_API_KEY=0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af
NAVER_ADS_SECRET_KEY=AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==
NAVER_ADS_CUSTOMER_ID=1632045
EOF

echo "✅ 환경변수 설정 완료"

# 빌드 삭제
rm -rf .next

# Prisma 재생성
npx prisma generate

# 빌드
npm run build

# PM2 시작
pm2 start npm --name miraenad -- start

echo ""
echo "✅ 완료! 테스트:"
sleep 5

# 테스트
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}'

echo ""
echo "PM2 상태:"
pm2 status