# Lambda 배포 가이드 - MarketingPlat 순위 추적 시스템

## 🎯 개요
EC2 기반 순위 추적 시스템을 AWS Lambda로 완전히 전환하는 상세 가이드입니다.
이 가이드는 AWS 계정이 없는 상태부터 시작하여 실제 Lambda 함수가 작동하는 것을 확인하는 단계까지 모든 과정을 다룹니다.

## 📋 Step 1: AWS 계정 생성 및 IAM 설정

### 1-1. AWS 계정 생성
1. https://aws.amazon.com 접속
2. "AWS 계정 생성" 클릭
3. 이메일 주소와 계정 이름 입력
4. 신용카드 정보 입력 (프리 티어 사용 가능)
5. 전화번호 인증
6. 지원 플랜 선택 (기본 - 무료)

### 1-2. IAM 사용자 생성 (보안을 위해 루트 계정 대신 사용)
1. AWS Console 로그인 → IAM 서비스 검색
2. 좌측 메뉴 "사용자" → "사용자 추가" 클릭
3. 사용자 이름: `marketingplat-lambda-admin`
4. AWS 자격 증명 유형: "프로그래밍 방식 액세스" 체크
5. 권한 설정:
   - "기존 정책 직접 연결" 선택
   - 다음 정책들을 검색하여 체크:
     - `AWSLambda_FullAccess`
     - `AmazonSQSFullAccess`
     - `AmazonVPCFullAccess`
     - `CloudWatchLogsFullAccess`
     - `AmazonS3FullAccess` (Lambda 배포용)
6. 태그 추가 (선택사항): `Environment: Production`
7. 검토 및 생성
8. **⚠️ 중요**: Access Key ID와 Secret Access Key를 안전한 곳에 저장
   ```
   Access Key ID: AKIA...
   Secret Access Key: wJalr...
   ```

### 1-3. AWS CLI 설치
#### Windows:
1. https://aws.amazon.com/cli/ 에서 Windows용 MSI 설치 파일 다운로드
2. 설치 후 명령 프롬프트 재시작

#### Mac:
```bash
brew install awscli
```

#### 설치 확인:
```bash
aws --version
# 출력: aws-cli/2.x.x Python/3.x.x Windows/10 exe/AMD64
```

### 1-4. AWS CLI 설정
```bash
aws configure

# 입력할 정보:
AWS Access Key ID [None]: AKIA... (위에서 저장한 키)
AWS Secret Access Key [None]: wJalr... (위에서 저장한 시크릿)
Default region name [None]: ap-northeast-2 (서울 리전)
Default output format [None]: json
```

## 📦 Step 2: 필수 도구 설치

### 2-1. Node.js 확인
```bash
node --version  # v18 이상 필요
npm --version   # v8 이상 필요
```

### 2-2. Serverless Framework 설치
```bash
npm install -g serverless
serverless --version
# 출력: Framework Core: 3.x.x
```

### 2-3. 필요한 Serverless 플러그인 설치

#### Windows (명령 프롬프트 또는 PowerShell):
```cmd
# 프로젝트 루트에서 실행
cd D:\marketingplatformproject\lambda-functions

# 또는 상대 경로로
cd lambda-functions

# 디렉토리 확인
dir
```

#### Mac/Linux:
```bash
cd lambda-functions
ls -la
```

#### 플러그인 설치:
```bash
npm install --save-dev serverless-plugin-typescript serverless-offline
```

⚠️ **Note**: 만약 `cd` 명령이 작동하지 않으면 전체 경로를 사용하세요

## 🔧 Step 3: AWS 리소스 준비

### 3-1. VPC 및 서브넷 확인 (RDS 연결용)

#### VPC 확인하기
1. **AWS Console 로그인** 후 상단 검색창에 **"VPC"** 입력
2. **"VPC"** 서비스 클릭

