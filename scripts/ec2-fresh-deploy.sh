#!/bin/bash
# ec2-fresh-deploy.sh - EC2 새로운 배포 스크립트

echo "🚀 MarketingPlat 새로운 배포 시작..."

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정
REPO_URL="https://github.com/your-repo/marketingplatformproject.git"  # 실제 URL로 변경 필요
APP_DIR="/home/ubuntu/marketingplatformproject"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 1. Git 리포지토리 클론
echo -e "${BLUE}📥 프로젝트 클론 중...${NC}"
if [ -d "$APP_DIR" ]; then
    echo -e "${RED}❌ 디렉토리가 이미 존재합니다: $APP_DIR${NC}"
    echo "먼저 ec2-backup-and-reset.sh를 실행해주세요!"
    exit 1
fi

cd /home/ubuntu
git clone $REPO_URL marketingplatformproject
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git clone 실패!${NC}"
    exit 1
fi
cd $APP_DIR

echo -e "${GREEN}✅ 프로젝트 클론 완료${NC}"

# 2. 환경 변수 복원 또는 생성
echo -e "${BLUE}⚙️  환경 변수 설정...${NC}"

# 최신 백업 파일 찾기
LATEST_ENV_BACKUP=$(ls -t /home/ubuntu/env_backup_*.production 2>/dev/null | head -1)

if [ -f "$LATEST_ENV_BACKUP" ]; then
    echo -e "${YELLOW}📋 백업된 환경 변수 발견: $LATEST_ENV_BACKUP${NC}"
    cp $LATEST_ENV_BACKUP .env.production
    echo -e "${GREEN}✅ 환경 변수 복원 완료${NC}"
else
    echo -e "${YELLOW}⚠️  백업된 환경 변수가 없습니다. 템플릿에서 생성합니다.${NC}"
    if [ -f ".env.production.template" ]; then
        cp .env.production.template .env.production
        echo -e "${YELLOW}📝 .env.production 파일을 편집해주세요:${NC}"
        echo "   nano .env.production"
        echo -e "${RED}⚠️  환경 변수를 설정한 후 다시 실행해주세요!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.production.template 파일이 없습니다!${NC}"
        exit 1
    fi
fi

# 3. Node.js 버전 확인
echo -e "${BLUE}🔍 Node.js 버전 확인...${NC}"
NODE_VERSION=$(node -v)
echo "현재 Node.js 버전: $NODE_VERSION"

if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
    echo -e "${YELLOW}⚠️  Node.js 20.x가 필요합니다. 설치 중...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 4. 의존성 설치
echo -e "${BLUE}📦 의존성 설치 중...${NC}"
npm ci --production=false
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ npm install 실패!${NC}"
    exit 1
fi

# 5. Playwright 브라우저 설치
echo -e "${BLUE}🎭 Playwright 브라우저 설치...${NC}"
npx playwright install chromium
sudo npx playwright install-deps

# 6. Prisma 설정
echo -e "${BLUE}🗄️  데이터베이스 설정...${NC}"
npx prisma generate

# 데이터베이스 연결 테스트
echo -e "${YELLOW}🔍 데이터베이스 연결 테스트...${NC}"
npx prisma db pull > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 데이터베이스 연결 성공${NC}"

    # 마이그레이션 실행
    echo -e "${BLUE}📋 마이그레이션 실행...${NC}"
    npx prisma migrate deploy
else
    echo -e "${RED}❌ 데이터베이스 연결 실패! DATABASE_URL을 확인해주세요.${NC}"
    exit 1
fi

# 7. 프로덕션 빌드
echo -e "${BLUE}🔨 프로덕션 빌드 중... (시간이 걸릴 수 있습니다)${NC}"
NODE_OPTIONS="--max-old-space-size=2048" npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 빌드 실패!${NC}"
    exit 1
fi

# 8. PM2 설정
echo -e "${BLUE}📊 PM2 설정...${NC}"

# PM2가 설치되어 있는지 확인
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 설치 중...${NC}"
    sudo npm install -g pm2
fi

# PM2 시작
pm2 start ecosystem.config.js --env production
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# 9. Nginx 설정 (이미 설정되어 있다면 스킵)
echo -e "${BLUE}🌐 Nginx 설정 확인...${NC}"
if [ ! -f "/etc/nginx/sites-available/marketingplat" ]; then
    echo -e "${YELLOW}Nginx 설정 중...${NC}"
    sudo cp nginx.conf /etc/nginx/sites-available/marketingplat
    sudo cp proxy_params /etc/nginx/proxy_params
    sudo ln -s /etc/nginx/sites-available/marketingplat /etc/nginx/sites-enabled/ 2>/dev/null
    sudo nginx -t && sudo systemctl restart nginx
else
    echo -e "${GREEN}✅ Nginx 이미 설정됨${NC}"
    sudo systemctl reload nginx
fi

# 10. 상태 확인
echo -e "\n${BLUE}📊 배포 상태 확인...${NC}"
echo "=================================="

# PM2 상태
echo -e "${YELLOW}PM2 프로세스:${NC}"
pm2 status

# 포트 확인
echo -e "\n${YELLOW}포트 3000 상태:${NC}"
sudo lsof -i :3000

# Nginx 상태
echo -e "\n${YELLOW}Nginx 상태:${NC}"
sudo systemctl status nginx | head -5

echo "=================================="

# 11. 완료 메시지
echo -e "\n${GREEN}🎉 배포 완료!${NC}"
echo -e "${BLUE}애플리케이션 URL:${NC}"
echo "  - http://$(curl -s ifconfig.me):3000"
echo "  - https://marketingplat.com (도메인 설정 필요)"

echo -e "\n${YELLOW}📋 다음 단계:${NC}"
echo "1. PM2 로그 확인: pm2 logs"
echo "2. 애플리케이션 테스트"
echo "3. SSL 인증서 설정 (필요시): sudo certbot --nginx"

echo -e "\n${GREEN}✅ 모든 작업 완료!${NC}"