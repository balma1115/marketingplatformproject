#!/bin/bash

echo "======================================"
echo "EC2 빌드 문제 해결 스크립트"
echo "======================================"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 프로젝트 경로
PROJECT_DIR="/home/ubuntu/marketingplatformproject"

echo -e "${YELLOW}1. PM2 완전 종료...${NC}"
pm2 kill

echo -e "${YELLOW}2. 프로젝트 디렉토리로 이동...${NC}"
cd $PROJECT_DIR

echo -e "${YELLOW}3. 기존 빌드 파일 삭제...${NC}"
rm -rf .next
rm -rf node_modules
rm -f package-lock.json

echo -e "${YELLOW}4. Git 최신 코드 가져오기...${NC}"
git stash
git pull origin main --force

echo -e "${YELLOW}5. Node.js 의존성 새로 설치...${NC}"
npm install

echo -e "${YELLOW}6. Prisma 클라이언트 생성...${NC}"
export DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
npx prisma generate

echo -e "${YELLOW}7. Next.js 프로덕션 빌드...${NC}"
export NODE_ENV=production
export DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
export NEXTAUTH_SECRET="Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6"
export NEXTAUTH_URL="https://miraenad.com"
export JWT_SECRET="Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6"

npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 빌드 실패! 오류를 확인하세요.${NC}"
    exit 1
fi

echo -e "${YELLOW}8. 빌드 파일 확인...${NC}"
if [ -d ".next" ]; then
    echo -e "${GREEN}✅ .next 디렉토리 존재${NC}"
    ls -la .next/static/chunks/ | head -20
else
    echo -e "${RED}❌ .next 디렉토리가 없습니다!${NC}"
    exit 1
fi

echo -e "${YELLOW}9. PM2 ecosystem 설정...${NC}"
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
      JWT_SECRET: 'Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6'
    }
  }]
}
EOF

echo -e "${YELLOW}10. 로그 디렉토리 생성...${NC}"
mkdir -p /home/ubuntu/logs

echo -e "${YELLOW}11. PM2 시작...${NC}"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${YELLOW}12. Nginx 설정 확인...${NC}"
# Nginx 설정 파일 생성 (없을 경우)
sudo tee /etc/nginx/sites-available/marketingplat > /dev/null << 'EOF'
server {
    listen 80;
    server_name miraenad.com www.miraenad.com;

    # 클라이언트 최대 바디 사이즈
    client_max_body_size 10M;

    # 정적 파일 캐싱
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # 캐싱 설정
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 나머지 요청
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# 심볼릭 링크 생성 (없을 경우)
if [ ! -L /etc/nginx/sites-enabled/marketingplat ]; then
    sudo ln -s /etc/nginx/sites-available/marketingplat /etc/nginx/sites-enabled/
fi

# 기본 사이트 비활성화
if [ -L /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

echo -e "${YELLOW}13. Nginx 테스트 및 재시작...${NC}"
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx 재시작 완료${NC}"
else
    echo -e "${RED}❌ Nginx 설정 오류${NC}"
fi

echo -e "${YELLOW}14. 포트 확인...${NC}"
sleep 5
netstat -tlpn | grep :3000

echo -e "${YELLOW}15. PM2 상태 확인...${NC}"
pm2 status

echo -e "${YELLOW}16. 애플리케이션 로그 (최근 30줄)...${NC}"
pm2 logs --lines 30

echo ""
echo "======================================"
echo -e "${GREEN}🎉 빌드 문제 해결 완료!${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}확인사항:${NC}"
echo "1. https://miraenad.com 접속 테스트"
echo "2. 개발자 도구 > Network 탭에서 404 에러 확인"
echo "3. pm2 logs 로 실시간 로그 모니터링"
echo ""
echo -e "${YELLOW}문제가 지속되면:${NC}"
echo "- pm2 logs --lines 100 으로 상세 로그 확인"
echo "- ls -la .next/static/chunks/ 로 빌드 파일 확인"
echo "- curl http://localhost:3000 으로 로컬 테스트"
echo ""