#!/bin/bash
# EC2 권한 문제 해결 및 강제 업데이트 스크립트

echo "🔧 EC2 권한 문제 해결 시작"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 현재 사용자 확인
CURRENT_USER=$(whoami)
echo -e "${BLUE}현재 사용자: ${CYAN}$CURRENT_USER${NC}"
echo ""

cd ~/marketingplatformproject

# 1. 중요한 파일 백업 (홈 디렉토리에)
echo -e "${BLUE}📦 중요 파일 백업...${NC}"
if [ -f .env ]; then
    cp .env ~/.env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ .env 백업 완료 (홈 디렉토리)${NC}"
fi
echo ""

# 2. 권한 문제 해결
echo -e "${BLUE}🔐 디렉토리 권한 수정...${NC}"

# .git 디렉토리 권한 수정
if [ -d .git ]; then
    echo "Git 디렉토리 권한 수정 중..."
    sudo chown -R $CURRENT_USER:$CURRENT_USER .git
    chmod -R 755 .git
    echo -e "${GREEN}✅ .git 권한 수정 완료${NC}"
fi

# .next 디렉토리 삭제 (빌드 캐시 - 재생성 가능)
if [ -d .next ]; then
    echo ".next 빌드 캐시 삭제 중..."
    sudo rm -rf .next
    echo -e "${GREEN}✅ .next 삭제 완료${NC}"
fi

# node_modules 권한 수정
if [ -d node_modules ]; then
    echo "node_modules 권한 수정 중..."
    sudo chown -R $CURRENT_USER:$CURRENT_USER node_modules
    echo -e "${GREEN}✅ node_modules 권한 수정 완료${NC}"
fi

# 전체 프로젝트 디렉토리 권한 수정
sudo chown -R $CURRENT_USER:$CURRENT_USER ~/marketingplatformproject
chmod -R 755 ~/marketingplatformproject
echo -e "${GREEN}✅ 프로젝트 디렉토리 권한 수정 완료${NC}"
echo ""

# 3. Git 설정 초기화
echo -e "${BLUE}🔄 Git 상태 초기화...${NC}"

# Git 캐시 정리
git gc --prune=now
echo -e "${GREEN}✅ Git 캐시 정리 완료${NC}"

# 로컬 변경사항 강제 리셋
echo -e "${YELLOW}⚠️  로컬 변경사항을 모두 삭제하고 최신 코드로 업데이트합니다${NC}"
git fetch origin main
git reset --hard origin/main
git clean -fd
echo -e "${GREEN}✅ 최신 코드로 강제 업데이트 완료${NC}"
echo ""

# 4. 환경변수 파일 복원
echo -e "${BLUE}🔧 환경변수 파일 생성...${NC}"

# 프로덕션용 .env 파일 생성
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

# Naver Ads API
NAVER_ADS_API_KEY=0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af
NAVER_ADS_SECRET_KEY=AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==
NAVER_ADS_CUSTOMER_ID=1632045
EOF

echo -e "${GREEN}✅ .env 파일 생성 완료${NC}"
echo ""

# 5. 의존성 재설치
echo -e "${BLUE}📦 의존성 클린 설치...${NC}"

# node_modules 완전 삭제 후 재설치
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --production=false

# Prisma 클라이언트 생성
npx prisma generate

echo -e "${GREEN}✅ 의존성 설치 완료${NC}"
echo ""

# 6. 빌드
echo -e "${BLUE}🏗️  Next.js 빌드...${NC}"
npm run build || {
    echo -e "${RED}❌ 빌드 실패${NC}"
    echo "빌드 에러 내용:"
    exit 1
}
echo -e "${GREEN}✅ 빌드 완료${NC}"
echo ""

# 7. PM2 재시작
echo -e "${BLUE}🚀 PM2 재시작...${NC}"

# PM2 완전 리셋
pm2 kill 2>/dev/null || true
pm2 flush  # 로그 정리

# ecosystem 파일 생성
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'miraenad',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
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

# PM2 시작
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

echo -e "${GREEN}✅ PM2 재시작 완료${NC}"
echo ""

# 8. 서비스 테스트
echo -e "${BLUE}🧪 서비스 테스트...${NC}"
sleep 8

# 헬스 체크
echo -e "${CYAN}헬스 체크...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ 서버 응답 정상 (HTTP $response)${NC}"
else
    echo -e "${RED}❌ 서버 응답 오류 (HTTP $response)${NC}"
    echo "PM2 로그 확인:"
    pm2 logs miraenad --lines 20 --nostream
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
else
    echo -e "${RED}❌ 로그인 API 오류 (HTTP $response)${NC}"
    if [ -f /tmp/login_response.json ]; then
        echo "응답 내용:"
        cat /tmp/login_response.json
    fi
fi
echo ""

# 9. Nginx 상태 확인
echo -e "${BLUE}🔍 Nginx 상태 확인...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx 실행 중${NC}"
    # Nginx 재시작
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx 재시작 완료${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx가 실행되지 않음${NC}"
fi
echo ""

# 10. 최종 상태
echo -e "${BLUE}📊 최종 상태${NC}"
echo "======================================"
pm2 status
echo ""

# 11. 완료
echo -e "${GREEN}======================================"
echo "✨ 권한 문제 해결 및 배포 완료!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}🌐 접속 정보:${NC}"
echo "  URL: https://miraenad.com"
echo "  테스트: admin@marketingplat.com / admin123"
echo ""
echo -e "${BLUE}📝 유용한 명령어:${NC}"
echo "  pm2 logs miraenad --lines 100  # 로그 확인"
echo "  pm2 monit                      # 실시간 모니터링"
echo "  sudo systemctl status nginx    # Nginx 상태"
echo ""
echo -e "${YELLOW}💾 백업 파일:${NC}"
echo "  ~/.env.backup.*  # 홈 디렉토리의 .env 백업"
echo ""

# 문제가 있으면 상세 로그 표시
if [ "$response" != "200" ]; then
    echo -e "${YELLOW}⚠️  문제 진단 로그:${NC}"
    pm2 logs miraenad --lines 50 --nostream
fi