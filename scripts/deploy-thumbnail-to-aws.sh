#!/bin/bash

echo "======================================"
echo "썸네일 제작기 AWS 배포 스크립트"
echo "======================================"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 프로젝트 경로
PROJECT_DIR="/home/ubuntu/marketingplatformproject"

echo -e "${YELLOW}📦 1. 프로젝트 디렉토리로 이동...${NC}"
cd $PROJECT_DIR

echo -e "${YELLOW}📥 2. 최신 코드 가져오기...${NC}"
git stash
git pull origin main --force
echo -e "${GREEN}✅ 최신 코드 업데이트 완료${NC}"

echo -e "${YELLOW}📦 3. 의존성 설치...${NC}"
npm install
echo -e "${GREEN}✅ 패키지 설치 완료${NC}"

echo -e "${YELLOW}🔧 4. 환경 변수 설정...${NC}"
# .env.local 파일 생성 (기존 파일 백업)
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup
    echo -e "${BLUE}기존 .env.local 백업 완료${NC}"
fi

# 환경 변수 추가 (AI API 키 포함)
cat >> .env.local << 'EOL'

# AI Image Generation APIs
GOOGLE_AI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
BFL_API_KEY=your_flux_api_key_here
FLUX_API_KEY=your_flux_api_key_here
EOL

echo -e "${YELLOW}⚠️  중요: AI API 키를 설정해주세요!${NC}"
echo -e "${YELLOW}파일 위치: /home/ubuntu/marketingplatformproject/.env.local${NC}"

echo -e "${YELLOW}🗄️ 5. Prisma 클라이언트 생성...${NC}"
export DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
npx prisma generate
echo -e "${GREEN}✅ Prisma 클라이언트 생성 완료${NC}"

echo -e "${YELLOW}🏗️ 6. Next.js 프로덕션 빌드...${NC}"
export NODE_ENV=production
export DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
export NEXTAUTH_SECRET="Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6"
export NEXTAUTH_URL="https://miraenad.com"
export JWT_SECRET="Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6"

npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 빌드 실패!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 빌드 성공${NC}"

echo -e "${YELLOW}⚙️ 7. PM2 ecosystem 설정 업데이트...${NC}"
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'marketingplat',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/marketingplatformproject',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    error_file: '/home/ubuntu/logs/err.log',
    out_file: '/home/ubuntu/logs/out.log',
    log_file: '/home/ubuntu/logs/combined.log',
    time: true,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat',
      NEXTAUTH_SECRET: 'Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6',
      NEXTAUTH_URL: 'https://miraenad.com',
      JWT_SECRET: 'Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6',
      // AI API Keys - 실제 키로 교체 필요
      GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      BFL_API_KEY: process.env.BFL_API_KEY,
      FLUX_API_KEY: process.env.FLUX_API_KEY
    }
  }]
}
EOF

echo -e "${YELLOW}🔄 8. PM2 프로세스 재시작...${NC}"
pm2 stop marketingplat
pm2 delete marketingplat
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✅ PM2 재시작 완료${NC}"

echo -e "${YELLOW}🔍 9. 상태 확인...${NC}"
pm2 status

echo -e "${YELLOW}📊 10. 로그 확인 (최근 30줄)...${NC}"
pm2 logs --lines 30

echo ""
echo "======================================"
echo -e "${GREEN}🎉 썸네일 제작기 배포 완료!${NC}"
echo "======================================"
echo ""
echo -e "${BLUE}📌 다음 단계:${NC}"
echo ""
echo -e "${YELLOW}1. AI API 키 설정 (필수!):${NC}"
echo "   sudo nano /home/ubuntu/marketingplatformproject/.env.local"
echo ""
echo "   다음 키들을 실제 값으로 교체:"
echo "   - GOOGLE_AI_API_KEY=실제_구글_AI_키"
echo "   - BFL_API_KEY=실제_Flux_API_키"
echo ""
echo -e "${YELLOW}2. 환경변수 적용 후 재시작:${NC}"
echo "   pm2 restart marketingplat"
echo ""
echo -e "${YELLOW}3. 접속 테스트:${NC}"
echo "   https://miraenad.com/design/thumbnail"
echo ""
echo -e "${BLUE}📝 참고사항:${NC}"
echo "- Google AI 키: https://makersuite.google.com/app/apikey"
echo "- Flux API 키: https://docs.bfl.ai/"
echo ""