# Windows PowerShell 배포 스크립트

# 환경 변수 설정 (.env 파일에서 읽기)
$env:DATABASE_URL = "postgresql://postgres:Asungmini77A@marketingplat-db.c1a2b3c4d5e6.ap-northeast-2.rds.amazonaws.com:5432/marketingplat"
$env:LAMBDA_SECURITY_GROUP_ID = "sg-0584fd2a2cc9d17e1"
$env:LAMBDA_SUBNET_ID_1 = "subnet-0d07a6427c0454dc7"
$env:LAMBDA_SUBNET_ID_2 = "subnet-00a38eb1a1c14c391"
# AWS_REGION is automatically set by Lambda

# 현재 설정 확인
Write-Host "Environment Variables Set:" -ForegroundColor Green
Write-Host "DATABASE_URL: $env:DATABASE_URL"
Write-Host "LAMBDA_SECURITY_GROUP_ID: $env:LAMBDA_SECURITY_GROUP_ID"
Write-Host "LAMBDA_SUBNET_ID_1: $env:LAMBDA_SUBNET_ID_1"
Write-Host "LAMBDA_SUBNET_ID_2: $env:LAMBDA_SUBNET_ID_2"
# AWS_REGION is automatically set by Lambda

# AWS 자격 증명 확인
Write-Host "`nChecking AWS Credentials:" -ForegroundColor Yellow
aws sts get-caller-identity

# Serverless 배포
Write-Host "`nDeploying with Serverless Framework:" -ForegroundColor Cyan
npx serverless deploy --stage production --verbose