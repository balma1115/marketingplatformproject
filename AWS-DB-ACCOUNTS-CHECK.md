# AWS RDS 데이터베이스 계정 조회 가이드

## 📋 계정 확인 방법

### 방법 1: EC2에서 Prisma Studio 사용 (가장 쉬움) 🎯

```bash
# EC2 접속
ssh -i ~/marketingplat.pem ubuntu@43.203.199.103

# 프로젝트 디렉토리로 이동
cd /home/ubuntu/marketingplatformproject

# Prisma Studio 실행
npx prisma studio
```

- 브라우저에서 `http://43.203.199.103:5555` 접속
- User 테이블 클릭하여 모든 계정 확인
- 필터링, 정렬, 검색 기능 사용 가능

### 방법 2: TypeScript 스크립트 실행 📊

#### EC2에서 실행
```bash
# EC2 접속 후
cd /home/ubuntu/marketingplatformproject
git pull origin main
npx tsx scripts/check-aws-accounts.ts
```

#### 로컬에서 실행
```bash
cd D:\marketingplatformproject
npx tsx scripts/check-aws-accounts.ts
```

**출력 내용:**
- 총 계정 수
- 역할별/플랜별 통계
- 전체 계정 목록
- 테스트 계정 목록
- 최근 가입 계정
- 관리자 계정 목록

### 방법 3: DBeaver/pgAdmin으로 직접 조회 🗄️

#### DBeaver 연결 정보
- Host: `marketingplat-db.cpqoq7zspwdr.ap-northeast-2.rds.amazonaws.com`
- Port: `5432`
- Database: `marketingplat`
- Username: `postgres`
- Password: (RDS 비밀번호)

#### 주요 SQL 쿼리

```sql
-- 전체 계정 조회
SELECT * FROM users ORDER BY role, created_at DESC;

-- 역할별 계정 수
SELECT role, COUNT(*) FROM users GROUP BY role;

-- 테스트 계정만 조회
SELECT * FROM users WHERE email LIKE '%@test.aws.com';

-- 관리자 계정 조회
SELECT * FROM users WHERE role = 'admin';
```

### 방법 4: 웹 애플리케이션 관리자 페이지 🌐

```bash
# 관리자 계정으로 로그인
https://marketingplat.com/login

# 관리자 대시보드 접속
https://marketingplat.com/dashboard/admin
```

관리자 계정:
- `admin@marketingplat.com` / `admin123`
- `admin@test.aws.com` / `test1234` (테스트용)

### 방법 5: AWS CLI로 원격 조회 🖥️

```bash
# PostgreSQL 클라이언트로 직접 연결
psql -h marketingplat-db.cpqoq7zspwdr.ap-northeast-2.rds.amazonaws.com \
     -U postgres -d marketingplat -c "SELECT * FROM users;"
```

## 🔍 주요 조회 항목

### 계정 정보 필드
| 필드명 | 설명 | 예시 |
|--------|------|------|
| `id` | 계정 ID | 1, 2, 3... |
| `email` | 이메일 | admin@test.com |
| `name` | 이름 | 홍길동 |
| `role` | 역할 | admin, agency, branch, academy, user |
| `plan` | 요금제 | basic, professional, enterprise |
| `academy_name` | 학원명 | 서울영어학원 |
| `coin` | 보유 코인 | 1000.00 |
| `is_active` | 활성화 상태 | true/false |
| `is_approved` | 승인 상태 | true/false |
| `kt_pass_verified` | KT인증 | true/false |

### 역할별 권한
- **admin**: 시스템 전체 관리
- **agency**: 대행사 (여러 지사 관리)
- **branch**: 지사 (여러 학원 관리)
- **academy**: 학원 (자체 학원만 관리)
- **user**: 일반 사용자

## 📊 빠른 통계 확인 SQL

```sql
-- 전체 통계 한 번에 보기
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'academy' THEN 1 END) as academies,
    COUNT(CASE WHEN is_approved = true THEN 1 END) as approved,
    SUM(coin) as total_coins
FROM users;
```

## 🛠️ 문제 해결

### Prisma Studio가 안 열릴 때
```bash
# 포트 확인
sudo lsof -i :5555

# 프로세스 종료 후 재실행
kill -9 [PID]
npx prisma studio
```

### 데이터베이스 연결 실패
```bash
# .env 파일 확인
cat .env | grep DATABASE_URL

# 연결 테스트
npx prisma db pull
```

### 권한 문제
```bash
# Prisma 재생성
npx prisma generate

# 데이터베이스 동기화
npx prisma db push
```

## 📝 참고사항

- 민감한 정보(비밀번호 해시 등)는 조회 시 제외
- 프로덕션 환경에서는 필요한 권한만 부여
- 정기적으로 비활성 계정 정리 필요
- 테스트 계정은 프로덕션 배포 전 삭제

---

**작성일**: 2025년 1월 17일
**최종 수정**: 2025년 1월 17일