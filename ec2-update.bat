@echo off
echo ======================================
echo EC2 서버 업데이트 가이드
echo ======================================
echo.
echo GitHub에 코드가 푸시되었습니다.
echo.
echo EC2 서버에 SSH로 접속한 후 다음 명령어를 실행하세요:
echo.
echo 1. SSH 접속:
echo    ssh -i "PEM_KEY_PATH" ubuntu@EC2_IP_ADDRESS
echo.
echo 2. 프로젝트 디렉토리로 이동:
echo    cd /home/ubuntu/marketingplatformproject
echo.
echo 3. Git Pull로 최신 코드 받기:
echo    git pull origin main
echo.
echo 4. 의존성 설치:
echo    npm install
echo.
echo 5. Prisma 클라이언트 생성:
echo    npx prisma generate
echo.
echo 6. Next.js 빌드:
echo    npm run build
echo.
echo 7. PM2로 서비스 재시작:
echo    pm2 restart marketingplat
echo.
echo 8. 상태 확인:
echo    pm2 status
echo    pm2 logs
echo.
echo ======================================
pause