3. **VPC 목록 확인**:
   - 좌측 메뉴에서 **"VPC"** 클릭
   - 목록에서 사용 중인 VPC 찾기
   - 일반적으로 **"기본 VPC"** (Default VPC) 사용
   - **VPC ID** 복사: `vpc-0a1b2c3d4e5f6g7h8` (예시)

   ![VPC 화면 예시]
   ```
   이름           VPC ID                  IPv4 CIDR        상태
   기본 VPC       vpc-0a1b2c3d4e5f6g7h8  172.31.0.0/16   사용 가능
   ```

4. **서브넷 확인**:
   - 좌측 메뉴에서 **"서브넷"** 클릭
   - 상단 필터에서 VPC ID로 필터링
   - **최소 2개의 서브넷** 필요 (다른 가용영역)

   서브넷 정보 확인할 사항:
   ```
   서브넷 ID              가용 영역        IPv4 CIDR         유형
   subnet-0a1b2c3d4e5f   ap-northeast-2a  172.31.0.0/20    퍼블릭/프라이빗
   subnet-1b2c3d4e5f6g   ap-northeast-2c  172.31.16.0/20   퍼블릭/프라이빗
   ```

5. **메모할 정보**:
   ```bash
   VPC_ID=vpc-0a1b2c3d4e5f6g7h8
   SUBNET_1=subnet-0a1b2c3d4e5f     # 가용영역 A
   SUBNET_2=subnet-1b2c3d4e5f6g     # 가용영역 C
   ```

#### 💡 Tip: 기존 EC2/RDS와 같은 VPC 사용하기
1. **EC2 Console** → **인스턴스**
2. 실행 중인 EC2 인스턴스 클릭
3. **세부 정보** 탭에서 **VPC ID** 확인
4. 동일한 VPC의 서브넷 사용

### 3-2. 보안 그룹 생성 (Lambda용)

#### 보안 그룹 생성 단계별 가이드

1. **EC2 Console로 이동**:
   - AWS Console 상단 검색창에 **"EC2"** 입력
   - **EC2** 서비스 클릭

2. **보안 그룹 메뉴로 이동**:
   - 좌측 메뉴 스크롤
   - **"네트워크 및 보안"** 섹션
   - **"보안 그룹"** 클릭

3. **"보안 그룹 생성" 버튼 클릭** (우측 상단 주황색 버튼)

4. **기본 세부 정보 입력**:
   ```
   보안 그룹 이름: marketingplat-lambda-sg
   설명: Security group for Lambda functions to access RDS
   VPC: vpc-0a1b2c3d4e5f6g7h8 (위에서 확인한 VPC 선택)
   ```

5. **인바운드 규칙**:
   - Lambda는 인바운드 트래픽을 받지 않으므로 **비워둠**

6. **아웃바운드 규칙** (기본값 유지):
   ```
   유형: 모든 트래픽
   프로토콜: 전체
   포트 범위: 전체
   대상: 0.0.0.0/0
   설명: Allow all outbound traffic
   ```

7. **태그 추가** (선택사항):
   ```
   키: Name
   값: Lambda Security Group

   키: Environment
   값: Production
   ```

8. **"보안 그룹 생성"** 클릭

9. **생성된 보안 그룹 ID 복사**:
   - 생성 완료 메시지에서 보안 그룹 ID 확인
   - 예: `sg-0a1b2c3d4e5f6g7h8`
   - 📋 메모장에 저장!

### 3-3. RDS 보안 그룹 업데이트

#### RDS가 Lambda 연결을 허용하도록 설정

1. **RDS Console로 이동**:
   - AWS Console 상단 검색창에 **"RDS"** 입력
   - **RDS** 서비스 클릭

2. **데이터베이스 찾기**:
   - 좌측 메뉴 **"데이터베이스"** 클릭
   - 사용 중인 DB 인스턴스 클릭 (예: `marketingplat-db`)

3. **연결 & 보안 탭 확인**:
   - **"연결 & 보안"** 탭 클릭
   - **VPC 보안 그룹** 섹션에서 현재 보안 그룹 확인
   - 보안 그룹 링크 클릭 (새 탭에서 EC2 Console 열림)

