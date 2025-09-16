# Lambda 레이어 설정 가이드

## 🎯 Lambda 레이어란?
Lambda 함수에서 공통으로 사용하는 라이브러리를 별도로 패키징하여 재사용하는 방법입니다.

## 📦 필요한 레이어

1. **Chromium Layer** - 웹 스크래핑용 브라우저
2. **Prisma Layer** - 데이터베이스 ORM

## 1️⃣ EC2에서 레이어 준비

EC2에 SSH 접속 후 작업:

### Step 1: 작업 디렉토리 생성
```bash
# 홈 디렉토리로 이동
cd ~

# Lambda 레이어 작업 디렉토리 생성
mkdir -p lambda-layers
cd lambda-layers
```

### Step 2: Chromium Layer 생성
```bash
# Chromium layer 디렉토리 생성
mkdir -p chromium-layer/nodejs
cd chromium-layer/nodejs

# package.json 생성
cat > package.json << 'EOF'
{
  "name": "chromium-layer",
  "version": "1.0.0",
  "dependencies": {
    "@sparticuz/chromium": "^119.0.0",
    "puppeteer-core": "^21.5.0"
  }
}
EOF

# 패키지 설치
npm install

# 레이어 압축
cd ..
zip -r chromium-layer.zip nodejs

# 파일 크기 확인 (250MB 이하여야 함)
ls -lh chromium-layer.zip
```

### Step 3: Prisma Layer 생성
```bash
# 홈으로 돌아가기
cd ~/lambda-layers

# Prisma layer 디렉토리 생성
mkdir -p prisma-layer/nodejs
cd prisma-layer/nodejs

# package.json 생성
cat > package.json << 'EOF'
{
  "name": "prisma-layer",
  "version": "1.0.0",
  "dependencies": {
    "@prisma/client": "^6.15.0"
  }
}
EOF

# Prisma 스키마 파일 복사 (로컬에서 업로드 필요)
# 또는 직접 생성
cat > schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-1.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 여기에 실제 스키마 내용 추가
EOF

# Prisma Client 생성
npm install
npx prisma generate --schema=schema.prisma

# .prisma 폴더 복사
cp -r node_modules/.prisma ./
cp -r node_modules/@prisma ./

# 레이어 압축
cd ..
zip -r prisma-layer.zip nodejs

# 파일 크기 확인
ls -lh prisma-layer.zip
```

## 2️⃣ Lambda Layer 업로드

### 방법 1: AWS CLI 사용 (EC2에서)
```bash
# Chromium Layer 업로드
aws lambda publish-layer-version \
  --layer-name chromium-layer \
  --description "Chromium browser for web scraping" \
  --zip-file fileb://~/lambda-layers/chromium-layer/chromium-layer.zip \
  --compatible-runtimes nodejs18.x nodejs20.x \
  --region ap-northeast-2

# Prisma Layer 업로드
aws lambda publish-layer-version \
  --layer-name prisma-layer \
  --description "Prisma ORM client" \
  --zip-file fileb://~/lambda-layers/prisma-layer/prisma-layer.zip \
  --compatible-runtimes nodejs18.x nodejs20.x \
  --region ap-northeast-2
```

### 방법 2: S3 경유 (파일이 큰 경우)
```bash
# S3에 업로드
aws s3 cp ~/lambda-layers/chromium-layer/chromium-layer.zip s3://marketingplat-assets/lambda-layers/
aws s3 cp ~/lambda-layers/prisma-layer/prisma-layer.zip s3://marketingplat-assets/lambda-layers/

# S3에서 Layer 생성
aws lambda publish-layer-version \
  --layer-name chromium-layer \
  --description "Chromium browser for web scraping" \
  --content S3Bucket=marketingplat-assets,S3Key=lambda-layers/chromium-layer.zip \
  --compatible-runtimes nodejs18.x nodejs20.x \
  --region ap-northeast-2
```

### 방법 3: AWS Console 사용
1. **Lambda > Layers > Create layer**
2. **Layer configuration**:
   - Name: `chromium-layer`
   - Description: Chromium browser for web scraping
   - Upload: .zip 파일 업로드 또는 S3 URL
   - Compatible runtimes: Node.js 18.x, Node.js 20.x
3. **Create** 클릭

## 3️⃣ Layer ARN 저장

생성 후 출력되는 ARN 저장:
```
Chromium Layer ARN: arn:aws:lambda:ap-northeast-2:[ACCOUNT-ID]:layer:chromium-layer:1
Prisma Layer ARN: arn:aws:lambda:ap-northeast-2:[ACCOUNT-ID]:layer:prisma-layer:1
```

## 4️⃣ 간단한 테스트 Lambda 함수 생성

### Lambda Console에서:
1. **Functions > Create function**
2. **Basic information**:
   - Function name: `test-layers`
   - Runtime: Node.js 20.x
   - Architecture: x86_64

### 함수 생성 후:
1. **Code > Layers > Add a layer**
2. **Custom layers** 선택
3. 생성한 레이어 추가

### 테스트 코드:
```javascript
exports.handler = async (event) => {
    try {
        // Chromium 테스트
        const chromium = require('@sparticuz/chromium');
        console.log('Chromium path:', await chromium.executablePath());

        // Prisma 테스트
        const { PrismaClient } = require('@prisma/client');
        console.log('Prisma Client loaded successfully');

        return {
            statusCode: 200,
            body: JSON.stringify('Layers working!'),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify(error.message),
        };
    }
};
```

## ⚠️ 주의사항

### Layer 크기 제한
- 압축 파일: 최대 50MB (직접 업로드)
- 압축 해제 후: 최대 250MB
- 초과시 S3 경유 필요

### Chromium 바이너리
- Lambda 환경에 맞는 바이너리 필요
- `@sparticuz/chromium` 패키지 사용 권장

### Prisma 바이너리
- Lambda 환경용 바이너리 타겟 설정 필요:
  ```prisma
  binaryTargets = ["native", "rhel-openssl-1.0.x"]
  ```

## ✅ 체크리스트

- [ ] EC2에서 작업 디렉토리 생성
- [ ] Chromium Layer 패키지 설치
- [ ] Chromium Layer 압축
- [ ] Prisma Layer 패키지 설치
- [ ] Prisma Client 생성
- [ ] Prisma Layer 압축
- [ ] Layer 업로드 (CLI 또는 Console)
- [ ] Layer ARN 저장
- [ ] 테스트 Lambda 함수로 확인

## 📝 Layer ARN 기록

```env
# Lambda 함수에서 사용할 Layer ARN
CHROMIUM_LAYER_ARN=arn:aws:lambda:ap-northeast-2:[ACCOUNT-ID]:layer:chromium-layer:1
PRISMA_LAYER_ARN=arn:aws:lambda:ap-northeast-2:[ACCOUNT-ID]:layer:prisma-layer:1
```

## 🎉 Day 1 완료!

Lambda 레이어까지 생성하면 Day 1의 모든 인프라 구축이 완료됩니다!

내일(Day 2)은:
- 애플리케이션 코드 배포
- 데이터베이스 마이그레이션
- Lambda 함수 배포
- 전체 시스템 테스트