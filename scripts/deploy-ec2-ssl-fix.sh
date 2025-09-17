#!/bin/bash
# deploy-ec2-ssl-fix.sh - SSL 프로토콜 오류 수정 배포 스크립트

echo "🔧 SSL 프로토콜 오류 수정 배포 시작..."

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 로컬 빌드 확인
echo -e "${BLUE}🔨 로컬 빌드 확인...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 빌드 실패. 에러를 확인하세요.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 로컬 빌드 성공!${NC}"

# 2. 필요한 파일 확인
echo -e "${BLUE}📋 배포 파일 확인...${NC}"
FILES_TO_DEPLOY=(
    "next.config.mjs"
    "middleware.ts"
    ".env.production"
    "scripts/ec2-pull-deploy.sh"
)

for file in "${FILES_TO_DEPLOY[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✅ $file${NC}"
    else
        echo -e "${RED}  ❌ $file 파일이 없습니다!${NC}"
        exit 1
    fi
done

# 3. Git 커밋 및 푸시
echo -e "${BLUE}📤 GitHub에 푸시...${NC}"
git add .
git commit -m "fix: SSL protocol error - update HTTPS configuration"
git push origin main

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️ Git push 실패 또는 변경사항 없음${NC}"
fi

echo -e "${GREEN}🎉 배포 준비 완료!${NC}"
echo ""
echo -e "${YELLOW}📌 다음 단계를 EC2에서 실행하세요:${NC}"
echo ""
echo "1. EC2 SSH 접속:"
echo "   ssh -i your-key.pem ubuntu@your-ec2-ip"
echo ""
echo "2. 프로젝트 디렉토리로 이동:"
echo "   cd /home/ubuntu/marketingplatformproject"
echo ""
echo "3. 최신 코드 가져오기:"
echo "   git pull origin main"
echo ""
echo "4. .env.production 파일 업데이트:"
echo "   nano .env.production"
echo "   # NEXT_PUBLIC_API_URL과 NEXT_PUBLIC_BASE_URL을"
echo "   # https://www.marekplace.co.kr로 설정"
echo ""
echo "5. 의존성 설치 및 빌드:"
echo "   npm ci --production=false"
echo "   npm run build"
echo ""
echo "6. PM2 재시작:"
echo "   pm2 restart marketingplat"
echo "   pm2 save"
echo ""
echo "7. Nginx 설정 확인 (SSL 인증서 확인):"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
echo "8. 상태 확인:"
echo "   pm2 status"
echo "   curl -I https://www.marekplace.co.kr"
echo ""
echo -e "${GREEN}✨ 배포 가이드 출력 완료!${NC}"