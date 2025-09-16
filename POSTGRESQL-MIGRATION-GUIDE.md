# PostgreSQL 마이그레이션 가이드

## 📋 마이그레이션 상태
- SQLite → PostgreSQL 마이그레이션 준비 완료
- 날짜: 2024-09-15

## 🚀 마이그레이션 단계

### 1. PostgreSQL 설치 (로컬 개발환경)

#### Windows
```bash
# PostgreSQL 다운로드 및 설치
# https://www.postgresql.org/download/windows/
# 설치 시 비밀번호 설정 필요 (기본 사용자: postgres)
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. PostgreSQL 데이터베이스 생성

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE marketingplat_dev;

# 사용자 생성 (옵션)
CREATE USER marketingplat WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE marketingplat_dev TO marketingplat;

# 종료
\q
```

### 3. 환경 변수 설정

```bash
# .env.local 파일 백업
cp .env.local .env.local.sqlite.backup

# PostgreSQL 환경 변수로 전환
cp .env.postgresql .env.local

# DATABASE_URL 수정 (본인의 PostgreSQL 설정에 맞게)
# DATABASE_URL="postgresql://postgres:password@localhost:5432/marketingplat_dev"
```

### 4. Prisma 마이그레이션 실행

```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 마이그레이션 초기화
npx prisma migrate dev --name init_postgresql

# 데이터베이스 확인
npx prisma studio
```

### 5. 기존 데이터 마이그레이션 (선택사항)

#### 방법 1: Prisma Seed 사용
```bash
# prisma/seed.ts 파일이 있다면
npm run db:seed
```

#### 방법 2: 데이터 내보내기/가져오기 스크립트
```typescript
// migrate-data.ts
import { PrismaClient as SqliteClient } from './prisma/generated/sqlite'
import { PrismaClient as PostgresClient } from '@prisma/client'

const sqliteDb = new SqliteClient({
  datasources: {
    db: { url: 'file:./prisma/dev.db' }
  }
})

const postgresDb = new PostgresClient()

async function migrateData() {
  // Users 마이그레이션
  const users = await sqliteDb.user.findMany()
  for (const user of users) {
    await postgresDb.user.create({
      data: user
    })
  }

  // 다른 테이블들도 동일하게 진행
  console.log('Migration completed!')
}

migrateData()
  .catch(console.error)
  .finally(() => {
    sqliteDb.$disconnect()
    postgresDb.$disconnect()
  })
```

### 6. 애플리케이션 테스트

```bash
# 개발 서버 재시작
npm run dev

# 주요 기능 테스트
- 로그인/회원가입
- 스마트플레이스 진단
- 블로그 순위 추적
- 광고 관리
```

## 🔄 롤백 절차

문제 발생 시 SQLite로 롤백:

```bash
# PostgreSQL 스키마 백업
cp prisma/schema.prisma prisma/schema.postgresql.backup

# SQLite 스키마 복원
cp prisma/schema.sqlite.prisma.backup prisma/schema.prisma

# 환경 변수 복원
cp .env.local.sqlite.backup .env.local

# Prisma 클라이언트 재생성
npx prisma generate

# 서버 재시작
npm run dev
```

## 📊 스키마 변경사항

### 주요 변경사항
1. **Provider 변경**: `sqlite` → `postgresql`
2. **데이터 타입 추가**:
   - 긴 텍스트 필드에 `@db.Text` 추가
   - JSON 필드는 그대로 유지 (PostgreSQL JSONB 사용)
3. **인덱스 및 관계**: 변경 없음
4. **ID 생성 전략**:
   - `@default(autoincrement())` - 그대로 유지
   - `@default(cuid())` - 그대로 유지
   - `@default(uuid())` - 그대로 유지

## 🚨 주의사항

### 개발환경
- PostgreSQL 서버가 실행 중인지 확인
- 데이터베이스 연결 정보 확인
- 포트 5432가 사용 가능한지 확인

### 프로덕션 환경 (AWS RDS)
```env
# .env.production
DATABASE_URL="postgresql://username:password@your-rds-endpoint.rds.amazonaws.com:5432/marketingplat_prod"

# RDS 설정 권장사항
- 인스턴스 클래스: db.t3.medium 이상
- 스토리지: 100GB SSD
- 백업: 자동 백업 7일
- Multi-AZ: 프로덕션에서 활성화
- 보안 그룹: EC2에서만 접근 가능
```

### 성능 최적화
```sql
-- 인덱스 생성 (필요시)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_smartplace_keywords_user ON smartplace_keywords(user_id);
CREATE INDEX idx_blog_tracking_keywords_project ON blog_tracking_keywords(project_id);

-- 연결 풀 설정 (prisma/schema.prisma)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // 연결 풀 설정
  // connection_limit = 10
}
```

## 📈 모니터링

### 데이터베이스 상태 확인
```sql
-- 연결 수 확인
SELECT count(*) FROM pg_stat_activity;

-- 테이블 크기 확인
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 슬로우 쿼리 확인
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## 🔧 트러블슈팅

### 일반적인 문제

#### 1. 연결 오류
```
Error: P1001: Can't reach database server
```
**해결**: PostgreSQL 서버 실행 확인
```bash
# Windows
net start postgresql-x64-14

# Linux/Mac
sudo systemctl status postgresql
```

#### 2. 인증 오류
```
Error: P1000: Authentication failed
```
**해결**: 사용자명/비밀번호 확인, pg_hba.conf 설정 확인

#### 3. 마이그레이션 오류
```
Error: P3009: migrate found failed migrations
```
**해결**:
```bash
npx prisma migrate resolve --rolled-back
npx prisma migrate dev
```

## 📚 참고 자료

- [Prisma PostgreSQL 가이드](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)

---

**작성일**: 2024-09-15
**프로젝트**: MarketingPlat
**버전**: PostgreSQL 마이그레이션 v1.0