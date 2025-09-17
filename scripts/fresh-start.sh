#!/bin/bash
# 완전히 새로 시작하는 스크립트

echo "🆕 완전히 새로 시작"
echo "======================================"
echo ""

# PM2 완전 종료
echo "PM2 종료..."
pm2 kill

# 백업
echo "기존 프로젝트 백업..."
if [ -d ~/marketingplatformproject ]; then
    mv ~/marketingplatformproject ~/marketingplatformproject.backup.$(date +%Y%m%d_%H%M%S)
fi

# 새로 클론
echo "새로 클론..."
cd ~
git clone https://github.com/balma1115/marketingplatformproject.git
cd marketingplatformproject

# 환경변수 설정
echo "환경변수 설정..."
cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
NEXTAUTH_URL=https://miraenad.com
JWT_SECRET=MiraenAdProductionJWTSecretKey2025SuperSecure
NEXTAUTH_SECRET=MiraenAdProductionNextAuthSecretKey2025SuperSecure
NAVER_ADS_API_KEY=0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af
NAVER_ADS_SECRET_KEY=AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==
NAVER_ADS_CUSTOMER_ID=1632045
PORT=3000
EOF

# 의존성 설치
echo "의존성 설치..."
npm install

# Prisma 생성
echo "Prisma 생성..."
npx prisma generate

# 빌드
echo "빌드..."
npm run build

# PM2 시작
echo "PM2 시작..."
pm2 start npm --name miraenad -- start

echo ""
echo "✅ 완료!"
echo ""

# 테스트
sleep 5
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}'