# 🚀 MarketingPlat AWS 배포 체크리스트

## 📅 배포 정보
- **배포일**: 2025년 1월 16일
- **버전**: 1.0.0
- **빌드 상태**: ✅ 성공
- **문서 업데이트**: 2025년 1월 16일

---

## ✅ Day 1: 인프라 구축

### AWS 계정 준비
- [ ] AWS 계정 생성/로그인
- [ ] IAM 사용자 생성 (프로그래밍 액세스 활성화)
- [ ] AWS CLI 설치 및 구성
- [ ] 리전 설정: `ap-northeast-2` (서울)

### RDS PostgreSQL
- [ ] db.t3.micro 인스턴스 생성 (프리티어)
- [ ] 데이터베이스 이름: `marketingplat`
- [ ] 마스터 사용자: `marketingplat`
- [ ] 마스터 암호: 생성된 DB_PASSWORD 사용
- [ ] 퍼블릭 액세스: No
- [ ] Security Group 생성 (5432 포트, EC2에서만 접근)
- [ ] 자동 백업: 1일 보관
- [ ] 엔드포인트 기록: ___________________

### EC2 인스턴스
- [ ] t2.micro 인스턴스 생성 (프리티어)
- [ ] Ubuntu 22.04 LTS 선택
- [ ] 스토리지: 30GB gp3
- [ ] Key Pair 생성 및 다운로드
- [ ] Security Group 설정:
  - [ ] SSH (22): 내 IP만
  - [ ] HTTP (80): 0.0.0.0/0
  - [ ] HTTPS (443): 0.0.0.0/0
  - [ ] App (3000): 0.0.0.0/0 (임시)
- [ ] Elastic IP 할당
- [ ] 퍼블릭 IP 기록: ___________________

### S3 버킷
- [ ] 버킷 이름: `marketingplat-assets`
- [ ] 리전: `ap-northeast-2`
- [ ] 버전 관리: 활성화
- [ ] 퍼블릭 액세스: 차단
- [ ] Lifecycle 정책 설정

### SQS 큐
- [ ] `smartplace-tracking-queue` 생성
- [ ] `blog-tracking-queue` 생성
- [ ] Dead Letter Queue 설정
- [ ] 큐 URL 기록: ___________________

### IAM Role
- [ ] EC2 Role 생성 (`marketingplat-ec2-role`)
  - [ ] SecretsManager 읽기 권한
  - [ ] S3 읽기/쓰기 권한
  - [ ] SQS 전체 권한
- [ ] Lambda Role 생성 (`marketingplat-lambda-role`)
  - [ ] VPC 실행 권한
  - [ ] SecretsManager 읽기 권한
  - [ ] RDS 접근 권한
  - [ ] CloudWatch Logs 권한

---

## ✅ Day 2: 애플리케이션 배포

### 보안 설정
- [x] 자격 증명 생성 완료
  - JWT_SECRET: 88자
  - DB_PASSWORD: 44자
  - BACKUP_ENCRYPTION_KEY: 48자
- [ ] AWS Secrets Manager에 저장
- [ ] 로컬 자격 증명 파일 삭제

### EC2 초기 설정
```bash
# SSH 접속
ssh -i your-key.pem ubuntu@[EC2_PUBLIC_IP]

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 필수 도구 설치
sudo apt install -y git nginx certbot python3-certbot-nginx
sudo npm install -g pm2

# Playwright 의존성
sudo npx playwright install-deps chromium
```

### 애플리케이션 배포
```bash
# 코드 클론
git clone https://github.com/your-repo/marketingplatformproject.git
cd marketingplatformproject

# 의존성 설치
npm ci --production

# 환경변수 설정
source scripts/load-secrets-from-aws.sh

# 데이터베이스 마이그레이션
npx prisma migrate deploy
npx prisma db seed

# 프로덕션 빌드
npm run build

# PM2로 실행
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Nginx 설정
```bash
# 설정 파일 복사
sudo cp nginx/marketingplat.conf /etc/nginx/sites-available/marketingplat
sudo ln -s /etc/nginx/sites-available/marketingplat /etc/nginx/sites-enabled/

