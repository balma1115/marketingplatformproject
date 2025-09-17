#!/bin/bash
# ec2-pull-deploy.sh - EC2에서 Git pull 후 자동 배포
# EC2에 배치하여 실행하는 스크립트

echo "🔄 EC2 자동 업데이트 시작..."

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 디렉토리
APP_DIR="/home/ubuntu/marketingplatformproject"

# 디렉토리 이동
cd $APP_DIR
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 프로젝트 디렉토리를 찾을 수 없습니다: $APP_DIR${NC}"
    exit 1
fi

# 1. 현재 브랜치와 커밋 확인
echo -e "${BLUE}📍 현재 상태 확인...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "브랜치: $CURRENT_BRANCH"
echo "커밋: $CURRENT_COMMIT"

# 2. Git pull
echo -e "${BLUE}📥 최신 코드 가져오기...${NC}"
git fetch origin
git pull origin $CURRENT_BRANCH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull 실패! 충돌이 있을 수 있습니다.${NC}"
    echo "수동으로 해결이 필요합니다:"
    echo "  git status"
    echo "  git stash  # 로컬 변경사항 임시 저장"
    echo "  git pull origin main"
    exit 1
fi

NEW_COMMIT=$(git rev-parse HEAD)

# 3. 변경사항 확인
if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    echo -e "${YELLOW}⚠️  변경사항이 없습니다.${NC}"
    exit 0
fi

echo -e "${GREEN}✅ 새로운 커밋 감지: $NEW_COMMIT${NC}"

# 4. 의존성 업데이트 체크
echo -e "${BLUE}📦 의존성 확인...${NC}"
if git diff $CURRENT_COMMIT $NEW_COMMIT --name-only | grep -q "package-lock.json"; then
    echo "package-lock.json 변경 감지 - 의존성 설치..."
    npm ci --production=false
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ npm ci 실패!${NC}"
        exit 1
    fi
fi

# 5. Prisma 스키마 변경 체크
if git diff $CURRENT_COMMIT $NEW_COMMIT --name-only | grep -q "prisma/schema.prisma"; then
    echo -e "${BLUE}🗄️  Prisma 스키마 변경 감지...${NC}"
    npx prisma generate

    # 마이그레이션 실행 (주의: 프로덕션에서는 신중하게)
    echo -e "${YELLOW}⚠️  데이터베이스 마이그레이션 필요할 수 있습니다.${NC}"
    echo "수동 실행: npx prisma migrate deploy"

    # 자동 실행을 원하면 아래 주석 해제
    # npx prisma migrate deploy
fi

# 6. 프로덕션 빌드
echo -e "${BLUE}🔨 프로덕션 빌드...${NC}"
NODE_OPTIONS="--max-old-space-size=2048" npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 빌드 실패!${NC}"
    echo "롤백 중..."
    git reset --hard $CURRENT_COMMIT
    npm ci --production=false
    npm run build
    pm2 restart marketingplat
    exit 1
fi

# 7. PM2 재시작
echo -e "${BLUE}🔄 PM2 재시작...${NC}"
pm2 restart marketingplat

# Zero-downtime 재시작을 원하는 경우
# pm2 reload marketingplat

# 8. 헬스 체크
echo -e "${BLUE}🏥 헬스 체크...${NC}"
sleep 5

# 앱이 정상적으로 실행 중인지 확인
pm2 status marketingplat | grep -q "online"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 애플리케이션이 정상적으로 실행 중입니다.${NC}"
else
    echo -e "${RED}❌ 애플리케이션 실행 실패!${NC}"
    pm2 logs marketingplat --lines 50
    exit 1
fi

# HTTP 응답 체크
curl -f http://localhost:3000/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ HTTP 응답 정상${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP 응답 실패 - 확인 필요${NC}"
fi

# 9. 변경 내역 표시
echo -e "\n${BLUE}📋 변경 내역:${NC}"
git log $CURRENT_COMMIT..$NEW_COMMIT --oneline

echo -e "\n${GREEN}🎉 배포 완료!${NC}"
echo "이전 커밋: $CURRENT_COMMIT"
echo "현재 커밋: $NEW_COMMIT"

# 10. 로그 모니터링 제안
echo -e "\n${YELLOW}💡 로그 모니터링:${NC}"
echo "  pm2 logs marketingplat --follow"