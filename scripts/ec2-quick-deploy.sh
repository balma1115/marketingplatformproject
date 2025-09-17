#!/bin/bash

echo "======================================"
echo "EC2 빠른 배포 스크립트"
echo "======================================"

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 프로젝트 경로
PROJECT_DIR="/home/ubuntu/marketingplatformproject"

echo -e "${YELLOW}1. Git Pull...${NC}"
cd $PROJECT_DIR
git stash
git pull origin main --force

echo -e "${YELLOW}2. 의존성 설치...${NC}"
npm install

echo -e "${YELLOW}3. Prisma 클라이언트 생성...${NC}"
DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat" npx prisma generate

echo -e "${YELLOW}4. Next.js 빌드...${NC}"
DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat" npm run build

echo -e "${YELLOW}5. PM2 재시작...${NC}"
pm2 restart marketingplat

echo -e "${GREEN}✅ 배포 완료!${NC}"
echo ""
echo "로그 확인: pm2 logs"
echo "상태 확인: pm2 status"