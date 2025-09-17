#!/bin/bash
# ec2-initial-setup.sh - EC2 인스턴스 초기 설정 스크립트

echo "🚀 Starting EC2 initial setup..."

# 시스템 업데이트
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 스왑 메모리 설정 (t2.micro용)
echo "💾 Setting up swap memory..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Node.js 20 설치
echo "🟢 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 필수 도구 설치
echo "🔧 Installing essential tools..."
sudo apt install -y git nginx certbot python3-certbot-nginx redis-server postgresql-client

# PM2 설치
echo "📊 Installing PM2..."
sudo npm install -g pm2

# Playwright 의존성 설치
echo "🎭 Installing Playwright dependencies..."
sudo apt-get install -y \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libxss1 \
  libasound2 libwayland-client0

# 디렉토리 생성
echo "📁 Creating directories..."
mkdir -p /home/ubuntu/marketingplatform
mkdir -p /home/ubuntu/logs
mkdir -p /home/ubuntu/backups

# 권한 설정
echo "🔐 Setting permissions..."
sudo chown -R ubuntu:ubuntu /home/ubuntu

echo "✅ EC2 초기 설정 완료!"