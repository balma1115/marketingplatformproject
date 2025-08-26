# 05_분석도구 모듈

## 개요
블로그 키워드 추적 및 분석 도구를 제공하는 모듈입니다.

## 주요 기능
- 블로그 키워드 순위 추적
- 블로그 분석 및 업데이트
- 키워드 분석 대시보드
- 경쟁업체 블로그 모니터링
- 트렌드 분석 리포트

## 기술 스택

### Frontend
- React 18 with TypeScript
- Chart.js for analytics visualization
- Date range picker components
- Real-time data updates

### Backend
- Node.js with Express
- Puppeteer for blog scraping
- Cheerio for HTML parsing
- Custom blog ranking algorithms

## 프로젝트 구조

```
05_분석도구/
├── frontend/
│   ├── components/
│   │   ├── MonthlyDataTable.tsx
│   │   ├── DateRangePicker.tsx
│   │   └── PerformanceDashboard.tsx
│   ├── pages/
│   │   ├── BlogKeywordTracking.tsx
│   │   ├── BlogAnalysisUpdate.tsx
│   │   ├── KeywordAnalyticsDashboard.tsx
│   │   └── BlogTracking.tsx
│   └── styles/
│       ├── BlogAnalysisPage.css
│       ├── BlogTracking.css
│       ├── MonthlyDataTable.css
│       └── PerformanceDashboard.css
├── backend/
│   ├── routes/
│   │   ├── blog-analysis.routes.ts
│   │   ├── blog-tracking.routes.ts
│   │   ├── blog-update.routes.ts
│   │   └── my-blog.routes.ts
│   ├── services/
│   │   ├── blogAnalysisService.ts
│   │   ├── blogKeywordAnalyzer.ts
│   │   ├── blogScrapingService.ts
│   │   ├── blogTrackingService.ts
│   │   └── naverBlogScraper.ts
│   └── config/
│       └── blog-selectors.json
└── database/
    └── blog_analysis_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Frontend 의존성
npm install react react-dom chart.js react-chartjs-2 date-fns

# Backend 의존성
npm install puppeteer cheerio axios cron node-schedule
```

### 환경 변수
```env
# 스크래핑 설정
PUPPETEER_HEADLESS=true
BLOG_SCRAPING_DELAY=1000
MAX_CONCURRENT_SCRAPERS=5

# 네이버 블로그 API
NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret

# 캐싱 설정
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

## API 엔드포인트

### 블로그 분석
```http
POST /api/blog-analysis/analyze
Content-Type: application/json

{
  "keyword": "영어학원",
  "location": "강남구",
  "analysisType": "ranking"
}
```

### 키워드 추적 시작
```http
POST /api/blog-tracking/start
Content-Type: application/json

{
  "keywords": ["영어학원", "토익학원"],
  "blogUrl": "https://blog.naver.com/example",
  "trackingInterval": "daily"
}
```

### 추적 결과 조회
```http
GET /api/blog-tracking/results
?keyword=영어학원&period=7days&blogUrl=https://blog.naver.com/example
```

### 블로그 업데이트 분석
```http
POST /api/blog-update/analyze
Content-Type: application/json

{
  "blogUrl": "https://blog.naver.com/example",
  "targetKeywords": ["영어학원", "토익학원"]
}
```

## 데이터베이스 스키마

### blog_keyword_tracking 테이블
```sql
CREATE TABLE blog_keyword_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    blog_url TEXT NOT NULL,
    ranking_position INT,
    page_number INT DEFAULT 1,
    total_results INT,
    tracking_date DATE NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    snippet_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_keyword_date (keyword, tracking_date),
    INDEX idx_blog_url (blog_url(255))
);
```

### blog_analysis_results 테이블
```sql
CREATE TABLE blog_analysis_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    blog_url TEXT NOT NULL,
    title VARCHAR(500),
    content_summary TEXT,
    ranking_factors JSON,
    seo_score DECIMAL(5,2),
    content_score DECIMAL(5,2),
    competition_level ENUM('low', 'medium', 'high'),
    recommendations JSON,
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### blog_tracking_schedules 테이블
```sql
CREATE TABLE blog_tracking_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    keywords JSON NOT NULL,
    blog_urls JSON NOT NULL,
    tracking_interval ENUM('hourly', 'daily', 'weekly') DEFAULT 'daily',
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 사용 방법

### 1. 블로그 키워드 추적 설정
```typescript
// 키워드 추적 시작
const startTracking = async () => {
  const trackingConfig = {
    keywords: ['영어학원', '토익학원'],
    blogUrl: 'https://blog.naver.com/example',
    trackingInterval: 'daily'
  };
  
  const response = await api.post('/blog-tracking/start', trackingConfig);
  console.log('추적 시작:', response.data.scheduleId);
};
```

### 2. 블로그 분석 실행
```typescript
// 키워드별 블로그 분석
const analyzeBlog = async () => {
  const analysis = await api.post('/blog-analysis/analyze', {
    keyword: '영어학원',
    location: '강남구',
    analysisType: 'comprehensive'
  });
  
  console.log('분석 결과:', analysis.data);
};
```

### 3. 추적 결과 시각화
```typescript
// Chart.js를 사용한 추적 결과 차트
const createTrackingChart = (trackingData: any[]) => {
  return {
    type: 'line',
    data: {
      labels: trackingData.map(d => d.date),
      datasets: [{
        label: '블로그 순위',
        data: trackingData.map(d => d.ranking),
        borderColor: '#4A90E2',
        backgroundColor: 'rgba(74, 144, 226, 0.1)',
        yAxisID: 'ranking'
      }]
    },
    options: {
      scales: {
        ranking: {
          type: 'linear',
          position: 'left',
          reverse: true, // 낮은 순위(1위)가 위로
          min: 1
        }
      }
    }
  };
};
```

## 스크래핑 서비스

### 네이버 블로그 스크래핑
```typescript
// 광고 필터링이 적용된 블로그 스크래핑
class NaverBlogScraper {
  async searchBlogRanking(keyword: string, targetBlogUrl: string): Promise<BlogRankingResult> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // 검색 실행
      await page.goto(`https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(keyword)}`);
      await page.waitForSelector('#main_pack');
      
