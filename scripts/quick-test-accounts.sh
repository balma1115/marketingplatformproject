#!/bin/bash

# EC2에서 즉시 실행 가능한 테스트 계정 생성 스크립트

echo "🌱 테스트 계정 생성 시작..."

# 프로젝트 디렉토리 확인 및 이동
if [ -d "/home/ubuntu/marketingplatformproject" ]; then
    cd /home/ubuntu/marketingplatformproject
    echo "✅ 프로젝트 디렉토리: /home/ubuntu/marketingplatformproject"
elif [ -d "/home/ubuntu/marketingplatform" ]; then
    cd /home/ubuntu/marketingplatform
    echo "✅ 프로젝트 디렉토리: /home/ubuntu/marketingplatform"
else
    echo "❌ 프로젝트 디렉토리를 찾을 수 없습니다."
    exit 1
fi

# 최신 코드 가져오기
echo "📥 최신 코드 가져오기..."
git pull origin main

# Prisma 클라이언트 생성
echo "🔨 Prisma 클라이언트 생성..."
npx prisma generate

# 테스트 계정 생성 실행
echo "🚀 테스트 계정 생성 실행..."
npx tsx scripts/seed-test-accounts.ts

echo ""
echo "✅ 테스트 계정 생성 완료!"
echo ""
echo "생성된 계정:"
echo "------------------------"
echo "관리자: admin@test.aws.com / test1234"
echo "대행사: agency@test.aws.com / test1234"
echo "지사: branch@test.aws.com / test1234"
echo "학원: academy@test.aws.com / test1234"
echo "일반: user@test.aws.com / test1234"
echo "------------------------"