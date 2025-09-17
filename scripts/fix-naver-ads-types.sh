#!/bin/bash

echo "======================================"
echo "네이버 광고 API 타입 에러 일괄 수정"
echo "======================================"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FILES=(
  "app/api/ads/keywords/route.ts:154:let result:let result: any = null"
  "app/api/ads/campaigns/[campaignId]/adgroups/route.ts:97:let adGroups:let adGroups: any[] = []"
  "app/api/ads/adgroups/[adgroupId]/ads/route.ts:95:let ads:let ads: any[] = []"
  "app/api/ads/adgroups/[adgroupId]/route.ts:95:let adGroup:let adGroup: any = null"
  "app/api/ads/adgroups/[adgroupId]/keywords/route.ts:66:let adGroup:let adGroup: any = null"
  "app/api/ads/adgroups/[adgroupId]/keywords/route.ts:78:let keywords:let keywords: any[] = []"
)

for FILE_INFO in "${FILES[@]}"; do
  IFS=':' read -r FILE LINE OLD NEW <<< "$FILE_INFO"
  echo -e "${YELLOW}수정중: $FILE (라인 $LINE)${NC}"
  echo "  변경: $OLD -> $NEW"
done

echo -e "${GREEN}✅ 타입 수정 목록 생성 완료${NC}"