# 🔐 EC2 보안 그룹 Cloudflare 설정 완전 가이드

## 📋 인바운드 규칙 설정 (모든 규칙 추가 필요)

### HTTP (포트 80) 규칙
| Type | Protocol | Port Range | Source Type | Source |
|------|----------|------------|-------------|--------|
| HTTP | TCP | 80 | Custom | 173.245.48.0/20 |
| HTTP | TCP | 80 | Custom | 103.21.244.0/22 |
| HTTP | TCP | 80 | Custom | 103.22.200.0/22 |
| HTTP | TCP | 80 | Custom | 103.31.4.0/22 |
| HTTP | TCP | 80 | Custom | 141.101.64.0/18 |
| HTTP | TCP | 80 | Custom | 108.162.192.0/18 |
| HTTP | TCP | 80 | Custom | 190.93.240.0/20 |
| HTTP | TCP | 80 | Custom | 188.114.96.0/20 |
| HTTP | TCP | 80 | Custom | 197.234.240.0/22 |
| HTTP | TCP | 80 | Custom | 198.41.128.0/17 |
| HTTP | TCP | 80 | Custom | 162.158.0.0/15 |
| HTTP | TCP | 80 | Custom | 104.16.0.0/13 |
| HTTP | TCP | 80 | Custom | 104.24.0.0/14 |
| HTTP | TCP | 80 | Custom | 172.64.0.0/13 |
| HTTP | TCP | 80 | Custom | 131.0.72.0/22 |

### HTTPS (포트 443) 규칙
| Type | Protocol | Port Range | Source Type | Source |
|------|----------|------------|-------------|--------|
| HTTPS | TCP | 443 | Custom | 173.245.48.0/20 |
| HTTPS | TCP | 443 | Custom | 103.21.244.0/22 |
| HTTPS | TCP | 443 | Custom | 103.22.200.0/22 |
| HTTPS | TCP | 443 | Custom | 103.31.4.0/22 |
| HTTPS | TCP | 443 | Custom | 141.101.64.0/18 |
| HTTPS | TCP | 443 | Custom | 108.162.192.0/18 |
| HTTPS | TCP | 443 | Custom | 190.93.240.0/20 |
| HTTPS | TCP | 443 | Custom | 188.114.96.0/20 |
| HTTPS | TCP | 443 | Custom | 197.234.240.0/22 |
| HTTPS | TCP | 443 | Custom | 198.41.128.0/17 |
| HTTPS | TCP | 443 | Custom | 162.158.0.0/15 |
| HTTPS | TCP | 443 | Custom | 104.16.0.0/13 |
| HTTPS | TCP | 443 | Custom | 104.24.0.0/14 |
| HTTPS | TCP | 443 | Custom | 172.64.0.0/13 |
| HTTPS | TCP | 443 | Custom | 131.0.72.0/22 |

### SSH (포트 22) 규칙 - 기존 유지
| Type | Protocol | Port Range | Source Type | Source | Description |
|------|----------|------------|-------------|--------|-------------|
| SSH | TCP | 22 | My IP | 내 IP 주소/32 | SSH 접속용 |

### Custom TCP (포트 3000) 규칙 - 개발용 (선택)
| Type | Protocol | Port Range | Source Type | Source | Description |
|------|----------|------------|-------------|--------|-------------|
| Custom TCP | TCP | 3000 | Anywhere | 0.0.0.0/0 | Next.js 직접 접속 (테스트용) |

## 🚀 간편한 설정 방법 (권장)

### 옵션 1: 모든 HTTP/HTTPS 트래픽 허용 (가장 간단)
| Type | Protocol | Port Range | Source Type | Source | Description |
|------|----------|------------|-------------|--------|-------------|
| HTTP | TCP | 80 | Anywhere-IPv4 | 0.0.0.0/0 | 모든 HTTP 트래픽 |
| HTTPS | TCP | 443 | Anywhere-IPv4 | 0.0.0.0/0 | 모든 HTTPS 트래픽 |
| SSH | TCP | 22 | My IP | 내 IP/32 | SSH 접속 |

### 옵션 2: Cloudflare IP만 허용 (보안 강화)
위의 모든 Cloudflare IP 대역 규칙 추가

## 📝 AWS Console에서 설정하는 방법

### 1단계: 보안 그룹 찾기
1. AWS Console → EC2
2. 좌측 메뉴 "네트워크 및 보안" → "보안 그룹"
3. 현재 EC2 인스턴스의 보안 그룹 선택

### 2단계: 인바운드 규칙 편집
1. "인바운드 규칙" 탭 클릭
2. "인바운드 규칙 편집" 버튼 클릭

### 3단계: 규칙 추가 (간편 설정)
1. "규칙 추가" 클릭
2. 다음 설정 입력:
   - **유형**: HTTP
   - **프로토콜**: TCP (자동)
   - **포트 범위**: 80 (자동)
   - **소스 유형**: Anywhere-IPv4
   - **소스**: 0.0.0.0/0 (자동)
   - **설명**: Allow HTTP from anywhere

3. "규칙 추가" 다시 클릭
4. 다음 설정 입력:
   - **유형**: HTTPS
   - **프로토콜**: TCP (자동)
   - **포트 범위**: 443 (자동)
   - **소스 유형**: Anywhere-IPv4
   - **소스**: 0.0.0.0/0 (자동)
   - **설명**: Allow HTTPS from anywhere

5. "규칙 저장" 클릭

### 4단계: Cloudflare IP만 허용하려면 (선택)
1. "규칙 추가" 클릭
2. 다음 설정 입력:
   - **유형**: HTTP
   - **프로토콜**: TCP
   - **포트 범위**: 80
   - **소스 유형**: Custom
   - **소스**: 173.245.48.0/20
   - **설명**: Cloudflare IP range 1

3. 위 과정을 각 Cloudflare IP 대역마다 반복

## ⚠️ 중요 참고사항

### Cloudflare IP 목록 업데이트
Cloudflare IP는 변경될 수 있으므로 최신 목록 확인:
- IPv4: https://www.cloudflare.com/ips-v4
- IPv6: https://www.cloudflare.com/ips-v6

### 보안 vs 편의성
- **개발/테스트**: 0.0.0.0/0 사용 (모든 IP 허용)
- **프로덕션**: Cloudflare IP만 허용 (보안 강화)

### 변경사항 적용
- 보안 그룹 변경은 즉시 적용됨
- 서버 재시작 불필요

## 🔍 문제 해결

### 521 에러가 계속 발생하는 경우
1. 보안 그룹 규칙이 올바르게 저장되었는지 확인
2. EC2 인스턴스가 올바른 보안 그룹을 사용하는지 확인
3. Nginx와 PM2가 실행 중인지 확인:
   ```bash
   sudo systemctl status nginx
   pm2 status
   ```

### 테스트 방법
1. Cloudflare Proxy를 "Proxied" (주황색)로 설정
2. 5분 대기 (DNS 전파)
3. https://miraenad.com 접속 테스트

## 💡 최종 권장사항

### 빠른 해결을 원한다면:
```
HTTP  | TCP | 80  | 0.0.0.0/0 | Allow all HTTP
HTTPS | TCP | 443 | 0.0.0.0/0 | Allow all HTTPS
```

### 보안을 강화하려면:
위의 모든 Cloudflare IP 대역 추가

### 현재 상황에서는:
1. 먼저 0.0.0.0/0으로 설정하여 작동 확인
2. 작동 확인 후 Cloudflare IP로 제한

---

**작성일**: 2025년 1월 17일
**문서 용도**: EC2 보안 그룹 설정으로 Cloudflare 521 에러 해결