4. **RDS 보안 그룹 수정**:
   - 해당 보안 그룹 선택 (체크박스)
   - **"작업"** → **"인바운드 규칙 편집"** 클릭

5. **새 인바운드 규칙 추가**:
   - **"규칙 추가"** 버튼 클릭
   - 다음 정보 입력:
   ```
   유형: PostgreSQL (또는 MySQL/Aurora)
   프로토콜: TCP
   포트 범위: 5432 (PostgreSQL) 또는 3306 (MySQL)
   소스: 사용자 지정
   소스 값: sg-0a1b2c3d4e5f6g7h8 (Lambda 보안 그룹 ID)
   설명: Allow Lambda functions
   ```

6. **"규칙 저장"** 클릭

7. **확인**:
   - RDS Console로 돌아가기
   - 상태가 **"사용 가능"**인지 확인

### 3-4. RDS 엔드포인트 및 연결 정보 확인

#### 데이터베이스 연결 정보 수집

1. **RDS Console에서 데이터베이스 선택**:
   - **"데이터베이스"** 목록에서 해당 DB 클릭

2. **엔드포인트 & 포트 확인**:
   - **"연결 & 보안"** 탭
   - **엔드포인트** 복사:
     ```
     marketingplat-db.c1a2b3c4d5e6.ap-northeast-2.rds.amazonaws.com
     ```
   - **포트**: `5432` (PostgreSQL) 또는 `3306` (MySQL)

3. **데이터베이스 정보 확인**:
   - **"구성"** 탭
   - **DB 이름**: `marketingplat`
   - **마스터 사용자 이름**: `postgres` 또는 `admin`

4. **DATABASE_URL 구성**:
   ```
   postgresql://[사용자명]:[비밀번호]@[엔드포인트]:[포트]/[DB이름]

   예시:
   postgresql://postgres:mypassword@marketingplat-db.c1a2b3c4d5e6.ap-northeast-2.rds.amazonaws.com:5432/marketingplat
   ```

### 3-5. NAT Gateway 확인 (Private 서브넷 사용 시)

#### Lambda가 인터넷 접근이 필요한 경우

1. **VPC Console** → **NAT 게이트웨이**
2. NAT Gateway가 있는지 확인
3. 없다면:
   - Public 서브넷 사용 권장
   - 또는 VPC Endpoint 설정

### 📝 수집한 정보 정리

`.env` 파일에 추가할 정보:
```bash
# VPC 설정
VPC_ID=vpc-0a1b2c3d4e5f6g7h8
LAMBDA_SUBNET_ID_1=subnet-0a1b2c3d4e5f
LAMBDA_SUBNET_ID_2=subnet-1b2c3d4e5f6g
LAMBDA_SECURITY_GROUP_ID=sg-0a1b2c3d4e5f6g7h8

# RDS 연결 정보
DATABASE_URL=postgresql://postgres:password@marketingplat-db.c1a2b3c4d5e6.ap-northeast-2.rds.amazonaws.com:5432/marketingplat
```

### ⚠️ 중요 체크포인트

- [ ] Lambda와 RDS가 **같은 VPC**에 있는가?
- [ ] Lambda 보안 그룹이 생성되었는가?
- [ ] RDS 보안 그룹에 Lambda 보안 그룹이 추가되었는가?
- [ ] 서브넷이 **최소 2개 이상** 다른 가용영역에 있는가?
- [ ] DATABASE_URL이 올바르게 구성되었는가?

### 🔍 문제 해결

#### "VPC를 찾을 수 없음" 오류
- 기본 VPC가 삭제된 경우
- 해결: AWS Support에 기본 VPC 복구 요청

#### "서브넷이 부족함" 오류
- Lambda는 최소 2개의 서브넷 필요
- 해결: 다른 가용영역에 서브넷 생성

