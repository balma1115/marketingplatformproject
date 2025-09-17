#!/bin/bash

echo "======================================"
echo "Git 권한 문제 해결 스크립트"
echo "======================================"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/home/ubuntu/marketingplatformproject"

echo -e "${YELLOW}1. 현재 .git 디렉토리 권한 확인...${NC}"
ls -la $PROJECT_DIR/.git

echo -e "${YELLOW}2. .git 디렉토리 소유권 변경...${NC}"
sudo chown -R ubuntu:ubuntu $PROJECT_DIR/.git
sudo chown -R ubuntu:ubuntu $PROJECT_DIR

echo -e "${YELLOW}3. .git 디렉토리 권한 설정...${NC}"
chmod -R 755 $PROJECT_DIR/.git

echo -e "${YELLOW}4. git 설정 초기화...${NC}"
cd $PROJECT_DIR
git config --global --add safe.directory $PROJECT_DIR

echo -e "${YELLOW}5. 기존 변경사항 저장...${NC}"
git stash --include-untracked

echo -e "${YELLOW}6. 최신 코드 가져오기...${NC}"
git fetch origin
git reset --hard origin/main

echo -e "${GREEN}✅ Git 권한 문제 해결 완료!${NC}"

echo -e "${YELLOW}7. 현재 Git 상태 확인...${NC}"
git status

echo -e "${YELLOW}8. 최근 커밋 확인...${NC}"
git log --oneline -3

echo ""
echo "======================================"
echo -e "${GREEN}🎉 완료! 이제 정상적으로 사용 가능합니다.${NC}"
echo "======================================"