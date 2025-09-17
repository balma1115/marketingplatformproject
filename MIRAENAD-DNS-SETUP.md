# 🌐 miraenad.com DNS 설정 가이드

## 현재 상태
✅ **EC2 서버**: 정상 작동 중 (http://13.125.39.37)
❌ **도메인**: Cloudflare 기본 페이지 표시 중

## 📋 필요한 작업

### 1️⃣ Cloudflare DNS 설정 변경

#### Cloudflare 대시보드에서:

1. **Cloudflare 로그인**
   - https://dash.cloudflare.com 접속
   - miraenad.com 도메인 선택

2. **DNS 레코드 추가/수정**

   DNS 메뉴에서 다음 레코드를 추가하세요:

   | Type | Name | Content | Proxy Status | TTL |
   |------|------|---------|--------------|-----|
   | A | @ | 13.125.39.37 | DNS only (회색 구름) | Auto |
   | A | www | 13.125.39.37 | DNS only (회색 구름) | Auto |

   ⚠️ **중요**:
   - Proxy Status를 **"DNS only"** (회색 구름)로 설정
   - SSL 인증서 발급 후에 "Proxied" (주황색 구름)로 변경 가능

3. **기존 레코드 삭제**
   - Cloudflare가 자동으로 생성한 다른 A, AAAA 레코드가 있다면 삭제
   - CNAME 레코드 중 불필요한 것 삭제

### 2️⃣ DNS 전파 확인 (5-30분 소요)

```bash
# Windows에서
nslookup miraenad.com

# 결과가 13.125.39.37을 가리켜야 함
```

온라인 도구:
- https://www.whatsmydns.net
- miraenad.com 입력 후 A 레코드 확인

### 3️⃣ EC2 서버에서 배포

DNS가 EC2를 가리키는 것을 확인한 후:

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

### 4️⃣ SSL 인증서 설정

배포 스크립트가 자동으로 물어봅니다. 또는 수동으로:

```bash
# Let's Encrypt SSL 인증서 발급
sudo certbot --nginx -d miraenad.com -d www.miraenad.com

# 프롬프트 응답:
# 이메일: admin@miraenad.com
# 약관 동의: A
# 이메일 수신: N
# HTTPS 리디렉션: 2 (Redirect)
```

### 5️⃣ Cloudflare SSL 설정 (선택사항)

SSL 인증서가 발급되고 사이트가 작동하면:

1. **Cloudflare 대시보드**
   - SSL/TLS 메뉴 → Overview
   - SSL/TLS encryption mode를 **"Full (strict)"**로 설정

2. **DNS Proxy 활성화** (선택)
   - DNS 메뉴에서 A 레코드의 Proxy Status를 "Proxied" (주황색 구름)로 변경
   - Cloudflare의 CDN과 보안 기능 활용 가능

## 🔍 문제 해결

### DNS가 여전히 Cloudflare 페이지를 보여주는 경우
1. DNS 레코드가 올바른지 확인
2. Proxy Status가 "DNS only"인지 확인
3. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
4. DNS 캐시 플러시:
   ```cmd
   # Windows
   ipconfig /flushdns

   # Mac
   sudo dscacheutil -flushcache
   ```

### 502 Bad Gateway 오류
```bash
# EC2에서 PM2 상태 확인
pm2 status
pm2 restart marketingplat

# Nginx 재시작
sudo systemctl restart nginx
```

### Mixed Content 오류
- .env.production의 모든 URL이 https://로 시작하는지 확인
- 빌드 다시 실행: `npm run build && pm2 restart marketingplat`

## 📌 최종 확인

1. **HTTP 접속 테스트**: http://miraenad.com
   - HTTPS로 자동 리디렉션되어야 함

2. **HTTPS 접속 테스트**: https://miraenad.com
   - SSL 자물쇠 아이콘이 표시되어야 함
   - MarketingPlat 사이트가 정상적으로 표시되어야 함

## ⏱️ 예상 소요 시간
- DNS 전파: 5-30분 (최대 48시간)
- SSL 인증서 발급: 1-2분
- 전체 배포: 10-15분