#### "RDS 연결 실패" 오류
- 보안 그룹 규칙 확인
- RDS가 공개적으로 액세스 가능한지 확인
- 비밀번호가 올바른지 확인

## 🔐 Step 4: 환경 변수 설정

### 4-1. Lambda 환경 변수 파일 생성

#### Windows (PowerShell):
```powershell
# lambda-functions 디렉토리로 이동
cd D:\marketingplatformproject\lambda-functions

# .env.example을 .env로 복사
Copy-Item .env.example -Destination .env

# 또는 줄여서
copy .env.example .env
```

#### Windows (명령 프롬프트 CMD):
```cmd
cd D:\marketingplatformproject\lambda-functions
copy .env.example .env
```

#### Mac/Linux:
```bash
cd lambda-functions
cp .env.example .env
```

### 4-2. .env 파일 편집

#### Windows에서 편집:
```cmd
# 메모장으로 열기
notepad .env

# 또는 VS Code로 열기 (설치되어 있다면)
code .env
```

#### .env 파일에 입력할 내용:
```bash
# 실제 값으로 변경 (위 Step 3에서 수집한 정보 사용)
DATABASE_URL="postgresql://postgres:your-password@your-db.xxxxxxxx.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
AWS_REGION="ap-northeast-2"
LAMBDA_SECURITY_GROUP_ID="sg-xxxxxxxx"
LAMBDA_SUBNET_ID_1="subnet-xxxxxxxx"
LAMBDA_SUBNET_ID_2="subnet-yyyyyyyy"

# SQS Queue URLs (배포 후 자동 생성됨)
SMARTPLACE_QUEUE_URL=""
BLOG_QUEUE_URL=""
```

### 4-3. 환경 변수 확인

#### Windows:
```cmd
# .env 파일 내용 확인
type .env
```

#### Mac/Linux:
```bash
# .env 파일 내용 확인
cat .env
```

## 🚀 Step 5: Lambda 함수 배포

### 5-1. 프로젝트 준비

#### Windows:
```cmd
# 전체 경로 사용 (Windows)
cd D:\marketingplatformproject\lambda-functions

# 또는 프로젝트 루트에서 상대 경로
cd lambda-functions

# 현재 위치 확인
echo %CD%
```

#### Mac/Linux:
```bash
# 프로젝트 루트에서
cd lambda-functions

# 현재 위치 확인
pwd
```

#### 의존성 설치:
```bash
npm install
```

### 5-2. Prisma 클라이언트 생성

#### Windows (PowerShell):
```powershell
# 현재 위치 확인 (lambda-functions 폴더여야 함)
pwd

# prisma 디렉토리 생성
mkdir prisma

# schema.prisma 파일 복사
copy ..\prisma\schema.prisma .\prisma\

# 파일 복사 확인
dir prisma\
```

#### Windows (명령 프롬프트 CMD):
```cmd
# prisma 디렉토리 생성
mkdir prisma

# schema.prisma 파일 복사
copy ..\prisma\schema.prisma prisma\

# 파일 복사 확인
dir prisma\
```

#### Mac/Linux:
```bash
# prisma 디렉토리 생성
mkdir -p prisma

# schema.prisma 파일 복사
cp ../prisma/schema.prisma ./prisma/

# 파일 확인
ls -la prisma/
```

#### Prisma 클라이언트 설치 및 생성 (모든 OS 공통):
```bash
# Prisma 패키지 설치 (필수!)
npm install @prisma/client prisma --save

# Prisma 클라이언트 생성
npx prisma generate

# 성공 시 출력:
# ✔ Generated Prisma Client (v6.x.x) to ./node_modules/@prisma/client
```

⚠️ **중요**: `@prisma/client`를 먼저 설치해야 합니다!

### 5-3. Lambda Layers 생성 (브라우저 실행을 위한 Chromium)

