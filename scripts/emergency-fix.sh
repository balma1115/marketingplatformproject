#!/bin/bash
# 긴급 수정: 데이터베이스 연결 문제 해결

echo "🚨 긴급 수정 시작 - 데이터베이스 연결 문제"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd ~/marketingplatformproject

# 1. PM2 중지
echo -e "${BLUE}⏹️  PM2 중지...${NC}"
pm2 stop miraenad 2>/dev/null || true
pm2 delete miraenad 2>/dev/null || true
echo -e "${GREEN}✅ PM2 중지 완료${NC}\n"

# 2. 기존 빌드 완전 삭제
echo -e "${BLUE}🗑️  기존 빌드 삭제...${NC}"
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.prisma
echo -e "${GREEN}✅ 빌드 삭제 완료${NC}\n"

# 3. 환경변수 파일 재생성 (절대 확실하게)
echo -e "${BLUE}🔧 환경변수 재설정...${NC}"

# 기존 .env 백업
if [ -f .env ]; then
    mv .env .env.old
fi

# 새로운 .env 생성
cat > .env << 'ENVEOF'
# CRITICAL: Production Database Configuration
NODE_ENV=production
DATABASE_URL="postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"

# Domain
NEXTAUTH_URL=https://miraenad.com

# Auth Secrets
JWT_SECRET=MiraenAdProductionJWTSecretKey2025SuperSecure
NEXTAUTH_SECRET=MiraenAdProductionNextAuthSecretKey2025SuperSecure

# Naver Ads
NAVER_ADS_API_KEY=0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af
NAVER_ADS_SECRET_KEY=AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==
NAVER_ADS_CUSTOMER_ID=1632045

PORT=3000
ENVEOF

echo -e "${GREEN}✅ 환경변수 설정 완료${NC}"
echo "DATABASE_URL 확인:"
grep DATABASE_URL .env
echo ""

# 4. 환경변수 export (빌드 시 사용)
export DATABASE_URL="postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
export NODE_ENV=production
export NEXTAUTH_URL=https://miraenad.com

# 5. Prisma 클라이언트 재생성
echo -e "${BLUE}🔨 Prisma 클라이언트 재생성...${NC}"

# Prisma 스키마 파일에서 DATABASE_URL 확인
if [ -f prisma/schema.prisma ]; then
    echo "Prisma 스키마 데이터소스 확인:"
    grep -A2 "datasource db" prisma/schema.prisma
fi

# Prisma 재생성
npx prisma generate --schema=./prisma/schema.prisma

echo -e "${GREEN}✅ Prisma 클라이언트 생성 완료${NC}\n"

# 6. 데이터베이스 연결 테스트
echo -e "${BLUE}🔍 데이터베이스 연결 테스트...${NC}"

node << 'NODEEOF'
const { PrismaClient } = require('@prisma/client');

// 환경변수 직접 설정
process.env.DATABASE_URL = "postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error', 'warn']
});

(async () => {
  try {
    await prisma.$connect();
    console.log('✅ 데이터베이스 연결 성공!');
    const userCount = await prisma.user.count();
    console.log(`사용자 수: ${userCount}`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    process.exit(1);
  }
})();
NODEEOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 데이터베이스 연결 실패 - 계속 진행${NC}"
fi
echo ""

# 7. Next.js 빌드 (환경변수 포함)
echo -e "${BLUE}🏗️  Next.js 빌드 (환경변수 강제 적용)...${NC}"

# 빌드 시 환경변수 명시적 전달
DATABASE_URL="postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat" \
NODE_ENV=production \
NEXTAUTH_URL=https://miraenad.com \
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 빌드 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 빌드 완료${NC}\n"

# 8. PM2 재시작 (환경변수 포함)
echo -e "${BLUE}🚀 PM2 시작...${NC}"

# ecosystem 파일 생성 (환경변수 명시)
cat > ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [{
    name: 'miraenad',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/home/ubuntu/marketingplatformproject',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat',
      NEXTAUTH_URL: 'https://miraenad.com',
      JWT_SECRET: 'MiraenAdProductionJWTSecretKey2025SuperSecure',
      NEXTAUTH_SECRET: 'MiraenAdProductionNextAuthSecretKey2025SuperSecure'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    merge_logs: true,
    time: true
  }]
}
PMEOF

mkdir -p logs

# PM2 시작
pm2 start ecosystem.config.js
pm2 save --force

echo -e "${GREEN}✅ PM2 시작 완료${NC}\n"

# 9. 서비스 테스트
echo -e "${BLUE}🧪 서비스 테스트...${NC}"
sleep 8

# 헬스 체크
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
echo -e "헬스 체크: HTTP $response"

# API 테스트
echo -e "${BLUE}API 테스트...${NC}"
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}' \
  -o /tmp/login_test.json \
  -w "%{http_code}")

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ 로그인 API 정상 작동! (HTTP $response)${NC}"
    cat /tmp/login_test.json | python3 -m json.tool
else
    echo -e "${RED}❌ API 오류 (HTTP $response)${NC}"
    if [ -f /tmp/login_test.json ]; then
        cat /tmp/login_test.json
    fi
    echo ""
    echo "PM2 에러 로그:"
    pm2 logs miraenad --lines 20 --err --nostream
fi
echo ""

# 10. 최종 확인
echo -e "${BLUE}📊 최종 상태${NC}"
echo "======================================"
pm2 status
echo ""

echo -e "${GREEN}✨ 긴급 수정 완료!${NC}"
echo ""
echo -e "${BLUE}확인 사항:${NC}"
echo "1. 데이터베이스 연결: AWS RDS로 변경됨"
echo "2. 환경변수: PM2 ecosystem에 하드코딩됨"
echo "3. Prisma 클라이언트: 재생성됨"
echo ""

if [ "$response" != "200" ]; then
    echo -e "${YELLOW}⚠️  여전히 문제가 있다면:${NC}"
    echo "1. pm2 logs miraenad --lines 100"
    echo "2. cat .env | grep DATABASE_URL"
    echo "3. pm2 restart miraenad"
fi