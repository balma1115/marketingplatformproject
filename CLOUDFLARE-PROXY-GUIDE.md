# 🛡️ Cloudflare Proxy 설정 가이드

## 📌 현재 상황
Cloudflare에서 "프록시 상태를 사용하여 원본 서버를 보호하십시오"라는 메시지가 나타남

## ⚠️ 중요: 단계별 접근이 필요합니다!

### 🔄 올바른 설정 순서

#### **Step 1: DNS only로 먼저 설정** (현재 단계)
```
Type: A
Name: @
Content: 13.125.39.37
Proxy status: DNS only (회색 구름) ← 이것을 선택!
TTL: Auto
```

**이유:**
- Let's Encrypt SSL 인증서 발급을 위해 필요
- Cloudflare Proxy를 통하면 Let's Encrypt가 도메인 소유권을 확인할 수 없음
- 직접 연결이 되어야 인증서 발급 가능

#### **Step 2: SSL 인증서 발급 후**
EC2에서 SSL 인증서가 성공적으로 발급된 후:
1. Let's Encrypt SSL 인증서 설치 완료
2. HTTPS가 정상 작동하는지 확인
3. 그 다음 Cloudflare Proxy 활성화 고려

#### **Step 3: Cloudflare Proxy 활성화** (선택사항)
SSL 인증서 발급 완료 후:
```
Proxy status: Proxied (주황색 구름)
```

## 🎯 Cloudflare Proxy의 장단점

### ✅ Proxied (주황색 구름) 사용 시
**장점:**
- DDoS 공격 방어
- 실제 서버 IP 주소 숨김
- Cloudflare CDN 사용 (속도 향상)
- 무료 SSL 인증서 제공
- 보안 기능 (WAF, Bot 방어 등)

**단점:**
- Let's Encrypt 인증서 직접 발급 불가
- 일부 기능 제한 (WebSocket 등)
- 디버깅이 어려울 수 있음

### ✅ DNS only (회색 구름) 사용 시
**장점:**
- Let's Encrypt 인증서 직접 발급 가능
- 서버 직접 접근 (디버깅 용이)
- 모든 기능 제한 없음

**단점:**
- 실제 서버 IP 노출
- DDoS 공격에 취약
- CDN 혜택 없음

## 📋 권장 설정 프로세스

### 1️⃣ 초기 설정 (지금 해야 할 것)
```bash
# Cloudflare DNS 설정
A @ 13.125.39.37 (DNS only)
A www 13.125.39.37 (DNS only)
```

### 2️⃣ EC2에서 배포 및 SSL 발급
```bash
ssh -i your-key.pem ubuntu@13.125.39.37
cd /home/ubuntu/marketingplatformproject
git pull origin main
./scripts/deploy-miraenad.sh

# SSL 인증서 발급 (스크립트가 자동으로 처리)
sudo certbot --nginx -d miraenad.com -d www.miraenad.com
```

### 3️⃣ SSL 인증서 확인
```bash
# 브라우저에서
https://miraenad.com 접속
# SSL 자물쇠 아이콘 확인
```

### 4️⃣ (선택) Cloudflare Proxy 활성화
모든 것이 정상 작동하면:

**Cloudflare 대시보드에서:**
1. DNS 메뉴
2. A 레코드의 구름 아이콘 클릭
3. 주황색 (Proxied)로 변경

**SSL/TLS 설정:**
1. SSL/TLS → Overview
2. "Full (strict)" 선택

## 🚨 문제 해결

### "Too many redirects" 오류 발생 시
Cloudflare SSL 모드를 "Full (strict)"로 설정

### Let's Encrypt 인증서 발급 실패 시
1. Proxy를 반드시 "DNS only"로 설정
2. 방화벽에서 포트 80, 443 열기
3. DNS 전파 완료 확인

## 💡 최종 권장사항

### 개발/테스트 단계
- **DNS only** 사용 (디버깅 용이)

### 프로덕션 단계 (나중에)
1. Let's Encrypt로 SSL 인증서 발급
2. 모든 기능 테스트 완료
3. Cloudflare Proxy 활성화 고려
4. SSL 모드 "Full (strict)" 설정

## 📌 결론
**지금은 "DNS only"로 설정하세요!**
- SSL 인증서 발급을 위해 필수
- 나중에 언제든 Proxy로 변경 가능
- 보안은 Let's Encrypt SSL로도 충분