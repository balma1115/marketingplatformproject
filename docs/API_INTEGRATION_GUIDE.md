# API 통합 가이드 - 네이버 검색광고 & 인스타그램

## 목차
1. [네이버 검색광고 API 연동](#네이버-검색광고-api-연동)
2. [Instagram Graph API 연동](#instagram-graph-api-연동)
3. [API 활용 기능 개발 가이드](#api-활용-기능-개발-가이드)

---

## 네이버 검색광고 API 연동

### 1. API 키 발급 과정

#### 1.1 네이버 광고 계정 준비
1. [네이버 광고관리시스템](https://manage.searchad.naver.com) 접속
2. 네이버 계정으로 로그인
3. 광고주 계정이 없는 경우 신규 등록

#### 1.2 API 사용 신청
1. 광고관리시스템 로그인 후 설정 메뉴 이동
2. "API 관리" 또는 "도구" > "API" 선택
3. API 사용 신청 및 약관 동의
4. 사업자등록증 업로드 (법인/개인사업자)

#### 1.3 API 키 발급
1. API 사용 승인 후 API 키 생성
2. 필요한 정보:
   - **Access License (API Key)**: API 인증용 라이선스 키
   - **Secret Key**: 서명 생성용 비밀 키
   - **Customer ID**: 광고 계정 고객 ID

### 2. API 주요 기능 및 엔드포인트

#### 2.1 계정 관리
```javascript
// 계정 정보 조회
GET https://api.searchad.naver.com/customers/{customerId}

// 계정 잔액 조회
GET https://api.searchad.naver.com/billing/bizmoney/{customerId}
```

#### 2.2 캠페인 관리
```javascript
// 캠페인 목록 조회
GET https://api.searchad.naver.com/campaigns

// 캠페인 생성
POST https://api.searchad.naver.com/campaigns
{
  "name": "캠페인명",
  "campaignType": "SHOPPING",
  "dailyBudget": 10000
}

// 캠페인 수정
PUT https://api.searchad.naver.com/campaigns/{campaignId}

// 캠페인 상태 변경 (활성화/비활성화)
PUT https://api.searchad.naver.com/campaigns/{campaignId}/enable
```

#### 2.3 광고그룹 관리
```javascript
// 광고그룹 목록 조회
GET https://api.searchad.naver.com/adgroups?campaignId={campaignId}

// 광고그룹 생성
POST https://api.searchad.naver.com/adgroups
{
  "campaignId": "캠페인ID",
  "name": "광고그룹명",
  "pcChannelId": "PC_채널ID",
  "mobileChannelId": "모바일_채널ID"
}
```

#### 2.4 키워드 관리
```javascript
// 키워드 목록 조회
GET https://api.searchad.naver.com/keywords?adgroupId={adgroupId}

// 키워드 추가
POST https://api.searchad.naver.com/keywords
{
  "adgroupId": "광고그룹ID",
  "keyword": "키워드",
  "bidAmt": 70,
  "useGroupBidAmt": false
}

// 키워드 입찰가 수정
PUT https://api.searchad.naver.com/keywords/{keywordId}
```

#### 2.5 리포트 및 통계
```javascript
// 실적 데이터 조회
POST https://api.searchad.naver.com/stats
{
  "reportTp": "CAMPAIGN",
  "dateRange": {
    "since": "2024-01-01",
    "until": "2024-01-31"
  },
  "timeUnit": "DATE",
  "fields": ["impCnt", "clkCnt", "ctr", "cpc", "avgRnk", "ccnt"]
}

// 키워드별 성과 분석
GET https://api.searchad.naver.com/stats/keywords?ids={keywordIds}&fields=all&timeRange=1MONTH
```

### 3. 네이버 API 인증 구현

```typescript
// lib/services/naver-ads-api.ts
import crypto from 'crypto'

class NaverAdsAPI {
  private apiKey: string
  private secretKey: string
  private customerId: string
  private baseURL = 'https://api.searchad.naver.com'

  constructor(apiKey: string, secretKey: string, customerId: string) {
    this.apiKey = apiKey
    this.secretKey = secretKey
    this.customerId = customerId
  }

  // API 서명 생성
  private generateSignature(timestamp: string, method: string, uri: string): string {
    const message = `${timestamp}.${method}.${uri}`
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64')
  }

  // API 요청 헤더 생성
  private getHeaders(method: string, uri: string): Headers {
    const timestamp = Date.now().toString()
    const signature = this.generateSignature(timestamp, method, uri)
    
    return new Headers({
      'X-Timestamp': timestamp,
      'X-API-KEY': this.apiKey,
      'X-Customer': this.customerId,
      'X-Signature': signature,
      'Content-Type': 'application/json'
    })
  }

  // API 요청
  async request(method: string, endpoint: string, body?: any) {
    const uri = `/api${endpoint}`
    const headers = this.getHeaders(method, uri)
    
    const response = await fetch(`${this.baseURL}${uri}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      throw new Error(`Naver API Error: ${response.status}`)
    }

    return response.json()
  }

  // 캠페인 목록 조회
  async getCampaigns() {
    return this.request('GET', '/campaigns')
  }

  // 키워드 성과 조회
  async getKeywordStats(keywordIds: string[]) {
    return this.request('POST', '/stats', {
      reportTp: 'KEYWORD',
      ids: keywordIds,
      fields: ['impCnt', 'clkCnt', 'ctr', 'cpc', 'ccnt'],
      timeUnit: 'DATE',
      dateRange: {
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        until: new Date().toISOString().split('T')[0]
      }
    })
  }
}

export default NaverAdsAPI
```

---

## Instagram Graph API 연동

### 1. API 설정 과정

#### 1.1 Facebook Developer 계정 설정
1. [Facebook Developer](https://developers.facebook.com) 접속
2. Facebook 계정으로 로그인
3. "My Apps" > "Create App" 선택
4. 앱 유형: "Business" 선택

#### 1.2 Instagram Business Account 연동
1. Facebook Page와 Instagram 계정 연동 필수
2. Instagram 계정을 Business Account로 전환
3. Facebook Page 설정에서 Instagram 계정 연결

#### 1.3 필요한 권한 및 토큰
- **권한 (Permissions)**:
  - `instagram_basic`: 기본 프로필 정보
  - `instagram_manage_insights`: 인사이트 데이터
  - `instagram_content_publish`: 콘텐츠 발행
  - `pages_show_list`: 페이지 정보
  - `pages_read_engagement`: 참여 데이터

- **Access Token**:
  - User Access Token → Page Access Token 교환
  - Long-lived Token으로 변환 (60일 유효)

#### 1.4 Access Token 발급
1. Graph API Explorer 사용
2. 앱 선택 및 권한 설정
3. User Token 생성
4. Page Token으로 교환
5. Long-lived Token 변환

### 2. Instagram API 주요 기능

#### 2.1 계정 정보 조회
```javascript
// 비즈니스 계정 정보
GET https://graph.facebook.com/v18.0/{instagram-business-account-id}
  ?fields=name,username,profile_picture_url,followers_count,media_count

// 미디어 목록 조회
GET https://graph.facebook.com/v18.0/{instagram-business-account-id}/media
  ?fields=id,caption,media_type,media_url,timestamp,like_count,comments_count
```

#### 2.2 인사이트 데이터
```javascript
// 계정 인사이트
GET https://graph.facebook.com/v18.0/{instagram-business-account-id}/insights
  ?metric=impressions,reach,profile_views
  &period=day
  &since=2024-01-01
  &until=2024-01-31

// 미디어 인사이트
GET https://graph.facebook.com/v18.0/{media-id}/insights
  ?metric=engagement,impressions,reach,saved
```

#### 2.3 콘텐츠 발행
```javascript
// 이미지 포스트 생성
POST https://graph.facebook.com/v18.0/{instagram-business-account-id}/media
{
  "image_url": "https://example.com/image.jpg",
  "caption": "포스트 내용 #해시태그"
}

// 포스트 발행
POST https://graph.facebook.com/v18.0/{instagram-business-account-id}/media_publish
{
  "creation_id": "{creation-id}"
}
```

#### 2.4 해시태그 검색
```javascript
// 해시태그 ID 검색
GET https://graph.facebook.com/v18.0/ig_hashtag_search
  ?user_id={instagram-business-account-id}
  &q=마케팅

// 해시태그 미디어 조회
GET https://graph.facebook.com/v18.0/{hashtag-id}/top_media
  ?user_id={instagram-business-account-id}
  &fields=id,media_type,comments_count,like_count
```

### 3. Instagram API 구현

```typescript
// lib/services/instagram-api.ts
class InstagramAPI {
  private accessToken: string
  private businessAccountId: string
  private baseURL = 'https://graph.facebook.com/v18.0'

  constructor(accessToken: string, businessAccountId: string) {
    this.accessToken = accessToken
    this.businessAccountId = businessAccountId
  }

  // API 요청
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`)
    url.searchParams.append('access_token', this.accessToken)

    const response = await fetch(url.toString(), options)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Instagram API Error: ${error.error.message}`)
    }

    return response.json()
  }

  // 계정 정보 조회
  async getAccountInfo() {
    return this.request(`/${this.businessAccountId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  // 미디어 목록 조회
  async getMedia(limit = 25) {
    const fields = 'id,caption,media_type,media_url,timestamp,like_count,comments_count'
    return this.request(`/${this.businessAccountId}/media?fields=${fields}&limit=${limit}`)
  }

  // 계정 인사이트 조회
  async getAccountInsights(since: Date, until: Date) {
    const metrics = 'impressions,reach,profile_views,website_clicks'
    const period = 'day'
    
    return this.request(
      `/${this.businessAccountId}/insights?` +
      `metric=${metrics}&period=${period}&` +
      `since=${since.toISOString().split('T')[0]}&` +
      `until=${until.toISOString().split('T')[0]}`
    )
  }

  // 미디어 인사이트 조회
  async getMediaInsights(mediaId: string) {
    const metrics = 'engagement,impressions,reach,saved,shares'
    return this.request(`/${mediaId}/insights?metric=${metrics}`)
  }

  // 콘텐츠 생성
  async createMediaPost(imageUrl: string, caption: string) {
    // Step 1: Create media object
    const creation = await this.request(`/${this.businessAccountId}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption
      })
    })

    // Step 2: Publish media
    return this.request(`/${this.businessAccountId}/media_publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        creation_id: creation.id
      })
    })
  }
}

export default InstagramAPI
```

---

## API 활용 기능 개발 가이드

### 1. 네이버 검색광고 기능

#### 1.1 광고 캠페인 대시보드
```typescript
// app/naver-ads/dashboard/page.tsx
import { useEffect, useState } from 'react'
import NaverAdsAPI from '@/lib/services/naver-ads-api'

export default function NaverAdsDashboard() {
  const [campaigns, setCampaigns] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchCampaignData()
  }, [])

  const fetchCampaignData = async () => {
    try {
      const response = await fetch('/api/naver-ads/campaigns')
      const data = await response.json()
      setCampaigns(data.campaigns)
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch campaign data:', error)
    }
  }

  return (
    <div className="dashboard">
      <h1>네이버 검색광고 대시보드</h1>
      
      {/* 주요 지표 */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>총 노출수</h3>
          <p>{stats?.totalImpressions}</p>
        </div>
        <div className="metric-card">
          <h3>총 클릭수</h3>
          <p>{stats?.totalClicks}</p>
        </div>
        <div className="metric-card">
          <h3>평균 CTR</h3>
          <p>{stats?.averageCTR}%</p>
        </div>
        <div className="metric-card">
          <h3>총 비용</h3>
          <p>₩{stats?.totalCost}</p>
        </div>
      </div>

      {/* 캠페인 목록 */}
      <div className="campaigns-list">
        <h2>활성 캠페인</h2>
        {campaigns.map(campaign => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </div>
  )
}
```

#### 1.2 키워드 입찰 자동화
```typescript
// lib/services/keyword-bid-optimizer.ts
class KeywordBidOptimizer {
  private naverAPI: NaverAdsAPI

  constructor(naverAPI: NaverAdsAPI) {
    this.naverAPI = naverAPI
  }

  // 키워드 성과 기반 입찰가 조정
  async optimizeBids(adgroupId: string) {
    // 키워드 목록 조회
    const keywords = await this.naverAPI.request('GET', `/keywords?adgroupId=${adgroupId}`)
    
    // 키워드 성과 데이터 조회
    const keywordIds = keywords.map(k => k.keywordId)
    const stats = await this.naverAPI.getKeywordStats(keywordIds)
    
    // 성과 기반 입찰 조정
    for (const keyword of keywords) {
      const keywordStat = stats.find(s => s.keywordId === keyword.keywordId)
      
      if (keywordStat) {
        const newBid = this.calculateOptimalBid(keywordStat, keyword.bidAmt)
        
        if (newBid !== keyword.bidAmt) {
          await this.naverAPI.request('PUT', `/keywords/${keyword.keywordId}`, {
            bidAmt: newBid
          })
        }
      }
    }
  }

  // 최적 입찰가 계산
  private calculateOptimalBid(stats: any, currentBid: number): number {
    const { ctr, avgRnk, roi } = stats
    
    // CTR이 높고 평균 순위가 낮은 경우 입찰가 증가
    if (ctr > 5 && avgRnk > 3) {
      return Math.min(currentBid * 1.2, 5000) // 최대 5000원
    }
    
    // CTR이 낮고 비용 대비 전환이 낮은 경우 입찰가 감소
    if (ctr < 1 || roi < 0.5) {
      return Math.max(currentBid * 0.8, 70) // 최소 70원
    }
    
    return currentBid
  }
}
```

### 2. Instagram 기능

#### 2.1 인스타그램 성과 분석
```typescript
// app/instagram/analytics/page.tsx
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function InstagramAnalytics() {
  const [insights, setInsights] = useState([])
  const [topPosts, setTopPosts] = useState([])

  useEffect(() => {
    fetchInsights()
    fetchTopPosts()
  }, [])

  const fetchInsights = async () => {
    const response = await fetch('/api/instagram/insights')
    const data = await response.json()
    setInsights(data.insights)
  }

  const fetchTopPosts = async () => {
    const response = await fetch('/api/instagram/top-posts')
    const data = await response.json()
    setTopPosts(data.posts)
  }

  return (
    <div className="instagram-analytics">
      <h1>인스타그램 성과 분석</h1>
      
      {/* 성장 추이 차트 */}
      <div className="growth-chart">
        <h2>팔로워 성장 추이</h2>
        <LineChart width={800} height={400} data={insights}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="followers" stroke="#8884d8" />
          <Line type="monotone" dataKey="reach" stroke="#82ca9d" />
        </LineChart>
      </div>

      {/* 인기 포스트 */}
      <div className="top-posts">
        <h2>인기 포스트 TOP 10</h2>
        <div className="posts-grid">
          {topPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>

      {/* 해시태그 성과 */}
      <div className="hashtag-performance">
        <h2>해시태그 성과</h2>
        <HashtagAnalysis />
      </div>
    </div>
  )
}
```

#### 2.2 콘텐츠 자동 발행
```typescript
// lib/services/instagram-scheduler.ts
import InstagramAPI from './instagram-api'

class InstagramScheduler {
  private api: InstagramAPI
  private scheduledPosts: Map<string, NodeJS.Timeout> = new Map()

  constructor(api: InstagramAPI) {
    this.api = api
  }

  // 포스트 예약
  schedulePost(imageUrl: string, caption: string, publishAt: Date): string {
    const postId = `post_${Date.now()}`
    const delay = publishAt.getTime() - Date.now()

    if (delay <= 0) {
      // 즉시 발행
      this.publishPost(imageUrl, caption)
      return postId
    }

    // 예약 발행
    const timeout = setTimeout(() => {
      this.publishPost(imageUrl, caption)
      this.scheduledPosts.delete(postId)
    }, delay)

    this.scheduledPosts.set(postId, timeout)
    return postId
  }

  // 포스트 발행
  private async publishPost(imageUrl: string, caption: string) {
    try {
      const result = await this.api.createMediaPost(imageUrl, caption)
      console.log('Post published:', result)
      
      // 발행 성공 알림
      await this.sendNotification('Instagram 포스트가 성공적으로 발행되었습니다.')
    } catch (error) {
      console.error('Failed to publish post:', error)
      await this.sendNotification('Instagram 포스트 발행에 실패했습니다.')
    }
  }

  // 예약 취소
  cancelScheduledPost(postId: string): boolean {
    const timeout = this.scheduledPosts.get(postId)
    if (timeout) {
      clearTimeout(timeout)
      this.scheduledPosts.delete(postId)
      return true
    }
    return false
  }

  // 알림 전송
  private async sendNotification(message: string) {
    // 이메일 또는 앱 내 알림 구현
    await fetch('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({ message })
    })
  }
}
```

### 3. 통합 대시보드

#### 3.1 마케팅 통합 대시보드
```typescript
// app/marketing/integrated-dashboard/page.tsx
import { useEffect, useState } from 'react'

export default function IntegratedDashboard() {
  const [naverData, setNaverData] = useState(null)
  const [instagramData, setInstagramData] = useState(null)
  
  useEffect(() => {
    Promise.all([
      fetch('/api/naver-ads/summary').then(res => res.json()),
      fetch('/api/instagram/summary').then(res => res.json())
    ]).then(([naver, instagram]) => {
      setNaverData(naver)
      setInstagramData(instagram)
    })
  }, [])

  return (
    <div className="integrated-dashboard">
      <h1>마케팅 통합 대시보드</h1>
      
      {/* 통합 KPI */}
      <div className="kpi-section">
        <div className="kpi-card">
          <h3>총 도달</h3>
          <p>{(naverData?.impressions || 0) + (instagramData?.reach || 0)}</p>
        </div>
        <div className="kpi-card">
          <h3>총 참여</h3>
          <p>{(naverData?.clicks || 0) + (instagramData?.engagement || 0)}</p>
        </div>
        <div className="kpi-card">
          <h3>총 비용</h3>
          <p>₩{naverData?.cost || 0}</p>
        </div>
        <div className="kpi-card">
          <h3>ROI</h3>
          <p>{calculateROI(naverData, instagramData)}%</p>
        </div>
      </div>

      {/* 채널별 성과 */}
      <div className="channel-performance">
        <div className="naver-section">
          <h2>네이버 검색광고</h2>
          <NaverPerformanceChart data={naverData} />
        </div>
        
        <div className="instagram-section">
          <h2>인스타그램</h2>
          <InstagramPerformanceChart data={instagramData} />
        </div>
      </div>

      {/* AI 인사이트 */}
      <div className="ai-insights">
        <h2>AI 마케팅 인사이트</h2>
        <AIRecommendations 
          naverData={naverData} 
          instagramData={instagramData} 
        />
      </div>
    </div>
  )
}
```

### 4. API 에러 처리 및 로깅

```typescript
// lib/utils/api-error-handler.ts
class APIErrorHandler {
  static handle(error: any, service: string) {
    console.error(`[${service}] API Error:`, error)
    
    // 에러 타입별 처리
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      // Rate limit 처리
      return {
        error: '요청 한도 초과. 잠시 후 다시 시도해주세요.',
        retry: true,
        retryAfter: error.retryAfter || 60
      }
    }
    
    if (error.code === 'INVALID_TOKEN') {
      // 토큰 갱신 필요
      return {
        error: 'API 인증 실패. 설정에서 API 키를 확인해주세요.',
        retry: false,
        action: 'UPDATE_TOKEN'
      }
    }
    
    // 기본 에러 처리
    return {
      error: '알 수 없는 오류가 발생했습니다.',
      retry: false
    }
  }
  
  // API 로깅
  static async log(request: any, response: any, service: string) {
    await fetch('/api/logs/api', {
      method: 'POST',
      body: JSON.stringify({
        service,
        request,
        response,
        timestamp: new Date().toISOString()
      })
    })
  }
}
```

## 보안 고려사항

### 1. API 키 보안
- 모든 API 키는 서버 측에서만 사용
- 환경 변수를 통한 키 관리
- 데이터베이스 저장 시 암호화

### 2. Rate Limiting
- API 호출 제한 구현
- 캐싱을 통한 불필요한 호출 감소
- 재시도 로직 구현

### 3. 에러 처리
- 상세한 에러 로깅
- 사용자 친화적 에러 메시지
- 자동 재시도 메커니즘

## 테스트 가이드

### 1. 네이버 API 테스트
```bash
# API 연결 테스트
npm run test:naver-connection

# 캠페인 조회 테스트
npm run test:naver-campaigns

# 키워드 관리 테스트
npm run test:naver-keywords
```

### 2. Instagram API 테스트
```bash
# API 연결 테스트
npm run test:instagram-connection

# 인사이트 조회 테스트
npm run test:instagram-insights

# 콘텐츠 발행 테스트 (Sandbox)
npm run test:instagram-publish
```

## 문제 해결

### 자주 발생하는 문제

1. **네이버 API 인증 실패**
   - API 키와 Secret 키 확인
   - Customer ID 정확성 확인
   - 타임스탬프 동기화 확인

2. **Instagram 토큰 만료**
   - Long-lived Token 갱신 필요
   - 60일마다 자동 갱신 구현

3. **Rate Limit 초과**
   - 캐싱 구현
   - 배치 요청 활용
   - 요청 간격 조절

## 추가 리소스

- [네이버 검색광고 API 공식 문서](https://developers.searchad.naver.com)
- [Instagram Graph API 공식 문서](https://developers.facebook.com/docs/instagram-api)
- [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer)
- [네이버 API 테스트 도구](https://manage.searchad.naver.com/api-test)