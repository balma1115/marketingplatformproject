# 🚀 배포 워크플로우 가이드

## 📌 핵심 원칙
**EC2에서 직접 코드를 수정하지 않습니다!**
모든 수정은 로컬에서 진행하고, Git을 통해 배포합니다.

## 🔄 배포 방법 3가지

### 방법 1: 수동 배포 (권장)
로컬에서 수정 → GitHub Push → EC2에서 Pull

### 방법 2: 스크립트 자동 배포
로컬에서 수정 → 스크립트 실행 → 자동 배포

### 방법 3: GitHub Actions (CI/CD)
로컬에서 수정 → GitHub Push → 자동 배포

---

## 📝 방법 1: 수동 배포 (가장 안전)

### 1-1. 로컬에서 작업
```bash
# 1. 코드 수정
code .  # VS Code로 수정

# 2. 테스트
npm run dev   # 개발 서버에서 테스트
npm run lint  # 코드 검사
npm run build # 빌드 테스트

# 3. Git 커밋 및 푸시
git add .
git commit -m "fix: 버그 수정 내용"
git push origin main
```

### 1-2. EC2에서 배포
```bash
# SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 배포 스크립트 실행
cd /home/ubuntu/marketingplatformproject
./scripts/ec2-pull-deploy.sh

# 또는 수동으로
git pull origin main
npm ci --production=false
npm run build
pm2 restart marketingplat
```

---

## 🤖 방법 2: 스크립트 자동 배포

### 2-1. 초기 설정 (1회만)
```bash
# scripts/local-to-ec2-deploy.sh 수정
nano scripts/local-to-ec2-deploy.sh

# 다음 값들을 실제 값으로 변경:
EC2_HOST="ubuntu@your-actual-ec2-ip"
EC2_KEY="~/.ssh/your-actual-key.pem"
REPO_URL="https://github.com/your-username/marketingplatformproject.git"
```

### 2-2. 배포 실행
```bash
# 로컬에서 실행
./scripts/local-to-ec2-deploy.sh
```

이 스크립트는 자동으로:
- 로컬 테스트 실행
- Git commit & push
- EC2에서 pull & build & restart

---

## 🔧 방법 3: GitHub Actions CI/CD

### 3-1. GitHub Secrets 설정
GitHub 리포지토리 → Settings → Secrets → Actions에서:

1. `EC2_HOST`: EC2 퍼블릭 IP 주소
2. `EC2_SSH_KEY`: EC2 SSH 키 내용 (전체 복사)

```bash
# SSH 키 내용 확인
cat ~/.ssh/your-key.pem
# 이 내용을 EC2_SSH_KEY에 붙여넣기
```

### 3-2. 자동 배포
```bash
# main 브랜치에 푸시하면 자동 배포
git push origin main

# GitHub Actions 상태 확인
# https://github.com/your-username/marketingplatformproject/actions
```

---

## 📋 EC2 초기 설정 (최초 1회)

### EC2에 배포 스크립트 설치
```bash
# EC2 SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 스크립트 다운로드
cd /home/ubuntu/marketingplatformproject/scripts
wget https://raw.githubusercontent.com/your-repo/marketingplatformproject/main/scripts/ec2-pull-deploy.sh
chmod +x ec2-pull-deploy.sh

# 별칭 설정 (선택사항)
echo "alias deploy='cd /home/ubuntu/marketingplatformproject && ./scripts/ec2-pull-deploy.sh'" >> ~/.bashrc
source ~/.bashrc
```

이제 EC2에서 `deploy` 명령으로 간단히 배포 가능!

---

## 🔥 긴급 핫픽스 프로세스

### 빠른 수정이 필요한 경우
```bash
# 1. 로컬에서 긴급 수정
git checkout -b hotfix/critical-bug
# 코드 수정...

# 2. 테스트
npm run build

# 3. 머지 및 배포
git checkout main
git merge hotfix/critical-bug
git push origin main

# 4. EC2에서 즉시 배포
ssh -i key.pem ubuntu@ec2-ip "cd /home/ubuntu/marketingplatformproject && ./scripts/ec2-pull-deploy.sh"
```

---

## 🛡️ 안전 장치

### 배포 전 체크리스트
- [ ] 로컬에서 `npm run build` 성공
- [ ] 로컬에서 `npm run lint` 통과
- [ ] 중요 기능 테스트 완료
- [ ] Git 커밋 메시지 명확히 작성

### 롤백 방법
```bash
# EC2에서 이전 커밋으로 롤백
cd /home/ubuntu/marketingplatformproject

# 이전 커밋 확인
git log --oneline -5

# 특정 커밋으로 롤백
git reset --hard [commit-hash]
npm ci --production=false
npm run build
pm2 restart marketingplat
```

---

## 📊 배포 모니터링

### 배포 후 확인
```bash
# PM2 상태
pm2 status
pm2 logs marketingplat --lines 100

# 애플리케이션 접속 테스트
curl http://localhost:3000/api/health

# 실시간 로그 모니터링
pm2 logs marketingplat --follow
```

### 에러 발생 시
```bash
# 에러 로그 확인
pm2 logs marketingplat --err --lines 200

# Nginx 로그
sudo tail -f /var/log/nginx/error.log

# 시스템 리소스 확인
htop
df -h
free -m
```

---

## 🎯 권장 워크플로우

### 일반 개발
1. **로컬**: 기능 개발 및 테스트
2. **Git**: 커밋 및 푸시
3. **EC2**: `deploy` 명령 실행

### 프로덕션 배포
1. **로컬**: 충분한 테스트
2. **Git**: PR 생성 및 리뷰
3. **GitHub**: main 브랜치 머지
4. **EC2**: 자동 배포 (Actions) 또는 수동 배포

---

## 💡 팁

### 배포 속도 향상
```bash
# EC2에서 미리 의존성 설치
npm ci --production=false

# 빌드만 실행
npm run build
pm2 restart marketingplat
```

### 무중단 배포
```bash
# reload 사용 (restart 대신)
pm2 reload marketingplat
```

### 배포 자동화
```bash
# cron으로 정기 배포 (매일 새벽 3시)
crontab -e
0 3 * * * cd /home/ubuntu/marketingplatformproject && ./scripts/ec2-pull-deploy.sh >> /home/ubuntu/logs/deploy.log 2>&1
```

---

**작성일**: 2025년 1월 16일
**프로젝트**: MarketingPlat
**목적**: 로컬 개발 → EC2 배포 워크플로우