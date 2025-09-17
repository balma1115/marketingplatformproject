# AWS EC2에서 테스트 계정을 생성하는 PowerShell 스크립트

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "🚀 테스트 계정 생성 배포 스크립트" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Cyan

# EC2 서버 정보
$EC2_HOST = "43.203.199.103"
$EC2_USER = "ubuntu"
$EC2_KEY = "$env:USERPROFILE\marketingplat.pem"
$EC2_APP_PATH = "/home/ubuntu/marketingplatformproject"

Write-Host ""
Write-Host "1️⃣ GitHub으로 코드 푸시 중..." -ForegroundColor Green
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git push 실패. 종료합니다." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2️⃣ EC2 서버에 SSH 접속하여 코드 풀 및 테스트 계정 생성..." -ForegroundColor Green

# SSH 명령 실행
$sshCommands = @"
echo '📂 프로젝트 디렉토리로 이동...'
cd /home/ubuntu/marketingplatformproject

echo '📥 최신 코드 가져오기...'
git pull origin main

echo '📦 의존성 설치 확인...'
npm install

echo '🔨 Prisma 클라이언트 생성...'
npx prisma generate

echo ''
echo '🌱 테스트 계정 생성 실행...'
npx tsx scripts/seed-test-accounts.ts

echo ''
echo '✅ 테스트 계정 생성 완료!'
"@

ssh -i $EC2_KEY "$EC2_USER@$EC2_HOST" $sshCommands

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "✅ 배포 및 테스트 계정 생성 완료!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "테스트 계정 정보:" -ForegroundColor Yellow
Write-Host "------------------------"
Write-Host "관리자: admin@test.aws.com / test1234" -ForegroundColor White
Write-Host "대행사: agency@test.aws.com / test1234" -ForegroundColor White
Write-Host "지사: branch@test.aws.com / test1234" -ForegroundColor White
Write-Host "학원: academy@test.aws.com / test1234" -ForegroundColor White
Write-Host "일반: user@test.aws.com / test1234" -ForegroundColor White
Write-Host "------------------------"