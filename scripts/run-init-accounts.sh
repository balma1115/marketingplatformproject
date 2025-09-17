#!/bin/bash
#
# AWS RDS 초기 계정 설정 실행 스크립트
# EC2 및 로컬 환경 모두 지원
#
# 사용법:
#   bash scripts/run-init-accounts.sh
#

set -e  # 오류 발생시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 타이틀 출력
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           AWS RDS 초기 계정 설정 시스템 v2.0                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 프로젝트 루트 디렉토리로 이동
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
echo -e "${BLUE}📁 작업 디렉토리:${NC} $PROJECT_ROOT"

# 환경 확인 (EC2 또는 로컬)
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "ubuntu" ]] && [[ -f /home/ubuntu/marketingplatformproject/.env ]]; then
        echo -e "${GREEN}🌐 EC2 환경 감지${NC}"
        ENVIRONMENT="EC2"
    else
        echo -e "${YELLOW}💻 로컬 환경 감지${NC}"
        ENVIRONMENT="LOCAL"
    fi
else
    echo -e "${YELLOW}💻 로컬 환경 감지${NC}"
    ENVIRONMENT="LOCAL"
fi
echo ""

# 환경 변수 확인
echo -e "${BLUE}🔍 환경 설정 확인...${NC}"

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ] && [ -f ".env.local" ]; then
    ENV_FILE=".env.local"
fi

if [ -f "$ENV_FILE" ]; then
    echo -e "   ${GREEN}✅ 환경 파일: $ENV_FILE${NC}"

    # DATABASE_URL 확인
    if grep -q "DATABASE_URL" "$ENV_FILE"; then
        DB_URL=$(grep "DATABASE_URL" "$ENV_FILE" | head -1 | cut -d '=' -f2- | sed 's/:.*@/:****@/')
        echo -e "   ${GREEN}✅ Database URL: $DB_URL${NC}"
    else
        echo -e "   ${RED}❌ DATABASE_URL이 설정되지 않았습니다${NC}"
        echo -e "   ${YELLOW}💡 .env 파일에 DATABASE_URL을 추가해주세요${NC}"
        exit 1
    fi
else
    echo -e "   ${RED}❌ .env 또는 .env.local 파일을 찾을 수 없습니다${NC}"
    echo -e "   ${YELLOW}💡 프로젝트 루트에 .env 파일을 생성해주세요${NC}"
    exit 1
fi
echo ""

# Node.js 환경 확인
echo -e "${BLUE}🔧 시스템 환경 확인...${NC}"

# Node.js 확인
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "   ${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "   ${RED}❌ Node.js가 설치되지 않았습니다${NC}"
    exit 1
fi

# npm 확인
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "   ${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "   ${RED}❌ npm이 설치되지 않았습니다${NC}"
    exit 1
fi

# tsx 확인
if command -v tsx &> /dev/null; then
    echo -e "   ${GREEN}✅ tsx: 설치됨 (글로벌)${NC}"
elif [ -f "node_modules/.bin/tsx" ]; then
    echo -e "   ${GREEN}✅ tsx: 설치됨 (로컬)${NC}"
else
    echo -e "   ${YELLOW}⚠️  tsx: npx로 실행${NC}"
fi
echo ""

# 의존성 확인
echo -e "${BLUE}📦 의존성 확인...${NC}"

if [ ! -d "node_modules" ]; then
    echo -e "   ${YELLOW}📦 패키지 설치 중...${NC}"
    npm install --silent
    echo -e "   ${GREEN}✅ 패키지 설치 완료${NC}"
else
    # 필수 패키지 확인
    if [ ! -d "node_modules/@prisma/client" ]; then
        echo -e "   ${YELLOW}📦 Prisma 클라이언트 설치 중...${NC}"
        npm install @prisma/client --silent
    fi

    if [ ! -d "node_modules/bcryptjs" ]; then
        echo -e "   ${YELLOW}📦 bcryptjs 설치 중...${NC}"
        npm install bcryptjs --silent
    fi

    echo -e "   ${GREEN}✅ 의존성 확인 완료${NC}"
fi
echo ""

# Prisma 클라이언트 생성
echo -e "${BLUE}🔨 Prisma 클라이언트 준비...${NC}"

if [ ! -d "node_modules/.prisma/client" ]; then
    echo -e "   ${YELLOW}⚙️  Prisma 클라이언트 생성 중...${NC}"
    npx prisma generate --silent
    echo -e "   ${GREEN}✅ Prisma 클라이언트 생성 완료${NC}"
else
    echo -e "   ${GREEN}✅ Prisma 클라이언트 준비됨${NC}"
fi
echo ""

# 스크립트 실행
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 계정 초기화 시작${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# TypeScript 파일 실행
SCRIPT_FILE="scripts/init-aws-accounts.ts"

if [ -f "$SCRIPT_FILE" ]; then
    # tsx 실행
    if command -v tsx &> /dev/null; then
        tsx "$SCRIPT_FILE"
    elif [ -f "node_modules/.bin/tsx" ]; then
        ./node_modules/.bin/tsx "$SCRIPT_FILE"
    else
        npx tsx "$SCRIPT_FILE"
    fi

    RESULT=$?

    if [ $RESULT -eq 0 ]; then
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║            ✨ 초기 계정 설정 완료!                           ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
        echo ""

        if [[ "$ENVIRONMENT" == "EC2" ]]; then
            echo -e "${BLUE}🌐 웹사이트:${NC} https://marketingplat.shop"
        else
            echo -e "${BLUE}🌐 웹사이트:${NC} http://localhost:3000"
        fi

        echo -e "${BLUE}📧 관리자:${NC} admin@marketingplat.com / admin123"
        echo ""
    else
        echo ""
        echo -e "${RED}❌ 스크립트 실행 중 오류가 발생했습니다${NC}"
        echo -e "${YELLOW}💡 위의 오류 메시지를 확인하세요${NC}"
        exit $RESULT
    fi
else
    echo -e "${RED}❌ $SCRIPT_FILE 파일을 찾을 수 없습니다${NC}"
    echo -e "${YELLOW}💡 scripts 디렉토리에 init-aws-accounts.ts 파일이 있는지 확인하세요${NC}"
    exit 1
fi