#### Windows (PowerShell):
```powershell
# layers 디렉토리 확인/생성
cd D:\marketingplatformproject\lambda-functions
if (!(Test-Path layers)) { mkdir layers }
cd layers

# Chromium Layer 생성
mkdir chromium-layer
cd chromium-layer
npm init -y
npm install @sparticuz/chromium

# 상위 폴더로 이동
cd ..

# ZIP 파일 생성 (PowerShell)
Compress-Archive -Path chromium-layer\node_modules\* -DestinationPath chromium-layer.zip -Force

# Prisma Layer 생성
mkdir prisma-layer
cd prisma-layer
copy ..\..\prisma\schema.prisma .\
npx prisma generate

# 상위 폴더로 이동
cd ..

# Prisma Layer ZIP 생성
Compress-Archive -Path prisma-layer\node_modules\*, prisma-layer\.prisma\* -DestinationPath prisma-layer.zip -Force

# lambda-functions 루트로 복귀
cd ..
```

#### Windows (7-Zip 사용 - 설치 필요):
```cmd
# 7-Zip이 설치되어 있다면
"C:\Program Files\7-Zip\7z.exe" a -r chromium-layer.zip chromium-layer\node_modules\*
"C:\Program Files\7-Zip\7z.exe" a -r prisma-layer.zip prisma-layer\node_modules\* prisma-layer\.prisma\*
```

#### Mac/Linux:
```bash
# layers 디렉토리 생성
mkdir -p layers
cd layers

# Chromium Layer 생성
mkdir chromium-layer
cd chromium-layer
npm init -y
npm install @sparticuz/chromium
cd ..
zip -r chromium-layer.zip chromium-layer/node_modules

# Prisma Layer 생성
mkdir prisma-layer
cd prisma-layer
cp ../../prisma/schema.prisma ./
npx prisma generate
cd ..
zip -r prisma-layer.zip prisma-layer/node_modules prisma-layer/.prisma

cd ..  # lambda-functions 디렉토리로 복귀
```

#### 생성된 파일 확인:
```powershell
# Windows
dir *.zip

# Mac/Linux
ls -la *.zip
```

예상 출력:
```
chromium-layer.zip    (약 50-100MB)
prisma-layer.zip      (약 10-20MB)
```

⚠️ **주의사항**:
- Chromium layer는 크기가 클 수 있습니다 (50MB 이상)
- Lambda Layer 크기 제한: 압축 시 50MB, 압축 해제 시 250MB
- 크기가 너무 크면 S3에 업로드 후 참조 필요

### 5-4. Serverless Framework 설치 및 배포

#### Serverless Framework 설치 확인:
```bash
# Serverless가 설치되어 있는지 확인
serverless --version

# 설치되어 있지 않다면 설치
npm install -g serverless
```

⚠️ **Windows PowerShell 주의사항**:
- 설치 후 PowerShell을 **재시작**해야 할 수 있습니다
- 또는 `npx serverless` 명령어 사용

#### 배포 준비:
```bash
# lambda-functions 디렉토리에서 실행
cd D:\marketingplatformproject\lambda-functions

# 배포 전 설정 확인 (선택사항)
npx serverless print --stage production

# 또는 (Serverless가 전역 설치된 경우)
serverless print --stage production
```

#### 실제 배포:
```bash
# AWS 자격 증명 확인
aws sts get-caller-identity

# Serverless 배포 실행
npx serverless deploy --stage production --verbose

# 또는
serverless deploy --stage production --verbose
```

⚠️ **첫 배포 시 시간이 오래 걸릴 수 있습니다** (5-10분)

### 5-5. 배포 결과 확인
배포가 완료되면 다음과 같은 출력을 볼 수 있습니다:
```
Service Information
service: marketingplat-tracking
stage: production
region: ap-northeast-2
stack: marketingplat-tracking-production
resources: 25
api keys:
  None
endpoints:
  None
functions:
  smartplaceTracker: marketingplat-tracking-production-smartplaceTracker
  blogTracker: marketingplat-tracking-production-blogTracker
  scheduledTrigger: marketingplat-tracking-production-scheduledTrigger

Stack Outputs:
SmartPlaceQueueUrl: https://sqs.ap-northeast-2.amazonaws.com/123456789/marketingplat-smartplace-queue-production
BlogQueueUrl: https://sqs.ap-northeast-2.amazonaws.com/123456789/marketingplat-blog-queue-production
```

