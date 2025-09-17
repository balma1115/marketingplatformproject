#!/bin/bash
# miraenad.com 최종 수정 스크립트 - 리다이렉트 및 500 에러 해결

set -e

echo "🔧 miraenad.com 최종 수정 시작"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

cd ~/marketingplatformproject

# 1. 최신 코드 가져오기 (권한 문제 해결)
echo -e "${BLUE}📥 최신 코드 가져오기...${NC}"

# 권한 문제 방지
sudo chown -R ubuntu:ubuntu ~/marketingplatformproject 2>/dev/null || true

# 기존 변경사항 제거하고 최신 코드로
git fetch origin main
git reset --hard origin/main
git clean -fd

echo -e "${GREEN}✅ 최신 코드 업데이트 완료${NC}\n"

# 2. 환경변수 파일 생성 (필수!)
echo -e "${BLUE}🔧 환경변수 설정...${NC}"

cat > .env << 'EOF'
# Production Environment for miraenad.com
NODE_ENV=production

# Database - AWS RDS (절대 변경하지 마세요)
DATABASE_URL="postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"

# Domain Configuration
NEXTAUTH_URL=https://miraenad.com

# Authentication Secrets (중요: 프로덕션용)
JWT_SECRET=MiraenAdProductionJWTSecretKey2025SuperSecure
NEXTAUTH_SECRET=MiraenAdProductionNextAuthSecretKey2025SuperSecure

# Naver Ads API (키워드 분석용)
NAVER_ADS_API_KEY=0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af
NAVER_ADS_SECRET_KEY=AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==
NAVER_ADS_CUSTOMER_ID=1632045

# 추가 설정
PORT=3000
EOF

echo -e "${GREEN}✅ 환경변수 설정 완료${NC}\n"

# 3. 데이터베이스 연결 테스트
echo -e "${BLUE}🔍 데이터베이스 연결 테스트...${NC}"

# 간단한 연결 테스트
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.\$connect();
    const userCount = await prisma.user.count();
    console.log('✅ DB 연결 성공! 사용자 수:', userCount);
    await prisma.\$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ DB 연결 실패:', error.message);
    process.exit(1);
  }
})();
" || {
    echo -e "${YELLOW}⚠️  DB 연결 테스트 실패 - 계속 진행${NC}"
}
echo ""

# 4. PM2 중지
echo -e "${BLUE}⏹️  PM2 중지...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo -e "${GREEN}✅ PM2 중지 완료${NC}\n"

# 5. 캐시 및 빌드 정리
echo -e "${BLUE}🧹 캐시 정리...${NC}"
rm -rf .next
rm -rf node_modules/.cache
echo -e "${GREEN}✅ 캐시 정리 완료${NC}\n"

# 6. 의존성 설치
echo -e "${BLUE}📦 의존성 설치...${NC}"
npm install --production=false
npx prisma generate
echo -e "${GREEN}✅ 의존성 설치 완료${NC}\n"

# 7. 빌드
echo -e "${BLUE}🏗️  Next.js 빌드...${NC}"
npm run build || {
    echo -e "${RED}❌ 빌드 실패${NC}"
    exit 1
}
echo -e "${GREEN}✅ 빌드 완료${NC}\n"

# 8. PM2 설정 및 시작
echo -e "${BLUE}🚀 PM2 시작...${NC}"

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'miraenad',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/ubuntu/marketingplatformproject',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/marketingplatformproject/logs/error.log',
    out_file: '/home/ubuntu/marketingplatformproject/logs/out.log',
    merge_logs: true,
    time: true
  }]
}
EOF

# 로그 디렉토리 생성
mkdir -p logs

# PM2 시작
pm2 start ecosystem.config.js
pm2 save --force
echo -e "${GREEN}✅ PM2 시작 완료${NC}\n"

# 9. Nginx 설정 업데이트 (Cloudflare용)
echo -e "${BLUE}🔧 Nginx 설정 확인...${NC}"

if [ -f nginx/miraenad-cloudflare.conf ]; then
    echo -e "${CYAN}Cloudflare용 Nginx 설정 적용${NC}"
    sudo cp nginx/miraenad-cloudflare.conf /etc/nginx/sites-available/miraenad
    sudo ln -sf /etc/nginx/sites-available/miraenad /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default

    # Nginx 테스트 및 재시작
    if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ Nginx 설정 완료${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx 설정 오류 - 수동 확인 필요${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Nginx 설정 파일 없음${NC}"
fi
echo ""

# 10. 서비스 테스트 (지연 시간 증가)
echo -e "${BLUE}🧪 서비스 테스트...${NC}"
echo "서버 시작 대기 중..."
sleep 10

# 헬스 체크
echo -e "${CYAN}헬스 체크...${NC}"
for i in {1..3}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ 서버 응답 정상 (HTTP $response)${NC}"
        break
    else
        echo -e "${YELLOW}시도 $i/3: HTTP $response${NC}"
        sleep 5
    fi
done

# API 테스트
echo -e "${CYAN}API 테스트...${NC}"
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}' \
  -o /tmp/login_response.json \
  -w "%{http_code}" 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ 로그인 API 정상 (HTTP $response)${NC}"
    echo "응답:"
    cat /tmp/login_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/login_response.json
elif [ "$response" = "401" ]; then
    echo -e "${YELLOW}⚠️  로그인 실패 (HTTP 401) - 인증 정보 확인 필요${NC}"
else
    echo -e "${RED}❌ API 오류 (HTTP $response)${NC}"
    if [ -f /tmp/login_response.json ]; then
        echo "응답 내용:"
        cat /tmp/login_response.json
    fi
    echo ""
    echo "PM2 로그:"
    pm2 logs miraenad --lines 30 --nostream
fi
echo ""

# 11. 최종 상태
echo -e "${BLUE}📊 최종 상태${NC}"
echo "======================================"
pm2 status
echo ""

# 12. Cloudflare 설정 안내
echo -e "${YELLOW}⚠️  Cloudflare 설정 확인 필요:${NC}"
echo "1. SSL/TLS → Overview → 'Flexible' 또는 'Full' 모드 선택"
echo "2. SSL/TLS → Edge Certificates → 'Always Use HTTPS' 비활성화"
echo "3. Rules → Page Rules → 캐시 레벨 설정"
echo ""

# 13. 완료
echo -e "${GREEN}======================================"
echo "✨ 최종 수정 완료!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}🌐 접속 정보:${NC}"
echo "  URL: https://miraenad.com"
echo "  테스트: admin@marketingplat.com / admin123"
echo ""
echo -e "${BLUE}📝 디버깅 명령어:${NC}"
echo "  pm2 logs miraenad --lines 100     # PM2 로그"
echo "  sudo tail -f /var/log/nginx/miraenad_error.log  # Nginx 에러"
echo "  curl -I https://miraenad.com      # 헤더 확인"
echo "  curl http://localhost:3000        # 로컬 테스트"
echo ""

# 문제가 있으면 상세 진단
if [ "$response" != "200" ]; then
    echo -e "${RED}⚠️  문제 진단 정보:${NC}"
    echo ""
    echo "1. 환경변수 확인:"
    grep -E "DATABASE_URL|NEXTAUTH_URL" .env
    echo ""
    echo "2. PM2 프로세스:"
    pm2 list
    echo ""
    echo "3. 포트 사용 확인:"
    netstat -tlnp 2>/dev/null | grep 3000 || ss -tlnp | grep 3000
    echo ""
    echo "4. 최근 에러 로그:"
    pm2 logs miraenad --lines 50 --nostream --err
fi