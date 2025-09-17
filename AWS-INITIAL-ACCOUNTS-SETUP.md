# AWS RDS 초기 계정 설정 가이드

## 🎯 목적
AWS RDS PostgreSQL 데이터베이스에 5가지 역할별 초기 계정을 생성하여 시스템 테스트 및 운영을 가능하게 합니다.

## 📋 생성될 초기 계정 목록

### 메인 운영 계정

| 역할 | 이메일 | 비밀번호 | 플랜 | 코인 | 용도 |
|------|--------|----------|------|------|------|
| **👑 관리자** | admin@marketingplat.com | admin123!@# | Enterprise | 999,999 | 전체 시스템 관리 |
| **🏢 대행사** | agency@marketingplat.com | agency123!@# | Enterprise | 50,000 | 여러 지사 관리 |
| **🏪 지사** | branch@marketingplat.com | branch123!@# | Professional | 30,000 | 여러 학원 관리 |
| **🏫 학원** | academy@marketingplat.com | academy123!@# | Professional | 10,000 | 자체 학원 운영 |
| **👤 일반회원** | user@marketingplat.com | user123!@# | Basic | 100 | 일반 사용자 |

### 테스트 계정 (비밀번호: test1234)

| 역할 | 이메일 | 용도 |
|------|--------|------|
| 관리자 | test.admin@marketingplat.com | 개발/테스트용 관리자 |
| 대행사 | test.agency@marketingplat.com | 대행사 기능 테스트 |
| 지사 | test.branch@marketingplat.com | 지사 기능 테스트 |
| 학원 | test.academy@marketingplat.com | 학원 기능 테스트 |
| 일반 | test.user@marketingplat.com | 일반 사용자 테스트 |

## 🚀 실행 방법

### 방법 1: 자동 배포 스크립트 (권장) ⭐

#### Windows PowerShell/Git Bash
```bash
# 로컬에서 실행
cd D:\marketingplatformproject
bash scripts/deploy-init-accounts.sh
```

이 스크립트는 자동으로:
1. GitHub에 코드 푸시
2. EC2 서버 접속
3. 최신 코드 풀
4. 초기 계정 생성
5. 결과 확인

### 방법 2: EC2에서 직접 실행

```bash
# 1. EC2 서버 접속
ssh -i ~/marketingplat.pem ubuntu@43.203.199.103

# 2. 프로젝트 디렉토리로 이동
cd /home/ubuntu/marketingplatformproject

# 3. 최신 코드 가져오기
git pull origin main

# 4. 초기 계정 생성 스크립트 실행
npx tsx scripts/init-aws-accounts.ts
```

### 방법 3: 로컬에서 직접 실행

```bash
# 로컬 프로젝트 디렉토리에서
cd D:\marketingplatformproject

# 초기 계정 생성 (로컬 DB URL이 AWS RDS를 가리켜야 함)
npx tsx scripts/init-aws-accounts.ts
```

## 🔍 계정 생성 확인 방법

### 1. Prisma Studio로 확인
```bash
# EC2에서
cd /home/ubuntu/marketingplatformproject
npx prisma studio
```
브라우저에서 `http://43.203.199.103:5555` 접속

### 2. SQL 쿼리로 확인
```sql
-- 모든 초기 계정 조회
SELECT email, name, role, plan, coin, is_approved
FROM users
WHERE email LIKE '%@marketingplat.com'
ORDER BY role;

-- 역할별 계정 수 확인
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;
```

### 3. TypeScript 스크립트로 확인
```bash
npx tsx scripts/check-aws-accounts.ts
```

### 4. 웹사이트에서 로그인 테스트
1. https://marketingplat.com 접속
2. 각 계정으로 로그인 시도
3. 역할별 대시보드 확인

## 📊 스크립트 실행 결과 예시

```
=================================
🚀 AWS RDS 초기 계정 설정 시작
=================================

📋 생성할 계정 수: 10개

✅ 👑 [ADMIN] admin@marketingplat.com
   비밀번호: admin123!@#
   이름: MarketingPlat 관리자
   플랜: enterprise | 코인: 999,999

✅ 🏢 [AGENCY] agency@marketingplat.com
   비밀번호: agency123!@#
   이름: 서울마케팅 대행사
   플랜: enterprise | 코인: 50,000

... (이하 생략)

=================================
📊 실행 결과
=================================
✅ 성공: 10개
⏭️ 건너뜀: 0개
❌ 실패: 0개
```

## 🔐 보안 주의사항

1. **프로덕션 환경 배포 전**:
   - 테스트 계정 삭제 또는 비활성화
   - 기본 비밀번호 변경 필수
   - 불필요한 관리자 계정 제거

2. **비밀번호 정책**:
   - 모든 비밀번호는 bcrypt로 해시됨
   - 프로덕션에서는 더 강력한 비밀번호 사용
   - 정기적인 비밀번호 변경 권장

3. **접근 제어**:
   - role 기반 권한 체크 구현
   - 민감한 기능은 관리자만 접근
   - API 엔드포인트 보호

## 🛠️ 문제 해결

### 계정 생성 실패
```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 데이터베이스 연결 확인
npx prisma db pull
```

### 중복 계정 오류
- 스크립트는 upsert를 사용하여 중복 방지
- 기존 계정이 있으면 정보만 업데이트

### 데이터베이스 연결 오류
```bash
# .env 파일 확인
cat .env | grep DATABASE_URL

# 연결 테스트
npx prisma db execute --stdin <<< "SELECT 1"
```

## 📝 추가 작업

### 계정 삭제 (필요시)
```sql
-- 테스트 계정만 삭제
DELETE FROM users WHERE email LIKE 'test.%@marketingplat.com';

-- 모든 초기 계정 삭제
DELETE FROM users WHERE email LIKE '%@marketingplat.com';
```

### 계정 비활성화
```sql
-- 특정 계정 비활성화
UPDATE users
SET is_active = false
WHERE email = 'user@marketingplat.com';
```

## 🎨 역할별 기능 접근 권한

| 기능 | Admin | Agency | Branch | Academy | User |
|------|-------|--------|--------|---------|------|
| 시스템 설정 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 전체 사용자 관리 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 지사 관리 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 학원 관리 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 마케팅 도구 | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| 기본 기능 | ✅ | ✅ | ✅ | ✅ | ✅ |

⚠️ = 제한적 접근

## 📞 지원 및 문의

- 스크립트 오류: GitHub Issues에 보고
- 계정 관련 문의: 관리자 계정으로 로그인 후 확인
- 긴급 지원: EC2 서버 로그 확인

---

**작성일**: 2025년 1월 17일
**최종 수정**: 2025년 1월 17일
**버전**: 1.0.0