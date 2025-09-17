#!/bin/bash
# EC2에서 강제로 최신 코드 업데이트하는 스크립트

echo "🔄 EC2 강제 업데이트 시작"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd ~/marketingplatformproject

# 1. 현재 변경사항 백업
echo -e "${BLUE}📦 로컬 변경사항 백업...${NC}"
if [ -f middleware.ts ]; then
    cp middleware.ts middleware.ts.local_backup
    echo -e "${GREEN}✅ middleware.ts 백업 완료${NC}"
fi

if [ -f .env ]; then
    cp .env .env.local_backup
    echo -e "${GREEN}✅ .env 백업 완료${NC}"
fi
echo ""

# 2. 로컬 변경사항 임시 저장 (stash)
echo -e "${BLUE}💾 로컬 변경사항 임시 저장...${NC}"
git stash save "EC2 local changes $(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✅ 로컬 변경사항 저장 완료${NC}"
echo ""

# 3. 최신 코드 가져오기
echo -e "${BLUE}📥 최신 코드 가져오기...${NC}"
git fetch origin main
git reset --hard origin/main
echo -e "${GREEN}✅ 최신 코드로 업데이트 완료${NC}"
echo ""

# 4. .env 파일 복원 (중요!)
echo -e "${BLUE}🔧 환경변수 파일 복원...${NC}"
if [ -f .env.local_backup ]; then
    # 백업한 .env 파일에서 중요한 설정만 복원
    echo "# Production Environment" > .env
    echo "NODE_ENV=production" >> .env
    echo "" >> .env

    # DATABASE_URL 복원
    if grep -q "DATABASE_URL.*amazonaws" .env.local_backup; then
        grep "DATABASE_URL" .env.local_backup >> .env
        echo -e "${GREEN}✅ DATABASE_URL 복원${NC}"
    else
        echo 'DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"' >> .env
        echo -e "${YELLOW}⚠️  DATABASE_URL을 기본값으로 설정${NC}"
    fi
    echo "" >> .env

    # Domain 설정
    echo "# Domain" >> .env
    echo "NEXTAUTH_URL=https://miraenad.com" >> .env
    echo "" >> .env

    # JWT 설정
    echo "# JWT & Auth" >> .env
    if grep -q "JWT_SECRET" .env.local_backup; then
        grep "JWT_SECRET" .env.local_backup >> .env
    else
        echo "JWT_SECRET=YourSuperSecureJWTSecret2025MireanadProduction" >> .env
    fi

    if grep -q "NEXTAUTH_SECRET" .env.local_backup; then
        grep "NEXTAUTH_SECRET" .env.local_backup >> .env
    else
        echo "NEXTAUTH_SECRET=YourSuperSecureNextAuthSecret2025MireanadProduction" >> .env
    fi
    echo "" >> .env

    # Naver Ads API 설정
    echo "# Naver Ads API" >> .env
    echo "NAVER_ADS_API_KEY=0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af" >> .env
    echo "NAVER_ADS_SECRET_KEY=AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==" >> .env
    echo "NAVER_ADS_CUSTOMER_ID=1632045" >> .env

    echo -e "${GREEN}✅ .env 파일 복원 완료${NC}"
else
    # 백업이 없으면 새로 생성
    cat > .env << 'EOF'
# Production Environment
NODE_ENV=production

# Database - AWS RDS
DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"

# Domain
NEXTAUTH_URL=https://miraenad.com

# JWT & Auth
JWT_SECRET=YourSuperSecureJWTSecret2025MireanadProduction
NEXTAUTH_SECRET=YourSuperSecureNextAuthSecret2025MireanadProduction

# Naver Ads API
NAVER_ADS_API_KEY=0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af
NAVER_ADS_SECRET_KEY=AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==
NAVER_ADS_CUSTOMER_ID=1632045
EOF
    echo -e "${YELLOW}⚠️  .env 파일을 새로 생성했습니다${NC}"
fi
echo ""

# 5. 의존성 설치
echo -e "${BLUE}📦 의존성 설치...${NC}"
npm install --production=false
npx prisma generate
echo -e "${GREEN}✅ 의존성 설치 완료${NC}"
echo ""

# 6. 빌드
echo -e "${BLUE}🏗️  Next.js 빌드...${NC}"
npm run build
echo -e "${GREEN}✅ 빌드 완료${NC}"
echo ""

# 7. PM2 재시작
echo -e "${BLUE}🚀 PM2 재시작...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'miraenad',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✅ PM2 시작 완료${NC}"
echo ""

# 8. 테스트
echo -e "${BLUE}🧪 서비스 테스트...${NC}"
sleep 5

# 헬스 체크
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ 로컬 서버 정상${NC}"
else
    echo -e "${RED}❌ 로컬 서버 응답 없음${NC}"
fi

# API 테스트
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}' \
  -w "\n%{http_code}" 2>/dev/null || echo "000")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ API 정상 (HTTP $http_code)${NC}"
else
    echo -e "${YELLOW}⚠️  API 응답: HTTP $http_code${NC}"
fi
echo ""

# 9. 완료
echo -e "${GREEN}======================================"
echo "✨ 강제 업데이트 완료!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}📊 PM2 상태:${NC}"
pm2 status
echo ""
echo -e "${BLUE}🌐 접속 정보:${NC}"
echo "  https://miraenad.com"
echo "  admin@marketingplat.com / admin123"
echo ""
echo -e "${YELLOW}💡 백업 파일 위치:${NC}"
echo "  middleware.ts.local_backup"
echo "  .env.local_backup"
echo ""
echo -e "${YELLOW}📝 저장된 로컬 변경사항 확인:${NC}"
echo "  git stash list"