#!/bin/bash

echo "======================================"
echo "EC2 완전 재빌드 스크립트"
echo "======================================"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 프로젝트 경로
PROJECT_DIR="/home/ubuntu/marketingplatformproject"

echo -e "${YELLOW}1️⃣  프로젝트 디렉토리로 이동...${NC}"
cd $PROJECT_DIR

echo -e "${YELLOW}2️⃣  Git 최신 코드 가져오기...${NC}"
# 로컬 변경사항 저장
git stash
# 최신 코드 pull
git pull origin main --force
echo -e "${GREEN}✅ 최신 코드 업데이트 완료${NC}"

echo -e "${YELLOW}3️⃣  PM2 프로세스 완전 종료...${NC}"
pm2 kill
echo -e "${GREEN}✅ PM2 프로세스 종료됨${NC}"

echo -e "${YELLOW}4️⃣  Node modules 재설치...${NC}"
rm -rf node_modules package-lock.json
npm install
echo -e "${GREEN}✅ 의존성 설치 완료${NC}"

echo -e "${YELLOW}5️⃣  Prisma 클라이언트 재생성...${NC}"
DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat" npx prisma generate
echo -e "${GREEN}✅ Prisma 클라이언트 생성됨${NC}"

echo -e "${YELLOW}6️⃣  Next.js 빌드 실행...${NC}"
# 환경 변수 설정하여 빌드
export NODE_ENV=production
export DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
export NEXTAUTH_SECRET="Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6"
export NEXTAUTH_URL="https://miraenad.com"
export JWT_SECRET="Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6"

# 빌드 실행
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 빌드 성공${NC}"
else
    echo -e "${RED}❌ 빌드 실패!${NC}"
    exit 1
fi

echo -e "${YELLOW}7️⃣  PM2 ecosystem 파일 업데이트...${NC}"
cat > ecosystem.config.js << 'EOL'
module.exports = {
  apps: [{
    name: 'marketingplat',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/marketingplatformproject',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat',
      NEXTAUTH_SECRET: 'Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6',
      NEXTAUTH_URL: 'https://miraenad.com',
      JWT_SECRET: 'Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6'
    }
  }]
}
EOL
echo -e "${GREEN}✅ PM2 설정 파일 업데이트됨${NC}"

echo -e "${YELLOW}8️⃣  PM2로 애플리케이션 시작...${NC}"
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✅ 애플리케이션 시작됨${NC}"

echo -e "${YELLOW}9️⃣  Nginx 재시작...${NC}"
sudo nginx -t && sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx 재시작됨${NC}"

echo -e "${YELLOW}🔟 최종 상태 확인...${NC}"
echo -e "${YELLOW}PM2 상태:${NC}"
pm2 status

echo -e "${YELLOW}포트 확인:${NC}"
sudo netstat -tlpn | grep :3000

echo -e "${YELLOW}최근 로그:${NC}"
pm2 logs --lines 20

echo ""
echo "======================================"
echo -e "${GREEN}🎉 EC2 재빌드 완료!${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}📝 확인사항:${NC}"
echo "1. 브라우저에서 https://miraenad.com 접속"
echo "2. 로그인 테스트"
echo "3. 관리자 페이지 접근 테스트"
echo ""
echo -e "${YELLOW}⚠️  문제가 있다면:${NC}"
echo "- pm2 logs 로 실시간 로그 확인"
echo "- pm2 restart marketingplat 로 재시작"
echo ""