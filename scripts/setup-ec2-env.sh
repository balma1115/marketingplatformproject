#!/bin/bash
# EC2에서 실행할 환경 설정 스크립트

echo "🔧 Setting up EC2 environment variables..."

# 1. Secrets 로드 스크립트 생성
cat > ~/load-secrets.sh << 'EOF'
#!/bin/bash

# AWS Secrets Manager에서 값 가져오기
export JWT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id marketingplat/jwt-secret \
  --query SecretString \
  --output text \
  --region ap-northeast-2)

export DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id marketingplat/database-url \
  --query SecretString \
  --output text \
  --region ap-northeast-2)

export GEMINI_API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id marketingplat/gemini-api-key \
  --query SecretString \
  --output text \
  --region ap-northeast-2 2>/dev/null || echo "")

export NAVER_CLIENT_ID=$(aws secretsmanager get-secret-value \
  --secret-id marketingplat/naver-client-id \
  --query SecretString \
  --output text \
  --region ap-northeast-2 2>/dev/null || echo "")

export NAVER_CLIENT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id marketingplat/naver-client-secret \
  --query SecretString \
  --output text \
  --region ap-northeast-2 2>/dev/null || echo "")

echo "✅ Secrets loaded successfully"
EOF

chmod +x ~/load-secrets.sh

# 2. .env.local 파일 생성
cat > ~/marketingplatformproject/.env.local << 'EOF'
# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://marketingplat.com

# AWS Configuration
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=marketingplat-assets
SQS_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/YOUR_ACCOUNT_ID/ranking-tracking-queue

# Redis (로컬)
REDIS_URL=redis://localhost:6379

# 보안 설정
RATE_LIMIT_ENABLED=true
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_DURATION=900000

# 크롤러 설정
USE_REAL_CRAWLER=true
USE_MOCK_SCRAPER=false
ENABLE_SCHEDULER=true
AUTO_SCHEDULER=true

# 로깅 설정
LOG_LEVEL=error
DEBUG_MODE=false
SHOW_ERROR_DETAILS=false

# 포트 설정
PORT=3000
HOSTNAME=0.0.0.0
EOF

echo "✅ Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update SQS_QUEUE_URL with your actual queue URL"
echo "2. Update S3_BUCKET with your actual bucket name"
echo "3. Run: source ~/load-secrets.sh"
echo "4. Build the application: npm run build"