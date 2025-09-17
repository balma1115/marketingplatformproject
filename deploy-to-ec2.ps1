# EC2 배포 PowerShell 스크립트
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🚀 MarketingPlat EC2 배포 시작" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan

# EC2 정보
$EC2_HOST = "43.203.211.149"
$EC2_USER = "ubuntu"
$EC2_KEY = "C:\Users\User\Desktop\marketingplat.pem"
$PROJECT_DIR = "/home/ubuntu/marketingplatformproject"

# SSH 명령 함수
function Execute-SSH {
    param($Command)
    ssh -i $EC2_KEY -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" $Command
}

# SCP 명령 함수
function Execute-SCP {
    param($Source, $Destination)
    scp -i $EC2_KEY -o StrictHostKeyChecking=no $Source "$EC2_USER@${EC2_HOST}:$Destination"
}

Write-Host "`n1. EC2 연결 테스트..." -ForegroundColor Yellow
try {
    Execute-SSH "echo 'EC2 연결 성공'"
    Write-Host "✅ EC2 연결 성공" -ForegroundColor Green
}
catch {
    Write-Host "❌ EC2 연결 실패. PEM 키 경로를 확인하세요." -ForegroundColor Red
    exit 1
}

Write-Host "`n2. 로컬 빌드 파일 준비..." -ForegroundColor Yellow

# 빌드 파일 압축 (Windows tar 사용)
Write-Host "   빌드 파일 압축 중..." -ForegroundColor Gray
tar -czf build.tar.gz .next package.json package-lock.json prisma public next.config.js tsconfig.json

# 소스 파일 압축
Write-Host "   소스 파일 압축 중..." -ForegroundColor Gray
tar -czf source.tar.gz lib app components contexts hooks utils scripts *.js *.json .env.production --exclude=node_modules

Write-Host "`n3. 파일 업로드..." -ForegroundColor Yellow
Write-Host "   빌드 파일 업로드 중..." -ForegroundColor Gray
Execute-SCP "build.tar.gz" "/tmp/"

Write-Host "   소스 파일 업로드 중..." -ForegroundColor Gray
Execute-SCP "source.tar.gz" "/tmp/"

Write-Host "`n4. EC2에서 배포 실행..." -ForegroundColor Yellow

$deployScript = @'
set -e
echo "======================================"
echo "EC2 서버에서 배포 실행 중..."
echo "======================================"

# 프로젝트 디렉토리로 이동
cd /home/ubuntu/marketingplatformproject

# 기존 파일 백업
echo "기존 파일 백업..."
if [ -d ".next" ]; then
    sudo cp -r .next .next.backup
fi

# 압축 파일 해제
echo "파일 압축 해제..."
sudo tar -xzf /tmp/build.tar.gz
sudo tar -xzf /tmp/source.tar.gz

# 권한 설정
echo "권한 설정..."
sudo chown -R ubuntu:ubuntu .

# 환경 변수 설정
echo "환경 변수 확인..."
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production 파일이 없습니다!"
    exit 1
fi

# 의존성 설치 (production만)
echo "의존성 설치..."
npm ci --production

# Prisma 클라이언트 생성
echo "Prisma 클라이언트 생성..."
npx prisma generate

# PM2로 서비스 재시작
echo "PM2 서비스 재시작..."
if pm2 list | grep -q marketingplat; then
    pm2 restart marketingplat
else
    pm2 start npm --name marketingplat -- start
fi
pm2 save

# 임시 파일 정리
echo "임시 파일 정리..."
rm -f /tmp/build.tar.gz /tmp/source.tar.gz

echo "======================================"
echo "✅ 배포 완료!"
echo "======================================"
pm2 status
'@

Execute-SSH $deployScript

# 로컬 임시 파일 정리
Write-Host "`n5. 로컬 임시 파일 정리..." -ForegroundColor Yellow
Remove-Item -Path "build.tar.gz" -ErrorAction SilentlyContinue
Remove-Item -Path "source.tar.gz" -ErrorAction SilentlyContinue

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "✅ EC2 배포 완료!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 웹사이트: https://www.marekplace.co.kr" -ForegroundColor Cyan
Write-Host "📊 로그 확인: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'pm2 logs'" -ForegroundColor Yellow
Write-Host "📈 상태 확인: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'pm2 status'" -ForegroundColor Yellow