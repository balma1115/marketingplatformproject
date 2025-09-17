#!/bin/bash

echo "======================================"
echo "포트 3000 강제 종료 및 재시작 스크립트"
echo "======================================"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. PM2 완전 종료...${NC}"
pm2 kill

echo -e "${YELLOW}2. 포트 3000 사용 프로세스 확인...${NC}"
PROCESS_ID=$(sudo lsof -ti:3000)

if [ ! -z "$PROCESS_ID" ]; then
    echo -e "${RED}포트 3000을 사용하는 프로세스 발견: $PROCESS_ID${NC}"
    echo -e "${YELLOW}프로세스 강제 종료 중...${NC}"
    sudo kill -9 $PROCESS_ID
    sleep 2
    echo -e "${GREEN}✅ 프로세스 종료 완료${NC}"
else
    echo -e "${GREEN}✅ 포트 3000이 사용 가능합니다${NC}"
fi

echo -e "${YELLOW}3. 잔여 Node 프로세스 정리...${NC}"
sudo pkill -f node
sudo pkill -f next
sleep 2

echo -e "${YELLOW}4. 프로젝트 디렉토리로 이동...${NC}"
cd /home/ubuntu/marketingplatformproject

echo -e "${YELLOW}5. PM2 ecosystem 설정 재생성...${NC}"
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
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
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

echo -e "${YELLOW}6. 로그 디렉토리 생성...${NC}"
mkdir -p /home/ubuntu/logs

echo -e "${YELLOW}7. 로그 파일 초기화...${NC}"
> /home/ubuntu/logs/err.log
> /home/ubuntu/logs/out.log
> /home/ubuntu/logs/combined.log

echo -e "${YELLOW}8. .next 디렉토리 확인...${NC}"
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ .next 디렉토리가 없습니다. 빌드가 필요합니다.${NC}"
    echo -e "${YELLOW}빌드 실행 중...${NC}"
    DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat" npm run build
fi

echo -e "${YELLOW}9. PM2로 애플리케이션 시작...${NC}"
pm2 start ecosystem.config.js

echo -e "${YELLOW}10. 3초 대기...${NC}"
sleep 3

echo -e "${YELLOW}11. PM2 상태 확인...${NC}"
pm2 status

echo -e "${YELLOW}12. 포트 3000 확인...${NC}"
sudo netstat -tlpn | grep :3000

echo -e "${YELLOW}13. 로그 확인 (최근 20줄)...${NC}"
pm2 logs --lines 20

echo -e "${YELLOW}14. 애플리케이션 상태 테스트...${NC}"
sleep 2
curl -I http://localhost:3000

echo ""
echo "======================================"
echo -e "${GREEN}🎉 포트 정리 및 재시작 완료!${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}다음 명령어로 상태를 확인하세요:${NC}"
echo "- pm2 status : PM2 상태"
echo "- pm2 logs : 실시간 로그"
echo "- sudo lsof -i:3000 : 포트 3000 사용 확인"
echo ""