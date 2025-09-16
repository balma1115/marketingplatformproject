#!/bin/bash

# Lambda Functions 배포 스크립트

echo "========================================="
echo "MarketingPlat Lambda Functions Deployment"
echo "========================================="

# 환경 변수 확인
if [ -z "$1" ]; then
  echo "Usage: ./deploy.sh [development|staging|production]"
  exit 1
fi

STAGE=$1
echo "Deploying to stage: $STAGE"

# 환경별 설정 파일 로드
if [ -f ".env.$STAGE" ]; then
  export $(cat .env.$STAGE | xargs)
  echo "Loaded environment variables from .env.$STAGE"
else
  echo "Warning: .env.$STAGE file not found"
fi

# 필수 환경 변수 확인
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set"
  exit 1
fi

# 의존성 설치
echo ""
echo "Installing dependencies..."
npm install

# TypeScript 컴파일
echo ""
echo "Compiling TypeScript..."
npm run build

# Lambda Layers 빌드
echo ""
echo "Building Lambda Layers..."
cd layers
./build.sh
cd ..

# Serverless Framework 배포
echo ""
echo "Deploying with Serverless Framework..."
npx serverless deploy --stage $STAGE --verbose

# 배포 결과 확인
if [ $? -eq 0 ]; then
  echo ""
  echo "========================================="
  echo "✅ Deployment successful!"
  echo "========================================="

  # 배포된 리소스 정보 출력
  echo ""
  echo "Deployed resources:"
  npx serverless info --stage $STAGE

  # SQS Queue URLs 출력
  echo ""
  echo "SQS Queue URLs:"
  aws sqs list-queues --queue-name-prefix "marketingplat-" --region ap-northeast-2

else
  echo ""
  echo "========================================="
  echo "❌ Deployment failed!"
  echo "========================================="
  exit 1
fi