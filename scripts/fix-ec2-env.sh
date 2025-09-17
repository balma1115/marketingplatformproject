#!/bin/bash
# EC2 환경변수 수정 및 PM2 재시작 스크립트

echo "🔧 EC2 환경 설정 수정 시작..."
echo ""

# 프로젝트 디렉토리로 이동
cd ~/marketingplatformproject

# 현재 DATABASE_URL 확인
echo "📍 현재 DATABASE_URL 확인:"
grep DATABASE_URL .env || echo "DATABASE_URL not found"
echo ""

# .env 백업
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ .env 파일 백업 완료"

# DATABASE_URL이 localhost를 가리키는지 확인
if grep -q "localhost:5432" .env; then
    echo "⚠️  localhost:5432 발견 - AWS RDS로 변경 필요"
    echo ""
    echo "📝 다음과 같이 .env 파일을 수정하세요:"
    echo ""
    echo "DATABASE_URL=\"postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat\""
    echo ""

    # 자동 수정 옵션
    read -p "자동으로 수정하시겠습니까? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # DATABASE_URL 자동 수정
        sed -i 's|DATABASE_URL="postgresql://[^"]*"|DATABASE_URL="postgresql://postgres:Asungmini77A@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"|' .env
        echo "✅ DATABASE_URL 수정 완료"
    fi
else
    echo "✅ DATABASE_URL이 이미 올바르게 설정됨"
fi

echo ""
echo "🔄 PM2 재시작 중..."

# PM2 재시작
pm2 stop marketingplat 2>/dev/null || true
pm2 delete marketingplat 2>/dev/null || true

# 빌드 (선택사항)
# echo "🏗️  Next.js 빌드 중..."
# npm run build

# PM2로 시작
pm2 start npm --name "marketingplat" -- start
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "✅ 완료!"
echo ""
echo "📊 상태 확인:"
pm2 status

echo ""
echo "📝 로그 확인 명령:"
echo "pm2 logs marketingplat --lines 50"