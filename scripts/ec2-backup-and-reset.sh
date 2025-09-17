#!/bin/bash
# ec2-backup-and-reset.sh - EC2 기존 프로젝트 백업 및 초기화

echo "🔄 EC2 프로젝트 백업 및 초기화 시작..."

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 타임스탬프
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 1. PM2 프로세스 중지
echo -e "${YELLOW}⏸️  PM2 프로세스 중지...${NC}"
pm2 stop all
pm2 delete all

# 2. 기존 프로젝트 백업
echo -e "${YELLOW}📦 기존 프로젝트 백업 중...${NC}"
if [ -d "/home/ubuntu/marketingplatformproject" ]; then
    # 환경 변수 파일 백업
    if [ -f "/home/ubuntu/marketingplatformproject/.env.production" ]; then
        cp /home/ubuntu/marketingplatformproject/.env.production /home/ubuntu/env_backup_${TIMESTAMP}.production
        echo -e "${GREEN}✅ .env.production 백업 완료: /home/ubuntu/env_backup_${TIMESTAMP}.production${NC}"
    fi

    if [ -f "/home/ubuntu/marketingplatformproject/.env.local" ]; then
        cp /home/ubuntu/marketingplatformproject/.env.local /home/ubuntu/env_backup_${TIMESTAMP}.local
        echo -e "${GREEN}✅ .env.local 백업 완료: /home/ubuntu/env_backup_${TIMESTAMP}.local${NC}"
    fi

    # 전체 프로젝트 백업 (node_modules, .next 제외)
    echo "전체 프로젝트 백업 중... (시간이 걸릴 수 있습니다)"
    tar -czf /home/ubuntu/backup_${TIMESTAMP}.tar.gz \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='dist' \
        -C /home/ubuntu marketingplatformproject
    echo -e "${GREEN}✅ 프로젝트 백업 완료: /home/ubuntu/backup_${TIMESTAMP}.tar.gz${NC}"

    # 기존 프로젝트 디렉토리 이름 변경
    mv /home/ubuntu/marketingplatformproject /home/ubuntu/marketingplatformproject_old_${TIMESTAMP}
    echo -e "${GREEN}✅ 기존 프로젝트 이동: /home/ubuntu/marketingplatformproject_old_${TIMESTAMP}${NC}"
else
    echo -e "${YELLOW}⚠️  기존 프로젝트 디렉토리가 없습니다.${NC}"
fi

# 3. 로그 백업
echo -e "${YELLOW}📋 로그 파일 백업 중...${NC}"
if [ -d "/home/ubuntu/logs" ]; then
    tar -czf /home/ubuntu/logs_backup_${TIMESTAMP}.tar.gz -C /home/ubuntu logs
    rm -rf /home/ubuntu/logs/*
    echo -e "${GREEN}✅ 로그 백업 완료: /home/ubuntu/logs_backup_${TIMESTAMP}.tar.gz${NC}"
fi

# 4. Nginx 캐시 정리
echo -e "${YELLOW}🧹 Nginx 캐시 정리...${NC}"
sudo rm -rf /var/cache/nginx/*
sudo systemctl restart nginx

# 5. 디렉토리 준비
echo -e "${YELLOW}📁 디렉토리 준비...${NC}"
mkdir -p /home/ubuntu/logs
mkdir -p /home/ubuntu/backups

# 백업 파일 목록 표시
echo -e "\n${GREEN}📋 생성된 백업 파일:${NC}"
echo "=================================="
ls -lh /home/ubuntu/*backup*.tar.gz 2>/dev/null
ls -lh /home/ubuntu/env_backup_* 2>/dev/null
ls -lh /home/ubuntu/marketingplatformproject_old_* -d 2>/dev/null
echo "=================================="

echo -e "\n${GREEN}✅ 백업 및 초기화 완료!${NC}"
echo -e "${YELLOW}다음 단계:${NC}"
echo "1. 새 프로젝트를 클론하세요:"
echo "   git clone [YOUR_REPO_URL] /home/ubuntu/marketingplatformproject"
echo ""
echo "2. 백업된 환경 변수를 복원하세요:"
echo "   cp /home/ubuntu/env_backup_${TIMESTAMP}.production /home/ubuntu/marketingplatformproject/.env.production"
echo ""
echo "3. quick-deploy.sh 또는 새 배포 스크립트를 실행하세요"