#!/bin/bash
# 로그인 API 직접 테스트 스크립트

echo "🔍 로그인 API 테스트"
echo "===================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 테스트할 URL
if [[ "$1" == "local" ]]; then
    BASE_URL="http://localhost:3000"
    echo -e "${YELLOW}로컬 서버 테스트${NC}"
else
    BASE_URL="https://marketingplat.shop"
    echo -e "${BLUE}프로덕션 서버 테스트${NC}"
fi

echo "URL: $BASE_URL"
echo ""

# 테스트 계정
declare -a accounts=(
    "admin@marketingplat.com:admin123"
    "academy@marketingplat.com:academy123"
    "nokyang@marketingplat.com:nokyang123"
    "user@test.com:test1234"
)

# 각 계정 테스트
for account in "${accounts[@]}"; do
    IFS=':' read -r email password <<< "$account"

    echo -e "${YELLOW}테스트: $email${NC}"
    echo "------------------------"

    # API 호출
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
        2>/dev/null)

    # HTTP 상태 코드 추출
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    # 결과 출력
    if [[ "$http_code" == "200" ]]; then
        echo -e "${GREEN}✅ 로그인 성공 (HTTP $http_code)${NC}"
        echo "응답: $body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ 로그인 실패 (HTTP $http_code)${NC}"
        echo "응답: $body" | jq '.' 2>/dev/null || echo "$body"
    fi

    echo ""
done

# 잘못된 비밀번호 테스트
echo -e "${YELLOW}잘못된 비밀번호 테스트${NC}"
echo "------------------------"

response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@marketingplat.com","password":"wrongpassword"}' \
    2>/dev/null)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" == "401" ]]; then
    echo -e "${GREEN}✅ 예상대로 실패 (HTTP $http_code)${NC}"
else
    echo -e "${RED}⚠️  예상치 못한 응답 (HTTP $http_code)${NC}"
fi
echo "응답: $body" | jq '.' 2>/dev/null || echo "$body"
echo ""

# 상세 디버그 모드
if [[ "$2" == "debug" ]]; then
    echo -e "${YELLOW}상세 디버그 모드${NC}"
    echo "------------------------"
    echo "curl 명령어 (복사해서 사용):"
    echo ""
    echo "curl -X POST '$BASE_URL/api/auth/login' \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"email\":\"admin@marketingplat.com\",\"password\":\"admin123\"}' \\"
    echo "  -v"
fi