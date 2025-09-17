#!/bin/bash
# Lambda 함수 배포 스크립트

ACCOUNT_ID=$1
REGION="ap-northeast-2"

if [ -z "$ACCOUNT_ID" ]; then
  echo "Usage: ./deploy-lambda.sh <AWS_ACCOUNT_ID>"
  exit 1
fi

echo "🚀 Deploying Lambda functions..."

# 1. IAM 역할 생성
echo "Creating IAM role..."
aws iam create-role --role-name marketingplat-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' || echo "Role already exists"

# 권한 정책 연결
aws iam attach-role-policy --role-name marketingplat-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole

# Secrets Manager 권한 추가
aws iam put-role-policy --role-name marketingplat-lambda-role \
  --policy-name SecretsManagerAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:'$REGION':'$ACCOUNT_ID':secret:marketingplat/*"
    }]
  }'

# SQS 권한 추가
aws iam put-role-policy --role-name marketingplat-lambda-role \
  --policy-name SQSAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:'$REGION':'$ACCOUNT_ID':ranking-tracking-queue"
    }]
  }'

sleep 10  # IAM 역할 생성 대기

# 2. smartplace-tracker 함수 배포
echo "Deploying smartplace-tracker..."
cd smartplace-tracker
npm install
zip -r function.zip . -x "*.env*" -x "*.git*"

aws lambda create-function \
  --function-name marketingplat-smartplace-tracker \
  --runtime nodejs20.x \
  --role arn:aws:iam::$ACCOUNT_ID:role/marketingplat-lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 120 \
  --memory-size 1024 \
  --environment Variables="{NODE_ENV=production,SECRETS_PREFIX=marketingplat/}" \
  --region $REGION || \
aws lambda update-function-code \
  --function-name marketingplat-smartplace-tracker \
  --zip-file fileb://function.zip \
  --region $REGION

# 3. blog-tracker 함수 배포
echo "Deploying blog-tracker..."
cd ../blog-tracker
npm install
zip -r function.zip . -x "*.env*" -x "*.git*"

aws lambda create-function \
  --function-name marketingplat-blog-tracker \
  --runtime nodejs20.x \
  --role arn:aws:iam::$ACCOUNT_ID:role/marketingplat-lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 120 \
  --memory-size 1024 \
  --environment Variables="{NODE_ENV=production,SECRETS_PREFIX=marketingplat/}" \
  --region $REGION || \
aws lambda update-function-code \
  --function-name marketingplat-blog-tracker \
  --zip-file fileb://function.zip \
  --region $REGION

# 4. SQS 트리거 추가
echo "Adding SQS triggers..."
aws lambda create-event-source-mapping \
  --function-name marketingplat-smartplace-tracker \
  --event-source-arn arn:aws:sqs:$REGION:$ACCOUNT_ID:ranking-tracking-queue \
  --batch-size 5 \
  --maximum-batching-window-in-seconds 20 \
  --region $REGION || echo "Trigger already exists"

echo "✅ Lambda deployment complete!"
echo ""
echo "📋 Deployed functions:"
echo "- marketingplat-smartplace-tracker"
echo "- marketingplat-blog-tracker"