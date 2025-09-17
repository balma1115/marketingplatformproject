# AWS 배포 준비 완료

## ✅ 완료된 작업

### 1. 로컬 환경 검증
- ✅ AWS SDK 패키지 설치 확인
- ✅ next.config.mjs 동적 경로 설정
- ✅ .env.production 템플릿 생성
- ✅ 로컬 테스트 스크립트 작성

### 2. 배포 스크립트 작성
- ✅ EC2 초기 설정 스크립트 (`scripts/ec2-initial-setup.sh`)
- ✅ PM2 설정 파일 (`ecosystem.config.js`)
- ✅ Nginx 설정 파일 (`nginx.conf`, `proxy_params`)
- ✅ Quick Deploy 스크립트 (`scripts/quick-deploy.sh`)
- ✅ 애플리케이션 배포 스크립트 (`scripts/deploy-app.sh`)

## 📁 생성된 파일 목록

```
marketingplatformproject/
├── .env.production.template    # 환경 변수 템플릿
├── ecosystem.config.js         # PM2 설정
├── nginx.conf                  # Nginx 설정
├── proxy_params               # Nginx proxy 설정
└── scripts/
    ├── local-test.sh          # 로컬 테스트
    ├── ec2-initial-setup.sh   # EC2 초기 설정
    ├── quick-deploy.sh        # 빠른 배포
    └── deploy-app.sh          # 앱 배포
```

## 🚀 AWS 배포 단계

### Step 1: EC2 인스턴스 생성
1. AWS Console에서 EC2 인스턴스 생성 (Ubuntu 22.04)
2. 보안 그룹 설정:
   - SSH (22)
   - HTTP (80)
   - HTTPS (443)
   - Application (3000)

### Step 2: EC2 초기 설정
```bash
# EC2에 SSH 접속 후
wget https://raw.githubusercontent.com/your-repo/marketingplatformproject/main/scripts/ec2-initial-setup.sh
chmod +x ec2-initial-setup.sh
./ec2-initial-setup.sh
```

### Step 3: 빠른 배포
```bash
wget https://raw.githubusercontent.com/your-repo/marketingplatformproject/main/scripts/quick-deploy.sh
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### Step 4: 환경 변수 설정
`.env.production` 파일을 편집하여 실제 값 입력:
- DATABASE_URL (RDS 엔드포인트)
- JWT_SECRET (새로 생성)
- 도메인 설정

### Step 5: SSL 인증서 설정 (선택)
```bash
sudo certbot --nginx -d marketingplat.com -d www.marketingplat.com
```

## ⚠️ 중요 사항

### 보안
- `.env.production` 파일은 절대 Git에 커밋하지 마세요
- JWT_SECRET은 반드시 새로 생성하세요
- 프로덕션에서는 AWS Secrets Manager 사용을 권장합니다

### 데이터베이스
- RDS PostgreSQL 인스턴스를 먼저 생성해야 합니다
- 보안 그룹에서 EC2의 접근을 허용해야 합니다

### 성능
- t2.micro에서는 스왑 메모리 설정이 필수입니다
- 트래픽이 많은 경우 t3.small 이상을 권장합니다

## 💰 예상 비용

### 프리티어 (첫 12개월)
- EC2 t2.micro: 무료
- RDS db.t3.micro: 무료
- 월 예상 비용: $0-5

### 프리티어 종료 후
- EC2 t3.small: ~$15/월
- RDS db.t3.micro: ~$13/월
- 월 예상 비용: $30-40

## 📞 문제 해결

### 빌드 실패
```bash
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
```

### PM2 재시작
```bash
pm2 restart all
pm2 logs
```

### Nginx 설정 확인
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 🔗 참고 문서
- [AWS-COMPLETE-DEPLOYMENT-GUIDE.md](./AWS-COMPLETE-DEPLOYMENT-GUIDE.md) - 상세 가이드
- [CLAUDE.md](./CLAUDE.md) - 프로젝트 개발 가이드

---

**작성일**: 2025년 1월 16일
**프로젝트**: MarketingPlat
**상태**: AWS 배포 준비 완료