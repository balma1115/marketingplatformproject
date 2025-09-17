# 🚀 miraenad.com 도메인 배포 가이드

## 📋 사전 준비 사항

### 1️⃣ DNS 설정 (도메인 등록업체에서 설정)
EC2 IP 주소(13.125.39.37)로 DNS A 레코드를 설정하세요:
- **A 레코드**: miraenad.com → 13.125.39.37
- **A 레코드**: www.miraenad.com → 13.125.39.37

Cloudflare를 사용중이라면:
1. Cloudflare 대시보드 로그인
2. DNS 메뉴 선택
3. 다음 레코드 추가:
   - Type: A, Name: @, Content: 13.125.39.37
   - Type: A, Name: www, Content: 13.125.39.37
4. **Proxy status는 일단 DNS only로 설정** (SSL 인증서 발급 후 변경 가능)

## 🛠️ EC2 서버 배포 절차

### 방법 1: 자동 스크립트 실행 (권장)
```bash
# EC2 접속
ssh -i your-key.pem ubuntu@13.125.39.37

# 프로젝트 디렉토리로 이동
cd /home/ubuntu/marketingplatformproject

# 최신 코드 가져오기
git pull origin main

# 배포 스크립트 실행
chmod +x scripts/deploy-miraenad.sh
./scripts/deploy-miraenad.sh
```

### 방법 2: 수동 배포

#### Step 1: EC2 접속 및 최신 코드 가져오기
```bash
ssh -i your-key.pem ubuntu@13.125.39.37
cd /home/ubuntu/marketingplatformproject
git pull origin main
```

#### Step 2: 환경변수 설정
```bash
# .env.production 파일 생성/수정
cp .env.production.miraenad .env.production
# 또는 직접 편집
nano .env.production

# 다음 내용 확인:
NEXT_PUBLIC_API_URL="https://miraenad.com"
NEXT_PUBLIC_BASE_URL="https://miraenad.com"
NODE_ENV="production"
```

#### Step 3: 빌드 및 재시작
```bash
# 의존성 설치
npm ci --production=false

# Prisma 클라이언트 생성
npx prisma generate

# 기존 빌드 삭제 및 새 빌드
rm -rf .next
NODE_ENV=production npm run build

# PM2 재시작
pm2 restart marketingplat
pm2 save
```

#### Step 4: SSL 인증서 설치 (Let's Encrypt)
```bash
# Certbot 설치 (처음 한 번만)
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d miraenad.com -d www.miraenad.com
```
프롬프트가 나오면:
- 이메일 입력: admin@miraenad.com
- 약관 동의: A
- 이메일 수신 동의: N 또는 Y
- HTTPS 리디렉션: 2 (Redirect 선택)

#### Step 5: Nginx 설정 업데이트
```bash
# Nginx 설정 파일 편집
sudo nano /etc/nginx/sites-available/marketingplat

# nginx-miraenad.conf 내용으로 교체 또는
# Certbot이 자동으로 추가한 SSL 설정 확인

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## ✅ 배포 확인

### 1. DNS 확인
```bash
# DNS 전파 확인
nslookup miraenad.com
dig miraenad.com
```

### 2. 연결 테스트
```bash
# HTTP → HTTPS 리디렉션 확인
curl -I http://miraenad.com

# HTTPS 연결 확인
curl -I https://miraenad.com
```

### 3. 브라우저 확인
- https://miraenad.com 접속
- SSL 자물쇠 아이콘 확인
- 콘솔에서 오류 확인

## 🔧 문제 해결

### DNS가 아직 전파되지 않은 경우
- DNS 전파는 최대 48시간 걸릴 수 있음
- https://www.whatsmydns.net 에서 전파 상태 확인

### SSL 인증서 발급 실패
```bash
# 방화벽 확인
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# Nginx 기본 설정 확인
sudo nginx -t
sudo systemctl status nginx
```

### 502 Bad Gateway 오류
```bash
# PM2 상태 확인
pm2 status
pm2 logs marketingplat --lines 50

# 포트 3000 확인
sudo netstat -tlpn | grep 3000
```

### Mixed Content 오류
- 브라우저 콘솔에서 HTTP 리소스 확인
- .env.production의 URL이 모두 https://로 시작하는지 확인

## 📝 SSL 인증서 자동 갱신 설정
```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# Cron job 확인 (자동으로 설정됨)
sudo systemctl status certbot.timer
```

## 🎉 완료!
배포가 완료되면 https://miraenad.com 에서 사이트를 확인할 수 있습니다.

## 📌 중요 참고사항
- Cloudflare Proxy를 사용하는 경우, SSL 모드를 "Full (strict)"로 설정
- 처음에는 "DNS only"로 설정하여 Let's Encrypt 인증서 발급
- 인증서 발급 후 Cloudflare Proxy 활성화 가능