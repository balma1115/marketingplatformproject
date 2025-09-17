#!/bin/bash

echo "======================================"
echo "Lockfile 정리 스크립트"
echo "======================================"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. 상위 디렉토리의 불필요한 lockfile 확인...${NC}"

# /home/ubuntu에 있는 package-lock.json 확인
if [ -f "/home/ubuntu/package-lock.json" ]; then
    echo -e "${RED}발견: /home/ubuntu/package-lock.json${NC}"
    echo -e "${YELLOW}이 파일을 삭제하시겠습니까? (y/n)${NC}"
    read -r response
    if [[ "$response" == "y" || "$response" == "Y" ]]; then
        sudo rm /home/ubuntu/package-lock.json
        echo -e "${GREEN}✅ /home/ubuntu/package-lock.json 삭제 완료${NC}"
    fi
fi

# /home/ubuntu에 있는 package.json 확인
if [ -f "/home/ubuntu/package.json" ]; then
    echo -e "${RED}발견: /home/ubuntu/package.json${NC}"
    echo -e "${YELLOW}이 파일을 삭제하시겠습니까? (y/n)${NC}"
    read -r response
    if [[ "$response" == "y" || "$response" == "Y" ]]; then
        sudo rm /home/ubuntu/package.json
        echo -e "${GREEN}✅ /home/ubuntu/package.json 삭제 완료${NC}"
    fi
fi

# /home/ubuntu에 있는 node_modules 확인
if [ -d "/home/ubuntu/node_modules" ]; then
    echo -e "${RED}발견: /home/ubuntu/node_modules${NC}"
    echo -e "${YELLOW}이 디렉토리를 삭제하시겠습니까? (y/n)${NC}"
    read -r response
    if [[ "$response" == "y" || "$response" == "Y" ]]; then
        sudo rm -rf /home/ubuntu/node_modules
        echo -e "${GREEN}✅ /home/ubuntu/node_modules 삭제 완료${NC}"
    fi
fi

echo -e "${YELLOW}2. 프로젝트 디렉토리 확인...${NC}"
echo -e "프로젝트 위치: /home/ubuntu/marketingplatformproject"

if [ -f "/home/ubuntu/marketingplatformproject/package-lock.json" ]; then
    echo -e "${GREEN}✅ 정상: 프로젝트 package-lock.json 존재${NC}"
else
    echo -e "${RED}⚠️  경고: 프로젝트 package-lock.json이 없습니다${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Lockfile 정리 완료!${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}다음 단계:${NC}"
echo "1. cd /home/ubuntu/marketingplatformproject"
echo "2. npm run build"
echo "3. pm2 restart miraenad"