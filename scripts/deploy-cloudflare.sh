#!/bin/bash
# miraenad.com Cloudflare 전용 배포 스크립트

set -e

echo "🚀 miraenad.com Cloudflare 배포 시작"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 프로젝트 디렉토리 설정
PROJECT_DIR="$HOME/marketingplatformproject"
cd "$PROJECT_DIR"
echo "📁 작업 디렉토리: $PROJECT_DIR"

# 1. Git 최신 코드
echo -e "${BLUE}📥 최신 코드 가져오기...${NC}"
git pull origin main
echo -e "${GREEN}✅ 코드 업데이트 완료${NC}\n"

# 2. 환경변수 확인
echo -e "${BLUE}🔧 환경변수 확인...${NC}"
if [ -f .env ]; then
    if grep -q "DATABASE_URL.*amazonaws" .env; then
        echo -e "${GREEN}✅ AWS RDS 설정 확인${NC}"
    else
        echo -e "${YELLOW}⚠️  DATABASE_URL을 AWS RDS로 변경 필요${NC}"
    fi

    if grep -q "NEXTAUTH_URL=https://miraenad.com" .env; then
        echo -e "${GREEN}✅ NEXTAUTH_URL 설정 확인${NC}"
    else
        echo -e "${YELLOW}⚠️  NEXTAUTH_URL을 https://miraenad.com으로 설정 필요${NC}"
    fi
else
    echo -e "${RED}❌ .env 파일이 없습니다${NC}"
    exit 1
fi
echo ""

# 3. PM2 재시작
echo -e "${BLUE}🔄 PM2 재시작...${NC}"
pm2 restart miraenad || pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✅ PM2 재시작 완료${NC}\n"

# 4. Nginx 설정 (sudo 권한 필요시만)
if [ "$1" = "--nginx" ]; then
    echo -e "${BLUE}🔧 Nginx 설정 업데이트...${NC}"
    echo -e "${YELLOW}sudo 권한이 필요합니다${NC}"

    sudo cp nginx/miraenad-cloudflare.conf /etc/nginx/sites-available/miraenad
    sudo ln -sf /etc/nginx/sites-available/miraenad /etc/nginx/sites-enabled/miraenad
    sudo rm -f /etc/nginx/sites-enabled/default

    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ Nginx 설정 완료 (Cloudflare 모드)${NC}"
    else
        echo -e "${RED}❌ Nginx 설정 오류${NC}"
    fi
    echo ""
fi

# 5. 서비스 테스트
echo -e "${BLUE}🧪 서비스 테스트...${NC}"
sleep 3

# 로컬 헬스 체크
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ 로컬 서버 정상${NC}"
else
    echo -e "${RED}❌ 로컬 서버 응답 없음${NC}"
fi

# API 테스트
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}' \
  -w "\n%{http_code}" 2>/dev/null || echo "000")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ API 정상 (HTTP $http_code)${NC}"
else
    echo -e "${YELLOW}⚠️  API 응답: HTTP $http_code${NC}"
fi

# 6. 완료
echo ""
echo -e "${GREEN}======================================"
echo "✨ 배포 완료!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}📝 명령어:${NC}"
echo "  pm2 logs miraenad        # 로그 보기"
echo "  pm2 monit                # 모니터링"
echo ""
echo -e "${BLUE}🌐 접속 주소:${NC}"
echo "  https://miraenad.com (Cloudflare 경유)"
echo ""
echo -e "${CYAN}💡 Nginx 설정 업데이트가 필요한 경우:${NC}"
echo "  bash scripts/deploy-cloudflare.sh --nginx"
echo ""