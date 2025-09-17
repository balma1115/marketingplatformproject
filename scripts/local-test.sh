#\!/bin/bash
# local-test.sh - AWS 배포 전 로컬 검증

echo "🔍 Starting local deployment test..."

# 1. 환경 변수 검증
echo "1️⃣ Checking environment variables..."
required_vars=("DATABASE_URL" "JWT_SECRET" "NEXT_PUBLIC_API_URL")
for var in "${required_vars[@]}"; do
  if [ -z "${\!var}" ]; then
    echo "❌ Missing: $var"
    exit 1
  else
    echo "✅ Found: $var"
  fi
done

# 2. 타입 체크
echo "2️⃣ Running type check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found"
  exit 1
fi

# 3. 린트 체크
echo "3️⃣ Running lint check..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Lint errors found"
  exit 1
fi

# 4. 보안 체크
echo "4️⃣ Security check..."
# 하드코딩된 키 검사
if grep -r "AKIA\|AIza\|ya29\|GOCSPX" --exclude-dir=node_modules .; then
  echo "❌ Hardcoded credentials found\!"
  exit 1
fi

# .env 파일 체크
if [ -f ".env.production" ]; then
  echo "⚠️ Warning: .env.production should not be committed"
fi

# 5. 프로덕션 빌드
echo "5️⃣ Building production..."
NODE_ENV=production npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# 6. 의존성 감사
echo "6️⃣ Running security audit..."
npm audit --audit-level=high
if [ $? -ne 0 ]; then
  echo "⚠️ Security vulnerabilities found"
fi

echo "✅ Local test completed successfully\!"
