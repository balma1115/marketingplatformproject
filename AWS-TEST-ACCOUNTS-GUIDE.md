# AWS 테스트 계정 생성 가이드

## 📋 개요
AWS RDS PostgreSQL 데이터베이스에 5가지 역할별 테스트 계정을 생성하는 가이드입니다.

## 🎯 생성될 테스트 계정

| 역할 | 이메일 | 비밀번호 | 권한 레벨 | 플랜 | 코인 | 승인상태 |
|------|--------|----------|-----------|------|------|----------|
| **관리자** | admin@test.aws.com | test1234 | admin | enterprise | 10,000 | ✅ 승인 |
| **대행사** | agency@test.aws.com | test1234 | agency | enterprise | 5,000 | ✅ 승인 |
| **지사** | branch@test.aws.com | test1234 | branch | professional | 3,000 | ✅ 승인 |
| **학원** | academy@test.aws.com | test1234 | academy | professional | 1,000 | ✅ 승인 |
| **일반회원** | user@test.aws.com | test1234 | user | basic | 100 | ❌ 미승인 |

## 🚀 실행 방법

### 방법 1: 자동 배포 스크립트 사용 (권장)

#### Windows PowerShell
```powershell
# PowerShell 관리자 권한으로 실행
cd D:\marketingplatformproject
.\scripts\deploy-test-accounts.ps1
```

#### Git Bash / WSL
```bash
cd /d/marketingplatformproject
bash scripts/deploy-test-accounts.sh
```

### 방법 2: 수동으로 EC2에서 실행

1. **GitHub으로 코드 푸시**
```bash
git add .
git commit -m "feat: 테스트 계정 생성 스크립트 추가"
git push origin main
```

2. **EC2 서버 접속**
```bash
ssh -i ~/marketingplat.pem ubuntu@43.203.199.103
```

3. **EC2에서 코드 업데이트 및 스크립트 실행**
```bash
cd /home/ubuntu/marketingplatform
git pull origin main
npm install
npx prisma generate
npx tsx scripts/seed-test-accounts.ts
```

### 방법 3: SQL 직접 실행 (DBeaver/pgAdmin 사용)

1. DBeaver 또는 pgAdmin에서 AWS RDS 연결
2. `scripts/create-test-accounts.sql` 파일 열기
3. 전체 SQL 실행

## 🔍 생성 확인

### EC2에서 확인
```bash
npx prisma studio
# 브라우저에서 http://43.203.199.103:5555 접속
```

### SQL로 확인
```sql
SELECT id, email, name, role, plan, coin, is_approved
FROM users
WHERE email LIKE '%@test.aws.com'
ORDER BY id;
```

### 애플리케이션에서 확인
1. https://marketingplat.com 접속
2. 각 테스트 계정으로 로그인 시도

## 📌 주의사항

1. **비밀번호 해시**:
   - 모든 비밀번호는 bcrypt로 해시됨
   - 원본 비밀번호: `test1234`

2. **중복 방지**:
   - `seed-test-accounts.ts`는 upsert 사용으로 중복 생성 방지
   - 기존 계정이 있으면 업데이트만 수행

3. **권한 구분**:
   - `admin`: 전체 시스템 관리 가능
   - `agency`: 여러 지사/학원 관리 가능
   - `branch`: 특정 지역 학원들 관리
   - `academy`: 자체 학원만 관리
   - `user`: 기본 사용자 권한

## 🔧 문제 해결

### SSH 접속 실패
```bash
# 키 파일 권한 설정 (Linux/Mac)
chmod 600 ~/marketingplat.pem

# Windows에서는 파일 속성 > 보안에서 권한 설정
```

### Prisma 에러
```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 데이터베이스 연결 확인
npx prisma db pull
```

### 계정 생성 실패
```bash
# 로그 확인
pm2 logs

# 데이터베이스 직접 접속 확인
psql -h marketingplat-db.cpqoq7zspwdr.ap-northeast-2.rds.amazonaws.com -U postgres -d marketingplat
```

## 📝 추가 작업

테스트 계정 삭제가 필요한 경우:
```sql
DELETE FROM users WHERE email LIKE '%@test.aws.com';
```

## 🔐 보안 주의사항

- 테스트 계정은 개발/테스트 환경에서만 사용
- 프로덕션 환경에서는 반드시 삭제 또는 비활성화
- 실제 서비스 출시 전 모든 테스트 계정 제거 필수

---

**작성일**: 2025년 1월 17일
**최종 업데이트**: 2025년 1월 17일