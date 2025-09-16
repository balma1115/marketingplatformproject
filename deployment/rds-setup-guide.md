# RDS PostgreSQL 설정 가이드

## 1️⃣ RDS 인스턴스 생성

### AWS Console에서 진행
1. **Services > RDS > Create database** 클릭

### 2️⃣ 데이터베이스 설정

#### 기본 설정
- **Choose a database creation method**: Standard create
- **Engine type**: PostgreSQL
- **Engine Version**: PostgreSQL 15.x (최신 안정 버전)
- **Templates**: Dev/Test ✅ (Free tier가 없는 경우 이것 선택)

#### DB 인스턴스 설정
- **DB instance identifier**: `marketingplat-db`
- **Master username**: `postgres`
- **Master password**: 강력한 비밀번호 설정 (예: `MarketingPlat2025!@#`)
- **Confirm password**: 동일하게 입력

#### 인스턴스 구성
- **DB instance class**:
  - Burstable classes (includes t classes) 선택
  - **db.t3.micro** 또는 **db.t4g.micro** 선택 (프리티어 대상)
  - vCPUs: 2, RAM: 1 GiB

#### Availability and durability
- **반드시 선택**: Single-AZ DB instance deployment (1 instance) ✅
  - Multi-AZ는 프리티어 대상이 아님!
  - Single-AZ만 무료입니다

#### Storage
- **Storage type**: General Purpose SSD (gp3) 또는 gp2
- **Allocated storage**: 20 GB (프리티어 한도)
- **Storage autoscaling**: ❌ 비활성화 (비용 절감)

#### 연결성
- **Virtual private cloud (VPC)**: Default VPC
- **Subnet group**: default
- **Public access**: Yes ✅ (초기 설정용, 나중에 변경)
- **VPC security group**: Create new
  - Security group name: `marketingplat-rds-sg`
- **Database port**: 5432

#### 데이터베이스 인증
- **Database authentication**: Password authentication

#### 추가 구성 (클릭하여 확장)
- **Initial database name**: `marketingplat`
- **DB parameter group**: default.postgres15
- **Backup retention period**: 1 day (프리티어)
- **Enable automatic backups**: ✅
- **Backup window**: No preference
- **Enable encryption**: ❌ (프리티어)
- **Enable Performance Insights**: ❌ (프리티어)
- **Enable deletion protection**: ❌ (개발 단계)

### 3️⃣ 생성 클릭
- "Create database" 클릭
- 생성까지 약 5-10분 소요

## 📝 생성 후 정보 저장

### RDS 엔드포인트 확인
생성 완료 후 RDS > Databases > marketingplat-db 클릭

**저장할 정보:**
```
Endpoint: marketingplat-db.xxxxx.ap-northeast-2.rds.amazonaws.com
Port: 5432
Username: postgres
Password: [설정한 비밀번호]
Database: marketingplat
```

### DATABASE_URL 생성
```
DATABASE_URL="postgresql://postgres:[password]@[endpoint]:5432/marketingplat?schema=public"
```

예시:
```
DATABASE_URL="postgresql://postgres:MarketingPlat2025!@#@marketingplat-db.xxxxx.ap-northeast-2.rds.amazonaws.com:5432/marketingplat?schema=public"
```

## 🔒 보안 그룹 설정

### RDS 보안 그룹 수정
1. EC2 > Security Groups > marketingplat-rds-sg
2. Inbound rules > Edit inbound rules
3. Add rule:
   - Type: PostgreSQL
   - Port: 5432
   - Source:
     - 개발 단계: 0.0.0.0/0 (임시)
     - 프로덕션: EC2 보안 그룹 ID만

## 🧪 연결 테스트

### 로컬에서 테스트
```bash
# psql 설치 (없는 경우)
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# 연결 테스트
psql -h [endpoint] -U postgres -d marketingplat -p 5432

# 또는 Node.js로 테스트
npm install pg
node -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: 'DATABASE_URL_HERE'
});
client.connect()
  .then(() => console.log('✅ Connected to RDS!'))
  .catch(err => console.error('❌ Connection failed:', err))
  .finally(() => client.end());
"
```

## ⚠️ 프리티어 적용 확인 방법

Templates에서 Free tier가 없어도 아래 설정으로 프리티어 적용됩니다:
1. **Templates**: Dev/Test 선택
2. **DB instance class**: db.t3.micro 또는 db.t4g.micro
3. **Storage**: 20GB 이하
4. **Multi-AZ**: No
5. **Backup retention**: 7일 이하

생성 후 AWS Billing에서 프리티어 사용량을 확인할 수 있습니다.

## ✅ 체크리스트

- [ ] RDS 인스턴스 생성 시작
- [ ] Templates: Dev/Test 선택
- [ ] db.t3.micro 또는 db.t4g.micro 선택
- [ ] 20GB 스토리지 설정
- [ ] Public access 활성화 (임시)
- [ ] 보안 그룹 생성
- [ ] Initial database name: marketingplat 설정
- [ ] 생성 완료 (5-10분 대기)
- [ ] 엔드포인트 정보 저장
- [ ] DATABASE_URL 생성
- [ ] 연결 테스트 성공

## 🔐 중요 정보 (안전하게 보관!)

```env
# .env.production에 저장할 내용
DATABASE_URL=postgresql://postgres:[password]@[endpoint]:5432/marketingplat?schema=public

# 예시 (실제 값으로 교체)
DATABASE_URL=postgresql://postgres:MarketingPlat2025!@#@marketingplat-db.xxxxx.ap-northeast-2.rds.amazonaws.com:5432/marketingplat?schema=public
```

## 다음 단계
RDS 생성이 완료되면 EC2 인스턴스 생성으로 진행합니다.