**⚠️ 중요: 위의 Queue URL들을 복사하여 저장하세요!**

## 📝 Step 6: 메인 애플리케이션 설정

### 6-1. 환경 변수 설정
```bash
# 프로젝트 루트로 이동
cd ..  # marketingplatformproject 디렉토리

# .env.local 파일 편집
# 배포 시 출력된 Queue URL들을 추가
echo "SMARTPLACE_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/YOUR_ACCOUNT_ID/marketingplat-smartplace-queue-production" >> .env.local
echo "BLOG_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/YOUR_ACCOUNT_ID/marketingplat-blog-queue-production" >> .env.local
echo "AWS_ACCESS_KEY_ID=AKIA..." >> .env.local
echo "AWS_SECRET_ACCESS_KEY=wJalr..." >> .env.local
echo "AWS_REGION=ap-northeast-2" >> .env.local
```

### 6-2. 애플리케이션 재시작
```bash
# 개발 서버 재시작
npm run dev

# 또는 프로덕션 빌드
npm run build
npm run start
```

## ✅ Step 7: Lambda 함수 테스트

### 7-1. AWS Console에서 직접 테스트
1. AWS Console → Lambda 서비스
2. 함수 목록에서 `marketingplat-tracking-production-blogTracker` 클릭
3. "테스트" 탭 클릭
4. 테스트 이벤트 생성:
```json
{
  "Records": [
    {
      "body": "{\"keywordId\":1,\"keyword\":\"테스트\",\"blogUrl\":\"https://blog.naver.com/test\",\"blogName\":\"테스트블로그\",\"userId\":1,\"projectId\":1,\"type\":\"BLOG_TRACKING\"}"
    }
  ]
}
```
5. "테스트" 버튼 클릭하여 실행

### 7-2. 애플리케이션에서 테스트
1. 브라우저에서 https://miraenad.com 접속
2. 로그인
3. 블로그 키워드 페이지로 이동
4. "전체 추적하기" 버튼 클릭 (Lambda 버전)
5. 응답 확인:
```json
{
  "message": "Lambda 추적 작업이 큐에 전송되었습니다.",
  "keywordCount": 5,
  "estimatedProcessingTime": "약 1분"
}
```

### 7-3. SQS Queue 모니터링
1. AWS Console → SQS 서비스
2. `marketingplat-blog-queue-production` 선택
3. "모니터링" 탭에서 메시지 수 확인
4. "메시지 전송 및 수신" → "메시지 폴링"으로 실제 메시지 내용 확인

### 7-4. CloudWatch 로그 실시간 확인
```bash
# 터미널에서 실시간 로그 확인
serverless logs -f blogTracker --tail --stage production

# 출력 예시:
START RequestId: xxx-xxx-xxx Version: $LATEST
Processing blog keyword: 테스트 키워드 (ID: 1)
Successfully tracked: 테스트 키워드 - Main: null, Blog: 15
END RequestId: xxx-xxx-xxx
REPORT RequestId: xxx-xxx-xxx Duration: 8234.56 ms Billed Duration: 8235 ms
```

## 🔍 Step 8: 결과 확인

### 8-1. 데이터베이스에서 결과 확인
```bash
# EC2 서버 접속
ssh ubuntu@your-ec2-ip

# PostgreSQL 접속
psql -h your-rds-endpoint -U postgres -d marketingplat

# 최근 추적 결과 조회
SELECT * FROM "BlogTrackingResult"
WHERE "trackingDate" > NOW() - INTERVAL '1 hour'
ORDER BY "trackingDate" DESC
LIMIT 10;
```

