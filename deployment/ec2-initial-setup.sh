#!/bin/bash

# EC2 초기 환경 설정 스크립트
# Ubuntu 22.04 LTS 기준

echo "🚀 MarketingPlat EC2 서버 초기 설정 시작..."

# 1. 시스템 업데이트
echo "📦 시스템 패키지 업데이트 중..."
sudo apt update && sudo apt upgrade -y

# 2. Node.js 20.x 설치
echo "📦 Node.js 20.x 설치 중..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Node.js 버전 확인
echo "✅ Node.js 버전:"
node --version
npm --version

# 3. Git 설치
echo "📦 Git 설치 중..."
sudo apt install -y git

# 4. PM2 설치 (프로세스 매니저)
echo "📦 PM2 설치 중..."
sudo npm install -g pm2

# 5. Nginx 설치
echo "📦 Nginx 설치 중..."
sudo apt install -y nginx

# 6. Certbot 설치 (SSL 인증서용)
echo "📦 Certbot 설치 중..."
sudo apt install -y certbot python3-certbot-nginx

# 7. PostgreSQL Client 설치 (RDS 연결 테스트용)
echo "📦 PostgreSQL Client 설치 중..."
sudo apt install -y postgresql-client

# 8. Build essentials 설치
echo "📦 Build essentials 설치 중..."
sudo apt install -y build-essential

# 9. Playwright 의존성 설치
echo "📦 Playwright 브라우저 의존성 설치 중..."
sudo npx playwright install-deps chromium

# 10. Redis 설치 (로컬 캐싱용 - 선택사항)
echo "📦 Redis 설치 중..."
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 11. 작업 디렉토리 생성
echo "📁 작업 디렉토리 생성 중..."
mkdir -p ~/logs
mkdir -p ~/backups

# 12. 시스템 정보 출력
echo "================================"
echo "✅ 초기 설정 완료!"
echo "================================"
echo "📊 시스템 정보:"
echo "- Node.js: $(node --version)"
echo "- npm: $(npm --version)"
echo "- PM2: $(pm2 --version)"
echo "- Git: $(git --version)"
echo "- Nginx: $(nginx -v 2>&1)"
echo "- Redis: $(redis-server --version)"
echo "================================"

# 13. 방화벽 설정 (UFW)
echo "🔒 방화벽 설정 중..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Next.js (임시)
sudo ufw --force enable

echo "🎉 모든 설정이 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. GitHub에서 코드 클론"
echo "2. 환경변수 설정"
echo "3. 애플리케이션 빌드 및 실행"