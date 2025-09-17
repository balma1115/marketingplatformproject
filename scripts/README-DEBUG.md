# 🔍 로그인 문제 디버깅 가이드

## 📋 체크리스트

### 1. EC2 서버 확인

#### PM2 로그 확인
```bash
# PM2 상태 확인
pm2 status

# 실시간 로그 모니터링
pm2 logs marketingplat --lines 100

# 에러 로그만 확인
tail -f ~/.pm2/logs/marketingplat-error.log

# 일반 로그 확인
tail -f ~/.pm2/logs/marketingplat-out.log
```

#### 환경변수 확인
```bash
# .env 파일 확인
cat .env | grep DATABASE_URL

# PM2 환경변수 확인
pm2 env 0 | grep -E "DATABASE|NODE_ENV"
```

### 2. 데이터베이스 확인

#### 디버깅 스크립트 실행
```bash
cd ~/marketingplatformproject
npx tsx scripts/debug-login.ts
```

이 스크립트는 다음을 확인합니다:
- ✅ 데이터베이스 연결
- ✅ 사용자 존재 여부
- ✅ 비밀번호 해시 검증
- ✅ 환경설정 문제

### 3. API 직접 테스트

#### 테스트 스크립트 사용
```bash
# 프로덕션 테스트
bash scripts/test-login-api.sh

# 로컬 테스트
bash scripts/test-login-api.sh local

# 디버그 모드
bash scripts/test-login-api.sh prod debug
```

#### curl 직접 사용
```bash
# 로그인 API 테스트
curl -X POST https://marketingplat.shop/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}' \
  -v

# 응답 확인
curl -X POST https://marketingplat.shop/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marketingplat.com","password":"admin123"}' \
  -s | jq '.'
```

### 4. 브라우저 디버깅

#### Chrome DevTools 사용
1. **F12** 또는 **우클릭 → 검사** 열기
2. **Network** 탭 이동
3. 로그인 시도
4. `login` 요청 찾기
5. 확인할 내용:
   - Request Headers
   - Request Payload
   - Response Headers
   - Response Body
   - Status Code

#### Console 확인
```javascript
// Console에서 직접 테스트
fetch('/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'admin@marketingplat.com',
    password: 'admin123'
  })
})
.then(res => res.json())
.then(console.log)
.catch(console.error)
```

### 5. 일반적인 문제 및 해결

#### ❌ DATABASE_URL이 localhost를 가리킴
```bash
# .env 파일 수정
nano .env

# DATABASE_URL을 AWS RDS로 변경
DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"

# PM2 재시작
pm2 restart marketingplat
```

#### ❌ 사용자가 없음
```bash
# 초기 계정 생성
npx tsx scripts/init-aws-accounts.ts
```

#### ❌ 비밀번호가 맞지 않음
```bash
# 디버깅 스크립트로 리셋
npx tsx scripts/debug-login.ts
# y를 입력하여 비밀번호 리셋
```

#### ❌ .next 빌드 파일 문제
```bash
# 완전 재빌드
bash scripts/ec2-rebuild.sh
```

### 6. CloudWatch 로그 확인 (AWS)

1. AWS Console → CloudWatch → Log groups
2. `/aws/rds/instance/marketingplat-db/postgresql` 확인
3. 최근 로그에서 연결 오류 확인

### 7. RDS 보안 그룹 확인

1. AWS Console → RDS → marketingplat-db
2. Security group rules 확인
3. EC2 인스턴스의 보안 그룹이 포함되어 있는지 확인

## 🚨 긴급 복구 절차

문제가 지속될 경우:

```bash
# 1. 모든 서비스 중지
pm2 stop all

# 2. 캐시 및 빌드 정리
rm -rf .next
rm -rf node_modules/.cache

# 3. 의존성 재설치
npm ci

# 4. Prisma 재생성
npx prisma generate

# 5. 데이터베이스 연결 테스트
npx tsx scripts/debug-login.ts

# 6. 재빌드
npm run build

# 7. PM2 재시작
pm2 start npm --name "marketingplat" -- start
pm2 save

# 8. 로그 모니터링
pm2 logs marketingplat
```

## 📞 추가 지원

문제가 해결되지 않을 경우:
1. `pm2 logs` 전체 내용 저장
2. `npx tsx scripts/debug-login.ts` 실행 결과 저장
3. 브라우저 Network 탭 스크린샷
4. 위 정보와 함께 문의