      // 광고 섹션 제외
      await page.evaluate(() => {
        const adElements = document.querySelectorAll('.link_ad, .ad_label, .splink_ad');
        adElements.forEach(el => el.remove());
      });
      
      // 일반 블로그 결과 추출
      const blogResults = await page.$$eval('.blog_list .total_wrap', elements => {
        return elements.map((el, index) => {
          const titleElement = el.querySelector('.title_link');
          const urlElement = el.querySelector('.title_link');
          
          return {
            rank: index + 1,
            title: titleElement?.textContent?.trim() || '',
            url: urlElement?.getAttribute('href') || '',
            snippet: el.querySelector('.dsc_wrap')?.textContent?.trim() || ''
          };
        });
      });
      
      // 타겟 블로그 순위 찾기
      const targetRank = blogResults.findIndex(result => 
        result.url.includes(targetBlogUrl.replace('https://', '').replace('http://', ''))
      );
      
      return {
        keyword,
        blogUrl: targetBlogUrl,
        ranking: targetRank >= 0 ? targetRank + 1 : null,
        totalResults: blogResults.length,
        results: blogResults
      };
      
    } finally {
      await browser.close();
    }
  }
}
```

### 블로그 분석 서비스
```typescript
// 블로그 콘텐츠 분석 및 SEO 점수 계산
class BlogAnalysisService {
  async analyzeBlogContent(blogUrl: string, targetKeywords: string[]): Promise<BlogAnalysis> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto(blogUrl);
      
      // 콘텐츠 추출
      const content = await page.evaluate(() => {
        return {
          title: document.querySelector('.se-title')?.textContent || '',
          body: document.querySelector('.se-main-container')?.textContent || '',
          images: Array.from(document.querySelectorAll('img')).length,
          links: Array.from(document.querySelectorAll('a')).length
        };
      });
      
      // SEO 점수 계산
      const seoScore = this.calculateSEOScore(content, targetKeywords);
      
      // 개선 제안 생성
      const recommendations = this.generateRecommendations(content, targetKeywords, seoScore);
      
      return {
        url: blogUrl,
        content,
        seoScore,
        recommendations,
        analyzedAt: new Date()
      };
      
    } finally {
      await browser.close();
    }
  }
  
  private calculateSEOScore(content: any, keywords: string[]): number {
    let score = 0;
    const maxScore = 100;
    
    // 제목에 키워드 포함 여부 (30점)
    if (keywords.some(k => content.title.includes(k))) {
      score += 30;
    }
    
    // 본문 키워드 밀도 (25점)
    const keywordDensity = this.calculateKeywordDensity(content.body, keywords);
    score += Math.min(25, keywordDensity * 5);
    
    // 콘텐츠 길이 (20점)
    if (content.body.length > 1000) score += 20;
    else if (content.body.length > 500) score += 15;
    else if (content.body.length > 200) score += 10;
    
    // 이미지 포함 (15점)
    if (content.images > 0) score += 15;
    
    // 링크 포함 (10점)
    if (content.links > 0) score += 10;
    
    return Math.min(score, maxScore);
  }
}
```

## 실시간 추적 기능

### 웹소켓 연동
```typescript
// 실시간 추적 결과 업데이트
class BlogTrackingWebSocket {
  private io: Server;
  
