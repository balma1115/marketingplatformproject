# EC2 AWS 자격 증명 설정 가이드

## 문제 상황
miraenad.com에서 Lambda 추적 시 다음 에러 발생:
```
InvalidClientTokenId: The security token included in the request is invalid.
```

## 원인
EC2 서버에 AWS 자격 증명이 설정되지 않아 SQS 및 Lambda 서비스에 접근할 수 없음

## 해결 방법

### 방법 1: IAM Role 사용 (권장) ⭐

1. **AWS Console에서 IAM Role 생성:**
   - IAM → Roles → Create role
   - Trusted entity type: AWS service
   - Use case: EC2
   - Permissions policies 추가:
     - `AmazonSQSFullAccess` (또는 최소 권한)
     - `AWSLambdaRole`
   - Role name: `marketingplat-ec2-role`

2. **EC2 인스턴스에 Role 연결:**
   - EC2 Console → 인스턴스 선택
   - Actions → Security → Modify IAM role
   - `marketingplat-ec2-role` 선택

3. **서버 재시작:**
   ```bash
   ssh ubuntu@miraenad.com
   cd ~/marketingplatformproject
   pm2 restart miraenad
   ```

### 방법 2: 환경 변수 직접 설정

1. **EC2 서버 접속:**
   ```bash
   ssh ubuntu@miraenad.com
   ```

2. **환경 변수 파일 생성:**
   ```bash
   cd ~/marketingplatformproject
   nano .env.production.local
   ```

3. **다음 내용 입력 (실제 값으로 변경):**
   ```env
   # AWS 자격 증명
   AWS_ACCESS_KEY_ID="AKIA..."
   AWS_SECRET_ACCESS_KEY="..."
   AWS_REGION="ap-northeast-2"

   # SQS Queue URLs (AWS Console에서 확인)
   BLOG_QUEUE_URL="https://sqs.ap-northeast-2.amazonaws.com/YOUR_ACCOUNT_ID/blog-tracking-queue"
   SMARTPLACE_QUEUE_URL="https://sqs.ap-northeast-2.amazonaws.com/YOUR_ACCOUNT_ID/smartplace-tracking-queue"

   # Lambda 사용 설정
   USE_LAMBDA="true"

   # 기존 DATABASE_URL 유지
   DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
   ```

4. **Git pull로 최신 코드 받기:**
   ```bash
   git pull origin main
   npm install
   npm run build
   ```

5. **PM2 재시작:**
   ```bash
   pm2 restart miraenad
   pm2 save
   ```

## AWS 리소스 확인 방법

### SQS Queue URL 확인:
1. AWS Console → SQS
2. Queue 선택
3. Details 탭에서 URL 복사

### Lambda Function ARN 확인:
1. AWS Console → Lambda
2. Function 선택
3. Function ARN 복사

## 테스트 방법

1. **miraenad.com 접속**
2. **로그인:** user@test.com / test1234
3. **블로그 키워드 페이지** 이동
4. **전체 추적** 버튼 클릭
5. Lambda 완료 알림 확인

## 주의사항

- **보안:** `.env.production.local` 파일은 절대 Git에 커밋하지 마세요
- **권한:** IAM Role 사용 시 최소 권한 원칙 적용
- **비용:** Lambda 실행 횟수와 SQS 메시지 수에 따라 요금 발생

## 문제 해결

### 여전히 에러가 발생하는 경우:

1. **로그 확인:**
   ```bash
   pm2 logs miraenad --lines 100
   ```

2. **환경 변수 확인:**
   ```bash
   pm2 env 0
   ```

3. **AWS CLI 테스트:**
   ```bash
   aws sqs list-queues --region ap-northeast-2
   ```

## 담당자 연락처
문제 지속 시 AWS 계정 관리자에게 IAM 권한 확인 요청