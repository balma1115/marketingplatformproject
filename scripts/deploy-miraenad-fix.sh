#!/bin/bash
# miraenad.com 완전 수정 및 배포 스크립트

set -e

echo "🔧 miraenad.com 완전 수정 및 배포 시작"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 프로젝트 디렉토리
cd ~/marketingplatformproject

# 1. Git 최신 코드 가져오기
echo -e "${BLUE}📥 최신 코드 가져오기...${NC}"
git stash 2>/dev/null || true
git pull origin main
echo -e "${GREEN}✅ 코드 업데이트 완료${NC}"
echo ""

# 2. 환경변수 설정
echo -e "${BLUE}🔧 환경변수 설정...${NC}"

# .env 파일 백업
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ .env 백업 완료${NC}"
fi

# .env 파일 확인 및 수정
if ! grep -q "DATABASE_URL" .env; then
    echo "DATABASE_URL=\"postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat\"" >> .env
    echo -e "${GREEN}✅ DATABASE_URL 추가${NC}"
fi

if ! grep -q "NODE_ENV" .env; then
    echo "NODE_ENV=production" >> .env
    echo -e "${GREEN}✅ NODE_ENV 추가${NC}"
fi

if ! grep -q "NEXTAUTH_URL" .env; then
    echo "NEXTAUTH_URL=https://miraenad.com" >> .env
    echo -e "${GREEN}✅ NEXTAUTH_URL 추가${NC}"
fi

# localhost를 AWS RDS로 변경
sed -i 's|localhost:5432|marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432|g' .env
echo -e "${GREEN}✅ 환경변수 설정 완료${NC}"
echo ""

# 3. PM2 중지
echo -e "${BLUE}⏹️  PM2 중지...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo -e "${GREEN}✅ PM2 중지 완료${NC}"
echo ""

# 4. 빌드 파일 정리
echo -e "${BLUE}🧹 빌드 파일 정리...${NC}"
rm -rf .next
rm -rf node_modules/.cache
echo -e "${GREEN}✅ 빌드 파일 정리 완료${NC}"
echo ""

# 5. 의존성 설치
echo -e "${BLUE}📦 의존성 설치...${NC}"
npm install --production=false
echo -e "${GREEN}✅ 의존성 설치 완료${NC}"
echo ""

# 6. Prisma 클라이언트 생성
echo -e "${BLUE}🔨 Prisma 클라이언트 생성...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma 클라이언트 생성 완료${NC}"
echo ""

# 7. 데이터베이스 테스트
echo -e "${BLUE}🔍 데이터베이스 연결 테스트...${NC}"
npx tsx scripts/debug-login.ts <<EOF
n
EOF
echo ""

# 8. Next.js 빌드
echo -e "${BLUE}🏗️  Next.js 빌드 중... (시간이 걸릴 수 있습니다)${NC}"
npm run build
echo -e "${GREEN}✅ Next.js 빌드 완료${NC}"
echo ""

# 9. PM2로 시작
echo -e "${BLUE}🚀 PM2로 앱 시작...${NC}"

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
    error_file: '~/.pm2/logs/miraenad-error.log',
    out_file: '~/.pm2/logs/miraenad-out.log',
    time: true
  }]
}
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
echo -e "${GREEN}✅ PM2 시작 완료${NC}"
echo ""

# 10. Nginx 설정 확인
echo -e "${BLUE}🔍 Nginx 설정 확인...${NC}"
if [ -f /etc/nginx/sites-available/miraenad ]; then
    echo -e "${GREEN}✅ Nginx 설정 존재${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx 설정이 없습니다. 수동 설정 필요${NC}"
fi
echo ""

# 11. 상태 확인
echo -e "${BLUE}📊 상태 확인${NC}"
echo "======================================"
pm2 status
echo ""

# 12. API 테스트
echo -e "${BLUE}🧪 API 테스트${NC}"
sleep 5  # PM2 시작 대기

# 헬스 체크
echo -e "${YELLOW}헬스 체크...${NC}"
curl -s http://localhost:3000 > /dev/null && echo -e "${GREEN}✅ 서버 응답 정상${NC}" || echo -e "${RED}❌ 서버 응답 없음${NC}"

# 로그인 API 테스트
echo -e "${YELLOW}로그인 API 테스트...${NC}"
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}' \
  -w "\n%{http_code}")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ 로그인 API 정상 (HTTP $http_code)${NC}"
else
    echo -e "${RED}❌ 로그인 API 오류 (HTTP $http_code)${NC}"
    echo "응답: $(echo "$response" | head -n-1)"
fi
echo ""

# 13. 완료 메시지
echo -e "${GREEN}======================================"
echo "✨ 배포 완료!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}📝 다음 명령어로 확인:${NC}"
echo "  pm2 logs miraenad          # 로그 확인"
echo "  pm2 monit                  # 모니터링"
echo "  curl http://localhost:3000 # 로컬 테스트"
echo ""
echo -e "${BLUE}🌐 웹사이트:${NC} https://miraenad.com"
echo -e "${BLUE}🔐 테스트 계정:${NC}"
echo "  admin@marketingplat.com / admin123"
echo "  academy@marketingplat.com / academy123"
echo ""
echo -e "${YELLOW}⚠️  문제가 있다면:${NC}"
echo "  npx tsx scripts/debug-login.ts    # 로그인 문제 진단"
echo "  pm2 logs miraenad --lines 100     # 상세 로그 확인"