#!/bin/bash
# 완전 재빌드 스크립트 - localhost 문제 완전 해결

echo "🔥 완전 재빌드 시작 - localhost 문제 해결"
echo "======================================"
echo ""

cd ~/marketingplatformproject

# 1. PM2 완전 종료
echo "⏹️  PM2 완전 종료..."
pm2 kill
echo "✅ PM2 종료 완료"
echo ""

# 2. 최신 코드 가져오기
echo "📥 최신 코드 가져오기..."
git fetch origin main
git reset --hard origin/main
echo "✅ 최신 코드 업데이트 완료"
echo ""

# 3. 모든 캐시 삭제
echo "🗑️  모든 캐시 및 빌드 삭제..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.prisma
rm -rf ~/.pm2/logs/*
echo "✅ 캐시 삭제 완료"
echo ""

# 4. 환경변수 파일 생성 (올바른 비밀번호)
echo "🔧 환경변수 설정 (비밀번호: Asungmini77A)..."
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

echo "DATABASE_URL 확인:"
grep DATABASE_URL .env
echo ""

# 5. 환경변수 시스템에 export
export DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
export NODE_ENV=production

# 6. node_modules 재설치
echo "📦 node_modules 재설치..."
rm -rf node_modules package-lock.json
npm install --production=false
echo "✅ 의존성 설치 완료"
echo ""

# 7. Prisma 클라이언트 재생성
echo "🔨 Prisma 클라이언트 생성..."
npx prisma generate --schema=./prisma/schema.prisma
echo "✅ Prisma 생성 완료"
echo ""

# 8. 데이터베이스 연결 테스트
echo "🔍 데이터베이스 연결 테스트..."
node << 'EOF'
const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = "postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

(async () => {
  try {
    await prisma.$connect();
    console.log('✅ 데이터베이스 연결 성공!');
    const count = await prisma.user.count();
    console.log('사용자 수:', count);
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
  }
})();
EOF
echo ""

# 9. Next.js 빌드 (환경변수 강제 전달)
echo "🏗️  Next.js 빌드 (환경변수 포함)..."
DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat" \
NODE_ENV=production \
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 빌드 실패"
    exit 1
fi
echo "✅ 빌드 완료"
echo ""

# 10. PM2 ecosystem 파일 생성 (환경변수 하드코딩)
echo "📝 PM2 설정 파일 생성..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'miraenad',
    script: './node_modules/.bin/next',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat',
      NEXTAUTH_URL: 'https://miraenad.com',
      JWT_SECRET: 'MiraenAdProductionJWTSecretKey2025SuperSecure',
      NEXTAUTH_SECRET: 'MiraenAdProductionNextAuthSecretKey2025SuperSecure',
      NAVER_ADS_API_KEY: '0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af',
      NAVER_ADS_SECRET_KEY: 'AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==',
      NAVER_ADS_CUSTOMER_ID: '1632045'
    }
  }]
}
EOF
echo "✅ PM2 설정 완료"
echo ""

# 11. PM2 시작
echo "🚀 PM2 시작..."
pm2 start ecosystem.config.js
pm2 save --force
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
echo "✅ PM2 시작 완료"
echo ""

# 12. 대기
echo "⏳ 서버 시작 대기 (10초)..."
sleep 10

# 13. 테스트
echo "🧪 서비스 테스트..."

# 헬스 체크
echo "헬스 체크..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$response" = "200" ]; then
    echo "✅ 서버 응답 정상 (HTTP $response)"
else
    echo "❌ 서버 응답 오류 (HTTP $response)"
fi

# 로그인 테스트
echo "로그인 API 테스트..."
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}' \
  -o /tmp/login_test.json \
  -w "%{http_code}")

if [ "$response" = "200" ]; then
    echo "✅ 로그인 성공! (HTTP $response)"
    cat /tmp/login_test.json | python3 -m json.tool 2>/dev/null || cat /tmp/login_test.json
else
    echo "❌ 로그인 실패 (HTTP $response)"
    if [ -f /tmp/login_test.json ]; then
        cat /tmp/login_test.json
    fi
fi
echo ""

# 14. 최종 상태
echo "📊 최종 상태"
echo "======================================"
pm2 status
echo ""

echo "📝 로그 확인:"
pm2 logs miraenad --lines 10 --nostream
echo ""

echo "✅ 완전 재빌드 완료!"
echo ""
echo "🌐 접속: https://miraenad.com"
echo "📧 테스트: admin@marketingplat.com / admin123"
echo ""

# localhost 에러 확인
echo "🔍 localhost 에러 확인:"
pm2 logs miraenad --lines 50 --nostream | grep -i "localhost" || echo "✅ localhost 에러 없음!"