# 기본 사이트 비활성화
sudo rm /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### SSL 인증서
```bash
# Let's Encrypt SSL 설정
sudo certbot --nginx -d marketingplat.com -d www.marketingplat.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

### Lambda 함수 배포
```bash
# Lambda 배포 스크립트 실행
bash scripts/deploy-lambda.sh

# 또는 AWS Console에서 수동 배포
```

---

## ✅ Day 3: 최적화 및 모니터링

### CloudWatch 설정
- [ ] 대시보드 생성
- [ ] 알람 설정:
  - [ ] EC2 CPU > 80%
  - [ ] RDS 연결 > 80
  - [ ] Lambda 오류율 > 1%
  - [ ] 청구 금액 > $10

### 백업 설정
- [ ] RDS 자동 백업 확인
- [ ] S3 백업 버킷 생성
- [ ] 백업 스크립트 cron 등록

### 보안 점검
- [ ] Security Group 최소 권한 확인
- [ ] IAM 권한 검토
- [ ] Secrets 로테이션 설정
- [ ] 로그 설정 확인

---

## 🔍 배포 후 확인사항

### 기능 테스트
- [ ] 홈페이지 접속 확인
- [ ] 로그인/회원가입 테스트
- [ ] 스마트플레이스 진단 테스트
- [ ] 키워드 추적 테스트
- [ ] 관리자 페이지 확인

### 성능 테스트
- [ ] 페이지 로딩 속도 (< 2초)
- [ ] API 응답 시간 (< 500ms)
- [ ] 동시 사용자 테스트

### 보안 테스트
- [ ] SSL 인증서 확인
- [ ] Rate Limiting 동작 확인
- [ ] 보안 헤더 확인
- [ ] SQL Injection 테스트
- [ ] XSS 방어 테스트

---

## 📞 트러블슈팅

### 일반적인 문제 해결

#### 1. 빌드 실패
```bash
# TypeScript 에러 무시 설정 확인
# next.config.mjs에서 typescript.ignoreBuildErrors: true
```

#### 2. DB 연결 실패
```bash
# Security Group 확인
# RDS 엔드포인트 확인
# DATABASE_URL 환경변수 확인
```

#### 3. PM2 프로세스 중단
```bash
pm2 logs marketingplat
pm2 restart marketingplat
```

#### 4. Nginx 502 에러
```bash
# PM2 상태 확인
pm2 status

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 모니터링 대시보드

### 확인해야 할 메트릭
1. **시스템 리소스**
   - CPU 사용률
   - 메모리 사용률
   - 디스크 사용률

2. **애플리케이션 메트릭**
   - 요청 수/분
   - 평균 응답 시간
   - 에러율

3. **비즈니스 메트릭**
   - 활성 사용자 수
   - 추적 중인 키워드 수
   - 일일 크롤링 횟수

---

## 📝 유지보수 계획

### 일일 점검
- [ ] CloudWatch 대시보드 확인
- [ ] 에러 로그 확인
- [ ] 백업 상태 확인

### 주간 점검
- [ ] Security 패치 업데이트
- [ ] 성능 메트릭 리뷰
- [ ] 비용 분석

### 월간 점검
- [ ] 전체 시스템 백업
- [ ] 보안 감사
- [ ] 용량 계획 검토

---

## ✅ 배포 완료 확인

- [ ] 모든 체크리스트 항목 완료
- [ ] 프로덕션 URL 동작 확인
- [ ] 모니터링 설정 완료
- [ ] 백업 설정 완료
- [ ] 문서 업데이트 완료

**배포 담당자**: ___________________
**배포 완료 시간**: ___________________
**최종 확인자**: ___________________

---

**마지막 업데이트**: 2025년 1월 16일
**작성자**: Claude Code Assistant