#!/bin/bash
# local-to-ec2-deploy.sh - 로컬에서 EC2로 직접 배포

echo "🚀 로컬에서 EC2로 배포 시작..."

# 설정 (수정 필요)
EC2_HOST="ubuntu@your-ec2-ip"
EC2_KEY="~/.ssh/your-key.pem"
REPO_URL="https://github.com/your-username/marketingplatformproject.git"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 로컬 테스트 실행
echo -e "${BLUE}🔍 로컬 테스트 실행...${NC}"
npm run lint
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Lint 에러가 있습니다. 수정 후 다시 시도하세요.${NC}"
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 빌드 실패. 에러를 확인하세요.${NC}"
    exit 1
fi

# 2. Git 커밋 및 푸시
echo -e "${BLUE}📤 GitHub에 푸시 중...${NC}"
git add .
git commit -m "Deploy: $(date +%Y-%m-%d_%H:%M:%S)"
git push origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git push 실패!${NC}"
    exit 1
fi

# 3. EC2에서 업데이트 실행
echo -e "${BLUE}🔄 EC2에서 업데이트 실행...${NC}"

ssh -i $EC2_KEY $EC2_HOST << 'EOF'
cd /home/ubuntu/marketingplatformproject

# Git pull
echo "📥 최신 코드 가져오는 중..."
git pull origin main

# 의존성 업데이트
echo "📦 의존성 업데이트..."
npm ci --production=false

# Prisma 마이그레이션
echo "🗄️ 데이터베이스 마이그레이션..."
npx prisma generate
npx prisma migrate deploy

# 프로덕션 빌드
echo "🔨 프로덕션 빌드..."
npm run build

# PM2 재시작
echo "🔄 PM2 재시작..."
pm2 restart marketingplat

# 상태 확인
pm2 status
echo "✅ 배포 완료!"
EOF

echo -e "${GREEN}🎉 로컬에서 EC2로 배포 완료!${NC}"