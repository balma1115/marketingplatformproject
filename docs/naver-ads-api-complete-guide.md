# 네이버 검색광고 API 완전 가이드 (공식 문서 기반)

*최종 업데이트: 2025년 1월*  
*기반 문서: https://naver.github.io/searchad-apidoc*

## 📋 목차
1. [API 개요](#api-개요)
2. [지원 광고 유형](#지원-광고-유형)
3. [파워링크 광고 구현](#파워링크-광고-구현)
4. [플레이스 광고 구현](#플레이스-광고-구현)
5. [파워콘텐츠 광고 구현](#파워콘텐츠-광고-구현)
6. [구현 로드맵](#구현-로드맵)

## 🎯 API 개요

### 기본 정보
```javascript
{
  "baseURL": "https://api.searchad.naver.com",
  "version": "/ncc",
  "authentication": "HMAC-SHA256",
  "contentType": "application/json; charset=UTF-8"
}
```

### 인증 헤더
```javascript
{
  "X-Timestamp": "{timestamp}",
  "X-API-KEY": "{accessKey}",
  "X-Customer": "{customerId}",
  "X-Signature": "{HMAC-SHA256 signature}"
}
```

## 📊 지원 광고 유형

### 1. 캠페인 타입 (campaignTp)
```javascript
enum CampaignType {
  WEB_SITE = "WEB_SITE",           // 파워링크 (검색광고)
  SHOPPING = "SHOPPING",           // 쇼핑검색광고
  BRAND_SEARCH = "BRAND_SEARCH",   // 브랜드검색
  POWER_CONTENTS = "POWER_CONTENTS", // 파워콘텐츠
  PLACE = "PLACE"                  // 플레이스 (플레이스 광고)
}
```

### 2. 광고 확장소재 (AdExtension)
```javascript
enum AdExtensionType {
  PLACE = "PLACE",                 // 플레이스 확장소재
  CALLOUT = "CALLOUT",            // 콜아웃 확장소재
  PRICE_EXTENSION = "PRICE_EXTENSION", // 가격 확장소재
  BIZMSG = "BIZMSG",              // 비즈메시지
  PHONE_NUMBER = "PHONE_NUMBER",  // 전화번호
  PROMOTION = "PROMOTION"          // 프로모션
}
```

### 중요: 플레이스 광고의 두 가지 구현 방식
**플레이스 광고는 두 가지 방식으로 구현 가능합니다:**
1. **독립적인 PLACE 캠페인 타입** - 플레이스 전용 캠페인 생성
2. **파워링크 캠페인의 AdExtension** - 파워링크에 PLACE 확장소재 추가

## 🔍 파워링크 광고 구현

### 1. 캠페인 생성
```javascript
// POST /ncc/campaigns
{
  "campaignTp": "WEB_SITE",
  "name": "파워링크 캠페인",
  "customerId": 1234567,
  "dailyBudget": 10000,              // 선택
  "useDailyBudget": true,            // 선택
  "deliveryMethod": "STANDARD",      // STANDARD | ACCELERATED
  "trackingMode": "TRACKING_DISABLED", // TRACKING_DISABLED | CONVERSION_TRACKING
  "period": {                        // 선택
    "since": "2025-01-01",
    "until": "2025-12-31"
  },
  "status": "ENABLED"                // ENABLED | PAUSED | DELETED
}
```

### 2. 광고그룹 생성
```javascript
// POST /ncc/adgroups
{
  "nccCampaignId": "cmp-xxxxx",
  "name": "광고그룹명",
  "pcChannelKey": "NAVER_SEARCH",    // 검색 채널
  "mobileChannelKey": "NAVER_SEARCH_MOBILE",
  "dailyBudget": 5000,
  "useDailyBudget": true,
  "bidAmt": 100,                     // 기본 입찰가
  "contentsNetworkBidAmt": 80,       // 콘텐츠 네트워크 입찰가
  "useCntsNetworkBidAmt": true,
  "keywordPlusWeight": 100,          // 키워드 확장 가중치
  "targets": {
    "pcDevice": true,
    "mobileDevice": true,
    "schedule": {                     // 시간 타겟팅
      "monday": [9,10,11,12,13,14,15,16,17,18,19,20,21],
      "tuesday": [9,10,11,12,13,14,15,16,17,18,19,20,21]
    },
    "region": {                       // 지역 타겟팅
      "code": ["02", "031"]           // 서울, 경기
    }
  }
}
```

### 3. 키워드 추가
```javascript
// POST /ncc/keywords
{
  "nccAdgroupId": "adg-xxxxx",
  "keywords": [
    {
      "keyword": "영어학원",
      "bidAmt": 150,                  // 최소 70원, 최대 100,000원
      "useGroupBidAmt": false,
      "userLock": false               // true면 자동 최적화 제외
    }
  ]
}
```

### 4. 광고 소재 생성
```javascript
// POST /ncc/ads
{
  "nccAdgroupId": "adg-xxxxx",
  "type": "TEXT_45",                  // TEXT_45 | RSA_AD | TEXT_AD
  "ad": {
    "headline": "최고의 영어학원",      // 15자
    "description": "체계적인 커리큘럼과 우수한 강사진", // 45자
    "pc": {
      "final": "https://example.com",
      "display": "example.com"        // 표시 URL
    },
    "mobile": {
      "final": "https://m.example.com",
      "display": "m.example.com"
    },
    "headline2": "무료 상담 진행중",    // RSA_AD일 경우 추가 제목들
    "headline3": "수준별 맞춤 수업",
    "description2": "원어민 강사와 함께하는 실용 영어"
  },
  "inspectRequestMsg": "심사 요청 메시지", // 선택
  "userLock": false
}
```

### 5. 성과 조회
```javascript
// GET /stats
{
  "id": "cmp-xxxxx",
  "fields": ["impCnt", "clkCnt", "ctr", "cpc", "salesAmt", "convCnt"],
  "timeRange": {
    "since": "2025-01-01",
    "until": "2025-01-31"
  },
  "datePreset": "LAST_7_DAYS",       // 또는 날짜 범위 직접 지정
  "timeIncrement": "allDays",        // allDays | daily | weekly | monthly
  "breakdown": "device"              // device | region | age | gender
}
```

## 🏪 플레이스 광고 구현

### 방법 1: 독립적인 PLACE 캠페인 생성

#### 1. PLACE 캠페인 생성
```javascript
// POST /ncc/campaigns
{
  "campaignTp": "PLACE",              // 플레이스 전용 캠페인
  "name": "플레이스 광고 캠페인",
  "customerId": 1234567,
  "dailyBudget": 30000,
  "useDailyBudget": true,
  "deliveryMethod": "STANDARD",
  "placeChannelKey": "1234567890",    // 네이버 플레이스 ID (필수)
  "period": {
    "since": "2025-01-01",
    "until": "2025-12-31"
  },
  "status": "ENABLED"
}
```

#### 2. PLACE 광고그룹 생성
```javascript
// POST /ncc/adgroups
{
  "nccCampaignId": "cmp-place-xxxxx",
  "name": "플레이스 광고그룹",
  "pcChannelKey": "PLACE",             // 플레이스 채널
  "mobileChannelKey": "PLACE_MOBILE",
  "dailyBudget": 15000,
  "useDailyBudget": true,
  "bidAmt": 150,                       // 기본 입찰가
  "targets": {
    "pcDevice": true,
    "mobileDevice": true,
    "region": {                        // 지역 타겟팅 (중요)
      "code": ["02", "031"]             // 서울, 경기
    }
  }
}
```

#### 3. 플레이스 키워드 추가
```javascript
// POST /ncc/keywords
{
  "nccAdgroupId": "adg-place-xxxxx",
  "keywords": [
    {
      "keyword": "강남역 맛집",           // 지역 + 업종 키워드
      "bidAmt": 200,
      "useGroupBidAmt": false
    },
    {
      "keyword": "강남 파스타",
      "bidAmt": 180
    }
  ]
}
```

#### 4. 플레이스 광고 소재 생성
```javascript
// POST /ncc/ads
{
  "nccAdgroupId": "adg-place-xxxxx",
  "type": "PLACE_AD",                  // 플레이스 광고 타입
  "ad": {
    "placeChannelKey": "1234567890",   // 플레이스 ID
    "headline": "강남 최고의 파스타",    // 광고 제목
    "description": "수제 파스타와 와인이 있는 곳", // 설명
    "businessInfo": {
      "phone": "02-1234-5678",
      "address": "서울 강남구 테헤란로 123",
      "businessHours": "11:00-22:00"
    }
  },
  "userLock": false
}
```

### 방법 2: 파워링크 캠페인에 플레이스 확장소재 추가

#### 1. 플레이스 확장소재 생성
```javascript
// POST /ncc/ad-extensions
{
  "ownerId": "adg-xxxxx",           // 광고그룹 ID
  "type": "PLACE",
  "placeChannelKey": "1234567890",  // 네이버 플레이스 ID
  "schedule": {
    "useSchedule": true,
    "schedule": {
      "monday": {
        "businessHour": [
          { "open": "09:00", "close": "22:00" }
        ]
      },
      "tuesday": {
        "businessHour": [
          { "open": "09:00", "close": "22:00" }
        ]
      }
    }
  },
  "pcChannelKey": "PLACE",
  "mobileChannelKey": "PLACE_MOBILE",
  "status": "ENABLED"
}
```

#### 2. 플레이스 확장소재 조회
```javascript
// GET /ncc/ad-extensions
{
  "ownerId": "adg-xxxxx",
  "type": "PLACE"
}
```

#### 3. 플레이스 정보 업데이트
```javascript
// PUT /ncc/ad-extensions/{adExtensionId}
{
  "schedule": {
    "monday": {
      "businessHour": [
        { "open": "10:00", "close": "21:00" }
      ]
    }
  },
  "status": "PAUSED"
}
```

#### 4. 플레이스 성과 조회
```javascript
// GET /stats
{
  "id": "ext-xxxxx",                // AdExtension ID
  "fields": ["impCnt", "clkCnt", "callCnt", "directionCnt"],
  "timeRange": {
    "since": "2025-01-01",
    "until": "2025-01-31"
  }
}
```

## 📱 파워콘텐츠 광고 구현

### 1. 파워콘텐츠 캠페인 생성
```javascript
// POST /ncc/campaigns
{
  "campaignTp": "POWER_CONTENTS",
  "name": "파워콘텐츠 캠페인",
  "customerId": 1234567,
  "dailyBudget": 20000,
  "deliveryMethod": "STANDARD",
  "targets": {
    "contentNetwork": ["BLOG", "CAFE", "POST"] // 콘텐츠 네트워크 선택
  },
  "status": "ENABLED"
}
```

### 2. 파워콘텐츠 광고그룹 생성
```javascript
// POST /ncc/adgroups
{
  "nccCampaignId": "cmp-xxxxx",
  "name": "파워콘텐츠 광고그룹",
  "adgroupType": "CONTENTS_AD",      // 콘텐츠 광고 타입
  "dailyBudget": 10000,
  "bidStrategy": {
    "type": "MANUAL_CPM",            // MANUAL_CPM | AUTO_CPM | TARGET_CPA
    "bidAmt": 1000                   // CPM 입찰가 (1000 노출당)
  },
  "targets": {
    "age": ["20-29", "30-39"],       // 연령 타겟팅
    "gender": ["MALE", "FEMALE"],    // 성별 타겟팅
    "interest": [                    // 관심사 타겟팅
      "EDUCATION",
      "LANGUAGE_LEARNING"
    ],
    "device": ["PC", "MOBILE"]
  }
}
```

### 3. 파워콘텐츠 소재 생성
```javascript
// POST /ncc/creatives
{
  "nccAdgroupId": "adg-xxxxx",
  "type": "POWER_CONTENTS_AD",
  "format": "IMAGE_BANNER",          // IMAGE_BANNER | VIDEO | NATIVE
  "creative": {
    "title": "영어 실력 향상의 지름길",
    "description": "맞춤형 커리큘럼으로 빠른 실력 향상",
    "image": {
      "url": "https://cdn.example.com/banner.jpg",
      "width": 1200,
      "height": 628
    },
    "landingUrl": "https://example.com/landing",
    "callToAction": "자세히 보기"     // 클릭 유도 문구
  },
  "inspectRequestMsg": "심사 요청합니다",
  "status": "ENABLED"
}
```

### 4. 파워콘텐츠 타겟팅 조회
```javascript
// GET /ncc/targeting-options
{
  "targetingType": "INTEREST"        // INTEREST | AGE | GENDER | REGION
}
```

### 5. 파워콘텐츠 성과 조회
```javascript
// GET /stats
{
  "id": "cmp-xxxxx",
  "fields": ["impCnt", "clkCnt", "ctr", "cpm", "salesAmt"],
  "timeRange": {
    "since": "2025-01-01",
    "until": "2025-01-31"
  },
  "breakdown": "contentNetwork"      // 콘텐츠 네트워크별 성과
}
```

## 📋 구현 로드맵

### Phase 1: 기본 인프라 (1주차)
- [x] HMAC-SHA256 인증 구현
- [ ] API 클라이언트 기본 구조
- [ ] 에러 핸들링 및 재시도 로직
- [ ] Rate Limiting 처리
- [ ] 응답 캐싱 시스템

### Phase 2: 파워링크 광고 (2주차)
#### 캠페인 관리
- [ ] 캠페인 생성 API
- [ ] 캠페인 조회 API
- [ ] 캠페인 수정 API
- [ ] 캠페인 삭제 API
- [ ] 캠페인 일괄 처리

#### 광고그룹 관리
- [ ] 광고그룹 생성 API
- [ ] 광고그룹 조회 API
- [ ] 광고그룹 수정 API
- [ ] 광고그룹 삭제 API
- [ ] 타겟팅 설정 관리

#### 키워드 관리
- [ ] 키워드 추가 API
- [ ] 키워드 조회 API
- [ ] 키워드 입찰가 수정 API
- [ ] 키워드 삭제 API
- [ ] 키워드 품질 지수 조회
- [ ] 부정 키워드 관리

#### 광고 소재 관리
- [ ] TEXT_45 광고 생성
- [ ] RSA_AD (반응형 검색광고) 생성
- [ ] 광고 조회 API
- [ ] 광고 수정 API
- [ ] 광고 삭제 API
- [ ] 광고 심사 상태 관리

### Phase 3: 플레이스 광고 (3주차)
#### 플레이스 연동
- [ ] 네이버 플레이스 ID 검증
- [ ] 플레이스 정보 조회 API
- [ ] 사업자 정보 연동

#### PLACE 캠페인 (독립형)
- [ ] PLACE 타입 캠페인 생성
- [ ] 플레이스 전용 광고그룹 설정
- [ ] 지역 타겟팅 설정
- [ ] 플레이스 키워드 관리
- [ ] PLACE_AD 소재 생성
- [ ] 비즈니스 정보 동기화

#### 플레이스 확장소재 (파워링크 연동)
- [ ] PLACE 타입 AdExtension 생성
- [ ] 영업시간 자동 동기화
- [ ] 플레이스 확장소재 조회
- [ ] 플레이스 확장소재 수정
- [ ] 플레이스 확장소재 삭제
- [ ] 플레이스 특화 성과 지표

#### 플레이스 최적화
- [ ] 지역 기반 입찰 조정
- [ ] 시간대별 입찰 최적화
- [ ] 경쟁업체 분석

### Phase 4: 파워콘텐츠 광고 (4주차)
#### 캠페인 설정
- [ ] POWER_CONTENTS 캠페인 생성
- [ ] 콘텐츠 네트워크 선택
- [ ] CPM 입찰 전략 설정

#### 타겟팅 설정
- [ ] 연령 타겟팅 API
- [ ] 성별 타겟팅 API
- [ ] 관심사 타겟팅 API
- [ ] 리타겟팅 설정
- [ ] 유사 타겟 설정

#### 크리에이티브 관리
- [ ] 이미지 배너 업로드
- [ ] 동영상 소재 업로드
- [ ] 네이티브 광고 설정
- [ ] A/B 테스트 설정
- [ ] 크리에이티브 성과 분석

### Phase 5: 통합 대시보드 (5주차)
#### 성과 분석
- [ ] 통합 성과 대시보드
- [ ] 실시간 데이터 모니터링
- [ ] 커스텀 리포트 생성
- [ ] 데이터 시각화
- [ ] 성과 알림 설정

#### 자동화 기능
- [ ] 자동 입찰 최적화
- [ ] 예산 자동 분배
- [ ] 키워드 자동 추가/제외
- [ ] 광고 소재 자동 로테이션
- [ ] 성과 기반 자동 일시정지

#### 관리 도구
- [ ] 벌크 작업 처리
- [ ] 템플릿 관리
- [ ] 계정 권한 관리
- [ ] 변경 이력 추적
- [ ] 백업 및 복원

## 🧪 테스트 계획

### 단위 테스트
```javascript
describe('NaverAdsAPI', () => {
  describe('Authentication', () => {
    test('HMAC-SHA256 서명 생성', async () => {
      const signature = api.generateSignature('GET', '/ncc/campaigns', timestamp)
      expect(signature).toMatch(/^[A-Za-z0-9+/=]+$/)
    })
  })

  describe('PowerLink Campaign', () => {
    test('캠페인 생성', async () => {
      const campaign = await api.createCampaign({
        campaignTp: 'WEB_SITE',
        name: '테스트 캠페인'
      })
      expect(campaign.nccCampaignId).toBeDefined()
    })
  })

  describe('Place AdExtension', () => {
    test('플레이스 확장소재 생성', async () => {
      const extension = await api.createAdExtension({
        type: 'PLACE',
        placeChannelKey: '1234567890'
      })
      expect(extension.adExtensionId).toBeDefined()
    })
  })

  describe('PowerContents Campaign', () => {
    test('파워콘텐츠 캠페인 생성', async () => {
      const campaign = await api.createCampaign({
        campaignTp: 'POWER_CONTENTS',
        name: '파워콘텐츠 테스트'
      })
      expect(campaign.nccCampaignId).toBeDefined()
    })
  })
})
```

### 통합 테스트
```javascript
describe('End-to-End Campaign Creation', () => {
  test('파워링크 + 플레이스 통합 캠페인', async () => {
    // 1. 캠페인 생성
    const campaign = await api.createCampaign({ ... })
    
    // 2. 광고그룹 생성
    const adgroup = await api.createAdGroup(campaign.id, { ... })
    
    // 3. 키워드 추가
    const keywords = await api.addKeywords(adgroup.id, [ ... ])
    
    // 4. 광고 생성
    const ad = await api.createAd(adgroup.id, { ... })
    
    // 5. 플레이스 확장소재 추가
    const placeExtension = await api.createAdExtension({
      ownerId: adgroup.id,
      type: 'PLACE',
      placeChannelKey: '1234567890'
    })
    
    // 6. 성과 확인
    const stats = await api.getStats(campaign.id)
    
    expect(stats).toBeDefined()
  })
})
```

## 💼 구현 예제

### 완전한 API 클라이언트
```javascript
import crypto from 'crypto'
import axios from 'axios'

class NaverSearchAdAPI {
  constructor(config) {
    this.accessKey = config.accessKey
    this.secretKey = config.secretKey
    this.customerId = config.customerId
    this.baseURL = 'https://api.searchad.naver.com'
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      }
    })
    
    // 요청 인터셉터로 인증 헤더 추가
    this.client.interceptors.request.use(config => {
      const timestamp = Date.now().toString()
      const signature = this.generateSignature(
        config.method.toUpperCase(),
        config.url,
        timestamp
      )
      
      config.headers['X-Timestamp'] = timestamp
      config.headers['X-API-KEY'] = this.accessKey
      config.headers['X-Customer'] = this.customerId
      config.headers['X-Signature'] = signature
      
      return config
    })
    
    // 응답 인터셉터로 에러 처리
    this.client.interceptors.response.use(
      response => response.data,
      error => {
        if (error.response?.status === 429) {
          // Rate limiting - 재시도 로직
          return this.retryWithBackoff(error.config)
        }
        throw new NaverAdError(error)
      }
    )
  }

  generateSignature(method, uri, timestamp) {
    const message = `${method}\n${uri}\n${timestamp}\n${this.accessKey}\n${this.customerId}`
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64')
  }

  async retryWithBackoff(config, attempt = 1) {
    if (attempt > 3) throw new Error('Max retries exceeded')
    
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    return this.client(config)
  }

  // 파워링크 캠페인 관리
  async createPowerLinkCampaign(data) {
    return this.client.post('/ncc/campaigns', {
      campaignTp: 'WEB_SITE',
      customerId: this.customerId,
      ...data
    })
  }

  // 플레이스 캠페인 관리
  async createPlaceCampaign(data) {
    return this.client.post('/ncc/campaigns', {
      campaignTp: 'PLACE',
      customerId: this.customerId,
      ...data
    })
  }

  async getCampaigns(options = {}) {
    return this.client.get('/ncc/campaigns', { params: options })
  }

  async updateCampaign(campaignId, data) {
    return this.client.put(`/ncc/campaigns/${campaignId}`, data)
  }

  async deleteCampaign(campaignId) {
    return this.client.delete(`/ncc/campaigns/${campaignId}`)
  }

  // 광고그룹 관리
  async createAdGroup(campaignId, data) {
    return this.client.post('/ncc/adgroups', {
      nccCampaignId: campaignId,
      ...data
    })
  }

  async getAdGroups(campaignId) {
    return this.client.get('/ncc/adgroups', {
      params: { nccCampaignId: campaignId }
    })
  }

  async updateAdGroup(adgroupId, data) {
    return this.client.put(`/ncc/adgroups/${adgroupId}`, data)
  }

  async deleteAdGroup(adgroupId) {
    return this.client.delete(`/ncc/adgroups/${adgroupId}`)
  }

  // 키워드 관리
  async addKeywords(adgroupId, keywords) {
    // 입찰가 검증
    keywords.forEach(kw => {
      if (kw.bidAmt < 70) throw new Error(`최소 입찰가는 70원입니다: ${kw.keyword}`)
      if (kw.bidAmt > 100000) throw new Error(`최대 입찰가는 100,000원입니다: ${kw.keyword}`)
    })
    
    return this.client.post('/ncc/keywords', {
      nccAdgroupId: adgroupId,
      keywords
    })
  }

  async getKeywords(adgroupId) {
    return this.client.get('/ncc/keywords', {
      params: { nccAdgroupId: adgroupId }
    })
  }

  async updateKeywordBids(updates) {
    return this.client.put('/ncc/keywords', { keywords: updates })
  }

  async deleteKeywords(keywordIds) {
    return this.client.delete('/ncc/keywords', {
      params: { ids: keywordIds.join(',') }
    })
  }

  // 광고 소재 관리
  async createAd(adgroupId, adData) {
    // 문자 길이 검증
    if (adData.headline?.length > 15) {
      throw new Error('제목은 15자를 초과할 수 없습니다')
    }
    if (adData.description?.length > 45) {
      throw new Error('설명은 45자를 초과할 수 없습니다')
    }
    
    return this.client.post('/ncc/ads', {
      nccAdgroupId: adgroupId,
      ...adData
    })
  }

  async getAds(adgroupId) {
    return this.client.get('/ncc/ads', {
      params: { nccAdgroupId: adgroupId }
    })
  }

  async updateAd(adId, data) {
    return this.client.put(`/ncc/ads/${adId}`, data)
  }

  async deleteAd(adId) {
    return this.client.delete(`/ncc/ads/${adId}`)
  }

  // 플레이스 확장소재 관리
  async createPlaceExtension(adgroupId, placeId, options = {}) {
    return this.client.post('/ncc/ad-extensions', {
      ownerId: adgroupId,
      type: 'PLACE',
      placeChannelKey: placeId,
      ...options
    })
  }

  async getPlaceExtensions(adgroupId) {
    return this.client.get('/ncc/ad-extensions', {
      params: {
        ownerId: adgroupId,
        type: 'PLACE'
      }
    })
  }

  async updatePlaceExtension(extensionId, data) {
    return this.client.put(`/ncc/ad-extensions/${extensionId}`, data)
  }

  async deletePlaceExtension(extensionId) {
    return this.client.delete(`/ncc/ad-extensions/${extensionId}`)
  }

  // 파워콘텐츠 캠페인 관리
  async createPowerContentsCampaign(data) {
    return this.client.post('/ncc/campaigns', {
      campaignTp: 'POWER_CONTENTS',
      customerId: this.customerId,
      ...data
    })
  }

  async createContentAd(adgroupId, creative) {
    return this.client.post('/ncc/creatives', {
      nccAdgroupId: adgroupId,
      type: 'POWER_CONTENTS_AD',
      ...creative
    })
  }

  async getTargetingOptions(targetingType) {
    return this.client.get('/ncc/targeting-options', {
      params: { targetingType }
    })
  }

  // 성과 조회
  async getStats(entityId, options = {}) {
    const defaultOptions = {
      id: entityId,
      fields: ['impCnt', 'clkCnt', 'ctr', 'cpc', 'salesAmt'],
      datePreset: 'LAST_7_DAYS'
    }
    
    return this.client.get('/stats', {
      params: { ...defaultOptions, ...options }
    })
  }

  // 일괄 작업
  async bulkOperation(operations) {
    return this.client.post('/ncc/bulk', { operations })
  }

  // 예산 최적화
  async optimizeBudget(campaignId) {
    const stats = await this.getStats(campaignId, {
      datePreset: 'LAST_30_DAYS'
    })
    
    const recommendations = this.calculateBudgetRecommendations(stats)
    return recommendations
  }

  calculateBudgetRecommendations(stats) {
    // ROI 기반 예산 최적화 로직
    const roi = stats.salesAmt / stats.cost
    const recommendations = {
      shouldIncrease: roi > 3,
      suggestedBudget: Math.round(stats.dailyBudget * (roi > 3 ? 1.2 : 0.8)),
      reason: roi > 3 ? 'ROI가 높아 예산 증액을 권장합니다' : 'ROI가 낮아 예산 조정이 필요합니다'
    }
    
    return recommendations
  }
}

// 에러 클래스
class NaverAdError extends Error {
  constructor(error) {
    super(error.response?.data?.message || error.message)
    this.name = 'NaverAdError'
    this.status = error.response?.status
    this.code = error.response?.data?.code
  }
}

export { NaverSearchAdAPI, NaverAdError }
```

### 사용 예제: 파워링크 + 플레이스 통합 캠페인
```javascript
async function createIntegratedCampaign() {
  const api = new NaverSearchAdAPI({
    accessKey: process.env.NAVER_ACCESS_KEY,
    secretKey: process.env.NAVER_SECRET_KEY,
    customerId: process.env.NAVER_CUSTOMER_ID
  })

  try {
    // 1. 파워링크 캠페인 생성
    console.log('📌 파워링크 캠페인 생성 중...')
    const campaign = await api.createPowerLinkCampaign({
      name: '통합 마케팅 캠페인',
      dailyBudget: 50000,
      period: {
        since: '2025-02-01',
        until: '2025-03-31'
      }
    })
    console.log(`✅ 캠페인 생성 완료: ${campaign.nccCampaignId}`)

    // 2. 광고그룹 생성
    console.log('📌 광고그룹 생성 중...')
    const adgroup = await api.createAdGroup(campaign.nccCampaignId, {
      name: '서울 강남 타겟',
      dailyBudget: 25000,
      bidAmt: 100,
      targets: {
        region: { code: ['02'] },
        schedule: {
          monday: [9,10,11,12,13,14,15,16,17,18,19,20,21],
          tuesday: [9,10,11,12,13,14,15,16,17,18,19,20,21]
        }
      }
    })
    console.log(`✅ 광고그룹 생성 완료: ${adgroup.nccAdgroupId}`)

    // 3. 키워드 추가
    console.log('📌 키워드 추가 중...')
    const keywords = await api.addKeywords(adgroup.nccAdgroupId, [
      { keyword: '강남영어학원', bidAmt: 200 },
      { keyword: '토익학원', bidAmt: 180 },
      { keyword: '영어회화', bidAmt: 150 },
      { keyword: '비즈니스영어', bidAmt: 170 }
    ])
    console.log(`✅ ${keywords.length}개 키워드 추가 완료`)

    // 4. 광고 소재 생성
    console.log('📌 광고 소재 생성 중...')
    const ad = await api.createAd(adgroup.nccAdgroupId, {
      type: 'TEXT_45',
      ad: {
        headline: '영어 실력 완성',
        description: '검증된 커리큘럼과 전문 강사진이 함께합니다',
        pc: {
          final: 'https://example-academy.com',
          display: 'example-academy.com'
        },
        mobile: {
          final: 'https://m.example-academy.com',
          display: 'm.example-academy.com'
        }
      }
    })
    console.log(`✅ 광고 생성 완료: ${ad.nccAdId}`)

    // 5. 플레이스 확장소재 추가
    console.log('📌 플레이스 확장소재 추가 중...')
    const placeExtension = await api.createPlaceExtension(
      adgroup.nccAdgroupId,
      '1234567890', // 네이버 플레이스 ID
      {
        schedule: {
          useSchedule: true,
          schedule: {
            monday: { businessHour: [{ open: '09:00', close: '22:00' }] },
            tuesday: { businessHour: [{ open: '09:00', close: '22:00' }] },
            wednesday: { businessHour: [{ open: '09:00', close: '22:00' }] },
            thursday: { businessHour: [{ open: '09:00', close: '22:00' }] },
            friday: { businessHour: [{ open: '09:00', close: '22:00' }] },
            saturday: { businessHour: [{ open: '10:00', close: '20:00' }] }
          }
        }
      }
    )
    console.log(`✅ 플레이스 확장소재 추가 완료: ${placeExtension.adExtensionId}`)

    // 6. 결과 요약
    console.log('\n🎯 캠페인 생성 완료!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`캠페인 ID: ${campaign.nccCampaignId}`)
    console.log(`광고그룹 ID: ${adgroup.nccAdgroupId}`)
    console.log(`키워드: ${keywords.length}개`)
    console.log(`광고 ID: ${ad.nccAdId}`)
    console.log(`플레이스 확장: ${placeExtension.adExtensionId}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return {
      campaign,
      adgroup,
      keywords,
      ad,
      placeExtension
    }

  } catch (error) {
    console.error('❌ 캠페인 생성 실패:', error.message)
    throw error
  }
}
```

### 사용 예제: 파워콘텐츠 캠페인
```javascript
async function createPowerContentsCampaign() {
  const api = new NaverSearchAdAPI({
    accessKey: process.env.NAVER_ACCESS_KEY,
    secretKey: process.env.NAVER_SECRET_KEY,
    customerId: process.env.NAVER_CUSTOMER_ID
  })

  try {
    // 1. 파워콘텐츠 캠페인 생성
    console.log('📱 파워콘텐츠 캠페인 생성 중...')
    const campaign = await api.createPowerContentsCampaign({
      name: '브랜드 인지도 캠페인',
      dailyBudget: 100000,
      targets: {
        contentNetwork: ['BLOG', 'CAFE', 'POST']
      }
    })

    // 2. 타겟팅 광고그룹 생성
    console.log('🎯 타겟팅 광고그룹 생성 중...')
    const adgroup = await api.createAdGroup(campaign.nccCampaignId, {
      name: '20-30대 교육 관심층',
      adgroupType: 'CONTENTS_AD',
      dailyBudget: 50000,
      bidStrategy: {
        type: 'MANUAL_CPM',
        bidAmt: 1500 // 1000 노출당 1,500원
      },
      targets: {
        age: ['20-29', '30-39'],
        gender: ['MALE', 'FEMALE'],
        interest: ['EDUCATION', 'LANGUAGE_LEARNING', 'CAREER']
      }
    })

    // 3. 크리에이티브 생성
    console.log('🎨 크리에이티브 생성 중...')
    const creative = await api.createContentAd(adgroup.nccAdgroupId, {
      format: 'IMAGE_BANNER',
      creative: {
        title: '새해 영어 실력 도약',
        description: '2025년, 글로벌 인재로 성장하세요',
        image: {
          url: 'https://cdn.example.com/banner-1200x628.jpg',
          width: 1200,
          height: 628
        },
        landingUrl: 'https://example.com/campaign',
        callToAction: '무료 레벨테스트'
      }
    })

    console.log('\n✨ 파워콘텐츠 캠페인 생성 완료!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`캠페인: ${campaign.name}`)
    console.log(`일 예산: ${campaign.dailyBudget.toLocaleString()}원`)
    console.log(`타겟: 20-30대 교육 관심층`)
    console.log(`CPM: 1,500원`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return { campaign, adgroup, creative }

  } catch (error) {
    console.error('❌ 파워콘텐츠 캠페인 생성 실패:', error.message)
    throw error
  }
}
```

## 📊 성과 모니터링 및 최적화

### 자동 최적화 시스템
```javascript
class CampaignOptimizer {
  constructor(api) {
    this.api = api
  }

  async optimizeCampaign(campaignId) {
    // 1. 성과 데이터 수집
    const stats = await this.api.getStats(campaignId, {
      datePreset: 'LAST_30_DAYS',
      breakdown: 'keyword'
    })

    // 2. 키워드별 성과 분석
    const keywordPerformance = stats.data.map(kw => ({
      id: kw.id,
      keyword: kw.keyword,
      ctr: kw.clkCnt / kw.impCnt,
      cpc: kw.cost / kw.clkCnt,
      roi: kw.salesAmt / kw.cost,
      score: this.calculateScore(kw)
    }))

    // 3. 최적화 액션 생성
    const actions = []

    keywordPerformance.forEach(kw => {
      // 성과가 좋은 키워드 입찰가 상승
      if (kw.score > 80) {
        actions.push({
          type: 'INCREASE_BID',
          keywordId: kw.id,
          newBid: Math.min(kw.cpc * 1.2, 100000)
        })
      }
      // 성과가 나쁜 키워드 입찰가 하락 또는 일시정지
      else if (kw.score < 30) {
        if (kw.ctr < 0.001) {
          actions.push({
            type: 'PAUSE_KEYWORD',
            keywordId: kw.id
          })
        } else {
          actions.push({
            type: 'DECREASE_BID',
            keywordId: kw.id,
            newBid: Math.max(kw.cpc * 0.8, 70)
          })
        }
      }
    })

    // 4. 최적화 실행
    await this.executeOptimizations(actions)

    return {
      analyzed: keywordPerformance.length,
      optimized: actions.length,
      actions
    }
  }

  calculateScore(stats) {
    // 가중치 기반 점수 계산
    const ctrScore = (stats.clkCnt / stats.impCnt) * 1000 // CTR * 1000
    const roiScore = (stats.salesAmt / stats.cost) * 10   // ROI * 10
    const convScore = (stats.convCnt / stats.clkCnt) * 100 // 전환율 * 100

    return (ctrScore * 0.3 + roiScore * 0.5 + convScore * 0.2).toFixed(2)
  }

  async executeOptimizations(actions) {
    const updates = actions.filter(a => a.type === 'INCREASE_BID' || a.type === 'DECREASE_BID')
      .map(a => ({
        nccKeywordId: a.keywordId,
        bidAmt: Math.round(a.newBid / 10) * 10 // 10원 단위
      }))

    if (updates.length > 0) {
      await this.api.updateKeywordBids(updates)
    }

    const pauseIds = actions.filter(a => a.type === 'PAUSE_KEYWORD')
      .map(a => a.keywordId)

    if (pauseIds.length > 0) {
      // 키워드 일시정지 처리
      await this.api.updateKeywords(pauseIds, { userLock: true })
    }
  }
}
```

## ⚠️ 주의사항

1. **API 호출 제한**
   - 초당 10회 제한
   - 일일 총 호출 수 제한 있음
   - 429 에러 시 지수 백오프 적용

2. **문자 제한**
   - 광고 제목: 15자 (공백 포함)
   - 광고 설명: 45자 (공백 포함)
   - 키워드: 최대 50자

3. **금액 제한**
   - 최소 입찰가: 70원
   - 최대 입찰가: 100,000원
   - 최소 일예산: 1,000원
   - 입찰 단위: 10원

4. **플레이스 광고 요구사항**
   - 네이버 플레이스 사전 등록 필수
   - 사업자등록증 인증 필요
   - 영업시간 정보 동기화

5. **파워콘텐츠 제약**
   - 이미지 크기: 1200x628 권장
   - 동영상: 최대 30초
   - 심사 기간: 1-2 영업일

## 🎯 구현 우선순위

1. **1순위: 파워링크 (완전 지원)**
   - 모든 CRUD 작업 가능
   - 자동 최적화 구현 가능
   - ROI 측정 용이

2. **2순위: 플레이스 확장 (AdExtension)**
   - 파워링크와 연계 필수
   - 지역 비즈니스에 효과적
   - 추가 클릭 유도

3. **3순위: 파워콘텐츠 (부분 지원)**
   - 브랜드 인지도 캠페인
   - 타겟팅 옵션 활용
   - 크리에이티브 중심

## 📝 다음 단계

1. **즉시**: HMAC-SHA256 인증 구현 및 테스트
2. **1주차**: 파워링크 전체 CRUD 구현
3. **2주차**: 플레이스 확장소재 연동
4. **3주차**: 파워콘텐츠 기본 기능
5. **4주차**: 통합 대시보드 및 최적화

---

이 문서는 네이버 검색광고 공식 API 문서를 기반으로 작성되었으며, 실제 구현 가능한 기능만을 다룹니다.