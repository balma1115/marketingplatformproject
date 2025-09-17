#!/bin/bash
# miraenad.com 완전 배포 스크립트 (Nginx 포함)

set -e

echo "🚀 miraenad.com 완전 배포 시작"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 루트 권한 확인
if [ "$EUID" -ne 0 ] && [ "$1" != "--no-nginx" ]; then
    echo -e "${YELLOW}⚠️  Nginx 설정을 위해 sudo 권한이 필요합니다.${NC}"
    echo "Nginx 설정 없이 진행: $0 --no-nginx"
    echo "Nginx 포함 실행: sudo $0"
    exit 1
fi

cd ~/marketingplatformproject

# 1. Git 최신 코드
echo -e "${BLUE}📥 최신 코드 가져오기...${NC}"
git stash 2>/dev/null || true
git pull origin main
echo -e "${GREEN}✅ 코드 업데이트 완료${NC}\n"

# 2. 환경변수 설정
echo -e "${BLUE}🔧 환경변수 설정...${NC}"

# .env 백업
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# 환경변수 수정
cat > .env << 'EOF'
# Production Environment
NODE_ENV=production

# Database
DATABASE_URL="postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"

# Domain
NEXTAUTH_URL=https://miraenad.com

# JWT
JWT_SECRET=your-secure-jwt-secret-here
NEXTAUTH_SECRET=your-secure-nextauth-secret-here

# Naver Ads API
NAVER_ADS_API_KEY=0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af
NAVER_ADS_SECRET_KEY=AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==
NAVER_ADS_CUSTOMER_ID=1632045
EOF

echo -e "${GREEN}✅ 환경변수 설정 완료${NC}\n"

# 3. middleware.ts 수정 (리다이렉트 문제 해결)
echo -e "${BLUE}🔧 middleware.ts 수정...${NC}"
if [ -f middleware.ts ]; then
    # 백업
    cp middleware.ts middleware.ts.backup

    # API 라우트 리다이렉트 방지 패치
    cat > middleware.ts << 'EOF'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const response = NextResponse.next();

  // API 라우트는 리다이렉트하지 않음
  if (url.pathname.startsWith('/api/')) {
    return response;
  }

  // 정적 파일도 리다이렉트하지 않음
  if (url.pathname.startsWith('/_next/') || url.pathname.includes('.')) {
    return response;
  }

  // 프로덕션 환경에서 HTTPS 리다이렉션 (페이지만)
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto');
    const host = request.headers.get('host');

    // localhost는 리다이렉션 하지 않음
    if (host && !host.includes('localhost')) {
      if (proto === 'http') {
        return NextResponse.redirect(`https://${host}${url.pathname}${url.search}`, 301);
      }

      if (host === 'www.miraenad.com') {
        return NextResponse.redirect(`https://miraenad.com${url.pathname}${url.search}`, 301);
      }
    }
  }

  // 보안 헤더
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
EOF
    echo -e "${GREEN}✅ middleware.ts 수정 완료${NC}\n"
fi

# 4. PM2 중지
echo -e "${BLUE}⏹️  PM2 중지...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo -e "${GREEN}✅ PM2 중지 완료${NC}\n"

# 5. 빌드 파일 정리
echo -e "${BLUE}🧹 빌드 파일 정리...${NC}"
rm -rf .next node_modules/.cache
echo -e "${GREEN}✅ 정리 완료${NC}\n"

# 6. 의존성 설치
echo -e "${BLUE}📦 의존성 설치...${NC}"
npm install --production=false
npx prisma generate
echo -e "${GREEN}✅ 의존성 설치 완료${NC}\n"

# 7. Next.js 빌드
echo -e "${BLUE}🏗️  Next.js 빌드...${NC}"
npm run build
echo -e "${GREEN}✅ 빌드 완료${NC}\n"

# 8. PM2 시작
echo -e "${BLUE}🚀 PM2 시작...${NC}"
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
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
echo -e "${GREEN}✅ PM2 시작 완료${NC}\n"

# 9. Nginx 설정 (sudo 필요)
if [ "$1" != "--no-nginx" ] && [ "$EUID" -eq 0 ]; then
    echo -e "${BLUE}🔧 Nginx 설정...${NC}"

    # Nginx 설치 확인
    if ! command -v nginx &> /dev/null; then
        echo -e "${YELLOW}Nginx 설치 중...${NC}"
        apt-get update
        apt-get install -y nginx certbot python3-certbot-nginx
    fi

    # 설정 파일 복사
    if [ -f nginx/miraenad.conf ]; then
        cp nginx/miraenad.conf /etc/nginx/sites-available/miraenad
        ln -sf /etc/nginx/sites-available/miraenad /etc/nginx/sites-enabled/miraenad

        # 기본 사이트 비활성화
        rm -f /etc/nginx/sites-enabled/default

        # Nginx 설정 테스트
        nginx -t

        # Nginx 재시작
        systemctl reload nginx
        echo -e "${GREEN}✅ Nginx 설정 완료${NC}"

        # SSL 인증서 확인
        if [ ! -f /etc/letsencrypt/live/miraenad.com/fullchain.pem ]; then
            echo -e "${YELLOW}SSL 인증서 설정...${NC}"
            certbot --nginx -d miraenad.com -d www.miraenad.com --non-interactive --agree-tos --email admin@miraenad.com
        fi
    else
        echo -e "${YELLOW}⚠️  nginx/miraenad.conf 파일이 없습니다${NC}"
    fi
    echo ""
fi

# 10. 테스트
echo -e "${BLUE}🧪 서비스 테스트...${NC}"
sleep 5

# 로컬 헬스 체크
echo -e "${CYAN}로컬 헬스 체크...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ 로컬 서버 정상${NC}"
else
    echo -e "${RED}❌ 로컬 서버 응답 없음${NC}"
fi

# API 테스트 (리다이렉트 없이)
echo -e "${CYAN}API 테스트...${NC}"
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

# 11. 상태 확인
echo -e "\n${BLUE}📊 서비스 상태${NC}"
echo "======================================"
pm2 status
echo ""

# 12. 완료
echo -e "${GREEN}======================================"
echo "✨ 배포 완료!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}📝 명령어:${NC}"
echo "  pm2 logs miraenad        # 로그 보기"
echo "  pm2 monit                # 모니터링"
echo "  sudo nginx -t            # Nginx 설정 테스트"
echo "  sudo systemctl status nginx # Nginx 상태"
echo ""
echo -e "${BLUE}🌐 접속 주소:${NC}"
echo "  https://miraenad.com"
echo ""
echo -e "${BLUE}🔐 테스트 계정:${NC}"
echo "  admin@marketingplat.com / admin123"
echo ""

# 문제 진단 명령
if [ "$http_code" != "200" ]; then
    echo -e "${YELLOW}⚠️  문제 해결:${NC}"
    echo "  npx tsx scripts/debug-login.ts  # 로그인 디버그"
    echo "  pm2 logs miraenad --lines 100   # 상세 로그"
    echo "  curl -I http://localhost:3000/api/auth/login # API 헤더 확인"
fi