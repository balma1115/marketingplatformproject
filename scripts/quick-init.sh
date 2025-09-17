#!/bin/bash
#
# 빠른 초기 계정 설정
# EC2 환경에서 간단하게 실행
#
# 사용법:
#   bash scripts/quick-init.sh
#

echo "🚀 AWS RDS 초기 계정 설정..."
echo ""

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")/.." || exit 1

# 스크립트 실행
npx tsx scripts/init-aws-accounts.ts

# 결과 확인
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 완료!"
    echo "🌐 https://marketingplat.shop"
    echo "📧 admin@marketingplat.com / admin123"
else
    echo "❌ 오류 발생!"
    exit 1
fi