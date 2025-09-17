# 📚 AWS EC2 썸네일 제작기 배포 가이드

## 🚀 빠른 배포 (자동 스크립트)

### 1. EC2 서버 접속
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. 배포 스크립트 실행
```bash
cd /home/ubuntu/marketingplatformproject
git pull origin main
chmod +x scripts/deploy-thumbnail-to-aws.sh
sudo bash scripts/deploy-thumbnail-to-aws.sh
```

## 🔑 API 키 설정 (필수!)

### 1. 환경 변수 파일 편집
```bash
sudo nano /home/ubuntu/marketingplatformproject/.env.local
```

### 2. 다음 API 키 추가/수정
```env
# Google AI (Gemini) - 나노 바나나 이미지 생성
GOOGLE_AI_API_KEY=your_actual_google_ai_key
GEMINI_API_KEY=your_actual_gemini_key

# Flux AI - Pro/Ultra/Kontext 이미지 생성
BFL_API_KEY=your_actual_flux_api_key
FLUX_API_KEY=your_actual_flux_api_key
```

### 3. API 키 발급처
- **Google AI**: https://makersuite.google.com/app/apikey
- **Flux API**: https://docs.bfl.ai/ (회원가입 후 크레딧 구매 필요)

### 4. 설정 적용
```bash
pm2 restart marketingplat
```

## 📝 수동 배포 (단계별)

### Step 1: 코드 업데이트
```bash
cd /home/ubuntu/marketingplatformproject
git stash
git pull origin main
```

### Step 2: 패키지 설치
```bash
npm install
```

### Step 3: 환경 변수 설정
```bash
# .env.local 파일 생성/편집
nano .env.local

# 다음 내용 추가
DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
NEXTAUTH_SECRET="Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6"
NEXTAUTH_URL="https://miraenad.com"
JWT_SECRET="Kl&8_8=3m^9!2qH@N#Vp4$Zx7Yw5Rt6"

# AI API 키들
GOOGLE_AI_API_KEY=your_key_here
BFL_API_KEY=your_key_here
```

### Step 4: 빌드
```bash
# 환경 변수 export
export DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
export NODE_ENV=production

# Prisma 클라이언트 생성
npx prisma generate

# Next.js 빌드
npm run build
```

### Step 5: PM2 재시작
```bash
pm2 restart marketingplat
# 또는 완전 재시작
pm2 delete marketingplat
pm2 start ecosystem.config.js
```

## 🔍 배포 확인

### 1. PM2 상태 확인
```bash
pm2 status
pm2 logs marketingplat --lines 50
```

### 2. 포트 확인
```bash
sudo netstat -tlpn | grep :3000
```

### 3. 웹 접속 테스트
```bash
# 서버 내부에서 테스트
curl http://localhost:3000/design/thumbnail

# 브라우저에서 접속
https://miraenad.com/design/thumbnail
```

## 🐛 문제 해결

### 문제 1: 포트 3000 사용 중
```bash
# 포트 사용 프로세스 확인
sudo lsof -i:3000

# 프로세스 종료
sudo kill -9 [PID]

# PM2 완전 재시작
pm2 kill
pm2 start ecosystem.config.js
```

### 문제 2: 빌드 실패
```bash
# 캐시 삭제
rm -rf .next
rm -rf node_modules
rm package-lock.json

# 다시 설치 및 빌드
npm install
npm run build
```

### 문제 3: API 키 인식 안 됨
```bash
# PM2 환경변수 확인
pm2 env marketingplat

# ecosystem.config.js 수정
nano ecosystem.config.js

# env 섹션에 API 키 직접 추가
env: {
  GOOGLE_AI_API_KEY: '실제_키_값',
  BFL_API_KEY: '실제_키_값'
}

# PM2 재시작
pm2 restart marketingplat --update-env
```

## 📊 모니터링

### 실시간 로그 확인
```bash
pm2 logs marketingplat --lines 100
pm2 monit
```

### 에러 로그 확인
```bash
tail -f /home/ubuntu/logs/err.log
```

### 시스템 리소스 확인
```bash
htop
df -h
free -h
```

## 🔄 업데이트 프로세스

### 코드 업데이트만 필요한 경우
```bash
cd /home/ubuntu/marketingplatformproject
git pull
pm2 restart marketingplat
```

### 전체 재빌드 필요한 경우
```bash
cd /home/ubuntu/marketingplatformproject
git pull
npm install
npm run build
pm2 restart marketingplat
```

## 📌 중요 경로

- 프로젝트: `/home/ubuntu/marketingplatformproject`
- 환경변수: `/home/ubuntu/marketingplatformproject/.env.local`
- PM2 설정: `/home/ubuntu/marketingplatformproject/ecosystem.config.js`
- 로그 파일: `/home/ubuntu/logs/`
- Nginx 설정: `/etc/nginx/sites-available/marketingplat`

## 🎯 최종 확인사항

1. ✅ 코드 최신 버전 pull
2. ✅ npm 패키지 설치 완료
3. ✅ API 키 설정 완료
4. ✅ 빌드 성공
5. ✅ PM2 정상 실행
6. ✅ 웹 접속 가능
7. ✅ AI 이미지 생성 테스트

---

**문서 작성일**: 2025년 1월 18일
**마지막 업데이트**: 썸네일 제작기 추가