# EC2 Lambda 에러 긴급 해결 방법

## 현재 상황
- miraenad.com에서 Lambda 추적 시 `InvalidClientTokenId` 에러 발생
- AWS 자격 증명이 EC2에 설정되지 않음

## 즉시 해결 방법 (5분 소요)

### 1단계: EC2 접속
```bash
ssh ubuntu@miraenad.com
```

### 2단계: 환경 변수 파일 생성
```bash
cd ~/marketingplatformproject
nano .env.production.local
```

### 3단계: 다음 내용 복사-붙여넣기
```env
# AWS 임시 자격 증명 (테스트용)
AWS_ACCESS_KEY_ID="AKIAQEGG5QPQXXX"
AWS_SECRET_ACCESS_KEY="XXX"
AWS_REGION="ap-northeast-2"

# SQS Queue URLs (없으면 Lambda 비활성화)
BLOG_QUEUE_URL=""
SMARTPLACE_QUEUE_URL=""

# Lambda 비활성화로 로컬 실행
USE_LAMBDA="false"

# 기존 DATABASE_URL 유지
DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
```

### 4단계: 최신 코드 적용
```bash
git pull origin main
npm install
npm run build
```

### 5단계: PM2 재시작
```bash
pm2 restart miraenad
pm2 save
```

## 대안: Lambda 없이 로컬 실행 모드

Lambda가 설정되지 않은 경우 자동으로 로컬에서 실행되도록 이미 코드가 구현되어 있습니다.

### 환경 변수 수정 (.env.production.local)
```env
# Lambda 비활성화
USE_LAMBDA="false"
BLOG_QUEUE_URL=""
SMARTPLACE_QUEUE_URL=""
```

이렇게 설정하면:
- Lambda 대신 EC2 서버에서 직접 스크래핑 실행
- AWS 자격 증명 불필요
- 즉시 작동 가능

## 확인 방법
```bash
pm2 logs miraenad --lines 50
```

로그에 "Lambda 비활성화됨. 로컬에서 실행합니다." 메시지 확인

## 테스트
1. https://miraenad.com 접속
2. user@test.com / test1234 로그인
3. 블로그 키워드 페이지에서 "전체 추적" 클릭
4. 정상 작동 확인

---
⚠️ **주의**: 이는 임시 해결책입니다. 추후 AWS 계정 설정 후 Lambda 활성화 권장