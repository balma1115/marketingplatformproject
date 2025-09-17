#!/bin/bash
# miraenad.com 프로덕션 환경 완전 수정 스크립트

set -e

echo "🔧 miraenad.com 프로덕션 환경 수정 시작"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 프로젝트 디렉토리
cd ~/marketingplatformproject

# 1. .env 파일 완전 재작성
echo -e "${BLUE}🔧 환경변수 파일 재작성...${NC}"

# 백업
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ 기존 .env 백업 완료${NC}"
fi

# 새 .env 파일 생성
cat > .env << 'EOF'
# Production Environment
NODE_ENV=production

# Database - AWS RDS
DATABASE_URL="postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"

# Domain
NEXTAUTH_URL=https://miraenad.com

# JWT & Auth
JWT_SECRET=YourSuperSecureJWTSecret2025MireanadProduction
NEXTAUTH_SECRET=YourSuperSecureNextAuthSecret2025MireanadProduction

# Naver Ads API (키워드 분석용)
NAVER_ADS_API_KEY=0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af
NAVER_ADS_SECRET_KEY=AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==
NAVER_ADS_CUSTOMER_ID=1632045
EOF

echo -e "${GREEN}✅ 환경변수 파일 생성 완료${NC}\n"

# 2. 데이터베이스 연결 테스트
echo -e "${BLUE}🔍 데이터베이스 연결 테스트...${NC}"
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.\$connect();
    console.log('✅ 데이터베이스 연결 성공!');

    // 사용자 수 확인
    const userCount = await prisma.user.count();
    console.log(\`📊 등록된 사용자 수: \${userCount}명\`);

    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    process.exit(1);
  }
})();
" || {
    echo -e "${RED}❌ 데이터베이스 연결 실패${NC}"
    echo -e "${YELLOW}DATABASE_URL을 확인해주세요${NC}"
    exit 1
}
echo ""

# 3. Prisma 클라이언트 재생성
echo -e "${BLUE}🔨 Prisma 클라이언트 재생성...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma 클라이언트 생성 완료${NC}\n"

# 4. PM2 중지
echo -e "${BLUE}⏹️  PM2 중지...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo -e "${GREEN}✅ PM2 중지 완료${NC}\n"

# 5. 캐시 정리
echo -e "${BLUE}🧹 캐시 정리...${NC}"
rm -rf .next
rm -rf node_modules/.cache
echo -e "${GREEN}✅ 캐시 정리 완료${NC}\n"

# 6. 빌드
echo -e "${BLUE}🏗️  Next.js 빌드...${NC}"
npm run build || {
    echo -e "${RED}❌ 빌드 실패${NC}"
    echo -e "${YELLOW}빌드 에러를 확인해주세요${NC}"
    exit 1
}
echo -e "${GREEN}✅ 빌드 완료${NC}\n"

# 7. PM2 시작
echo -e "${BLUE}🚀 PM2 시작...${NC}"

# ecosystem 파일 생성
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'miraenad',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    merge_logs: true,
    time: true
  }]
}
EOF

# 로그 디렉토리 생성
mkdir -p logs

pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✅ PM2 시작 완료${NC}\n"

# 8. 서비스 테스트
echo -e "${BLUE}🧪 서비스 테스트...${NC}"
sleep 5

# 헬스 체크
echo -e "${CYAN}헬스 체크...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ 서버 응답 정상 (HTTP $response)${NC}"
else
    echo -e "${YELLOW}⚠️  서버 응답: HTTP $response${NC}"
fi

# 로그인 API 테스트
echo -e "${CYAN}로그인 API 테스트...${NC}"
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}' \
  -o /tmp/login_response.json \
  -w "%{http_code}")

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ 로그인 API 정상 (HTTP $response)${NC}"
    if [ -f /tmp/login_response.json ]; then
        echo "응답 내용:"
        cat /tmp/login_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/login_response.json
    fi
else
    echo -e "${RED}❌ 로그인 API 오류 (HTTP $response)${NC}"
    if [ -f /tmp/login_response.json ]; then
        echo "에러 내용:"
        cat /tmp/login_response.json
    fi
    echo ""
    echo -e "${YELLOW}로그 확인:${NC}"
    pm2 logs miraenad --lines 20 --nostream
fi
echo ""

# 9. 최종 상태
echo -e "${BLUE}📊 최종 상태${NC}"
echo "======================================"
pm2 status
echo ""

# 10. 완료
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✨ 환경 수정 완료!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${BLUE}📝 유용한 명령어:${NC}"
echo "  pm2 logs miraenad --lines 100  # 로그 확인"
echo "  pm2 monit                      # 실시간 모니터링"
echo "  pm2 restart miraenad           # 앱 재시작"
echo ""
echo -e "${BLUE}🌐 접속 정보:${NC}"
echo "  URL: https://miraenad.com"
echo "  테스트: admin@marketingplat.com / admin123"
echo ""

# 에러가 있으면 로그 자동 표시
if [ "$response" != "200" ]; then
    echo -e "${YELLOW}⚠️  문제가 감지되어 최근 로그를 표시합니다:${NC}"
    pm2 logs miraenad --lines 50 --nostream
fi