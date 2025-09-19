@echo off
REM Windows 배포 스크립트 (CMD 버전)

REM 환경 변수 설정
set DATABASE_URL=postgresql://postgres:Asungmini77A@marketingplat-db.c1a2b3c4d5e6.ap-northeast-2.rds.amazonaws.com:5432/marketingplat
set LAMBDA_SECURITY_GROUP_ID=sg-0584fd2a2cc9d17e1
set LAMBDA_SUBNET_ID_1=subnet-0d07a6427c0454dc7
set LAMBDA_SUBNET_ID_2=subnet-00a38eb1a1c14c391
REM AWS_REGION is automatically set by Lambda

echo ========================================
echo Environment Variables Set:
echo DATABASE_URL=%DATABASE_URL%
echo LAMBDA_SECURITY_GROUP_ID=%LAMBDA_SECURITY_GROUP_ID%
echo LAMBDA_SUBNET_ID_1=%LAMBDA_SUBNET_ID_1%
echo LAMBDA_SUBNET_ID_2=%LAMBDA_SUBNET_ID_2%
REM AWS_REGION is automatically set by Lambda
echo ========================================

echo.
echo Checking AWS Credentials:
aws sts get-caller-identity

echo.
echo Deploying with Serverless Framework:
npx serverless deploy --stage production --verbose