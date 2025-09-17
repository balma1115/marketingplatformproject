#!/bin/bash

# AWS EC2에서 테스트 계정을 생성하는 스크립트

echo "==================================="
echo "🚀 테스트 계정 생성 배포 스크립트"
echo "==================================="

# EC2 서버 정보
EC2_HOST="43.203.199.103"
EC2_USER="ubuntu"
EC2_KEY="~/marketingplat.pem"  # 로컬 PC에서의 키 위치
EC2_APP_PATH="/home/ubuntu/marketingplatformproject"

# Windows에서 실행 시 키 파일 경로 조정
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    EC2_KEY="$HOME/marketingplat.pem"
fi

echo ""
echo "1️⃣ GitHub으로 코드 푸시 중..."
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Git push 실패. 종료합니다."
    exit 1
fi

echo ""
echo "2️⃣ EC2 서버에 SSH 접속하여 코드 풀 및 테스트 계정 생성..."

ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
    echo "📂 프로젝트 디렉토리로 이동..."
    cd /home/ubuntu/marketingplatformproject

    echo "📥 최신 코드 가져오기..."
    git pull origin main

    echo "📦 의존성 설치 확인..."
    npm install

    echo "🔨 Prisma 클라이언트 생성..."
    npx prisma generate

    echo ""
    echo "🌱 테스트 계정 생성 실행..."
    npx tsx scripts/seed-test-accounts.ts

    echo ""
    echo "✅ 테스트 계정 생성 완료!"
    echo ""
    echo "📋 생성된 계정 DB 확인..."
    npx prisma db execute --stdin << SQL
SELECT id, email, name, role, plan, coin, is_approved
FROM users
WHERE email LIKE '%@test.aws.com'
ORDER BY id;
SQL

ENDSSH

echo ""
echo "==================================="
echo "✅ 배포 및 테스트 계정 생성 완료!"
echo "==================================="
echo ""
echo "테스트 계정 정보:"
echo "------------------------"
echo "관리자: admin@test.aws.com / test1234"
echo "대행사: agency@test.aws.com / test1234"
echo "지사: branch@test.aws.com / test1234"
echo "학원: academy@test.aws.com / test1234"
echo "일반: user@test.aws.com / test1234"
echo "------------------------"