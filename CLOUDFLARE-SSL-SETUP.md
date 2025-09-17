# 🔐 Cloudflare SSL 설정 가이드

## 현재 문제
- ✅ HTTP 작동: http://miraenad.com
- ❌ HTTPS 미작동: https://miraenad.com (ERR_CONNECTION_REFUSED)

## 🚀 즉시 해결 방법

### Cloudflare 대시보드에서 설정 (5분 소요)

#### 1️⃣ **DNS 설정 확인**
1. Cloudflare 대시보드 → miraenad.com 선택
2. **DNS** 메뉴 클릭
3. A 레코드 확인:
   - miraenad.com → 13.125.39.37
   - **Proxy Status를 "Proxied" (주황색 구름)로 변경** ← 중요!

#### 2️⃣ **SSL/TLS 설정**
1. **SSL/TLS** → **Overview** 메뉴
2. SSL/TLS encryption mode 선택:
   - **"Flexible"** 선택 (가장 간단)
   - 또는 "Full" (EC2에 자체 서명 인증서가 있는 경우)

#### 3️⃣ **HTTPS 강제 리디렉션**
1. **SSL/TLS** → **Edge Certificates** 메뉴
2. 다음 옵션들 활성화:
   - **Always Use HTTPS**: ON ✅
   - **Automatic HTTPS Rewrites**: ON ✅
   - **Minimum TLS Version**: TLS 1.2

#### 4️⃣ **페이지 규칙 추가** (선택사항)
1. **Rules** → **Page Rules** 메뉴
2. "Create Page Rule" 클릭
3. 설정:
   - URL: `http://*miraenad.com/*`
   - Setting: Always Use HTTPS
   - Save and Deploy

## 🔍 설정 확인 체크리스트

### Cloudflare에서 확인:
- [ ] DNS Proxy Status: **Proxied (주황색)**
- [ ] SSL/TLS Mode: **Flexible** 또는 **Full**
- [ ] Always Use HTTPS: **ON**
- [ ] Automatic HTTPS Rewrites: **ON**

### EC2에서 확인:
```bash
# Nginx가 포트 80에서 실행 중인지 확인
sudo netstat -tlpn | grep :80

# PM2 애플리케이션 상태
pm2 status

# 환경변수 확인
grep NEXT_PUBLIC_API_URL .env.production
# 결과: NEXT_PUBLIC_API_URL="https://miraenad.com"
```

## ⏱️ 적용 시간
- DNS Proxy 변경: 즉시 ~ 5분
- SSL 인증서: 즉시 (Cloudflare Universal SSL)
- HTTPS 리디렉션: 즉시

## 🧪 테스트 방법

### 1. 브라우저 캐시 삭제
- Chrome: Ctrl+Shift+Delete
- 또는 시크릿 모드로 테스트

### 2. 연결 테스트
```bash
# Windows CMD
curl -I https://miraenad.com

# 또는 브라우저에서
https://miraenad.com 직접 접속
```

### 3. SSL 인증서 확인
브라우저 주소창의 자물쇠 아이콘 클릭:
- 발급자: Cloudflare Inc ECC CA-3
- 유효기간 확인

## 🚨 문제 해결

### "ERR_TOO_MANY_REDIRECTS" 오류
1. Cloudflare SSL Mode를 **Flexible**로 변경
2. EC2의 Nginx에서 HTTPS 리디렉션 제거

### "521 Web Server Is Down" 오류
```bash
# EC2에서 서버 상태 확인
pm2 restart marketingplat
sudo systemctl restart nginx
```

### "526 Invalid SSL Certificate" 오류
- SSL Mode를 **Flexible**로 변경
- 또는 EC2에 유효한 SSL 인증서 설치

## 📌 최종 목표
1. https://miraenad.com 접속 → 정상 표시
2. http://miraenad.com 접속 → HTTPS로 자동 리디렉션
3. SSL 자물쇠 아이콘 표시
4. Cloudflare 보안 기능 활성화

## 💡 팁
- **Flexible SSL**이 가장 빠르고 간단합니다
- EC2에 별도 SSL 설치 불필요
- 5분 내에 HTTPS 작동 시작