### 8-2. 웹 애플리케이션에서 확인
1. 블로그 키워드 페이지 새로고침
2. 각 키워드의 순위 업데이트 확인
3. "마지막 확인" 시간 업데이트 확인

### 8-3. CloudWatch 대시보드 생성 (선택사항)
1. AWS Console → CloudWatch → 대시보드
2. "대시보드 생성" 클릭
3. 이름: `MarketingPlat-Lambda-Tracking`
4. 위젯 추가:
   - Lambda 함수 실행 횟수
   - Lambda 함수 실행 시간
   - SQS 메시지 수
   - 에러 발생 횟수

## 🎯 Step 9: 실제 운영 전환

### 9-1. 점진적 전환 (권장)
```javascript
// 환경 변수로 제어
USE_LAMBDA_TRACKING=true  // Lambda 활성화

// 프론트엔드에서 조건부 사용
const trackingEndpoint = process.env.USE_LAMBDA_TRACKING === 'true'
  ? '/api/blog-keywords/track-all-lambda'
  : '/api/blog-keywords/track-all'
```

### 9-2. A/B 테스트
일부 사용자만 Lambda 사용:
```javascript
const useLabmda = userId % 10 < 3  // 30% 사용자만 Lambda 사용
```

### 9-3. 완전 전환
모든 트래픽을 Lambda로 전환 후 기존 EC2 기반 코드 제거

## 📊 Step 10: 비용 및 성능 모니터링

### 10-1. AWS Cost Explorer에서 비용 확인
1. AWS Console → Cost Management → Cost Explorer
2. 서비스별 필터: Lambda, SQS
3. 일별/월별 비용 추이 확인

### 10-2. 성능 메트릭 확인
```bash
# Lambda 함수 성능 통계
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=marketingplat-tracking-production-blogTracker \
  --start-time 2024-01-18T00:00:00Z \
  --end-time 2024-01-19T00:00:00Z \
  --period 3600 \
  --statistics Average,Maximum
```

### 10-3. 예상 비용 계산
- Lambda 실행: 1GB 메모리 × 10초 × 1000회 = $0.20
- SQS: 1000 메시지 = $0.0004
- 총 월간 예상: 약 $20-30 (10,000 키워드 기준)

## 🔧 Step 11: 트러블슈팅 가이드

### 11-1. 자주 발생하는 문제와 해결법

#### 문제 1: "Task timed out after X seconds"
**원인**: Lambda 함수가 설정된 시간 내에 완료되지 않음
**해결**:
```bash
# serverless.yml에서 timeout 증가
provider:
  timeout: 300  # 5분으로 증가 (최대 900초)
```

#### 문제 2: "Cannot connect to database"
**원인**: Lambda가 RDS에 접근할 수 없음
**체크리스트**:
1. Lambda 보안 그룹 → RDS 보안 그룹 인바운드 규칙 확인
2. Lambda가 VPC 내부에 있는지 확인
3. RDS 엔드포인트가 올바른지 확인
4. DATABASE_URL 환경 변수 확인

**해결**:
```bash
# RDS 보안 그룹 규칙 추가 (AWS Console)
Type: PostgreSQL
Port: 5432
Source: sg-xxxxxx (Lambda 보안 그룹)
```

#### 문제 3: "Module not found: '@sparticuz/chromium'"
**원인**: Lambda Layer가 제대로 배포되지 않음
**해결**:
```bash
# Layer 재생성 및 배포
cd lambda-functions/layers
rm -rf chromium-layer.zip
# 위의 Step 5-3 다시 실행
serverless deploy --stage production
```

#### 문제 4: "SQS Queue does not exist"
**원인**: Queue URL이 잘못되었거나 Queue가 생성되지 않음
**해결**:
```bash
# Queue 목록 확인
aws sqs list-queues --region ap-northeast-2

# Queue URL 다시 확인
serverless info --stage production
```

### 11-2. 디버깅 방법

