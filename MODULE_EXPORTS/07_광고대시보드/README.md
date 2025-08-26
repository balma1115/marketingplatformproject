# 07_광고대시보드 모듈

## 개요
네이버 검색광고 관리 및 분석 대시보드를 제공하는 모듈입니다.

## 주요 기능
- 네이버 검색광고 API 연동
- 광고 계정 및 캠페인 관리
- 키워드 분석 및 최적화
- 부정 키워드 관리
- 성과 분석 대시보드
- 자동화된 보고서 생성

## 기술 스택

### Frontend
- React 18 with TypeScript
- Chart.js for performance visualization
- Advanced data tables
- Real-time dashboard updates

### Backend
- Node.js with Express
- Naver Search AD API v2
- Automated bidding algorithms
- Performance analytics engine

## 프로젝트 구조

```
07_광고대시보드/
├── frontend/
│   ├── components/
│   │   ├── CampaignPerformanceChart.tsx
│   │   ├── KeywordBidManager.tsx
│   │   ├── NegativeKeywordManager.tsx
│   │   └── AdGroupTable.tsx
│   ├── pages/
│   │   ├── AdsDashboard.tsx
│   │   ├── MyAdsDashboard.tsx
│   │   ├── UserAdsDashboard.tsx
│   │   ├── AdsManagement.tsx
│   │   └── AdGroupDetail.tsx
│   └── styles/
│       ├── AdsDashboard.css
│       ├── AdsManagement.css
│       └── AdGroupDetail.css
├── backend/
│   ├── routes/
│   │   ├── ads.routes.ts
│   │   ├── agency.routes.ts
│   │   └── advertiser.routes.ts
│   ├── services/
│   │   ├── naverAdsService.ts
│   │   ├── naverAdsSyncService.ts
│   │   ├── naverSearchAdAPI.ts
│   │   └── naverSearchService.ts
│   └── config/
│       └── naver-ads-config.ts
└── database/
    └── ads_management_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Frontend 의존성
npm install react react-dom chart.js react-chartjs-2 date-fns

# Backend 의존성
npm install axios crypto-js moment lodash
```

### 환경 변수
```env
# 네이버 검색광고 API
NAVER_API_KEY=your-api-key
NAVER_SECRET_KEY=your-secret-key
NAVER_CUSTOMER_ID=your-customer-id

# API 설정
NAVER_ADS_BASE_URL=https://ncc.naver.com
API_RATE_LIMIT=100
REQUEST_TIMEOUT=30000

# 보고서 설정
REPORT_GENERATION_SCHEDULE=daily
AUTO_OPTIMIZATION_ENABLED=true
```

## API 엔드포인트

### 광고 계정 관리
```http
GET /api/ads/accounts
POST /api/ads/accounts/sync
PUT /api/ads/accounts/:accountId/settings
```

### 캠페인 관리
```http
GET /api/ads/campaigns
POST /api/ads/campaigns
PUT /api/ads/campaigns/:campaignId
DELETE /api/ads/campaigns/:campaignId
GET /api/ads/campaigns/:campaignId/performance
```

### 키워드 관리
```http
GET /api/ads/keywords
POST /api/ads/keywords/batch
PUT /api/ads/keywords/:keywordId/bid
GET /api/ads/keywords/suggestions
POST /api/ads/keywords/negative
```

### 성과 분석
```http
GET /api/ads/performance/summary
?startDate=2025-01-01&endDate=2025-01-31&accountId=123
GET /api/ads/performance/keywords
GET /api/ads/performance/campaigns
```

## 데이터베이스 스키마

### naver_ads_accounts 테이블
```sql
CREATE TABLE naver_ads_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    account_name VARCHAR(255),
    api_key VARCHAR(255) NOT NULL,
    secret_key VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_customer (customer_id)
);
```

### ad_campaigns 테이블
```sql
CREATE TABLE ad_campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type ENUM('SEARCH', 'DISPLAY', 'SHOPPING') DEFAULT 'SEARCH',
    status ENUM('ACTIVE', 'PAUSED', 'DELETED') DEFAULT 'ACTIVE',
    daily_budget DECIMAL(12,2),
    bid_strategy VARCHAR(50),
    target_location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES naver_ads_accounts(id),
    UNIQUE KEY unique_campaign (account_id, campaign_id)
);
```

