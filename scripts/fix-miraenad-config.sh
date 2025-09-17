#!/bin/bash

echo "======================================"
echo "🔧 MiraeNAD 설정 수정 스크립트"
echo "======================================"

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 프로젝트 경로
PROJECT_DIR="/home/ubuntu/marketingplatformproject"

echo -e "${YELLOW}1. 프로젝트 디렉토리로 이동...${NC}"
cd $PROJECT_DIR

echo -e "${YELLOW}2. PM2 상태 확인...${NC}"
pm2 status

echo -e "${YELLOW}3. 잘못된 marketingplat 앱 삭제...${NC}"
pm2 delete marketingplat 2>/dev/null || true

echo -e "${YELLOW}4. GitHub에서 최신 설정 Pull...${NC}"
git stash
git pull origin main --force

echo -e "${YELLOW}5. 환경 변수 설정 확인...${NC}"
if [ -f ".env.production" ]; then
    echo "✅ .env.production 파일 존재"
    # miraenad.com 설정 확인
    grep "miraenad.com" .env.production || echo -e "${RED}⚠️ miraenad.com 설정이 없습니다. 수동으로 수정 필요!${NC}"
else
    echo -e "${RED}❌ .env.production 파일이 없습니다!${NC}"
    cp .env.production.template .env.production 2>/dev/null || true
fi

echo -e "${YELLOW}6. 의존성 설치...${NC}"
npm install

echo -e "${YELLOW}7. Prisma 클라이언트 생성...${NC}"
npx prisma generate

echo -e "${YELLOW}8. Next.js 재빌드...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}빌드 실패!${NC}"
    exit 1
fi

echo -e "${YELLOW}9. miraenad 앱 재시작...${NC}"
pm2 restart miraenad || pm2 start npm --name miraenad -- start

echo -e "${YELLOW}10. PM2 설정 저장...${NC}"
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo -e "${GREEN}========================================"
echo -e "✅ 설정 수정 완료!"
echo -e "========================================"
echo ""
echo -e "${YELLOW}현재 PM2 상태:${NC}"
pm2 status
echo ""
echo -e "${YELLOW}miraenad 앱 로그 확인:${NC}"
pm2 logs miraenad --lines 20
echo ""
echo -e "${GREEN}웹사이트: https://miraenad.com${NC}"