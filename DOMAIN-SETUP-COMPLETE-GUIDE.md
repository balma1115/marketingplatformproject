# 🌐 Route 53 + Cloudflare + EC2 도메인 설정 완전 가이드

## 📊 현재 구조 이해하기
```
사용자 → Cloudflare (DNS + CDN) → EC2 서버 (13.125.39.37)
         ↑
    Route 53 (네임서버 지정)
```

## 🔄 올바른 설정 순서

### Step 1: 도메인 등록처 확인
**어디서 도메인을 구매했는지 확인**
- Route 53에서 구매 → Route 53이 등록기관
- 다른 곳(예: 가비아, 고대디)에서 구매 → 해당 업체가 등록기관

### Step 2: 네임서버 결정 및 설정

#### 옵션 A: Cloudflare를 메인 DNS로 사용 (권장) ✅
```
도메인 등록처 → Cloudflare 네임서버 → Cloudflare DNS → EC2
```

#### 옵션 B: Route 53을 메인 DNS로 사용
```
도메인 등록처 → Route 53 네임서버 → Route 53 DNS → EC2
```

## 📋 단계별 설정 가이드 (Cloudflare 사용 기준)

### 1️⃣ **Cloudflare 설정**

#### A. Cloudflare에 도메인 추가
1. Cloudflare 대시보드 → "Add a Site"
2. miraenad.com 입력
3. 무료 플랜 선택
4. **네임서버 정보 확인** (예시):
   ```
   greg.ns.cloudflare.com
   uma.ns.cloudflare.com
   ```

#### B. DNS 레코드 설정
```
Type | Name | Content        | Proxy Status    | TTL
-----|------|----------------|-----------------|-----
A    | @    | 13.125.39.37   | Proxied (주황) | Auto
A    | www  | 13.125.39.37   | Proxied (주황) | Auto
```

### 2️⃣ **도메인 등록처에서 네임서버 변경**

#### Route 53에서 도메인을 구매한 경우:
1. AWS Console → Route 53 → Registered domains
2. miraenad.com 선택
3. "Add or edit name servers" 클릭
4. Cloudflare 네임서버로 변경:
   ```
   greg.ns.cloudflare.com
   uma.ns.cloudflare.com
   ```
5. Save changes

#### 다른 등록기관의 경우:
해당 업체 관리 페이지에서 네임서버를 Cloudflare로 변경

### 3️⃣ **EC2 서버 설정 확인**

#### A. 보안 그룹 확인 (AWS Console)
```
EC2 → Security Groups → 인바운드 규칙:
- Type: HTTP    | Port: 80   | Source: 0.0.0.0/0
- Type: HTTPS   | Port: 443  | Source: 0.0.0.0/0
- Type: Custom  | Port: 3000 | Source: 0.0.0.0/0
```

#### B. 서버 상태 확인 (SSH 접속)
```bash
# EC2 접속
ssh -i your-key.pem ubuntu@13.125.39.37

# 애플리케이션 상태
pm2 status
pm2 logs marketingplat --lines 20

# Nginx 상태
sudo systemctl status nginx

# 포트 확인
sudo ss -tlpn | grep :80
sudo ss -tlpn | grep :3000

# 로컬 테스트
curl http://localhost:3000
```

### 4️⃣ **Cloudflare SSL 설정**

1. **SSL/TLS → Overview**
   - Mode: **Flexible** (EC2에 SSL 없는 경우)
   - Mode: **Full** (EC2에 자체 서명 SSL 있는 경우)

2. **SSL/TLS → Edge Certificates**
   - Always Use HTTPS: **ON**
   - Automatic HTTPS Rewrites: **ON**
   - Minimum TLS Version: **TLS 1.2**

### 5️⃣ **검증 및 테스트**

#### A. DNS 전파 확인
```bash
# Windows CMD
nslookup miraenad.com

# 결과 확인
# Cloudflare IP가 나오면 Proxy ON
# 13.125.39.37이 나오면 Proxy OFF
```

#### B. 온라인 도구 사용
- https://www.whatsmydns.net
- https://dnschecker.org

#### C. 연결 테스트
```bash
# HTTP 테스트
curl -I http://miraenad.com

# HTTPS 테스트
curl -I https://miraenad.com
```

## 🔍 문제 진단 체크리스트

### ✅ DNS 설정 확인
```bash
# 네임서버 확인
nslookup -type=NS miraenad.com

# A 레코드 확인
nslookup miraenad.com
```

### ✅ EC2 서버 확인
```bash
# 서비스 재시작
pm2 restart marketingplat
sudo systemctl restart nginx

# 방화벽 확인
sudo ufw status
```

### ✅ Cloudflare 설정 확인
- DNS Proxy: ON (주황색)
- SSL Mode: Flexible
- Always Use HTTPS: ON

## 🚨 일반적인 오류 해결

### 521 Web Server Is Down
```bash
# EC2에서 실행
pm2 restart marketingplat
sudo systemctl restart nginx
```

### 522 Connection Timed Out
- AWS 보안 그룹에서 Cloudflare IP 허용
- https://www.cloudflare.com/ips/ 참고

### 523 Origin Is Unreachable
- EC2 인스턴스가 실행 중인지 확인
- 보안 그룹 규칙 확인

### ERR_TOO_MANY_REDIRECTS
- Cloudflare SSL Mode를 "Flexible"로 변경
- EC2 Nginx에서 HTTPS 리디렉션 제거

## 📌 최종 확인 사항

1. **DNS 체인 확인**
   ```
   도메인 등록처 → Cloudflare NS 확인
   Cloudflare → EC2 IP 확인
   ```

2. **서버 접근성**
   ```bash
   # 직접 IP 접속 테스트
   curl http://13.125.39.37
   ```

3. **HTTPS 작동**
   ```
   https://miraenad.com → 정상 표시
   SSL 자물쇠 아이콘 확인
   ```

## ⏱️ 예상 소요 시간
- 네임서버 변경: 5분 ~ 48시간
- Cloudflare DNS: 즉시 ~ 5분
- SSL 활성화: 즉시

## 💡 권장 설정
1. Cloudflare를 메인 DNS로 사용 (무료 CDN + SSL)
2. Flexible SSL 모드 사용 (가장 간단)
3. Always Use HTTPS 활성화