# Lambda Functions for MarketingPlat

## 📋 개요
MarketingPlat의 순위 추적 시스템을 AWS Lambda로 구현한 서버리스 함수들입니다.

## 🏗️ 아키텍처

```
Next.js App → API Gateway → SQS Queue → Lambda Functions → RDS PostgreSQL
                                          ↓
                                    CloudWatch Metrics
```

## 📁 구조

```
lambda-functions/
├── smartplace-tracker/     # 스마트플레이스 순위 추적
│   └── index.ts
├── blog-tracker/          # 블로그 순위 추적
│   └── index.ts
├── scheduled-trigger/     # 스케줄 트리거
│   └── index.ts
├── layers/               # Lambda Layers
│   ├── chromium/         # Chromium 바이너리
│   └── prisma/           # Prisma ORM
├── serverless.yml        # Serverless Framework 설정
└── deploy.sh            # 배포 스크립트
```

## 🚀 배포 가이드

### 1. 사전 준비

```bash
# AWS CLI 설치 및 설정
aws configure

# Serverless Framework 설치
npm install -g serverless

# 의존성 설치
cd lambda-functions
npm install
```

### 2. 환경 변수 설정

`.env.production` 파일 생성:
```env
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/marketingplat
LAMBDA_SECURITY_GROUP_ID=sg-xxxxxxxxx
LAMBDA_SUBNET_ID_1=subnet-xxxxxxxxx
LAMBDA_SUBNET_ID_2=subnet-yyyyyyyyy
```

### 3. 배포

```bash
# 개발 환경
./deploy.sh development

# 스테이징 환경
./deploy.sh staging

# 프로덕션 환경
./deploy.sh production
```

## 🔧 로컬 테스트

```bash
# Serverless Offline 실행
npm run serverless:offline

# 특정 함수 테스트
serverless invoke local --function smartplaceTracker --path test/event.json
```

## 📊 모니터링

### CloudWatch 메트릭
- `TrackingDuration`: 추적 소요 시간
- `TrackingErrors`: 추적 에러 횟수

### CloudWatch 알람
- Lambda 에러율 > 1%
- DLQ 메시지 > 0
- Lambda 실행 시간 > 60초

## 💰 비용 최적화

### 예상 비용 (월간, 100명 사용자)
- Lambda 실행: ~$0.72
- Lambda 실행 시간: ~$300
- SQS: ~$1.44
- 총 예상: ~$320/월

### 비용 절감 방법
1. Reserved Concurrency 설정 (50개)
2. 새벽 시간대 집중 실행
3. 캐싱 활용

## 🎯 성능

### 현재 (EC2)
- 처리 시간: 100개 키워드 = 약 5분
- 동시성: 3개

### Lambda 적용 후
- 처리 시간: 100개 키워드 = 약 20초
- 동시성: 50개
- 확장성: 자동 스케일링

## 📝 주의사항

1. **콜드 스타트**: 첫 실행 시 10-15초 추가 소요
2. **RDS 연결**: RDS Proxy 사용 권장
3. **VPC 설정**: RDS 접근을 위한 VPC 구성 필요
4. **Layer 크기**: 250MB 제한

## 🔍 트러블슈팅

### Lambda 타임아웃
```bash
# serverless.yml에서 timeout 증가
timeout: 300 # 5분
```

### 메모리 부족
```bash
# serverless.yml에서 메모리 증가
memorySize: 3008 # 최대 3GB
```

### VPC 연결 실패
- Security Group에서 아웃바운드 규칙 확인
- NAT Gateway 설정 확인

## 📚 참고 자료
- [Serverless Framework](https://www.serverless.com/)
- [@sparticuz/chromium](https://github.com/Sparticuz/chromium)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)