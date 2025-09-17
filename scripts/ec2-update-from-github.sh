#!/bin/bash

# EC2에서 실행할 업데이트 스크립트
# 이 파일을 EC2 서버의 프로젝트 폴더에 복사해서 사용하세요

echo "========================================"
echo "🚀 MarketingPlat 자동 업데이트"
echo "========================================"

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 프로젝트 경로
PROJECT_DIR="/home/ubuntu/marketingplatformproject"

echo -e "${YELLOW}1. 프로젝트 디렉토리로 이동...${NC}"
cd $PROJECT_DIR

echo -e "${YELLOW}2. GitHub에서 최신 코드 Pull...${NC}"
git stash
git pull origin main --force

if [ $? -ne 0 ]; then
    echo -e "${RED}Git pull 실패!${NC}"
    exit 1
fi

echo -e "${YELLOW}3. 의존성 설치...${NC}"
npm install

echo -e "${YELLOW}4. Prisma 클라이언트 생성...${NC}"
npx prisma generate

echo -e "${YELLOW}5. Next.js 빌드...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}빌드 실패!${NC}"
    exit 1
fi

echo -e "${YELLOW}6. PM2 서비스 재시작...${NC}"
# miraenad 앱 재시작 (이미 실행 중인 앱)
pm2 restart miraenad || pm2 start npm --name miraenad -- start
# marketingplat 앱이 있다면 삭제
pm2 delete marketingplat 2>/dev/null || true
pm2 save

echo -e "${GREEN}========================================"
echo -e "✅ 업데이트 완료!"
echo -e "========================================"
echo ""
echo -e "${YELLOW}상태 확인:${NC}"
pm2 status
echo ""
echo -e "${YELLOW}로그 확인: pm2 logs${NC}"