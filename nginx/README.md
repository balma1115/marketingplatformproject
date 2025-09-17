# Nginx 설정 가이드

## 📁 파일 구조

- `miraenad.conf` - 표준 HTTPS 설정 (Let's Encrypt SSL 인증서 사용)
- `miraenad-cloudflare.conf` - Cloudflare 전용 설정 (SSL은 Cloudflare에서 처리)

## 🌐 Cloudflare 사용 시 (권장)

### 왜 Cloudflare + Nginx 조합인가?
- **Cloudflare**: SSL 인증서, DDoS 방어, CDN, 캐싱 담당
- **Nginx**: 로컬 리버스 프록시, 로드 밸런싱, 정적 파일 서빙 담당

### 설정 방법

1. **Nginx 설정 복사**
```bash
sudo cp nginx/miraenad-cloudflare.conf /etc/nginx/sites-available/miraenad
sudo ln -sf /etc/nginx/sites-available/miraenad /etc/nginx/sites-enabled/miraenad
sudo rm -f /etc/nginx/sites-enabled/default
```

2. **Nginx 테스트 및 재시작**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

3. **Cloudflare 설정**
- Cloudflare 대시보드에서:
  - SSL/TLS → Overview → "Flexible" 또는 "Full" 모드 선택
  - DNS → A 레코드가 EC2 인스턴스 IP를 가리키는지 확인
  - Proxy status: 🟠 Proxied (켜짐)

### 주요 특징
- HTTP(80 포트)만 사용 (SSL은 Cloudflare가 처리)
- Cloudflare Real IP 복원 설정 포함
- API 라우트 전용 최적화
- 정적 파일 캐싱 설정

## 🔒 직접 SSL 사용 시

### 설정 방법

1. **Let's Encrypt SSL 인증서 발급**
```bash
sudo certbot --nginx -d miraenad.com -d www.miraenad.com
```

2. **Nginx 설정 적용**
```bash
sudo cp nginx/miraenad.conf /etc/nginx/sites-available/miraenad
sudo ln -sf /etc/nginx/sites-available/miraenad /etc/nginx/sites-enabled/miraenad
```

3. **Nginx 재시작**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 🔍 문제 해결

### Nginx 로그 확인
```bash
# 액세스 로그
sudo tail -f /var/log/nginx/miraenad_access.log

# 에러 로그
sudo tail -f /var/log/nginx/miraenad_error.log
```

### 일반적인 문제

1. **502 Bad Gateway**
   - PM2가 실행 중인지 확인: `pm2 status`
   - 3000 포트 확인: `netstat -tlnp | grep 3000`

2. **리다이렉트 루프**
   - Cloudflare SSL 모드 확인 (Flexible 권장)
   - middleware.ts의 리다이렉트 로직 확인

3. **Real IP 문제**
   - Cloudflare IP 범위가 최신인지 확인
   - `CF-Connecting-IP` 헤더 확인

## 📊 성능 최적화

### Cloudflare 설정 권장사항
- **Caching Level**: Standard
- **Browser Cache TTL**: 4 hours
- **Always Online**: 활성화
- **Rocket Loader**: JavaScript 최적화 활성화

### Nginx 설정 최적화
- Gzip 압축 활성화
- 정적 파일 캐싱 헤더 설정
- 버퍼링 비활성화 (실시간 응답)

## 💻 개발 환경

개발 환경에서는 Nginx 없이 직접 접속:
```bash
# Next.js 개발 서버
npm run dev

# 로컬 접속
http://localhost:3000
```

## 📝 배포 스크립트

### 전체 배포 (Nginx 포함)
```bash
sudo bash scripts/deploy-complete.sh
```

### 간단 배포 (PM2만)
```bash
bash scripts/deploy-cloudflare.sh
```

### Nginx만 업데이트
```bash
bash scripts/deploy-cloudflare.sh --nginx
```