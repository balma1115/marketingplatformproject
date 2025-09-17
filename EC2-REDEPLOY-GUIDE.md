# 🔄 EC2 재배포 가이드

## 📋 개요
EC2에 기존 프로젝트를 백업하고 새로 배포하는 완전한 가이드

## 🚀 단계별 실행 방법

### Step 1: EC2 SSH 접속
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Step 2: 스크립트 다운로드
```bash
# 백업 스크립트 다운로드
wget https://raw.githubusercontent.com/your-repo/marketingplatformproject/main/scripts/ec2-backup-and-reset.sh

# 새 배포 스크립트 다운로드
wget https://raw.githubusercontent.com/your-repo/marketingplatformproject/main/scripts/ec2-fresh-deploy.sh

# 실행 권한 부여
chmod +x ec2-backup-and-reset.sh
chmod +x ec2-fresh-deploy.sh
```

### Step 3: 기존 프로젝트 백업 및 정리
```bash
./ec2-backup-and-reset.sh
```

이 스크립트는 다음 작업을 수행합니다:
- ✅ PM2 프로세스 중지
- ✅ 환경 변수 파일 백업 (.env.production, .env.local)
- ✅ 전체 프로젝트 백업 (tar.gz)
- ✅ 로그 파일 백업
- ✅ 기존 프로젝트 디렉토리 이름 변경
- ✅ Nginx 캐시 정리

### Step 4: GitHub 리포지토리 URL 수정
```bash
# ec2-fresh-deploy.sh 파일 편집
nano ec2-fresh-deploy.sh

# REPO_URL을 실제 GitHub URL로 변경
REPO_URL="https://github.com/YOUR_USERNAME/marketingplatformproject.git"
```

### Step 5: 새로운 배포 실행
```bash
./ec2-fresh-deploy.sh
```

이 스크립트는 다음 작업을 수행합니다:
- ✅ 새 프로젝트 클론
- ✅ 백업된 환경 변수 복원
- ✅ Node.js 20 확인 및 설치
- ✅ 의존성 설치
- ✅ Playwright 브라우저 설치
- ✅ Prisma 설정 및 마이그레이션
- ✅ 프로덕션 빌드
- ✅ PM2 재시작
- ✅ Nginx 설정

## 📁 백업 파일 위치

백업 스크립트 실행 후 생성되는 파일들:

```
/home/ubuntu/
├── backup_20250116_143022.tar.gz              # 전체 프로젝트 백업
├── env_backup_20250116_143022.production      # .env.production 백업
├── env_backup_20250116_143022.local           # .env.local 백업
├── logs_backup_20250116_143022.tar.gz         # 로그 백업
└── marketingplatformproject_old_20250116/     # 기존 프로젝트 디렉토리
```

## 🔧 문제 해결

### 문제: Git clone 실패
```bash
# SSH 키 설정이 필요한 경우
eval $(ssh-agent -s)
ssh-add ~/.ssh/id_rsa

# 또는 HTTPS 토큰 사용
git config --global credential.helper store
```

### 문제: 메모리 부족으로 빌드 실패
```bash
# 스왑 메모리 확인
free -h

# 스왑 메모리가 없다면 추가
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 문제: PM2 프로세스가 시작되지 않음
```bash
# PM2 로그 확인
pm2 logs

# PM2 재시작
pm2 kill
pm2 start ecosystem.config.js --env production

# PM2 모니터링
pm2 monit
```

### 문제: 데이터베이스 연결 실패
```bash
# DATABASE_URL 확인
cat .env.production | grep DATABASE_URL

# PostgreSQL 연결 테스트
psql $DATABASE_URL -c "SELECT 1"

# RDS 보안 그룹 확인 (EC2 IP 허용 필요)
```

## 📊 배포 확인

### 1. PM2 상태 확인
```bash
pm2 status
pm2 logs --lines 50
```

### 2. 포트 확인
```bash
sudo lsof -i :3000
curl http://localhost:3000
```

### 3. Nginx 상태
```bash
sudo systemctl status nginx
sudo nginx -t
```

### 4. 로그 모니터링
```bash
# PM2 로그
pm2 logs --follow

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log

# 애플리케이션 로그
tail -f /home/ubuntu/logs/error.log
```

## 🔄 롤백 방법

문제가 발생한 경우 이전 버전으로 롤백:

```bash
# PM2 중지
pm2 stop all

# 현재 버전 백업
mv /home/ubuntu/marketingplatformproject /home/ubuntu/marketingplatformproject_failed

# 이전 버전 복원 (타임스탬프는 실제 값으로 변경)
mv /home/ubuntu/marketingplatformproject_old_20250116_143022 /home/ubuntu/marketingplatformproject

# 환경 변수 복원
cp /home/ubuntu/env_backup_20250116_143022.production /home/ubuntu/marketingplatformproject/.env.production

# PM2 재시작
cd /home/ubuntu/marketingplatformproject
pm2 start ecosystem.config.js --env production
```

## 🎯 체크리스트

배포 전:
- [ ] GitHub 리포지토리 최신 코드 푸시됨
- [ ] 로컬에서 빌드 테스트 완료
- [ ] 데이터베이스 백업 완료

배포 중:
- [ ] 기존 프로젝트 백업 완료
- [ ] 환경 변수 백업 확인
- [ ] 새 프로젝트 클론 성공
- [ ] 빌드 성공

배포 후:
- [ ] PM2 프로세스 정상 실행
- [ ] 웹 애플리케이션 접속 가능
- [ ] 주요 기능 테스트 완료
- [ ] 에러 로그 확인

## 💡 유용한 명령어

```bash
# 시스템 리소스 확인
htop
df -h
free -h

# 네트워크 상태
netstat -tulpn
ss -tulpn

# 프로세스 확인
ps aux | grep node
ps aux | grep nginx

# 로그 실시간 모니터링
journalctl -f -u nginx
```

---

**작성일**: 2025년 1월 16일
**프로젝트**: MarketingPlat
**용도**: EC2 재배포