#!/bin/bash

# AWS EC2에서 초기 계정을 설정하는 자동화 스크립트

echo "==========================================="
echo "🚀 AWS RDS 초기 계정 설정 배포 스크립트"
echo "==========================================="
echo ""

# EC2 서버 정보
EC2_HOST="43.203.199.103"
EC2_USER="ubuntu"
EC2_KEY="~/marketingplat.pem"
EC2_APP_PATH="/home/ubuntu/marketingplatformproject"

# Windows에서 실행 시 키 파일 경로 조정
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    EC2_KEY="$HOME/marketingplat.pem"
fi

echo "1️⃣ GitHub으로 코드 푸시 중..."
git add scripts/init-aws-accounts.ts
git commit -m "feat: AWS RDS 초기 계정 설정 스크립트 추가" 2>/dev/null
git push origin main

if [ $? -ne 0 ]; then
    echo "⚠️  Git push 실패 또는 변경사항 없음. 계속 진행합니다..."
fi

echo ""
echo "2️⃣ EC2 서버에 SSH 접속하여 초기 계정 생성..."
echo ""

ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
    echo "==============================================="
    echo "📂 EC2 서버에서 작업 시작"
    echo "==============================================="

    # 프로젝트 디렉토리로 이동
    cd /home/ubuntu/marketingplatformproject

    echo "📥 최신 코드 가져오기..."
    git pull origin main

    echo "📦 필요한 패키지 설치 확인..."
    npm install bcrypt

    echo "🔨 Prisma 클라이언트 생성..."
    npx prisma generate

    echo ""
    echo "🌱 초기 계정 생성 시작..."
    echo "--------------------------------"
    npx tsx scripts/init-aws-accounts.ts
    echo "--------------------------------"

    echo ""
    echo "📊 생성된 계정 확인 (SQL 쿼리)..."
    npx prisma db execute --stdin << SQL
SELECT
    role,
    email,
    name,
    plan,
    coin,
    is_approved,
    kt_pass_verified
FROM users
WHERE email LIKE '%@marketingplat.com'
ORDER BY
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'agency' THEN 2
        WHEN 'branch' THEN 3
        WHEN 'academy' THEN 4
        WHEN 'user' THEN 5
    END;
SQL

    echo ""
    echo "✅ EC2 서버 작업 완료!"
    echo "==============================================="
ENDSSH

echo ""
echo "==========================================="
echo "✅ 초기 계정 설정 배포 완료!"
echo "==========================================="
echo ""
echo "🔑 생성된 계정 로그인 정보:"
echo "----------------------------------------"
echo ""
echo "📌 메인 계정 (운영용):"
echo "  👑 관리자: admin@marketingplat.com / admin123!@#"
echo "  🏢 대행사: agency@marketingplat.com / agency123!@#"
echo "  🏪 지사: branch@marketingplat.com / branch123!@#"
echo "  🏫 학원: academy@marketingplat.com / academy123!@#"
echo "  👤 일반: user@marketingplat.com / user123!@#"
echo ""
echo "📌 테스트 계정 (개발/테스트용):"
echo "  test.admin@marketingplat.com / test1234"
echo "  test.agency@marketingplat.com / test1234"
echo "  test.branch@marketingplat.com / test1234"
echo "  test.academy@marketingplat.com / test1234"
echo "  test.user@marketingplat.com / test1234"
echo "----------------------------------------"
echo ""
echo "🌐 웹사이트에서 로그인: https://marketingplat.com"
echo ""