  constructor(server: http.Server) {
    this.io = new Server(server, {
      cors: { origin: "*" }
    });
    
    this.io.on('connection', (socket) => {
      socket.on('subscribe-tracking', (data) => {
        const { userId, keywords } = data;
        socket.join(`tracking-${userId}`);
        
        // 해당 사용자의 추적 결과 업데이트 시 알림
        this.subscribeToTrackingUpdates(userId, keywords);
      });
    });
  }
  
  broadcastTrackingUpdate(userId: number, trackingResult: any) {
    this.io.to(`tracking-${userId}`).emit('tracking-update', trackingResult);
  }
}
```

### 스케줄러 서비스
```typescript
// Cron 기반 정기 추적
import * as cron from 'node-cron';

class BlogTrackingScheduler {
  start() {
    // 매일 오전 9시에 일간 추적 실행
    cron.schedule('0 9 * * *', async () => {
      await this.runDailyTracking();
    });
    
    // 매주 월요일 오전 8시에 주간 추적 실행
    cron.schedule('0 8 * * 1', async () => {
      await this.runWeeklyTracking();
    });
  }
  
  private async runDailyTracking() {
    const schedules = await this.getActiveSchedules('daily');
    
    for (const schedule of schedules) {
      try {
        await this.executeTracking(schedule);
        await this.updateLastRun(schedule.id);
      } catch (error) {
        console.error(`추적 실행 오류 (Schedule ${schedule.id}):`, error);
      }
    }
  }
}
```

## 성능 최적화

### 캐싱 전략
```typescript
// Redis 캐싱으로 스크래핑 결과 저장
class BlogScrapingCache {
  private redis: Redis;
  
  async getCachedResult(keyword: string, blogUrl: string): Promise<any> {
    const cacheKey = `blog:${keyword}:${Buffer.from(blogUrl).toString('base64')}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      const result = JSON.parse(cached);
      // 1시간 이내 결과만 사용
      if (Date.now() - result.timestamp < 3600000) {
        return result.data;
      }
    }
    
    return null;
  }
  
  async setCachedResult(keyword: string, blogUrl: string, data: any) {
    const cacheKey = `blog:${keyword}:${Buffer.from(blogUrl).toString('base64')}`;
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    
    await this.redis.setex(cacheKey, 3600, JSON.stringify(cacheData));
  }
}
```

### 동시 처리 제한
```typescript
// 동시 스크래핑 작업 수 제한
import pLimit from 'p-limit';

class ConcurrencyManager {
  private limit = pLimit(5); // 최대 5개 동시 실행
  
  async processBlogTracking(trackingTasks: TrackingTask[]) {
    const results = await Promise.all(
      trackingTasks.map(task => 
        this.limit(() => this.executeSingleTracking(task))
      )
    );
    
    return results;
  }
}
```

## 트러블슈팅

### 일반적인 문제
1. **스크래핑 실패**: 네이버 구조 변경 또는 차단 - 셀렉터 업데이트 필요
2. **메모리 누수**: Puppeteer 인스턴스 미해제 - finally 블록에서 browser.close() 보장
3. **데이터베이스 락**: 동시 추적 작업 - 트랜잭션 최적화 및 인덱스 추가

### 모니터링
```typescript
// 추적 성능 모니터링
class TrackingPerformanceMonitor {
  async trackPerformance(operation: string, fn: Function) {
    const startTime = Date.now();
    let success = false;
    
    try {
      const result = await fn();
      success = true;
      return result;
    } catch (error) {
      console.error(`${operation} 실행 오류:`, error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      await this.logPerformance(operation, duration, success);
    }
  }
  
  private async logPerformance(operation: string, duration: number, success: boolean) {
    await db.query(`
      INSERT INTO performance_logs (operation, duration, success, timestamp) 
      VALUES (?, ?, ?, NOW())
    `, [operation, duration, success]);
  }
}
```

## 업데이트 로그

### v1.3.0 (2025-08-08)
- 광고 필터링 정확도 대폭 개선
- 실제 블로그 검색 결과만 추출하도록 수정
- 백업 로직으로 안정성 확보

### v1.2.0 (2025-07-20)
- 실시간 추적 기능 추가
- 웹소켓 기반 라이브 업데이트
- 성능 모니터링 강화

### v1.1.0 (2025-07-01)
- 블로그 콘텐츠 분석 기능 추가
- SEO 점수 계산 알고리즘 개발
- 개선 제안 자동 생성

### v1.0.0 (2025-06-15)
- 기본 블로그 키워드 추적 기능
- 네이버 블로그 스크래핑 구현
- 추적 스케줄러 개발