# Windows에서 Lambda 배포 빠른 가이드

## 📁 현재 디렉토리 구조
```
D:\marketingplatformproject\
├── lambda-functions\         ← Lambda 함수들이 있는 폴더
│   ├── blog-tracker\
│   ├── smartplace-tracker\
│   ├── orchestrator\
│   ├── serverless.yml        ← Serverless 설정 파일
│   └── package.json
└── (기타 프로젝트 파일들)
```

## 🚀 Windows에서 Lambda 배포 단계별 가이드

### Step 1: 명령 프롬프트 열기
```
Windows + R → cmd → Enter
```

### Step 2: lambda-functions 디렉토리로 이동

#### 방법 1: 전체 경로 사용 (권장)
```cmd
cd D:\marketingplatformproject\lambda-functions
```

#### 방법 2: 단계별 이동
```cmd
D:
cd \marketingplatformproject
cd lambda-functions
```

#### 방법 3: Windows 탐색기에서 바로 열기
1. Windows 탐색기로 `D:\marketingplatformproject\lambda-functions` 이동
2. 주소창에 `cmd` 입력 후 Enter
3. 해당 폴더에서 명령 프롬프트가 열림

### Step 3: 현재 위치 확인
```cmd
# 현재 디렉토리 확인
echo %CD%

# 파일 목록 확인
dir

# 다음 파일들이 보여야 함:
# - serverless.yml
# - package.json
# - blog-tracker (폴더)
# - smartplace-tracker (폴더)
```

### Step 4: Node.js 패키지 설치
```cmd
# package.json이 있는지 확인
dir package.json

# 패키지 설치
npm install
```

### Step 5: Serverless Framework 설치
```cmd
# 전역 설치
npm install -g serverless

# 설치 확인
serverless --version
```

### Step 6: AWS 자격 증명 확인
```cmd
# AWS CLI 설정 확인
aws configure list

# 설정이 안 되어 있다면
aws configure
```

### Step 7: 환경 변수 설정
```cmd
# .env 파일 생성
copy .env.example .env

# 메모장으로 편집
notepad .env
```

`.env` 파일 내용:
```
DATABASE_URL="postgresql://username:password@your-rds.amazonaws.com:5432/marketingplat"
AWS_REGION="ap-northeast-2"
LAMBDA_SECURITY_GROUP_ID="sg-xxxxxx"
LAMBDA_SUBNET_ID_1="subnet-xxxxx"
LAMBDA_SUBNET_ID_2="subnet-yyyyy"
```

### Step 8: Prisma 설정
```cmd
# prisma 폴더 생성
mkdir prisma

# schema.prisma 복사
copy ..\prisma\schema.prisma prisma\

# Prisma 클라이언트 생성
npx prisma generate
```

### Step 9: Lambda Layers 준비
```cmd
# layers 디렉토리 확인
cd layers
dir

# 없다면 생성
mkdir layers
cd layers

# Chromium layer 생성
mkdir chromium-layer
cd chromium-layer
npm init -y
npm install @sparticuz/chromium

# 상위 디렉토리로 이동
cd ..

# ZIP 파일 생성 (PowerShell 사용)
powershell Compress-Archive -Path chromium-layer\* -DestinationPath chromium-layer.zip

# lambda-functions 루트로 돌아가기
cd ..
```

### Step 10: Serverless 배포
```cmd
# 배포 전 확인
serverless print --stage production

# 실제 배포
serverless deploy --stage production --verbose
```

## 🔍 자주 발생하는 문제와 해결

### 문제 1: "'cd'는 내부 또는 외부 명령이 아닙니다"
**해결**: 명령 프롬프트를 관리자 권한으로 실행

### 문제 2: "serverless: command not found"
**해결**:
```cmd
# npm 전역 설치 경로 확인
npm config get prefix

# PATH에 추가 (예: C:\Users\User\AppData\Roaming\npm)
setx PATH "%PATH%;C:\Users\User\AppData\Roaming\npm"

# 명령 프롬프트 재시작
```

### 문제 3: "npm: command not found"
**해결**: Node.js 재설치
1. https://nodejs.org 에서 LTS 버전 다운로드
2. 설치 후 명령 프롬프트 재시작

### 문제 4: AWS 자격 증명 오류
**해결**:
```cmd
# 자격 증명 재설정
aws configure

# 환경 변수로 설정
set AWS_ACCESS_KEY_ID=AKIA...
set AWS_SECRET_ACCESS_KEY=...
set AWS_DEFAULT_REGION=ap-northeast-2
```

## ✅ 체크리스트

- [ ] `D:\marketingplatformproject\lambda-functions` 디렉토리로 이동됨
- [ ] `npm install` 완료
- [ ] `serverless --version` 작동 확인
- [ ] AWS 자격 증명 설정됨
- [ ] `.env` 파일 생성 및 수정
- [ ] Prisma 클라이언트 생성됨
- [ ] Lambda Layers 준비됨

## 📝 배포 명령어 요약

```cmd
# 1. 디렉토리 이동
cd D:\marketingplatformproject\lambda-functions

# 2. 설치
npm install

# 3. 환경 설정
copy .env.example .env
notepad .env

# 4. Prisma 설정
mkdir prisma
copy ..\prisma\schema.prisma prisma\
npx prisma generate

# 5. 배포
serverless deploy --stage production
```

## 🆘 도움이 필요하면

1. 현재 디렉토리 확인: `echo %CD%`
2. 파일 목록 확인: `dir`
3. 에러 메시지 전체 복사
4. AWS Console에서 CloudFormation 스택 확인

---

**작성일**: 2025년 1월 18일
**환경**: Windows 10/11, Node.js 18+, AWS CLI 2.x