#### Lambda 함수 로컬 테스트
```bash
# lambda-functions 디렉토리에서
npm install -g serverless-offline
serverless offline --stage development
```

#### 특정 메시지 재처리
```bash
# DLQ에서 메시지 가져오기
aws sqs receive-message \
  --queue-url https://sqs.ap-northeast-2.amazonaws.com/YOUR_ACCOUNT/marketingplat-blog-dlq-production \
  --max-number-of-messages 1

# 메시지를 다시 메인 Queue로 이동
aws sqs send-message \
  --queue-url https://sqs.ap-northeast-2.amazonaws.com/YOUR_ACCOUNT/marketingplat-blog-queue-production \
  --message-body "메시지 내용"
```

## 📊 Step 12: 운영 모니터링 대시보드 구성

### 12-1. CloudWatch 알람 설정
```bash
# Lambda 에러율 알람 생성
aws cloudwatch put-metric-alarm \
  --alarm-name "Lambda-High-Error-Rate" \
  --alarm-description "Alert when Lambda error rate is high" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### 12-2. 일일 리포트 설정
1. CloudWatch Insights 쿼리 저장:
```sql
fields @timestamp, @message
| filter @type = "REPORT"
| stats avg(duration), max(duration), min(duration) by bin(5m)
```

### 12-3. 비용 알림 설정
1. AWS Budgets 접속
2. "예산 생성" 클릭
3. 월간 예산: $50
4. 알림 임계값: 80%, 100%
5. 이메일 알림 설정

## 🚀 Step 13: 프로덕션 체크리스트

### 배포 전 확인사항:
- [ ] IAM 권한 최소화 원칙 적용
- [ ] 환경 변수 모두 설정됨
- [ ] VPC 및 보안 그룹 설정 완료
- [ ] RDS 백업 설정 확인
- [ ] CloudWatch 알람 설정
- [ ] DLQ 설정 및 모니터링
- [ ] 비용 예산 및 알림 설정

### 배포 후 확인사항:
- [ ] Lambda 함수 정상 실행 확인
- [ ] SQS 메시지 처리 확인
- [ ] 데이터베이스 결과 저장 확인
- [ ] CloudWatch 로그 확인
- [ ] 애플리케이션에서 기능 테스트
- [ ] 성능 메트릭 확인
- [ ] 비용 모니터링 시작

## 💡 팁과 베스트 프랙티스

### 1. 개발/스테이징/프로덕션 환경 분리
```bash
# 개발 환경
serverless deploy --stage dev

# 스테이징 환경
serverless deploy --stage staging

# 프로덕션 환경
serverless deploy --stage production
```

### 2. 환경별 설정 분리
```yaml
# serverless.yml
custom:
  settings:
    dev:
      memorySize: 1024
      timeout: 60
    production:
      memorySize: 2048
      timeout: 120
```

### 3. 로그 레벨 관리
```javascript
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

if (LOG_LEVEL === 'debug') {
  console.log('Debug information...')
}
```

### 4. 재시도 로직
```javascript
// SQS 재시도 설정
const maxRetries = 3
const retryDelay = 5000 // 5초

async function processWithRetry(message, attempt = 1) {
  try {
    await process(message)
  } catch (error) {
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      return processWithRetry(message, attempt + 1)
    }
    throw error
  }
}
```

## 📝 추가 리소스

- [AWS Lambda 공식 문서](https://docs.aws.amazon.com/lambda/)
- [Serverless Framework 문서](https://www.serverless.com/framework/docs)
- [Puppeteer on Lambda 가이드](https://github.com/Sparticuz/chromium)
- [SQS 베스트 프랙티스](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html)

---

**작성일**: 2025년 1월 18일
**버전**: 2.0.0 (상세 가이드)
**작성자**: Claude Code Assistant

이 가이드를 따라하시면서 문제가 발생하면 CloudWatch 로그를 먼저 확인하고,
위의 트러블슈팅 가이드를 참조해주세요.