### ad_keywords 테이블
```sql
CREATE TABLE ad_keywords (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    adgroup_id VARCHAR(50),
    keyword_id VARCHAR(50) NOT NULL,
    keyword_text VARCHAR(255) NOT NULL,
    match_type ENUM('EXACT', 'PHRASE', 'BROAD') DEFAULT 'EXACT',
    bid_amount DECIMAL(10,2),
    quality_score INT,
    status ENUM('ACTIVE', 'PAUSED', 'DELETED') DEFAULT 'ACTIVE',
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    cost DECIMAL(12,2) DEFAULT 0.00,
    conversions INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id),
    UNIQUE KEY unique_keyword (campaign_id, keyword_id)
);
```

### negative_keywords 테이블
```sql
CREATE TABLE negative_keywords (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    campaign_id INT,
    adgroup_id VARCHAR(50),
    keyword_text VARCHAR(255) NOT NULL,
    match_type ENUM('EXACT', 'PHRASE', 'BROAD') DEFAULT 'EXACT',
    level ENUM('ACCOUNT', 'CAMPAIGN', 'ADGROUP') DEFAULT 'CAMPAIGN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES naver_ads_accounts(id),
    FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id)
);
```

### ad_performance_daily 테이블
```sql
CREATE TABLE ad_performance_daily (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    campaign_id INT,
    keyword_id INT,
    performance_date DATE NOT NULL,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    cost DECIMAL(12,2) DEFAULT 0.00,
    conversions INT DEFAULT 0,
    conversion_value DECIMAL(12,2) DEFAULT 0.00,
    ctr DECIMAL(5,2) DEFAULT 0.00,
    cpc DECIMAL(10,2) DEFAULT 0.00,
    cpa DECIMAL(12,2) DEFAULT 0.00,
    roas DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES naver_ads_accounts(id),
    FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id),
    UNIQUE KEY unique_daily_performance (account_id, campaign_id, keyword_id, performance_date)
);
```

## 네이버 검색광고 API 연동

### API 인증 및 기본 설정
```typescript
class NaverSearchAdAPI {
  private baseURL = 'https://ncc.naver.com';
  private customerId: string;
  private apiKey: string;
  private secretKey: string;

  constructor(customerId: string, apiKey: string, secretKey: string) {
    this.customerId = customerId;
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  private generateSignature(timestamp: string, method: string, uri: string): string {
    const message = `${timestamp}.${method}.${uri}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
  }

  private getHeaders(method: string, uri: string) {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(timestamp, method, uri);

    return {
      'X-Timestamp': timestamp,
      'X-API-KEY': this.apiKey,
      'X-Customer': this.customerId,
      'X-Signature': signature,
      'Content-Type': 'application/json'
    };
  }

  async getCampaigns(): Promise<Campaign[]> {
    const uri = '/ncc/campaigns';
    const headers = this.getHeaders('GET', uri);

    const response = await axios.get(`${this.baseURL}${uri}`, { headers });
    return response.data;
  }

  async getKeywords(campaignId: string): Promise<Keyword[]> {
    const uri = `/ncc/keywords?campaignId=${campaignId}`;
    const headers = this.getHeaders('GET', uri);

    const response = await axios.get(`${this.baseURL}${uri}`, { headers });
    return response.data;
  }

  async updateKeywordBid(keywordId: string, bidAmount: number): Promise<void> {
    const uri = `/ncc/keywords/${keywordId}`;
    const headers = this.getHeaders('PUT', uri);

    await axios.put(`${this.baseURL}${uri}`, {
      bidAmt: bidAmount
    }, { headers });
  }
}
```

### 데이터 동기화 서비스
```typescript
class NaverAdsSyncService {
  private apiService: NaverSearchAdAPI;
  private db: Database;

  async syncAllData(accountId: number): Promise<SyncResult> {
    const syncResult: SyncResult = {
      campaigns: 0,
      keywords: 0,
      performance: 0,
      errors: []
    };

    try {
      // 1. 캠페인 동기화
      const campaigns = await this.apiService.getCampaigns();
      for (const campaign of campaigns) {
        await this.syncCampaign(accountId, campaign);
        syncResult.campaigns++;
      }

      // 2. 키워드 동기화
      for (const campaign of campaigns) {
        const keywords = await this.apiService.getKeywords(campaign.nccCampaignId);
        for (const keyword of keywords) {
          await this.syncKeyword(accountId, campaign.id, keyword);
          syncResult.keywords++;
        }
      }

      // 3. 성과 데이터 동기화
      const performanceData = await this.apiService.getPerformanceReport();
      await this.syncPerformanceData(accountId, performanceData);
      syncResult.performance = performanceData.length;

      // 4. 부정 키워드 동기화
      await this.syncNegativeKeywords(accountId);

      return syncResult;
    } catch (error) {
      console.error('데이터 동기화 오류:', error);
      syncResult.errors.push(error.message);
      return syncResult;
    }
  }

