#!/bin/bash

echo "======================================"
echo "🚀 MarketingPlat EC2 배포 시작"
echo "======================================"

# EC2 정보
EC2_HOST="43.203.211.149"
EC2_USER="ubuntu"
EC2_KEY="C:/Users/User/Desktop/marketingplat.pem"
PROJECT_DIR="/home/ubuntu/marketingplatformproject"

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}1. EC2 연결 테스트...${NC}"
ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST "echo '✅ EC2 연결 성공'"

if [ $? -ne 0 ]; then
    echo -e "${RED}EC2 연결 실패. PEM 키 경로를 확인하세요.${NC}"
    exit 1
fi

echo -e "${YELLOW}2. 로컬 빌드 파일 준비...${NC}"
# .next 폴더 압축 (빌드된 파일)
tar -czf build.tar.gz .next package.json package-lock.json prisma public next.config.js tsconfig.json

echo -e "${YELLOW}3. 빌드 파일 업로드...${NC}"
scp -i "$EC2_KEY" build.tar.gz $EC2_USER@$EC2_HOST:/tmp/

echo -e "${YELLOW}4. 소스 코드 업데이트...${NC}"
# lib, app, components 등 소스 파일 압축
tar -czf source.tar.gz lib app components contexts hooks utils scripts *.js *.json .env.production --exclude=node_modules

# 소스 파일 업로드
scp -i "$EC2_KEY" source.tar.gz $EC2_USER@$EC2_HOST:/tmp/

echo -e "${YELLOW}5. EC2에서 배포 실행...${NC}"
ssh -i "$EC2_KEY" $EC2_USER@$EC2_HOST << 'ENDSSH'
    set -e

    echo "프로젝트 디렉토리로 이동..."
    cd /home/ubuntu/marketingplatformproject

    echo "기존 파일 백업..."
    sudo cp -r .next .next.backup 2>/dev/null || true

    echo "빌드 파일 압축 해제..."
    sudo tar -xzf /tmp/build.tar.gz
    sudo tar -xzf /tmp/source.tar.gz

    echo "권한 설정..."
    sudo chown -R ubuntu:ubuntu .

    echo "의존성 설치..."
    npm install --production

    echo "Prisma 클라이언트 생성..."
    npx prisma generate

    echo "PM2 재시작..."
    pm2 restart marketingplat || pm2 start npm --name marketingplat -- start
    pm2 save

    echo "임시 파일 정리..."
    rm -f /tmp/build.tar.gz /tmp/source.tar.gz

    echo "✅ 배포 완료!"
    echo ""
    echo "애플리케이션 상태:"
    pm2 status
ENDSSH

# 로컬 임시 파일 정리
rm -f build.tar.gz source.tar.gz

echo -e "${GREEN}======================================"
echo -e "✅ EC2 배포 완료!"
echo -e "======================================"
echo ""
echo "🔗 웹사이트: https://www.marekplace.co.kr"
echo "📊 로그 확인: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'pm2 logs'"
echo "📈 상태 확인: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'pm2 status'"