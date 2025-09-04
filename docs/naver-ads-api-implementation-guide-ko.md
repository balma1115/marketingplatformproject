# 네이버 광고 API 구현 가이드 (한글판)

*최종 업데이트: 2025년 1월*

## 📋 목차
1. [개요](#개요)
2. [구현 대상 광고 유형](#구현-대상-광고-유형)
3. [API 인증 구현](#api-인증-구현)
4. [순차적 구현 체크리스트](#순차적-구현-체크리스트)
5. [API 엔드포인트별 상세 명세](#api-엔드포인트별-상세-명세)
6. [테스트 시나리오](#테스트-시나리오)
7. [구현 코드 예제](#구현-코드-예제)

## 🎯 개요

네이버 광고 API는 제한적이지만 특정 광고 유형에 대해서는 완전한 자동화가 가능합니다. 본 문서는 실제 구현 가능한 기능만을 다루며, 각 단계별 테스트를 통해 검증된 내용만을 포함합니다.

### 구현 범위
- ✅ **파워링크** (PowerLink) - 키워드 검색광고
- ⚠️ **파워콘텐츠** (Power Contents) - 콘텐츠 광고 (제한적)
- ❌ **플레이스** (Place) - 지역 광고 (API 미지원, 수동 설정 필요)
- ❌ ~~쇼핑검색~~ (제외)
- ❌ ~~브랜드검색~~ (제외)

### 중요 사실
**플레이스 광고는 API로 생성/관리가 불가능합니다.** 반드시 네이버 광고 관리자에서 수동으로 설정해야 하며, 사업자 인증이 필요합니다.

## 🔧 구현 대상 광고 유형

### 1. 파워링크 (PowerLink) - 완전 지원 ✅

**설명**: 네이버 검색 결과에 노출되는 키워드 기반 광고

**API 지원 범위**:
- 캠페인 CRUD ✅
- 광고그룹 CRUD ✅
- 키워드 CRUD ✅
- 광고 소재 CRUD ✅
- 성과 리포트 ✅

**필수 요구사항**:
```javascript
{
  "최소_일예산": 5000,        // 5,000원
  "최소_키워드_입찰가": 70,    // 70원
  "최대_키워드_입찰가": 100000, // 100,000원
  "광고_제목_길이": 15,        // 15자 이내
  "광고_설명_길이": 45         // 45자 이내
}
```

### 2. 파워콘텐츠 (Power Contents) - 제한적 지원 ⚠️

**설명**: 네이버 블로그, 카페 등 콘텐츠 영역에 노출되는 광고

**API 지원 범위**:
- 캠페인 조회 ✅
- 예산 수정 ✅
- 광고 소재 생성 ❌ (수동 업로드 필요)
- 타겟팅 설정 ❌ (UI에서 설정)

**제한사항**:
- 이미지/동영상 소재는 UI에서 직접 업로드
- 상세 타겟팅은 UI에서만 설정 가능
- API로는 기본적인 관리만 가능

### 3. 플레이스 (Place) - API 미지원 ❌

**설명**: 네이버 지도/플레이스에 노출되는 지역 기반 광고

**현실**:
- **API로 생성 불가**
- **사업자 등록증 인증 필수**
- **네이버 플레이스 등록 필수**
- **모든 설정 수동 진행**

**대안 구현**:
```javascript
// 플레이스 광고는 UI 안내만 제공
const placeAdGuidance = {
  message: "플레이스 광고는 네이버 광고 관리자에서 직접 설정하세요",
  steps: [
    "1. 네이버 플레이스에 업체 등록",
    "2. 사업자 인증 완료",
    "3. 광고 관리자에서 플레이스 광고 신청",
    "4. 지역 및 카테고리 설정"
  ],
  url: "https://searchad.naver.com"
}
```

## 🔐 API 인증 구현

### 필수 자격 증명
```javascript
const credentials = {
  accessKey: "0100000000:XXXXXXXXXX",    // API 관리자에서 발급
  secretKey: "YYYYYYYYYYYYYYYYYYYYYYYY",  // API 관리자에서 발급
  customerId: "1234567"                   // 광고주 ID
}
```

### HMAC-SHA256 서명 생성
```javascript
import crypto from 'crypto'

function generateSignature(method, uri, timestamp, accessKey, customerId, secretKey) {
  const stringToSign = `${method}\n${uri}\n${timestamp}\n${accessKey}\n${customerId}`
  
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(stringToSign)
    .digest('base64')
  
  return signature
}

// 요청 헤더 구성
function getRequestHeaders() {
  const timestamp = Date.now().toString()
  const signature = generateSignature(
    'GET',
    '/ncc/campaigns',
    timestamp,
    credentials.accessKey,
    credentials.customerId,
    credentials.secretKey
  )
  
  return {
    'X-Timestamp': timestamp,
    'X-API-KEY': credentials.accessKey,
    'X-Customer': credentials.customerId,
    'X-Signature': signature,
    'Content-Type': 'application/json'
  }
}
```

## 📝 순차적 구현 체크리스트

### Phase 1: 기본 설정 (1주차)
- [ ] API 자격 증명 저장 시스템 구현
- [ ] HMAC-SHA256 서명 생성 함수 구현
- [ ] API 클라이언트 기본 구조 생성
- [ ] 에러 핸들링 시스템 구축
- [ ] 인증 테스트 완료

### Phase 2: 파워링크 캠페인 관리 (2주차)

#### 2-1. 캠페인 CRUD
- [ ] **CREATE**: 캠페인 생성
  ```javascript
  POST /ncc/campaigns
  필수: name, campaignTp(WEB_SITE), customerId
  선택: dailyBudget, period, deliveryMethod
  ```
- [ ] **READ**: 캠페인 목록 조회
  ```javascript
  GET /ncc/campaigns?customerId={customerId}
  ```
- [ ] **UPDATE**: 캠페인 수정
  ```javascript
  PUT /ncc/campaigns/{campaignId}
  수정가능: name, dailyBudget, period, status
  ```
- [ ] **DELETE**: 캠페인 삭제
  ```javascript
  DELETE /ncc/campaigns/{campaignId}
  ```

#### 2-2. 광고그룹 CRUD
- [ ] **CREATE**: 광고그룹 생성
  ```javascript
  POST /ncc/adgroups
  필수: campaignId, name, pcNetworkBidAmt, mobileNetworkBidAmt
  선택: dailyBudget, useDailyBudget
  ```
- [ ] **READ**: 광고그룹 조회
  ```javascript
  GET /ncc/adgroups?campaignId={campaignId}
  ```
- [ ] **UPDATE**: 광고그룹 수정
  ```javascript
  PUT /ncc/adgroups/{adgroupId}
  수정가능: name, dailyBudget, bidAmt, status
  ```
- [ ] **DELETE**: 광고그룹 삭제
  ```javascript
  DELETE /ncc/adgroups/{adgroupId}
  ```

#### 2-3. 키워드 CRUD
- [ ] **CREATE**: 키워드 추가
  ```javascript
  POST /ncc/keywords
  필수: nccAdgroupId, keyword, bidAmt
  선택: useGroupBidAmt
  최소입찰가: 70원
  ```
- [ ] **READ**: 키워드 조회
  ```javascript
  GET /ncc/keywords?nccAdgroupId={adgroupId}
  ```
- [ ] **UPDATE**: 키워드 입찰가 수정
  ```javascript
  PUT /ncc/keywords
  수정가능: bidAmt, useGroupBidAmt, userLock
  ```
- [ ] **DELETE**: 키워드 삭제
  ```javascript
  DELETE /ncc/keywords?nccKeywordIds={id1,id2}
  ```

#### 2-4. 광고 소재 CRUD
- [ ] **CREATE**: 텍스트 광고 생성
  ```javascript
  POST /ncc/ads
  필수: nccAdgroupId, type(TEXT_45), headline(15자), description(45자)
  필수: pc.final, mobile.final (랜딩 URL)
  ```
- [ ] **READ**: 광고 조회
  ```javascript
  GET /ncc/ads?nccAdgroupId={adgroupId}
  ```
- [ ] **UPDATE**: 광고 수정
  ```javascript
  PUT /ncc/ads/{adId}
  수정가능: userLock, inspectStatus
  ```
- [ ] **DELETE**: 광고 삭제
  ```javascript
  DELETE /ncc/ads/{adId}
  ```

### Phase 3: 파워콘텐츠 관리 (3주차)
- [ ] 기존 파워콘텐츠 캠페인 조회
- [ ] 예산 수정 기능
- [ ] 성과 리포트 조회
- [ ] UI 안내 메시지 (소재 업로드는 관리자에서)

### Phase 4: 리포팅 시스템 (4주차)
- [ ] 캠페인별 성과 데이터 수집
- [ ] 키워드별 성과 분석
- [ ] 일별/주별/월별 리포트
- [ ] 데이터 시각화 대시보드

## 🔍 API 엔드포인트별 상세 명세

### 캠페인 생성 (파워링크)

**엔드포인트**: `POST /ncc/campaigns`

**필수 파라미터**:
```javascript
{
  "campaignTp": "WEB_SITE",        // 고정값 (파워링크)
  "name": "캠페인명",               // 캠페인 이름
  "customerId": 1234567            // 광고주 ID
}
```

**선택 파라미터**:
```javascript
{
  "dailyBudget": 10000,            // 일 예산 (원)
  "useDailyBudget": true,          // 일 예산 사용 여부
  "deliveryMethod": "STANDARD",    // STANDARD | ACCELERATED
  "period": {                      // 캠페인 기간
    "since": "2025-01-01",
    "until": "2025-12-31"
  },
  "trackingMode": "TRACKING_DISABLED", // TRACKING_DISABLED | CONVERSION_TRACKING
  "trackingUrl": "https://..."     // 추적 URL (trackingMode가 CONVERSION_TRACKING일 때)
}
```

**응답 예시**:
```javascript
{
  "nccCampaignId": "cmp-xxxxx",
  "customerId": 1234567,
  "name": "캠페인명",
  "campaignTp": "WEB_SITE",
  "dailyBudget": 10000,
  "status": "ENABLED",
  "regTm": "2025-01-01T00:00:00Z",
  "editTm": "2025-01-01T00:00:00Z"
}
```

### 광고그룹 생성

**엔드포인트**: `POST /ncc/adgroups`

**필수 파라미터**:
```javascript
{
  "campaignId": "cmp-xxxxx",       // 캠페인 ID
  "name": "광고그룹명",              // 광고그룹 이름
  "pcNetworkBidAmt": 100,          // PC 네트워크 기본 입찰가
  "mobileNetworkBidAmt": 120       // 모바일 네트워크 기본 입찰가
}
```

**선택 파라미터**:
```javascript
{
  "dailyBudget": 5000,              // 일 예산
  "useDailyBudget": true,           // 일 예산 사용 여부
  "contentsNetworkBidAmt": 80,     // 콘텐츠 네트워크 입찰가
  "useCntsNetworkBidAmt": true,    // 콘텐츠 네트워크 사용 여부
  "targets": {                      // 타겟팅 설정
    "pc": true,
    "mobile": true,
    "time": {                       // 시간 타겟팅
      "monday": [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],
      "tuesday": [9,10,11,12,13,14,15,16,17,18,19,20,21]
    },
    "region": ["서울", "경기"]      // 지역 타겟팅
  }
}
```

### 키워드 추가

**엔드포인트**: `POST /ncc/keywords`

**필수 파라미터**:
```javascript
{
  "nccAdgroupId": "adg-xxxxx",     // 광고그룹 ID
  "keywords": [
    {
      "keyword": "영어학원",        // 키워드
      "bidAmt": 150                // 입찰가 (최소 70원)
    },
    {
      "keyword": "토익학원",
      "bidAmt": 200
    }
  ]
}
```

**입찰가 제한**:
- 최소: 70원
- 최대: 100,000원
- 10원 단위로 설정

### 광고 소재 생성

**엔드포인트**: `POST /ncc/ads`

**필수 파라미터**:
```javascript
{
  "nccAdgroupId": "adg-xxxxx",     // 광고그룹 ID
  "type": "TEXT_45",                // 광고 유형
  "ad": {
    "headline": "최고의 영어학원",    // 제목 (15자 이내)
    "description": "원어민 강사와 함께하는 체계적인 영어교육 프로그램", // 설명 (45자 이내)
    "pc": {
      "final": "https://example.com/landing"     // PC 랜딩 URL
    },
    "mobile": {
      "final": "https://m.example.com/landing"   // 모바일 랜딩 URL
    }
  }
}
```

**문자 제한**:
- 제목: 공백 포함 15자
- 설명: 공백 포함 45자
- 특수문자 제한 있음
- 금지어 검사 통과 필요

## 🧪 테스트 시나리오

### 1단계: 인증 테스트
```javascript
// 1. 잘못된 서명으로 요청
// 예상: 401 Unauthorized

// 2. 올바른 서명으로 요청  
// 예상: 200 OK

// 3. 존재하지 않는 customerId
// 예상: 403 Forbidden
```

### 2단계: 캠페인 CRUD 테스트
```javascript
// CREATE 테스트
const testCampaign = {
  campaignTp: "WEB_SITE",
  name: "테스트_캠페인_" + Date.now(),
  customerId: credentials.customerId,
  dailyBudget: 5000
}

// 1. 필수 파라미터만으로 생성
// 2. 모든 선택 파라미터 포함하여 생성
// 3. 잘못된 campaignTp로 생성 시도 (에러 확인)
// 4. 예산 0원으로 생성 시도 (에러 확인)

// READ 테스트
// 1. 전체 캠페인 목록 조회
// 2. 특정 캠페인 상세 조회
// 3. 존재하지 않는 캠페인 조회 (404 확인)

// UPDATE 테스트
// 1. 캠페인명 변경
// 2. 일 예산 변경
// 3. 상태 변경 (ENABLED → PAUSED)
// 4. 읽기 전용 필드 변경 시도 (에러 확인)

// DELETE 테스트
// 1. 빈 캠페인 삭제
// 2. 광고그룹이 있는 캠페인 삭제 시도 (에러 확인)
// 3. 이미 삭제된 캠페인 재삭제 시도 (에러 확인)
```

### 3단계: 광고그룹 CRUD 테스트
```javascript
// CREATE 테스트
const testAdgroup = {
  campaignId: "cmp-xxxxx",
  name: "테스트_광고그룹_" + Date.now(),
  pcNetworkBidAmt: 100,
  mobileNetworkBidAmt: 120
}

// 1. 필수 파라미터만으로 생성
// 2. 타겟팅 설정 포함하여 생성
// 3. 입찰가 70원 미만으로 생성 시도 (에러 확인)
// 4. 존재하지 않는 캠페인에 생성 시도 (에러 확인)
```

### 4단계: 키워드 CRUD 테스트
```javascript
// CREATE 테스트
const testKeywords = [
  { keyword: "영어학원", bidAmt: 150 },
  { keyword: "토익학원", bidAmt: 200 },
  { keyword: "영어회화", bidAmt: 100 }
]

// 1. 단일 키워드 추가
// 2. 벌크 키워드 추가 (최대 100개)
// 3. 중복 키워드 추가 시도 (에러 확인)
// 4. 입찰가 70원 미만 시도 (에러 확인)
// 5. 입찰가 100,000원 초과 시도 (에러 확인)

// UPDATE 테스트
// 1. 입찰가 수정 (70원 → 150원)
// 2. 벌크 입찰가 수정
// 3. 일시정지/활성화 전환

// DELETE 테스트
// 1. 단일 키워드 삭제
// 2. 벌크 키워드 삭제
```

### 5단계: 광고 소재 CRUD 테스트
```javascript
// CREATE 테스트
const testAd = {
  nccAdgroupId: "adg-xxxxx",
  type: "TEXT_45",
  ad: {
    headline: "영어실력 향상",        // 15자 이내
    description: "체계적 커리큘럼으로 확실한 영어실력 향상 보장",  // 45자 이내
    pc: { final: "https://example.com" },
    mobile: { final: "https://m.example.com" }
  }
}

// 1. 정상 광고 생성
// 2. 제목 15자 초과 시도 (에러 확인)
// 3. 설명 45자 초과 시도 (에러 확인)
// 4. URL 형식 오류 시도 (에러 확인)
// 5. 금지어 포함 시도 (에러 확인)
```

## 💻 구현 코드 예제

### NaverAdsAPI 클래스 구조
```javascript
class NaverAdsAPI {
  constructor(credentials) {
    this.accessKey = credentials.accessKey
    this.secretKey = credentials.secretKey
    this.customerId = credentials.customerId
    this.baseURL = 'https://api.searchad.naver.com'
  }

  // 서명 생성
  generateSignature(method, uri, timestamp) {
    const stringToSign = `${method}\n${uri}\n${timestamp}\n${this.accessKey}\n${this.customerId}`
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('base64')
  }

  // 요청 헤더 생성
  getHeaders(method, uri) {
    const timestamp = Date.now().toString()
    return {
      'X-Timestamp': timestamp,
      'X-API-KEY': this.accessKey,
      'X-Customer': this.customerId,
      'X-Signature': this.generateSignature(method, uri, timestamp),
      'Content-Type': 'application/json'
    }
  }

  // 파워링크 캠페인 생성
  async createPowerLinkCampaign(data) {
    const uri = '/ncc/campaigns'
    const headers = this.getHeaders('POST', uri)
    
    const body = {
      campaignTp: 'WEB_SITE',
      customerId: this.customerId,
      ...data
    }

    const response = await fetch(`${this.baseURL}${uri}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`캠페인 생성 실패: ${error}`)
    }

    return response.json()
  }

  // 광고그룹 생성
  async createAdGroup(campaignId, data) {
    const uri = '/ncc/adgroups'
    const headers = this.getHeaders('POST', uri)
    
    const body = {
      campaignId,
      pcNetworkBidAmt: 100,
      mobileNetworkBidAmt: 120,
      ...data
    }

    const response = await fetch(`${this.baseURL}${uri}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`광고그룹 생성 실패: ${error}`)
    }

    return response.json()
  }

  // 키워드 추가
  async addKeywords(adgroupId, keywords) {
    const uri = '/ncc/keywords'
    const headers = this.getHeaders('POST', uri)
    
    // 입찰가 검증
    keywords.forEach(kw => {
      if (kw.bidAmt < 70) {
        throw new Error(`최소 입찰가는 70원입니다: ${kw.keyword}`)
      }
      if (kw.bidAmt > 100000) {
        throw new Error(`최대 입찰가는 100,000원입니다: ${kw.keyword}`)
      }
    })

    const body = {
      nccAdgroupId: adgroupId,
      keywords
    }

    const response = await fetch(`${this.baseURL}${uri}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`키워드 추가 실패: ${error}`)
    }

    return response.json()
  }

  // 광고 소재 생성
  async createAd(adgroupId, adData) {
    const uri = '/ncc/ads'
    const headers = this.getHeaders('POST', uri)
    
    // 문자 길이 검증
    if (adData.headline.length > 15) {
      throw new Error('제목은 15자를 초과할 수 없습니다')
    }
    if (adData.description.length > 45) {
      throw new Error('설명은 45자를 초과할 수 없습니다')
    }

    const body = {
      nccAdgroupId: adgroupId,
      type: 'TEXT_45',
      ad: adData
    }

    const response = await fetch(`${this.baseURL}${uri}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`광고 생성 실패: ${error}`)
    }

    return response.json()
  }

  // 캠페인 성과 조회
  async getCampaignStats(campaignId, fromDate, toDate) {
    const uri = `/ncc/stats?campaignId=${campaignId}&fromDate=${fromDate}&toDate=${toDate}`
    const headers = this.getHeaders('GET', uri)
    
    const response = await fetch(`${this.baseURL}${uri}`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`성과 조회 실패: ${error}`)
    }

    return response.json()
  }
}
```

### 파워링크 캠페인 전체 생성 플로우
```javascript
async function createCompletePowerLinkCampaign() {
  const api = new NaverAdsAPI(credentials)
  
  try {
    // 1. 캠페인 생성
    console.log('1단계: 캠페인 생성 중...')
    const campaign = await api.createPowerLinkCampaign({
      name: '2025년 봄학기 영어학원 광고',
      dailyBudget: 10000,
      period: {
        since: '2025-02-01',
        until: '2025-03-31'
      }
    })
    console.log(`✅ 캠페인 생성 완료: ${campaign.nccCampaignId}`)
    
    // 2. 광고그룹 생성
    console.log('2단계: 광고그룹 생성 중...')
    const adgroup = await api.createAdGroup(campaign.nccCampaignId, {
      name: '서울지역_타겟',
      dailyBudget: 5000,
      targets: {
        region: ['서울']
      }
    })
    console.log(`✅ 광고그룹 생성 완료: ${adgroup.nccAdgroupId}`)
    
    // 3. 키워드 추가
    console.log('3단계: 키워드 추가 중...')
    const keywords = await api.addKeywords(adgroup.nccAdgroupId, [
      { keyword: '강남영어학원', bidAmt: 200 },
      { keyword: '토익학원', bidAmt: 150 },
      { keyword: '영어회화학원', bidAmt: 180 }
    ])
    console.log(`✅ ${keywords.length}개 키워드 추가 완료`)
    
    // 4. 광고 소재 생성
    console.log('4단계: 광고 소재 생성 중...')
    const ad = await api.createAd(adgroup.nccAdgroupId, {
      headline: '영어실력 완성',
      description: '검증된 커리큘럼과 우수한 강사진이 함께합니다',
      pc: { final: 'https://example-academy.com' },
      mobile: { final: 'https://m.example-academy.com' }
    })
    console.log(`✅ 광고 생성 완료: ${ad.nccAdId}`)
    
    return {
      campaign,
      adgroup,
      keywords,
      ad
    }
    
  } catch (error) {
    console.error('❌ 캠페인 생성 실패:', error.message)
    throw error
  }
}
```

## 📊 성과 측정 및 최적화

### 주요 성과 지표
```javascript
{
  "impressions": "노출수",
  "clicks": "클릭수",
  "ctr": "클릭률 (clicks/impressions)",
  "cpc": "클릭당비용",
  "cost": "총비용",
  "conversions": "전환수",
  "conversionRate": "전환율",
  "roas": "광고수익률"
}
```

### 키워드 최적화 자동화
```javascript
async function optimizeKeywordBids(adgroupId) {
  const api = new NaverAdsAPI(credentials)
  
  // 1. 키워드별 성과 조회
  const keywords = await api.getKeywordStats(adgroupId)
  
  // 2. 성과 기반 입찰가 조정
  const updates = keywords.map(kw => {
    let newBid = kw.bidAmt
    
    // CTR이 높고 전환율이 좋으면 입찰가 상승
    if (kw.ctr > 0.05 && kw.conversionRate > 0.02) {
      newBid = Math.min(kw.bidAmt * 1.2, 100000)
    }
    // 성과가 나쁘면 입찰가 하락
    else if (kw.ctr < 0.01 || kw.conversionRate < 0.005) {
      newBid = Math.max(kw.bidAmt * 0.8, 70)
    }
    
    return {
      nccKeywordId: kw.nccKeywordId,
      bidAmt: Math.round(newBid / 10) * 10  // 10원 단위
    }
  })
  
  // 3. 입찰가 일괄 업데이트
  await api.updateKeywordBids(updates)
  
  console.log(`✅ ${updates.length}개 키워드 입찰가 최적화 완료`)
}
```

## ⚠️ 주의사항 및 제약사항

### 1. 플레이스 광고 관련
```javascript
// ❌ 불가능: API로 플레이스 광고 생성
// ✅ 대안: 안내 메시지 제공
const showPlaceAdGuide = () => {
  return {
    message: "플레이스 광고는 네이버 광고 관리자에서 직접 설정해주세요",
    requirements: [
      "네이버 플레이스 업체 등록",
      "사업자등록증 인증",
      "광고 관리자에서 수동 설정"
    ],
    url: "https://searchad.naver.com"
  }
}
```

### 2. 파워콘텐츠 광고 관련
```javascript
// ⚠️ 제한적: 기본 관리만 가능
// 소재 업로드, 타겟팅 설정은 UI에서
const powerContentsLimitations = {
  canDo: [
    "캠페인 조회",
    "예산 수정",
    "상태 변경",
    "성과 리포트"
  ],
  cannotDo: [
    "이미지/동영상 업로드",
    "상세 타겟팅 설정",
    "크리에이티브 생성"
  ]
}
```

### 3. API 호출 제한
```javascript
{
  "rateLimit": "초당 10회",
  "maxResults": "페이지당 1000개",
  "timeout": "30초",
  "retryPolicy": "지수 백오프 사용"
}
```

### 4. 문자 및 금액 제한
```javascript
{
  "광고_제목": "15자 (공백 포함)",
  "광고_설명": "45자 (공백 포함)",
  "최소_입찰가": 70,
  "최대_입찰가": 100000,
  "입찰_단위": 10,
  "최소_일예산": 5000
}
```

## 🎯 구현 우선순위

### 1순위 - 즉시 구현 가능
- ✅ 파워링크 캠페인 CRUD
- ✅ 광고그룹 관리
- ✅ 키워드 관리 및 입찰
- ✅ 텍스트 광고 생성
- ✅ 성과 리포팅

### 2순위 - 제한적 구현
- ⚠️ 파워콘텐츠 예산 관리
- ⚠️ 파워콘텐츠 성과 조회

### 3순위 - UI 안내만 제공
- ❌ 플레이스 광고 (수동 설정 안내)
- ❌ 파워콘텐츠 소재 업로드 (관리자 링크 제공)
- ❌ 상세 타겟팅 설정 (관리자 링크 제공)

## 📝 다음 단계

1. **즉시 시작**: 파워링크 API 클라이언트 구현
2. **테스트**: 각 CRUD 작업별 단위 테스트
3. **UI 개발**: 파워링크 중심의 관리 대시보드
4. **최적화**: 자동 입찰 최적화 알고리즘
5. **문서화**: 사용자 가이드 작성

---

**중요**: 이 문서는 실제 네이버 광고 API의 제약사항을 반영한 현실적인 구현 가이드입니다. 플레이스 광고는 API로 관리할 수 없으며, 파워콘텐츠는 매우 제한적입니다. 개발 리소스는 파워링크 광고 자동화에 집중하는 것을 권장합니다.