  private async syncCampaign(accountId: number, campaignData: any): Promise<void> {
    const existingCampaign = await this.db.query(
      'SELECT id FROM ad_campaigns WHERE account_id = ? AND campaign_id = ?',
      [accountId, campaignData.nccCampaignId]
    );

    if (existingCampaign.length > 0) {
      await this.db.query(`
        UPDATE ad_campaigns SET
          campaign_name = ?,
          status = ?,
          daily_budget = ?,
          bid_strategy = ?,
          updated_at = NOW()
        WHERE account_id = ? AND campaign_id = ?
      `, [
        campaignData.name,
        campaignData.status,
        campaignData.dailyBudget,
        campaignData.bidStrategy,
        accountId,
        campaignData.nccCampaignId
      ]);
    } else {
      await this.db.query(`
        INSERT INTO ad_campaigns (
          account_id, campaign_id, campaign_name, status, 
          daily_budget, bid_strategy, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        accountId,
        campaignData.nccCampaignId,
        campaignData.name,
        campaignData.status,
        campaignData.dailyBudget,
        campaignData.bidStrategy
      ]);
    }
  }
}
```

## 성과 분석 및 시각화

### 대시보드 성과 지표
```typescript
class AdPerformanceAnalyzer {
  async generateDashboardData(accountId: number, dateRange: DateRange): Promise<DashboardData> {
    const summaryData = await this.getPerformanceSummary(accountId, dateRange);
    const campaignPerformance = await this.getCampaignPerformance(accountId, dateRange);
    const keywordPerformance = await this.getTopKeywords(accountId, dateRange);
    const trendData = await this.getPerformanceTrends(accountId, dateRange);

    return {
      summary: summaryData,
      campaigns: campaignPerformance,
      keywords: keywordPerformance,
      trends: trendData,
      recommendations: await this.generateRecommendations(summaryData)
    };
  }

  private async getPerformanceSummary(accountId: number, dateRange: DateRange): Promise<PerformanceSummary> {
    const query = `
      SELECT 
        SUM(impressions) as totalImpressions,
        SUM(clicks) as totalClicks,
        SUM(cost) as totalCost,
        SUM(conversions) as totalConversions,
        SUM(conversion_value) as totalRevenue,
        AVG(ctr) as avgCTR,
        AVG(cpc) as avgCPC,
        AVG(cpa) as avgCPA,
        AVG(roas) as avgROAS
      FROM ad_performance_daily 
      WHERE account_id = ? 
        AND performance_date BETWEEN ? AND ?
    `;

    const results = await this.db.query(query, [accountId, dateRange.start, dateRange.end]);
    return results[0];
  }

  private async generateRecommendations(summary: PerformanceSummary): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // CTR 분석
    if (summary.avgCTR < 2.0) {
      recommendations.push({
        type: 'CTR_IMPROVEMENT',
        priority: 'high',
        title: '클릭률 개선 필요',
        description: '평균 클릭률이 2% 미만입니다. 광고 문구와 키워드 관련성을 개선하세요.',
        actionItems: [
          '광고 문구 A/B 테스트 실행',
          '키워드와 광고 문구 일치도 검토',
          '부정 키워드 추가로 타겟팅 정교화'
        ]
      });
    }

    // CPA 분석
    if (summary.avgCPA > 50000) {
      recommendations.push({
        type: 'CPA_OPTIMIZATION',
        priority: 'medium',
        title: '획득 단가 최적화',
        description: '평균 획득 단가가 높습니다. 입찰가 조정을 고려하세요.',
        actionItems: [
          '성과가 낮은 키워드 입찰가 조정',
          '컨버전율이 높은 키워드 예산 증액',
          '랜딩 페이지 최적화 검토'
        ]
      });
    }

    // ROAS 분석
    if (summary.avgROAS < 3.0) {
      recommendations.push({
        type: 'ROAS_IMPROVEMENT',
        priority: 'high',
        title: '광고 수익률 개선',
        description: 'ROAS가 300% 미만입니다. 캠페인 전략을 재검토하세요.',
        actionItems: [
          '고수익 키워드 예산 집중',
          '저성과 캠페인 일시정지',
          '타겟 고객층 재정의'
        ]
      });
    }

    return recommendations;
  }
}
```

### Chart.js 성과 시각화
```typescript
// 캠페인 성과 차트 구성
const createPerformanceChart = (performanceData: PerformanceData[]) => {
  return {
    type: 'line',
    data: {
      labels: performanceData.map(d => d.date),
      datasets: [
        {
          label: '클릭수',
          data: performanceData.map(d => d.clicks),
          borderColor: '#4A90E2',
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          yAxisID: 'clicks'
        },
        {
          label: '비용',
          data: performanceData.map(d => d.cost),
          borderColor: '#E74C3C',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          yAxisID: 'cost'
        },
        {
          label: '전환수',
          data: performanceData.map(d => d.conversions),
          borderColor: '#2ECC71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          yAxisID: 'conversions'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        clicks: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: '클릭수' }
        },
        cost: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: '비용 (원)' }
        },
        conversions: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: '전환수' }
        }
      }
    }
  };
};

// 키워드 성과 산점도
const createKeywordScatterChart = (keywordData: KeywordPerformance[]) => {
  return {
    type: 'scatter',
    data: {
      datasets: [{
        label: '키워드 성과',
        data: keywordData.map(k => ({
          x: k.clicks,
          y: k.conversions,
          label: k.keyword,
          cost: k.cost,
          cpa: k.cpa
        })),
        backgroundColor: keywordData.map(k => {
          // CPA에 따른 색상 변경
          return k.cpa < 30000 ? '#2ECC71' : k.cpa < 50000 ? '#F39C12' : '#E74C3C';
        })
      }]
    },
    options: {
      scales: {
        x: { title: { display: true, text: '클릭수' } },
        y: { title: { display: true, text: '전환수' } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const data = context.raw;
              return [
                `키워드: ${data.label}`,
                `클릭수: ${data.x}`,
                `전환수: ${data.y}`,
                `비용: ${data.cost.toLocaleString()}원`,
                `CPA: ${data.cpa.toLocaleString()}원`
              ];
            }
          }
        }
      }
    }
  };
};
```

## 자동화 기능

### 자동 입찰 조정
```typescript
class AutoBiddingManager {
  async runAutoBidding(accountId: number): Promise<BiddingResult> {
    const campaigns = await this.getActiveCampaigns(accountId);
    const results: BiddingResult = {
      adjustedKeywords: 0,
      totalSavings: 0,
      performanceImprovement: 0
    };

    for (const campaign of campaigns) {
      const keywords = await this.getCampaignKeywords(campaign.id);
      
      for (const keyword of keywords) {
        const performance = await this.getKeywordPerformance(keyword.id, 7); // 최근 7일
        const suggestion = this.calculateOptimalBid(keyword, performance);
        
        if (suggestion.shouldAdjust) {
          await this.apiService.updateKeywordBid(keyword.keyword_id, suggestion.newBid);
          
          await this.db.query(`
            UPDATE ad_keywords SET
              bid_amount = ?,
              updated_at = NOW()
            WHERE id = ?
          `, [suggestion.newBid, keyword.id]);
          
          results.adjustedKeywords++;
          results.totalSavings += suggestion.expectedSavings;
        }
      }
    }

    return results;
  }

  private calculateOptimalBid(keyword: Keyword, performance: PerformanceData): BidSuggestion {
    const currentBid = keyword.bid_amount;
    const targetCPA = 40000; // 목표 CPA: 4만원
    const actualCPA = performance.cost / performance.conversions;

    let suggestion: BidSuggestion = {
      shouldAdjust: false,
      newBid: currentBid,
      expectedSavings: 0,
      confidence: 0
    };

    // CPA가 목표보다 높은 경우 입찰가 하향
    if (actualCPA > targetCPA && performance.conversions >= 3) {
      const adjustmentRatio = targetCPA / actualCPA;
      suggestion.newBid = Math.round(currentBid * adjustmentRatio * 0.9); // 보수적으로 10% 추가 할인
      suggestion.shouldAdjust = true;
      suggestion.expectedSavings = (currentBid - suggestion.newBid) * performance.clicks;
      suggestion.confidence = Math.min(performance.conversions / 10, 1); // 전환수가 많을수록 신뢰도 높음
    }
    
    // CPA가 목표보다 낮고 노출량이 충분하지 않은 경우 입찰가 상향
    else if (actualCPA < targetCPA * 0.7 && performance.impressions < 1000) {
      suggestion.newBid = Math.round(currentBid * 1.2);
      suggestion.shouldAdjust = true;
      suggestion.confidence = Math.min(performance.impressions / 5000, 0.8);
    }

    return suggestion;
  }
}
```

### 부정 키워드 자동 추가
```typescript
class NegativeKeywordManager {
  async autoAddNegativeKeywords(accountId: number): Promise<NegativeKeywordResult> {
    const lowPerformanceKeywords = await this.getLowPerformanceKeywords(accountId);
    const suggestions: NegativeKeywordSuggestion[] = [];

    for (const keyword of lowPerformanceKeywords) {
      // 높은 비용, 낮은 전환율 키워드 분석
      if (keyword.cost > 10000 && keyword.conversions === 0 && keyword.clicks > 10) {
        const negativeKeywords = this.extractNegativeKeywords(keyword.keyword_text);
        
        for (const negKeyword of negativeKeywords) {
          suggestions.push({
            campaignId: keyword.campaign_id,
            keywordText: negKeyword,
            matchType: 'EXACT',
            reason: `높은 비용 (${keyword.cost}원), 전환 없음`,
            confidence: 0.8
          });
        }
      }
    }

    // 자동으로 부정 키워드 추가
    for (const suggestion of suggestions.slice(0, 50)) { // 최대 50개까지
      await this.addNegativeKeyword(suggestion);
    }

    return {
      addedCount: suggestions.length,
      estimatedSavings: this.calculateEstimatedSavings(suggestions)
    };
  }

  private extractNegativeKeywords(keywordText: string): string[] {
    const negativePatterns = [
      '무료', '공짜', '할인', '이벤트', '체험', '샘플',
      '리뷰', '후기', '비교', '순위', '추천',
      '채용', '구인', '알바', '아르바이트'
    ];

    return negativePatterns.filter(pattern => 
      keywordText.includes(pattern)
    );
  }
}
```

## 사용자 권한 관리

### 계층형 권한 시스템
```typescript
// 광고 계정 접근 권한 관리
class AdsPermissionManager {
  async checkAdAccountAccess(userId: number, accountId: number): Promise<boolean> {
    const user = await this.getUserWithRole(userId);
    
    // 관리자는 모든 계정 접근 가능
    if (user.role === 'admin') return true;
    
    // 일반 사용자는 본인 계정만
    const account = await this.getAdAccount(accountId);
    return account.user_id === userId;
  }

  async getAccessibleAccounts(userId: number): Promise<AdAccount[]> {
    const user = await this.getUserWithRole(userId);
    
    if (user.role === 'admin') {
      return await this.getAllAdAccounts();
    }
    
    return await this.getUserAdAccounts(userId);
  }
}
```

## 트러블슈팅

### 일반적인 문제
1. **API 호출 한도 초과**: Rate limiting 구현 및 요청 배치 처리
2. **데이터 동기화 지연**: 증분 동기화 및 우선순위 기반 업데이트
3. **대용량 성과 데이터**: 인덱스 최적화 및 파티셔닝 적용

### 성능 모니터링
```typescript
class AdsPerformanceMonitor {
  async monitorAPIHealth(): Promise<APIHealthStatus> {
    const status: APIHealthStatus = {
      isHealthy: true,
      responseTime: 0,
      errorRate: 0,
      lastSuccessfulSync: null
    };

    try {
      const startTime = Date.now();
      await this.apiService.getCampaigns();
      status.responseTime = Date.now() - startTime;
      
      // 최근 24시간 에러율 계산
      status.errorRate = await this.calculateErrorRate();
      status.lastSuccessfulSync = await this.getLastSyncTime();
      
    } catch (error) {
      status.isHealthy = false;
      console.error('API 상태 확인 실패:', error);
    }

    return status;
  }
}
```

## 업데이트 로그

### v1.3.0 (2025-08-10)
- 자동 입찰 조정 기능 추가
- 부정 키워드 자동 관리
- 성과 예측 알고리즘 개선

### v1.2.0 (2025-07-20)
- 실시간 성과 대시보드 구현
- 다중 광고 계정 관리
- API 동기화 안정성 개선

### v1.1.0 (2025-07-01)
- 네이버 검색광고 API v2 연동
- 기본 캠페인 및 키워드 관리
- 성과 분석 리포트 생성

### v1.0.0 (2025-06-15)
- 초기 광고 대시보드 구현
- 기본 성과 지표 시각화
- 사용자 권한 관리 시스템