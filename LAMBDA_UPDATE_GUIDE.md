# 📦 Lambda 함수 업데이트 가이드

## 🎯 블로그탭 순위 체크 개선 사항 반영하기

### 📝 변경 내용
- 블로그 ID 추출 셀렉터 강화
- 여러 셀렉터 폴백 처리 추가
- `.user_box_inner a.name` 셀렉터 추가
- 제목 링크에서도 블로그 ID 추출 가능

---

## 🚀 Lambda 업데이트 방법

### 방법 1: Serverless Framework 사용 (권장)

#### 1. 로컬에서 코드 업데이트
```bash
# 1. 최신 코드 가져오기
cd D:\marketingplatformproject
git pull origin main

# 2. Lambda 함수 디렉토리로 이동
cd lambda-functions

# 3. 의존성 설치
npm install

# 4. TypeScript 컴파일
npm run build
```

#### 2. Lambda 배포
```bash
# Windows PowerShell에서 실행
.\deploy-windows.ps1

# 또는 배치 파일 사용
deploy-windows.bat

# 수동 배포 (Serverless CLI 직접 사용)
npx serverless deploy --stage production
```

#### 3. 배포 확인
```bash
# 함수 목록 확인
npx serverless info --stage production

# 로그 확인
npx serverless logs -f blogTracker --stage production --tail
```

---

### 방법 2: AWS Console에서 직접 업데이트

#### 1. AWS Lambda 콘솔 접속
1. AWS Console 로그인: https://console.aws.amazon.com
2. 서비스 → Lambda
3. 리전: **Asia Pacific (Seoul) ap-northeast-2** 확인

#### 2. 함수 선택
- `marketingplat-tracking-production-blogTracker` 클릭

#### 3. 코드 업데이트

**옵션 A: 직접 편집 (작은 변경)**
1. **코드** 탭 클릭
2. 코드 에디터에서 직접 수정
3. **Deploy** 버튼 클릭

**옵션 B: ZIP 파일 업로드 (전체 업데이트)**
1. 로컬에서 빌드:
```bash
cd lambda-functions
npm run build
```

2. ZIP 파일 위치:
```
lambda-functions/.serverless/marketingplat-tracking-production.zip
```

3. AWS Console에서:
   - **코드** 탭 → **업로드** → **.zip 파일 업로드**
   - 파일 선택 후 **저장**

#### 4. 레이어 확인 (중요!)
함수가 다음 레이어를 사용하는지 확인:
- `prisma-layer` - Prisma 클라이언트
- `chromium-layer` - Playwright 브라우저

---

### 방법 3: AWS CLI 사용

#### 1. AWS CLI 설정 확인
```bash
aws configure list
```

#### 2. 함수 코드 업데이트
```bash
# ZIP 파일 생성
cd lambda-functions
npm run build

# Lambda 함수 업데이트
aws lambda update-function-code \
  --function-name marketingplat-tracking-production-blogTracker \
  --zip-file fileb://.serverless/marketingplat-tracking-production.zip \
  --region ap-northeast-2
```

#### 3. 환경 변수 확인/업데이트
```bash
# 현재 환경 변수 확인
aws lambda get-function-configuration \
  --function-name marketingplat-tracking-production-blogTracker \
  --region ap-northeast-2 \
  --query 'Environment.Variables'

# 환경 변수 업데이트 (필요시)
aws lambda update-function-configuration \
  --function-name marketingplat-tracking-production-blogTracker \
  --environment Variables={DATABASE_URL="your-database-url",USE_LAMBDA="true"} \
  --region ap-northeast-2
```

---

## 🔍 업데이트 후 테스트

### 1. Lambda 콘솔에서 테스트
```json
{
  "type": "blog",
  "userId": "1",
  "keywords": ["테스트키워드"]
}
```

### 2. CloudWatch 로그 확인
1. CloudWatch → 로그 그룹
2. `/aws/lambda/marketingplat-tracking-production-blogTracker`
3. 최신 로그 스트림 확인

### 3. 실제 앱에서 테스트
```javascript
// 브라우저 콘솔에서 실행
fetch('/api/lambda/trigger-tracking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'blog',
    keywords: []
  })
}).then(r => r.json()).then(console.log)
```

---

## 📊 Lambda 함수 구조

```
lambda-functions/
├── blog-tracker/
│   └── index.ts          # 블로그 추적 함수 (수정된 파일)
├── smartplace-tracker/
│   └── index.ts          # 스마트플레이스 추적 함수
├── orchestrator/
│   └── index.ts          # 오케스트레이터
├── scheduled-trigger/
│   └── index.ts          # 스케줄 트리거
└── serverless.yml        # 배포 설정
```

---

## 🔧 문제 해결

### 오류: "Module not found"
**해결**:
```bash
cd lambda-functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 오류: "Timeout"
**해결**:
1. Lambda 콘솔 → 구성 → 일반 구성
2. 제한 시간: 5분(300초)으로 증가
3. 메모리: 1024MB 이상 권장

### 오류: "Database connection failed"
**해결**:
1. VPC 설정 확인
2. 보안 그룹에서 데이터베이스 포트 열려있는지 확인
3. DATABASE_URL 환경 변수 확인

---

## 🔄 롤백 방법

### 이전 버전으로 되돌리기
1. Lambda 콘솔 → 함수 선택
2. **버전** 탭
3. 이전 버전 선택 → **별칭** 업데이트

또는 Git에서 이전 커밋으로 롤백:
```bash
git checkout <previous-commit-hash>
cd lambda-functions
npm run build
npx serverless deploy --stage production
```

---

## 📝 체크리스트

배포 전:
- [ ] 로컬에서 테스트 완료
- [ ] Git pull로 최신 코드 받음
- [ ] npm install 실행
- [ ] TypeScript 컴파일 성공

배포 후:
- [ ] Lambda 콘솔에서 코드 업데이트 확인
- [ ] 테스트 이벤트 실행 성공
- [ ] CloudWatch 로그 정상
- [ ] 실제 앱에서 동작 확인

---

## 🌟 중요 팁

1. **항상 백업**: 배포 전 현재 버전 번호 기록
2. **단계별 배포**: 먼저 개발 환경에서 테스트
3. **모니터링**: CloudWatch 알람 설정으로 오류 즉시 감지
4. **비용 관리**: Lambda 실행 횟수와 시간 모니터링

---

**작성일**: 2025년 1월 19일
**환경**: AWS Lambda, Node.js 18.x, TypeScript
**프로젝트**: MarketingPlat Blog Tracker

> 💡 **참고**: 블로그탭 순위 체크 개선 사항은 `lib/services/naver-blog-scraper-v2.ts` 파일의 변경사항이 Lambda 함수에 반영되어야 합니다.