# 네이버 검색광고 API 완전 가이드 (Complete Documentation)

## 📋 목차
1. [API 기본 정보](#api-기본-정보)
2. [인증](#인증)
3. [전체 API 엔드포인트](#전체-api-엔드포인트)
   - [AdExtension (확장 소재)](#1-adextension-확장-소재)
   - [Adgroup (광고그룹)](#2-adgroup-광고그룹)
   - [Ad (광고 소재)](#3-ad-광고-소재)
   - [Campaign (캠페인)](#4-campaign-캠페인)
   - [BusinessChannel (비즈니스 채널)](#5-businesschannel-비즈니스-채널)
   - [AdKeyword (키워드)](#6-adkeyword-키워드)
   - [ProductGroup (상품 그룹)](#7-productgroup-상품-그룹)
   - [Criterion (타겟팅)](#8-criterion-타겟팅)
   - [SharedBudget (공유 예산)](#9-sharedbudget-공유-예산)
   - [Label & LabelRef (라벨)](#10-label--labelref-라벨즐겨찾기)
   - [ManagedKeyword (관리 키워드)](#11-managedkeyword-관리-키워드)
   - [Target (타겟)](#12-target-타겟)
   - [IpExclusion (IP 제외)](#13-ipexclusion-ip-제외)
   - [Bizmoney (비즈머니)](#14-bizmoney-비즈머니)
   - [AdAccounts (광고 계정)](#15-adaccounts-광고-계정)
   - [ManagerAccounts (관리 계정)](#16-manageraccounts-관리-계정)
   - [ManagedCustomerLink (고객 링크)](#17-managedcustomerlink-고객-링크)
   - [StatReport (통계 리포트)](#18-statreport-통계-리포트)
   - [Stat (통계)](#19-stat-통계)
   - [MasterReport (마스터 리포트)](#20-masterreport-마스터-리포트)
   - [RelKwdStat (연관 키워드 통계)](#21-relkwdstat-연관-키워드-통계)
   - [Estimate (예상 비용)](#22-estimate-예상-비용)
4. [오류 코드](#오류-코드)
5. [구현 가이드](#구현-가이드)
6. [베스트 프랙티스](#베스트-프랙티스)

---

## API 기본 정보

### Base URL
```
https://api.searchad.naver.com
```

### API 버전
- 현재 버전: v2
- 엔드포인트 prefix: `/api`

### Request/Response 형식
- Content-Type: `application/json`
- Accept: `application/json`
- Encoding: UTF-8

---

## 인증

### 필수 헤더
```javascript
{
  'X-Customer': customerId,       // 고객 ID (숫자)
  'X-API-KEY': accessKey,         // API 액세스 키
  'X-Signature': signature,       // HMAC-SHA256 서명
  'X-Timestamp': timestamp        // Unix timestamp (milliseconds)
}
```

### 서명 생성 방법
```javascript
const timestamp = Date.now().toString()
const method = 'GET'
const uri = '/api/campaigns'

// 서명 메시지 생성
const message = `${timestamp}.${method}.${uri}`

// HMAC-SHA256으로 서명
const signature = crypto
  .createHmac('sha256', secretKey)
  .update(message)
  .digest('base64')
```

---

## 전체 API 엔드포인트

### 1. AdExtension (확장 소재)
확장 광고 소재 관리

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list (by ids) | `GET /ncc/ad-extensions?ids={ids}` | 다수의 확장 소재 ID를 이용하여 조회 |
| list (by label) | `GET /ncc/ad-extensions?nccLabelId={labelId}` | 특정 즐겨찾기로 등록한 확장소재 목록 조회 |
| list (by owner) | `GET /ncc/ad-extensions?ownerId={ownerId}` | 캠페인/광고그룹/소재의 확장 소재 조회 |
| get | `GET /ncc/ad-extensions/{adExtensionId}` | 특정 확장 소재 정보 조회 |
| create | `POST /ncc/ad-extensions` | 새로운 확장 소재 생성 |
| update | `PUT /ncc/ad-extensions/{adExtensionId}?fields={fields}` | 확장 소재 정보 변경 (fields: userLock, period) |
| update items | `PUT /ncc/ad-extensions?fields={fields}` | 여러개의 확장 소재 변경 |
| delete | `DELETE /ncc/ad-extensions/{adExtensionId}` | 확장 소재 삭제 |

### 2. Adgroup (광고그룹)
광고그룹 관리 및 제외 키워드 설정

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list (negative keywords) | `GET /ncc/adgroups/{adgroupId}/restricted-keywords?type=KEYWORD_PLUS_RESTRICT` | 노출 제외 키워드 목록 조회 |
| list (by ids) | `GET /ncc/adgroups?ids={ids}` | ID 목록의 광고그룹 조회 |
| list (by campaign) | `GET /ncc/adgroups?nccCampaignId={campaignId}&baseSearchId={id}&recordSize={size}&selector={json}` | 캠페인의 광고그룹 목록 조회 |
| list (by label) | `GET /ncc/adgroups?nccLabelId={labelId}` | 라벨의 광고그룹 목록 조회 |
| get | `GET /ncc/adgroups/{adgroupId}` | 특정 광고그룹 조회 |
| create | `POST /ncc/adgroups` | 새 광고그룹 생성 |
| create (negative keywords) | `POST /ncc/adgroups/{adgroupId}/restricted-keywords` | 노출 제외 키워드 생성 |
| update | `PUT /ncc/adgroups/{adgroupId}` | 광고그룹 전체 수정 |
| update (by fields) | `PUT /ncc/adgroups/{adgroupId}?fields={fields}` | 광고그룹 특정 필드만 수정 |
| delete | `DELETE /ncc/adgroups/{adgroupId}` | 광고그룹 삭제 |
| delete (negative keywords) | `DELETE /ncc/adgroups/{adgroupId}/restricted-keywords?ids={ids}` | 노출 제외 키워드 삭제 |

### 3. Ad (광고 소재)
광고 소재 생성 및 관리

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /ncc/ads?ids={ids}` | 입력한 ID 목록의 소재 조회 |
| list (by adgroup) | `GET /ncc/ads?nccAdgroupId={adgroupId}` | 광고그룹에 포함된 소재 목록 조회 |
| get | `GET /ncc/ads/{adId}` | 특정 소재 조회 |
| create | `POST /ncc/ads` | 광고 소재 생성 |
| update | `PUT /ncc/ads/{adId}?fields={fields}` | 광고 소재 정보 변경 |
| delete | `DELETE /ncc/ads/{adId}` | 광고 소재 삭제 |
| copy | `PUT /ncc/ads?ids={ids}&targetAdgroupId={id}&userLock={bool}` | 광고 소재를 다른 광고그룹으로 복사 |

### 4. Campaign (캠페인)

캠페인 생성 및 관리

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list (by type) | `GET /ncc/campaigns?campaignType={type}&baseSearchId={id}&recordSize={size}&selector={json}` | 조회 조건에 해당하는 캠페인 목록 조회 |
| list (by ids) | `GET /ncc/campaigns?ids={ids}` | 입력된 아이디에 해당하는 캠페인 목록 조회 |
| get | `GET /ncc/campaigns/{campaignId}` | 단일 캠페인 조회 |
| create | `POST /ncc/campaigns` | 새로운 캠페인 생성 |
| update | `PUT /ncc/campaigns/{campaignId}?fields={fields}` | 캠페인 수정 |
| delete | `DELETE /ncc/campaigns/{campaignId}` | 캠페인 영구 삭제 (하위 요소도 함께 삭제) |
| delete items | `DELETE /ncc/campaigns?ids={ids}` | 다수 캠페인 삭제 |

#### 캠페인 생성 예시
```javascript
// Request
GET /api/campaigns

// Response
[
  {
    "nccCampaignId": "cmp-xxxxx",
    "customerId": 123456,
    "name": "캠페인명",
    "campaignTp": "WEB_SITE",  // WEB_SITE, SHOPPING, POWER_CONTENTS, PLACE
    "status": "ELIGIBLE",       // ELIGIBLE, PAUSED, DELETED
    "dailyBudget": 10000,
    "useDailyBudget": true,
    "deliveryMethod": "STANDARD", // STANDARD, ACCELERATED
    "trackingMode": "TRACKING_DISABLED",
    "usePeriod": false,
    "regTm": "2024-01-01T00:00:00.000Z",
    "editTm": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/campaigns/{campaignId}
특정 캠페인 조회

#### POST /api/campaigns
캠페인 생성
```javascript
// Request Body
{
  "name": "새 캠페인",
  "campaignTp": "WEB_SITE",
  "dailyBudget": 10000,
  "useDailyBudget": true,
  "deliveryMethod": "STANDARD"
}
```

#### PUT /api/campaigns/{campaignId}
캠페인 수정
```javascript
// Request Body (수정 가능 필드만)
{
  "name": "수정된 캠페인명",
  "dailyBudget": 20000,
  "status": "PAUSED",
  "useDailyBudget": true,
  "userLock": false
}
```

#### DELETE /api/campaigns/{campaignId}
캠페인 삭제

---

### 2. 광고그룹 관리 (AdGroup)

#### GET /api/adgroups
광고그룹 목록 조회
```javascript
// Query Parameters
?nccCampaignId=cmp-xxxxx        // 캠페인 ID로 필터
?ids=grp-xxx,grp-yyy            // 복수 광고그룹 ID 조회
?nccLabelId=label-xxx           // 라벨 ID로 필터
?recordSize=100                 // 최대 결과 수
?baseSearchId=grp-xxx           // 페이징용 기준 ID
?selector=all                   // 필드 선택자
```

#### GET /api/adgroups/{adgroupId}
특정 광고그룹 조회

#### POST /api/adgroups
광고그룹 생성
```javascript
// Request Body
{
  "nccCampaignId": "cmp-xxxxx",
  "name": "광고그룹명",
  "bidAmt": 400,                    // 기본 입찰가
  "dailyBudget": 30000,            
  "useDailyBudget": true,
  "pcChannelKey": "https://example.com",
  "mobileChannelKey": "https://m.example.com",
  "targetSummary": {
    "pcMobile": "all",              // all, pc, mobile
    "media": "all"                  // all, naver, daum
  }
}
```

#### PUT /api/adgroups/{adgroupId}
광고그룹 수정
```javascript
// Request Body
{
  "name": "수정된 광고그룹",
  "bidAmt": 500,
  "dailyBudget": 50000,
  "status": "PAUSED"
}
```

#### DELETE /api/adgroups/{adgroupId}
광고그룹 삭제

---

### 3. 키워드 관리 (AdKeyword)

#### ⚠️ 중요: AdKeyword API의 한계
- **설정 데이터만 제공**: 키워드 상태, 입찰가, 품질지수 등의 설정값만 조회 가능
- **성과 데이터 없음**: 노출수, 클릭수, CTR, CPC 등의 성과 지표는 제공하지 않음
- **성과 데이터 조회**: StatReport 또는 MasterReport API를 사용해야 함

#### GET /ncc/keywords
키워드 목록 조회
```javascript
// Query Parameters
?nccAdgroupId=grp-xxxxx         // 광고그룹 ID로 필터
?ids=kwd-xxx,kwd-yyy           // 복수 키워드 ID 조회
?recordSize=100                 // 최대 결과 수

// Response (성과 데이터 없음)
[
  {
    "nccKeywordId": "nkw-a001-01-000006938876439",
    "nccAdgroupId": "grp-a001-01-000000048644254",
    "keyword": "녹양동수학",
    "bidAmt": 500,
    "useGroupBidAmt": false,
    "status": "ELIGIBLE",
    "qualityIndex": 10,
    "editDt": "2025-08-01T10:00:00.000Z"
    // ❌ impCnt, clkCnt, ctr, cpc 등의 성과 데이터 없음
  }
]
```

#### GET /ncc/keywords/{keywordId}
특정 키워드 조회
```javascript
// Response (설정값만 포함)
{
  "nccKeywordId": "nkw-a001-01-000006938876439",
  "keyword": "녹양동수학",
  "bidAmt": 500,
  "status": "ELIGIBLE",
  "qualityIndex": 10
  // ❌ 성과 데이터 없음
}
```

#### POST /ncc/keywords
키워드 생성
```javascript
// Request Body
{
  "nccKeywordList": [
    {
      "nccAdgroupId": "grp-xxxxx",
      "keyword": "검색 키워드",
      "bidAmt": 500,
      "useGroupBidAmt": false
    }
  ]
}
```

#### PUT /ncc/keywords
키워드 일괄 수정
```javascript
// Request Body
{
  "nccKeywordList": [
    {
      "nccKeywordId": "kwd-xxxxx",
      "bidAmt": 600,
      "status": "PAUSED"
    }
  ]
}
```

#### PUT /ncc/keywords/{keywordId}
특정 키워드 수정

#### DELETE /api/keywords
키워드 일괄 삭제
```javascript
// Query Parameters
?nccKeywordIdList=kwd-xxx,kwd-yyy
```

---

### 4. 제외 키워드 (Restricted Keywords)

#### GET /api/adgroups/{adgroupId}/restricted-keywords
제외 키워드 조회
```javascript
// Query Parameters
?type=KEYWORD_PLUS_RESTRICT      // 확장 제외
?type=PHRASE_KEYWORD_RESTRICT    // 구문 제외  
?type=EXACT_KEYWORD_RESTRICT     // 정확 제외
```

#### POST /api/adgroups/{adgroupId}/restricted-keywords
제외 키워드 추가
```javascript
// Request Body
{
  "restrictedKeywords": [
    {
      "keyword": "제외할 키워드",
      "type": "KEYWORD_PLUS_RESTRICT"
    }
  ]
}
```

#### DELETE /api/adgroups/{adgroupId}/restricted-keywords
제외 키워드 삭제
```javascript
// Query Parameters
?restrictedKeywordIds=rkwd-xxx,rkwd-yyy
```

---

### 5. 광고 소재 관리 (Ad)

#### GET /api/ads
광고 목록 조회
```javascript
// Query Parameters
?nccAdgroupId=grp-xxxxx         // 광고그룹 ID로 필터
```

#### GET /api/ads/{adId}
특정 광고 조회

#### POST /api/ads
광고 생성
```javascript
// Request Body
{
  "nccAdgroupId": "grp-xxxxx",
  "ad": {
    "headline": "광고 제목",
    "description": "광고 설명",
    "pc": {
      "final": "https://example.com"
    },
    "mobile": {
      "final": "https://m.example.com"
    }
  }
}
```

#### PUT /api/ads/{adId}
광고 수정
```javascript
// Request Body
{
  "status": "PAUSED",
  "ad": {
    "headline": "수정된 제목",
    "description": "수정된 설명"
  }
}
```

#### DELETE /api/ads/{adId}
광고 삭제

---

### 6. 통계 보고서 (StatReport) ⚠️ 중요

#### GET /api/stat-reports
통계 보고서 조회

##### 파라미터 형식 (매우 중요!)
```javascript
// 올바른 요청 형식
{
  // 필수 파라미터
  "reportTp": "CAMPAIGN",           // CAMPAIGN, ADGROUP, AD, KEYWORD, AD_EXTENSION
  "start": "2024-08-01",           // YYYY-MM-DD 형식
  "end": "2024-08-31",             // YYYY-MM-DD 형식
  
  // 선택 파라미터
  "timeRange": {                   // start/end 대신 사용 가능
    "since": "2024-08-01",        
    "until": "2024-08-31"
  },
  
  // ID 필터 (선택)
  "ids": ["cmp-xxx", "cmp-yyy"],  // 특정 엔티티만 조회
  
  // 시간 단위 (선택)
  "timeIncrement": "allDays",     // allDays(기본), daily, weekly, monthly
  
  // 필드 선택 (선택)
  "fields": ["impCnt", "clkCnt", "salesAmt", "ctr", "cpc"]
}
```

##### 응답 형식
```javascript
{
  "data": [
    {
      "id": "cmp-xxxxx",           // 엔티티 ID
      "impCnt": 1000,               // 노출수
      "clkCnt": 50,                 // 클릭수
      "salesAmt": 50000,            // 비용
      "ctr": 5.0,                   // 클릭률 (%)
      "cpc": 1000,                  // 평균 클릭 비용
      "ccnt": 10,                   // 전환수
      "convAmt": 100000            // 전환 매출
    }
  ],
  "summary": {
    "impCnt": 1000,
    "clkCnt": 50,
    "salesAmt": 50000,
    "ctr": 5.0,
    "cpc": 1000
  }
}
```

##### 날짜 처리 주의사항
```javascript
// ❌ 잘못된 예시 (에러 발생)
{
  "dateRange": {
    "since": "20240801",    // 잘못된 형식
    "until": "20240831"     // 잘못된 형식
  }
}

// ✅ 올바른 예시
{
  "start": "2024-08-01",    // 하이픈 포함 필수
  "end": "2024-08-31"       // 하이픈 포함 필수
}

// ✅ 또는 timeRange 사용
{
  "timeRange": {
    "since": "2024-08-01",
    "until": "2024-08-31"
  }
}
```

---

### 5. BusinessChannel (비즈니스 채널)
비즈니스 채널 관리

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /ncc/channels` | 비즈니스 채널 목록 조회 |
| list (by type) | `GET /ncc/channels?channelTp={channelTp}` | 채널 타입별 목록 조회 |
| list (by ids) | `GET /ncc/channels?ids={ids}` | ID 목록으로 채널 조회 |
| list (purchasable) | `GET /ncc/purchasable-place-channels` | 구매 가능 플레이스 채널 목록 |
| get | `GET /ncc/channels/{businessChannelId}` | 특정 채널 조회 |
| create | `POST /ncc/channels` | 새 비즈니스 채널 생성 |
| update | `PUT /ncc/channels/{businessChannelId}?fields={fields}` | 채널 수정 (fields: name, inspectId, inspectPw, secondary) |
| delete | `DELETE /ncc/channels/{businessChannelId}` | 채널 삭제 |
| delete (by ids) | `DELETE /ncc/channels?ids={ids}` | 다수 채널 삭제 |
| request inspect | `PUT /ncc/channels/{businessChannelId}/inspect` | 채널 재검수 요청 |

### 6. AdKeyword (키워드)
키워드 입찰 및 관리

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list (by ids) | `GET /ncc/keywords?ids={ids}` | ID 목록의 키워드 조회 |
| list (by adgroup) | `GET /ncc/keywords?nccAdgroupId={id}&baseSearchId={id}&recordSize={size}&selector={json}` | 광고그룹의 키워드 목록 |
| list (by label) | `GET /ncc/keywords?nccLabelId={labelId}` | 라벨의 키워드 목록 |
| get | `GET /ncc/keywords/{nccKeywordId}` | 특정 키워드 조회 |
| create | `POST /ncc/keywords?nccAdgroupId={adgroupId}` | 키워드 생성 (최대 100개) |
| update | `PUT /ncc/keywords/{nccKeywordId}?fields={fields}` | 키워드 수정 (fields: userLock, bidAmt, links, inspect) |
| update-items | `PUT /ncc/keywords?fields={fields}` | 다수 키워드 수정 (최대 200개) |
| delete | `DELETE /ncc/keywords/{nccKeywordId}` | 키워드 삭제 |
| delete-items | `DELETE /ncc/keywords?ids={ids}` | 다수 키워드 삭제 |

### 7. ProductGroup (상품 그룹)
쇼핑 캠페인 상품 그룹 관리

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| get | `GET /ncc/product-groups` | 계정에 등록된 상품 그룹 목록 조회 |

### 8. Criterion (타겟팅)
타겟팅 설정 및 입찰가 가중치 관리

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /ncc/criterion/{adgroupId}?CriterionDictionaryType={type}` | 광고그룹에 속한 타겟팅 정보 조회 |
| get dictionary | `GET /ncc/criterion-dictionary?dictionaryType={type}` | 광고그룹 지원 타겟팅 코드 조회 |
| update bidWeight | `PUT /ncc/criterion/{adgroupId}/bidWeight?dictionaryCode={code}&bidWeight={weight}` | 타겟팅 입찰가 가중치 변경 |
| update | `PUT /ncc/criterion/{adgroupId}/?dictionaryType={type}` | 타겟팅 유형별 변경 |

### 9. SharedBudget (공유 예산)
캠페인/광고그룹 간 예산 공유

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| get | `GET /ncc/shared-budgets` | 공유예산 목록 조회 |
| get (by id) | `GET /ncc/shared-budgets/{id}` | 단건 공유예산 조회 |
| get (campaigns) | `GET /ncc/campaigns/shared-budgets/{id}` | 공유예산에 연결된 캠페인 목록 |
| get (adgroups) | `GET /ncc/adgroups/shared-budgets/{id}` | 공유예산에 연결된 광고그룹 목록 |
| add campaigns | `PUT /ncc/campaigns/?fields=sharedBudgetId` | 공유예산에 캠페인 추가 |
| add adgroups | `PUT /ncc/adgroups/?fields=sharedBudgetId` | 공유예산에 광고그룹 추가 |
| create | `POST /ncc/shared-budgets` | 공유예산 생성 |
| update budget | `PUT /ncc/shared-budgets?fields=budget` | 공유예산 금액 수정 |
| update | `PUT /ncc/shared-budgets/{id}` | 공유예산 수정 |
| delete | `DELETE /ncc/shared-budgets` | 공유예산 삭제 |
| exclude campaigns | `PUT /ncc/shared-budgets/campaigns?ids={ids}` | 캠페인을 공유예산에서 제외 |
| exclude adgroups | `PUT /ncc/shared-budgets/adgroups?ids={ids}` | 광고그룹을 공유예산에서 제외 |

### 10. Label & LabelRef (라벨/즐겨찾기)
라벨로 캠페인/광고그룹/키워드 관리

#### Label API
| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /ncc/labels` | 광고주의 전체 라벨 조회 |
| update | `PUT /ncc/labels` | 라벨명 변경 |

#### LabelRef API
| Method | HTTP Request | Description |
|--------|-------------|-------------|
| update | `PUT /ncc/label-refs` | 라벨 참조 생성/삭제 |

### 11. ManagedKeyword (관리 키워드)
월간 검색수 및 경쟁도 데이터

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /ncc/managedKeyword?keywords={keywords}` | 키워드의 월간 검색수 및 경쟁도 조회 |

### 12. Target (타겟)
광고 타겟팅 설정

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list (by owner) | `GET /ncc/targets?ownerId={ownerId}&types={types}` | 소유자(광고그룹/소재)의 타겟 조회 |
| list (by owners) | `GET /ncc/targets?types={types}&ownerIds={ownerIds}` | 다수 소유자의 타겟 조회 |
| update | `PUT /ncc/targets/{targetId}` | 타겟팅 변경 |

### 13. IpExclusion (IP 제외)
IP 기반 광고 제외

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| get | `GET /tool/ip-exclusions` | 등록된 제외 IP 조회 |
| create | `POST /tool/ip-exclusions` | 제외 IP 등록 |
| update | `PUT /tool/ip-exclusions` | 제외 IP 수정 |
| delete | `DELETE /tool/ip-exclusions/{id}` | 제외 IP 삭제 |
| delete (by ids) | `DELETE /tool/ip-exclusions?ids={ids}` | 다수 제외 IP 삭제 |

### 14. Bizmoney (비즈머니)
계정 잔액 및 거래 내역

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| get | `GET /billing/bizmoney` | 비즈머니 잔액 및 잠금 상태 조회 |
| get (charge) | `GET /billing/bizmoney/histories/charge?searchStartDt={date}&searchEndDt={date}` | 비즈머니 충전 내역 |
| get (exhaust) | `GET /billing/bizmoney/histories/exhaust?searchStartDt={date}&searchEndDt={date}` | 비즈머니 차감 내역 |
| get (period) | `GET /billing/bizmoney/histories/period?searchStartDt={date}&searchEndDt={date}` | 일별 비즈머니 상태 |

### 15. AdAccounts (광고 계정)
광고 계정 권한 관리

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /ad-accounts` | 권한이 있는 광고계정 목록 조회 |
| get members | `GET /ad-accounts/{adAccountNo}/members` | 특정 광고계정의 구성원 조회 |

### 16. ManagerAccounts (관리 계정)
관리 계정 및 하위 계정 관리

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /manager-accounts` | 권한이 있는 관리계정 목록 조회 |
| get child accounts | `GET /manager-accounts/{managerAccountNo}/child-ad-accounts` | 관리계정의 하위 광고계정 목록 |

### 17. ManagedCustomerLink (고객 링크)
고객 계정 연결 관리 (Deprecated)

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /customer-links` | 클라이언트 또는 관리자 목록 조회 (Deprecated) |

### 18. StatReport (통계 리포트)
성과 데이터 리포트

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /stat-reports` | 등록된 모든 리포트 작업 조회 |
| get | `GET /stat-reports/{reportJobId}` | 특정 리포트 작업 조회 |
| create | `POST /stat-reports` | 리포트 작업 등록 |
| delete | `DELETE /stat-reports` | 리포트 작업 삭제 |
| delete (by id) | `DELETE /stat-reports/{reportJobId}` | 특정 리포트 작업 삭제 |

### 19. Stat (통계)
다양한 엔티티의 통계 데이터

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| get (by id) | `GET /stats?id={id}&fields={fields}&timeRange={range}&datePreset={preset}&timeIncrement={increment}&breakdown={breakdown}` | 단일 엔티티 통계 조회 |
| get (by ids) | `GET /stats?ids={ids}&fields={fields}&timeRange={range}&datePreset={preset}&timeIncrement={increment}&breakdown={breakdown}` | 다수 엔티티 통계 조회 |
| get (by type) | `GET /stats?id={id}&statType={type}` | 통계 유형별 커스텀 리포트 |

### 20. MasterReport (마스터 리포트)

대량 데이터 리포트

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /master-reports` | 최근 생성된 마스터 리포트 목록 (최대 100개) |
| get | `GET /master-reports/{id}` | 특정 마스터 리포트 상세 조회 |
| create | `POST /master-reports` | 마스터 리포트 작업 생성 |
| delete all | `DELETE /master-reports` | 모든 마스터 리포트 삭제 |
| delete | `DELETE /master-reports/{id}` | 특정 마스터 리포트 삭제 |

### 21. RelKwdStat (연관 키워드 통계)
연관 키워드 및 통계 지표

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| list | `GET /keywordstool` | 연관 키워드 및 통계 지표 조회 |

파라미터 조합 (최소 1개 필수):
- `businessId`: 비즈니스 ID
- `nccBusinessChannelId`: NCC 비즈니스 채널 ID  
- `hintKeywords`: 힌트 키워드
- `season`: 시즌
- `eventId`: 이벤트 ID

### 22. Estimate (예상 비용)
입찰가 및 성과 예측

| Method | HTTP Request | Description |
|--------|-------------|-------------|
| average position bid | `POST /estimate/average-position-bid/{type}` | 평균 노출 위치별 예상 입찰가 |
| median bid | `POST /estimate/median-bid/{type}` | 중간 입찰가 예측 |
| exposure minimum bid | `POST /estimate/exposure-minimum-bid/{type}` | 최소 노출 입찰가 예측 |
| performance | `POST /estimate/performance/{type}` | 예상 입찰가별 성과 예측 |
| performance-bulk | `POST /estimate/performance-bulk` | 키워드별 대량 성과 예측 |
| NPLA average bid | `POST /npla-estimate/average-position-bid/{type}` | NPLA 평균 위치 입찰가 |
| NPLA minimum bid | `POST /npla-estimate/exposure-minimum-bid/{type}` | NPLA 최소 노출 입찰가 |
| NPC average bid | `POST /npc-estimate/average-position-bid/{type}` | NPC 평균 위치 입찰가 |
| NPC minimum bid | `POST /npc-estimate/exposure-minimum-bid/{type}` | NPC 최소 노출 입찰가 |
| NPC performance | `POST /npc-estimate/performance` | NPC 키워드별 성과 예측 |

---

## 키워드 성과 데이터 조회 방법 (2025년 1월 검증)

### ⚠️ 중요 제약사항
1. **키워드 API는 설정값만 제공**: `/ncc/keywords` API는 키워드 설정(입찰가, 상태 등)만 제공하고 성과 데이터(노출수, 클릭수 등)는 제공하지 않음
2. **직접 통계 API 없음**: 키워드에 대한 직접적인 통계 조회 엔드포인트가 없음
3. **리포트 API 필수**: 키워드 성과 데이터는 반드시 StatReport 또는 MasterReport를 통해서만 조회 가능

### 방법 1: StatReport API (권장하지 않음 - 오류 발생)
```javascript
// ❌ 오류 발생: Error 11001 - 잘못된 파라미터 형식
// 2025년 1월 기준 POST /stat-reports 엔드포인트가 제대로 작동하지 않음
{
  "reportTp": "KEYWORD",  // KEYWORD 타입으로 키워드 데이터 요청
  "dateRange": {
    "since": "20250801",    // YYYYMMDD 형식 (하이픈 없음)
    "until": "20250831"     // YYYYMMDD 형식 (하이픈 없음)
  }
}

// 기존 리포트가 있다면 사용 가능
GET /stat-reports/{reportJobId}
// TSV 형식 다운로드 후 파싱
// 컬럼: [0]=Date, [4]=KeywordID, [9]=Clicks, [11]=Cost, [12]=Impressions
```

### 방법 2: MasterReport API (작동 확인 ✅)
```javascript
// ✅ 성공적으로 작동
POST /master-reports
{
  "item": "Keyword",          // "Keyword"로 설정 (대소문자 구분)
  "fromTime": "2025-08-01",   // YYYY-MM-DD 형식
  "toTime": "2025-08-31"      // YYYY-MM-DD 형식
}

// Response
{
  "id": "af1094a7e6cfeeebd22108e4b764f365",
  "status": "REGIST",         // REGIST -> RUNNING -> COMPLETED
  "downloadUrl": ""           // 완료 시 다운로드 URL 제공
}

// 상태 확인
GET /master-reports/{id}
```

### 방법 3: 기존 AD Report 활용 (임시 해결책)
```javascript
// AD 타입 리포트에도 키워드 성과 데이터가 포함됨
// 기존 리포트 목록 조회
GET /stat-reports

// AD 타입 리포트 필터링
const adReports = reports.filter(r => 
  r.reportTp === 'AD' && 
  r.status === 'BUILT' && 
  r.downloadUrl
)

// TSV 다운로드 후 키워드 데이터 추출
```

## StatReport API 상세 구현
```javascript
// Request Body (현재 오류 발생 중)
{
  "reportTp": "CAMPAIGN",  // CAMPAIGN, ADGROUP, KEYWORD, AD, AD_EXTENSION
  "statDt": "2024-08-01",
  "dateRange": {
    "since": "20240801",    // YYYYMMDD 형식 (하이픈 없음)
    "until": "20240831"     // YYYYMMDD 형식 (하이픈 없음)
  },
  "ids": ["cmp-xxx", "cmp-yyy"],  // 선택: 특정 ID만 조회
  "dataPreset": ["impCnt", "clkCnt", "ctr", "cpc", "ccnt", "salesAmt"],
  "timeIncrement": "1",        // 1: 일별, 7: 주별, month: 월별, allDays: 전체
  "breakdown": "hh24"          // 시간대별 상세
```

#### GET /api/stat-reports/{reportJobId}
보고서 생성 상태 확인
```javascript
// Response
{
  "reportJobId": "job-xxxxx",
  "status": "COMPLETED",         // RUNNING, COMPLETED, FAILED
  "downloadUrl": "https://..."   // 완료 시 다운로드 URL
}
```

#### GET /api/stat-reports/download/{reportJobId}
보고서 다운로드

---

---

## 데이터 구조 상세

### Campaign Object
```json
{
  "nccCampaignId": "cmp-xxxxx",
  "customerId": 123456,
  "name": "캠페인명",
  "userLock": false,
  "campaignTp": "WEB_SITE",  // WEB_SITE, SHOPPING, POWER_CONTENTS, PLACE
  "deliveryMethod": "STANDARD",  // STANDARD, ACCELERATED
  "status": "ELIGIBLE",  // ELIGIBLE, PAUSED, DELETED
  "statusReason": "string",
  "dailyBudget": 10000,
  "useDailyBudget": true,
  "totalChargeCost": 0,
  "period": {
    "since": "2024-01-01",
    "until": "2024-12-31"
  },
  "regDt": "2024-01-01T00:00:00.000Z",
  "editDt": "2024-01-01T00:00:00.000Z"
}

### AdGroup Object
```javascript
{
  "nccAdgroupId": "grp-xxxxx",
  "nccCampaignId": "cmp-xxxxx",
  "customerId": 123456,
  "name": "광고그룹명",
  "userLock": false,
  "status": "ELIGIBLE",
  "statusReason": "string",
  "bidAmt": 100,
  "dailyBudget": 10000,
  "useDailyBudget": false,
  "useKeywordPlus": true,
  "keywordPlusWeight": 100,
  "contentsNetworkBidAmt": 100,
  "useCntsNetworkBidAmt": false,
  "mobileChannelId": "string",
  "pcChannelId": "string",
  "schedule": {},
  "targets": [],
  "regDt": "2024-01-01T00:00:00.000Z",
  "editDt": "2024-01-01T00:00:00.000Z"
}
```

### Keyword Object
```json
{
  "nccKeywordId": "kwd-xxxxx",
  "nccAdgroupId": "grp-xxxxx",
  "customerId": 123456,
  "keyword": "키워드",
  "userLock": false,
  "bidAmt": 100,
  "useGroupBidAmt": false,
  "status": "ELIGIBLE",
  "statusReason": "string",
  "qualityIndex": 10,
  "links": {},
  "regDt": "2024-01-01T00:00:00.000Z",
  "editDt": "2024-01-01T00:00:00.000Z"
}
```

### Ad Object
```json
{
  "nccAdId": "ad-xxxxx",
  "nccAdgroupId": "grp-xxxxx",
  "customerId": 123456,
  "userLock": false,
  "status": "ELIGIBLE",
  "statusReason": "string",
  "ad": {
    "headline": "광고 제목",
    "description": "광고 설명",
    "pc": {
      "url": "https://example.com"
    },
    "mobile": {
      "url": "https://m.example.com"
    }
  },
  "regDt": "2024-01-01T00:00:00.000Z",
  "editDt": "2024-01-01T00:00:00.000Z"
}
```

### StatReport Response Object
```json
{
  "id": "string",              // 엔티티 ID (캠페인/광고그룹/키워드 등)
  "customerId": 123456,
  "reportTp": "CAMPAIGN",
  "statDt": "2024-08-01",
  "impCnt": 1000,               // 노출수
  "clkCnt": 50,                 // 클릭수  
  "ctr": 5.0,                   // 클릭률 (%)
  "cpc": 100.0,                 // 평균 클릭 비용
  "avgDepth": 2.5,              // 평균 체류 깊이
  "avgRnk": 3.2,                // 평균 노출 순위
  "ccnt": 10,                   // 전환수
  "viewCnt": 500,               // 조회수
  "salesAmt": 50000             // 총 비용
}

---

## 베스트 프랙티스

### 1. API 호출 최적화
- 벌크 작업 활용 (키워드 일괄 생성/수정/삭제)
- 필요한 필드만 요청 (fields 파라미터 활용)
- 페이징 처리로 대량 데이터 관리
- 캐싱으로 반복 호출 최소화

### 2. 에러 처리
- 재시도 로직 구현 (exponential backoff)
- 에러 코드별 적절한 처리
- 상세 에러 로그 기록
- Rate limiting 고려 (초당 10 요청)

### 3. 날짜 처리 주의사항
- StatReport API: `dateRange`에는 YYYYMMDD 형식 (하이픈 없음)
- 일반 API: YYYY-MM-DD 형식 (하이픈 포함)
- 모든 시간은 KST (한국 표준시) 기준

### 4. 상태 관리
- `ELIGIBLE`: 활성/운영중
- `PAUSED`: 일시정지  
- `DELETED`: 삭제됨
- `userLock: true`: 사용자가 OFF 설정
- `userLock: false`: 사용자가 ON 설정

### 5. 제외 키워드 타입
- `KEYWORD_PLUS_RESTRICT`: 확장 제외
- `PHRASE_KEYWORD_RESTRICT`: 구문 제외
- `EXACT_KEYWORD_RESTRICT`: 정확 제외

---

## 오류 코드

### 일반 오류
| 코드 | 설명 | 해결 방법 |
|------|------|----------|
| 400 | Bad Request | 요청 파라미터 확인 |
| 401 | Unauthorized | 인증 헤더 확인 |
| 403 | Forbidden | 권한 확인 |
| 404 | Not Found | 리소스 ID 확인 |
| 500 | Internal Server Error | 네이버 API 서버 문제 |

### 네이버 API 특정 오류
| 코드 | 설명 | 해결 방법 |
|------|------|----------|
| 1001 | 잘못된 요청 | 요청 형식 확인 |
| 1002 | 잘못된 파라미터 | 파라미터 값 확인 |
| 1018 | 권한 없음 | Customer ID와 리소스 소유권 확인 |
| 11001 | 잘못된 파라미터 형식 | 날짜 형식 등 파라미터 형식 확인 |

---

## 구현 가이드

### 1. API 클라이언트 초기화
```javascript
class NaverAdsAPI {
  constructor(config) {
    this.accessKey = config.accessKey
    this.secretKey = config.secretKey
    this.customerId = config.customerId
    this.baseURL = 'https://api.searchad.naver.com'
  }

  getAuthHeaders(method, uri) {
    const timestamp = Date.now().toString()
    const message = `${timestamp}.${method}.${uri}`
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64')

    return {
      'X-Customer': this.customerId,
      'X-API-KEY': this.accessKey,
      'X-Signature': signature,
      'X-Timestamp': timestamp,
      'Content-Type': 'application/json'
    }
  }
}
```

### 2. 캠페인 생성 예제
```javascript
async createCampaign(data) {
  const uri = '/api/campaigns'
  const response = await axios.post(
    `${this.baseURL}${uri}`,
    data,
    { headers: this.getAuthHeaders('POST', uri) }
  )
  return response.data
}
```

### 3. 통계 조회 예제 (올바른 방식)
```javascript
async getStats(params) {
  const uri = '/api/stat-reports'
  
  // 날짜 형식 변환 (YYYY-MM-DD 유지)
  const requestData = {
    reportTp: params.reportTp,
    start: params.start,        // "2024-08-01" 형식
    end: params.end,            // "2024-08-31" 형식
    ids: params.ids,
    timeIncrement: params.timeIncrement || 'allDays'
  }
  
  const response = await axios.get(
    `${this.baseURL}${uri}`,
    {
      params: requestData,
      headers: this.getAuthHeaders('GET', uri)
    }
  )
  return response.data
}
```

### 4. 제외 키워드 관리
```javascript
// 조회
async getRestrictedKeywords(adgroupId, type) {
  const uri = `/api/adgroups/${adgroupId}/restricted-keywords`
  const params = type ? { type } : {}
  
  const response = await axios.get(
    `${this.baseURL}${uri}`,
    {
      params,
      headers: this.getAuthHeaders('GET', uri)
    }
  )
  return response.data
}

// 추가
async createRestrictedKeywords(adgroupId, keywords) {
  const uri = `/api/adgroups/${adgroupId}/restricted-keywords`
  
  const response = await axios.post(
    `${this.baseURL}${uri}`,
    { restrictedKeywords: keywords },
    { headers: this.getAuthHeaders('POST', uri) }
  )
  return response.data
}

// 삭제
async deleteRestrictedKeywords(adgroupId, keywordIds) {
  const uri = `/api/adgroups/${adgroupId}/restricted-keywords`
  const params = { restrictedKeywordIds: keywordIds.join(',') }
  
  const response = await axios.delete(
    `${this.baseURL}${uri}`,
    {
      params,
      headers: this.getAuthHeaders('DELETE', uri)
    }
  )
  return response.data
}
```

---

## 중요 참고사항

### 1. API 제한
- 초당 요청 수: 10 requests/second
- 일일 요청 수: 100,000 requests/day
- 응답 크기: 최대 10MB
- 타임아웃: 30초

### 2. 날짜/시간 처리
- 모든 날짜는 KST (한국 표준시) 기준
- 날짜 형식: YYYY-MM-DD (하이픈 필수)
- 시간 형식: YYYY-MM-DDTHH:mm:ss.sssZ (ISO 8601)

### 3. 페이징
- 기본 페이지 크기: 100
- 최대 페이지 크기: 1000
- baseSearchId 사용하여 다음 페이지 조회

### 4. 벌크 작업
- 키워드 일괄 생성: 최대 100개
- 키워드 일괄 수정: 최대 100개
- 키워드 일괄 삭제: 최대 100개

### 5. 상태 값
```javascript
// 캠페인/광고그룹/키워드/광고 상태
ELIGIBLE    // 활성 (운영중)
PAUSED      // 일시중지
DELETED     // 삭제됨

// 검토 상태
UNDER_REVIEW    // 검토중
APPROVED        // 승인
DISAPPROVED     // 거부
```

### 6. 캠페인 타입
```javascript
WEB_SITE        // 파워링크 (웹사이트)
SHOPPING        // 쇼핑
POWER_CONTENTS  // 파워컨텐츠
PLACE           // 플레이스 (지역)
```

---

## 문제 해결 가이드

### 문제 1: code 11001 - 잘못된 파라미터 형식
**원인**: 날짜 형식이 잘못됨
**해결**: 
```javascript
// ❌ 잘못된 예
"20240801"  // 하이픈 없음

// ✅ 올바른 예
"2024-08-01"  // 하이픈 포함
```

### 문제 2: code 1018 - 권한 없음
**원인**: Customer ID가 리소스 소유자와 다름
**해결**: 
- Customer ID 확인
- API 키와 Secret 키 확인
- 리소스 소유권 확인

### 문제 3: 통계 데이터가 0으로 표시
**원인**: 
- 날짜 범위에 데이터가 없음
- 광고가 실제로 노출되지 않음
- API 호출 형식 오류

**해결**:
1. 날짜 범위를 실제 광고가 운영된 기간으로 설정
2. 광고 상태가 ELIGIBLE인지 확인
3. API 호출 형식 확인

---

## 결론
네이버 검색광고 API는 복잡하지만 체계적입니다. 특히 날짜 형식과 인증 헤더 생성에 주의해야 합니다. 위 가이드를 따르면 대부분의 API 호출이 성공할 것입니다.

마지막 업데이트: 2025-01-06