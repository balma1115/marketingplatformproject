#!/bin/bash
# quick-deploy.sh - 빠른 배포 스크립트

echo "🚀 MarketingPlat Quick Deploy Starting..."

# 기본 설정
REPO_URL="https://github.com/your-repo/marketingplatformproject.git"
APP_DIR="/home/ubuntu/marketingplatformproject"

# 1. 시스템 준비
echo "📦 Installing system dependencies..."
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx postgresql-client
sudo npm install -g pm2

# 2. 코드 배포
echo "📥 Cloning repository..."
git clone $REPO_URL $APP_DIR
cd $APP_DIR

# 3. 환경 변수 설정 (수동 입력 필요)
echo "⚙️ Setting up environment variables..."
echo "Please edit .env.production file:"
cp .env.production.template .env.production
nano .env.production

# 4. 설치 및 빌드
echo "📦 Installing dependencies..."
npm install

echo "🎭 Installing Playwright..."
npx playwright install chromium
sudo npx playwright install-deps

echo "🗄️ Setting up database..."
npx prisma generate
npx prisma migrate deploy

echo "🔨 Building application..."
npm run build

# 5. PM2 시작
echo "🚀 Starting PM2..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 6. Nginx 설정
echo "🌐 Configuring Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/marketingplat
sudo cp proxy_params /etc/nginx/proxy_params
sudo ln -s /etc/nginx/sites-available/marketingplat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

echo "✅ Deployment completed!"
echo "🔗 Visit http://$(curl -s ifconfig.me):3000"