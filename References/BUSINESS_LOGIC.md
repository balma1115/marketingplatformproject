# MarketingPlat 핵심 비즈니스 로직

## 개요
MarketingPlat의 핵심 비즈니스 로직은 AI 기반 콘텐츠 생성, 네이버 검색 분석, 스마트플레이스 순위 추적, 그리고 냥 코인 시스템으로 구성됩니다.

## 1. 냥 코인 시스템 (Core Economy)

### 코인 구조
```typescript
interface CoinSystem {
  coin: number;           // 현재 잔액
  used_coin: number;      // 누적 사용량
  purchased_coin: number; // 누적 구매량
}
```

### 서비스별 코인 소모량
- **AI 글쓰기**: 3냥/요청
- **이미지 생성**: 
  - Flux Dev: 1냥
  - Flux Pro: 1.3냥  
  - Flux Max: 2.1냥
- **키워드 분석**: 1냥/요청
- **순위 체크**: 0.5냥/키워드

### 코인 차감 로직
```typescript
async function deductCoins(userId: number, amount: number, service: string) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. 현재 잔액 확인
    const [users] = await connection.execute(
      'SELECT coin FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    
    if (users[0].coin < amount) {
      throw new Error('INSUFFICIENT_COINS');
    }
    
    // 2. 코인 차감 및 사용 내역 업데이트
    await connection.execute(
      'UPDATE users SET coin = coin - ?, used_coin = used_coin + ? WHERE id = ?',
      [amount, amount, userId]
    );
    
    // 3. 사용 로그 기록
    await connection.execute(
      'INSERT INTO api_usage_logs (user_id, service_type, cost_in_nyang, created_at) VALUES (?, ?, ?, NOW())',
      [userId, service, amount]
    );
    
    await connection.commit();
    return true;
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

## 2. AI 콘텐츠 생성 시스템

### Gemini AI 서비스 아키텍처

#### 핵심 컴포넌트
```typescript
class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  
  // 참조 파일 기반 컨텍스트 생성
  private async getReferenceContent(gptType: string, useFor: 'title' | 'toc' | 'content'): Promise<string>
  
  // 블로그 제목 생성
  async generateBlogTitles(topic: string, gptType: string): Promise<string[]>
  
  // 블로그 콘텐츠 생성
  async generateBlogContent(title: string, gptType: string): Promise<string>
  
  // 키워드 추출
  async extractKeywords(text: string): Promise<string[]>
}
```

#### GPT 타입별 프롬프트 시스템
```typescript
interface GPTPromptConfig {
  titleGeneration: string;      // 제목 생성 프롬프트
  contentGeneration: string;    // 콘텐츠 생성 프롬프트
  tocGeneration: string;        // 목차 생성 프롬프트
  keywordExtraction: string;    // 키워드 추출 프롬프트
  referenceFiles: Array<{      // 참조 파일 목록
    path: string;
    description: string;
    useFor: ('title' | 'toc' | 'content')[];
  }>;
}

const gptTypes = {
  'english-branch': {
    titleGeneration: "영어 지사 관점에서 매력적인 블로그 제목을 5개 생성하세요...",
    contentGeneration: "영어 교육 전문가의 시각으로 상세한 블로그 글을 작성하세요...",
    referenceFiles: [
      {
        path: 'src/reference-files/english-branch-guide.txt',
        description: '영어 지사 운영 가이드',
        useFor: ['title', 'content']
      }
    ]
  }
};
```

#### 토큰 추적 및 비용 계산
```typescript
class TokenTrackingService {
  private readonly pricing: ModelPricing = {
    'gemini-2.0-flash-exp': {
      inputCostPer1K: 0.000075,   // $0.075 per 1M tokens
      outputCostPer1K: 0.0003,    // $0.30 per 1M tokens
    }
  };
  
  async trackUsage(tokenUsage: TokenUsage): Promise<void> {
    const cost = this.calculateCost(tokenUsage);
    await this.saveUsageLog({
      ...tokenUsage,
      cost,
      timestamp: new Date()
    });
  }
  
  private calculateCost(usage: TokenUsage): number {
    const pricing = this.pricing[usage.model];
    const inputCost = (usage.inputTokens / 1000) * pricing.inputCostPer1K;
    const outputCost = (usage.outputTokens / 1000) * pricing.outputCostPer1K;
    return inputCost + outputCost;
  }
}
```

## 3. 네이버 검색 분석 시스템

### 검색 결과 분석기
```typescript
class NaverSearchAnalyzer {
  private browser: Browser;
  
  async analyzePCSearch(keyword: string): Promise<SearchResult> {
    // 1. 브라우저 초기화 (Playwright)
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
    });
    
    // 2. 네이버 검색 페이지 방문
    const page = await context.newPage();
    const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
    await page.goto(url);
    
    // 3. DOM 구조 분석
    const tabs = await page.evaluate(() => {
      const tabElements = document.querySelectorAll('.lnb_nav_area a');
      return Array.from(tabElements).map(tab => tab.textContent?.trim() || '');
    });
    
    // 4. 검색 결과 섹션 추출
    const mainSections = await this.extractSearchSections(page);
    
    return { tabs, mainSections };
  }
  
  private async extractSearchSections(page: Page): Promise<SearchSection[]> {
    return await page.evaluate(() => {
      const sections = [];
      
      // 광고 섹션 감지
      const adSections = document.querySelectorAll('.link_ad, .ad_label');
      
      // 일반 검색 결과 감지
      const organicResults = document.querySelectorAll('#main_pack .sc_page_inner');
      
      // 스마트플레이스 섹션 감지
      const placeSections = document.querySelectorAll('.place_section');
      
      return sections;
    });
  }
}
```

### 광고 필터링 로직
```typescript
class AdDetectionService {
  static isAdvertisement(element: Element): boolean {
    // 1. 명시적 광고 마커 확인
    if (element.querySelector('.link_ad, .ad_label, .splink_ad')) {
      return true;
    }
    
    // 2. 클래스명 기반 감지
    const adClasses = ['area_ad', 'shop_ad', 'power_link'];
    if (adClasses.some(cls => element.classList.contains(cls))) {
      return true;
    }
    
    // 3. 텍스트 기반 감지 ("광고", "AD" 등)
    const adText = element.textContent?.toLowerCase();
    if (adText?.includes('광고') || adText?.includes('ad')) {
      return true;
    }
    
    return false;
  }
  
  static filterOrganicResults(results: Element[]): Element[] {
    return results.filter(result => !this.isAdvertisement(result));
  }
}
```

## 4. 스마트플레이스 순위 추적 시스템

### 적응형 순위 체크 서비스
```typescript
class AdaptiveRankingService {
  private useAwsLambda: boolean;
  
  constructor() {
    this.useAwsLambda = process.env.USE_LAMBDA === 'true';
  }
  
  async checkRankings(keywords: KeywordRequest[]): Promise<RankingResult[]> {
    if (this.useAwsLambda && process.env.NODE_ENV === 'production') {
      return await this.checkWithLambda(keywords);
    } else {
      return await this.checkWithPuppeteer(keywords);
    }
  }
  
  private async checkWithLambda(keywords: KeywordRequest[]): Promise<RankingResult[]> {
    // AWS Lambda를 사용한 병렬 처리 (100개 키워드 → 2분)
    const lambda = new AWS.Lambda();
    const batchSize = 10;
    const batches = this.chunkArray(keywords, batchSize);
    
    const promises = batches.map(batch => 
      lambda.invoke({
        FunctionName: 'smartplace-ranking-checker',
        Payload: JSON.stringify({ keywords: batch })
      }).promise()
    );
    
    const results = await Promise.all(promises);
    return results.flatMap(result => JSON.parse(result.Payload as string));
  }
  
  private async checkWithPuppeteer(keywords: KeywordRequest[]): Promise<RankingResult[]> {
    // 로컬 Puppeteer 순차 처리 (100개 키워드 → 30분)
    const results: RankingResult[] = [];
    
    for (const keyword of keywords) {
      try {
        const result = await this.checkSingleKeyword(keyword);
        results.push(result);
        await this.delay(2000); // Rate limiting
      } catch (error) {
        console.error(`Failed to check ${keyword.keyword}:`, error);
        results.push({
          keyword: keyword.keyword,
          rank: -1,
          found: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}
```

### 네이버 지도 검색 서비스
```typescript
class NaverMapSearchService {
  async searchPlace(keyword: string, location?: string): Promise<PlaceSearchResult[]> {
    const page = await this.browser.newPage();
    
    // 1. 네이버 지도에서 검색
    const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(keyword)}`;
    if (location) {
      searchUrl += `?c=${location}`;
    }
    
    await page.goto(searchUrl);
    await page.waitForSelector('#searchIframe');
    
    // 2. 검색 결과 iframe 내부 접근
    const frame = page.frame('searchIframe');
    if (!frame) throw new Error('Search iframe not found');
    
    // 3. 검색 결과 추출
    const results = await frame.evaluate(() => {
      const places = [];
      const placeElements = document.querySelectorAll('._pcmap_list_scroll_container li');
      
      placeElements.forEach((element, index) => {
        const nameElement = element.querySelector('.place_bluelink .TYaxT');
        const addressElement = element.querySelector('.LDgIH');
        const ratingElement = element.querySelector('.orXYY .PXMot em');
        
        places.push({
          rank: index + 1,
          name: nameElement?.textContent || '',
          address: addressElement?.textContent || '',
          rating: ratingElement?.textContent || '',
          placeId: this.extractPlaceId(element)
        });
      });
      
      return places;
    });
    
    return results;
  }
  
  private extractPlaceId(element: Element): string | null {
    // 네이버 플레이스 ID 추출 로직
    const linkElement = element.querySelector('a[href*="place/"]');
    if (!linkElement) return null;
    
    const href = linkElement.getAttribute('href');
    const match = href?.match(/place\/(\d+)/);
    return match ? match[1] : null;
  }
}
```

## 5. 블로그 추적 시스템

### 블로그 키워드 분석기
```typescript
class BlogKeywordAnalyzer {
  private nlpServiceUrl: string;
  
  async analyzeKeywords(text: string): Promise<KeywordAnalysisResult> {
    // 1. NLP 서비스로 한국어 형태소 분석 요청
    const response = await axios.post(`${this.nlpServiceUrl}/analyze`, {
      text,
      options: {
        extract_keywords: true,
        remove_stopwords: true,
        pos_filtering: ['NNG', 'NNP', 'VV', 'VA'] // 명사, 동사, 형용사만
      }
    });
    
    const { keywords, frequencies } = response.data;
    
    // 2. TF-IDF 점수 계산
    const tfidfScores = await this.calculateTFIDF(keywords, text);
    
    // 3. 키워드 중요도 순으로 정렬
    const sortedKeywords = keywords.map((keyword: string, index: number) => ({
      keyword,
      frequency: frequencies[index],
      tfidf: tfidfScores[keyword] || 0,
      importance: this.calculateImportance(frequencies[index], tfidfScores[keyword] || 0)
    })).sort((a, b) => b.importance - a.importance);
    
    return {
      keywords: sortedKeywords.slice(0, 20), // Top 20 키워드
      totalWords: text.split(/\s+/).length,
      uniqueWords: new Set(keywords).size
    };
  }
  
  private calculateImportance(frequency: number, tfidf: number): number {
    // 빈도와 TF-IDF 점수를 조합한 중요도 계산
    return (frequency * 0.4) + (tfidf * 0.6);
  }
}
```

### 블로그 순위 추적기
```typescript
class BlogTrackingService {
  async trackBlogRankings(projectId: number): Promise<TrackingResult[]> {
    // 1. 프로젝트의 키워드 목록 조회
    const keywords = await this.getProjectKeywords(projectId);
    
    // 2. 각 키워드에 대해 네이버 블로그 검색
    const results: TrackingResult[] = [];
    
    for (const keyword of keywords) {
      try {
        const searchResults = await this.searchNaverBlog(keyword.keyword, keyword.location);
        const blogRanking = this.findBlogInResults(searchResults, keyword.targetBlogUrl);
        
        results.push({
          keywordId: keyword.id,
          keyword: keyword.keyword,
          checkDate: new Date().toISOString().split('T')[0],
          rank: blogRanking.rank,
          found: blogRanking.found,
          blogUrl: blogRanking.url,
          blogTitle: blogRanking.title
        });
        
        await this.delay(1000); // Rate limiting
      } catch (error) {
        console.error(`Failed to track keyword ${keyword.keyword}:`, error);
      }
    }
    
    // 3. 결과를 데이터베이스에 저장
    await this.saveBlogTrackingResults(results);
    
    return results;
  }
  
  private async searchNaverBlog(keyword: string, location?: string): Promise<BlogSearchResult[]> {
    const page = await this.browser.newPage();
    
    // 네이버 블로그 검색 (광고 제외 필터링 적용)
    const searchUrl = `https://search.naver.com/search.naver?where=post&query=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl);
    
    // 광고가 아닌 실제 블로그 글만 추출
    const organicResults = await page.evaluate(() => {
      const results = [];
      const postElements = document.querySelectorAll('#main_pack .bx:not(.ad)');
      
      postElements.forEach((element, index) => {
        // 광고 마커 확인
        if (element.querySelector('.link_ad, .ad_label')) return;
        
        const titleElement = element.querySelector('.sh_blog_title');
        const urlElement = element.querySelector('.sh_blog_title');
        const excerptElement = element.querySelector('.sh_blog_passage');
        
        results.push({
          rank: index + 1,
          title: titleElement?.textContent || '',
          url: urlElement?.getAttribute('href') || '',
          excerpt: excerptElement?.textContent || ''
        });
      });
      
      return results;
    });
    
    return organicResults;
  }
}
```

## 6. 스케줄링 시스템

### 연속 추적 스케줄러
```typescript
class ContinuousTrackingScheduler {
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  
  start() {
    // 매일 자정에 전체 키워드 추적 실행
    cron.schedule('0 0 * * *', async () => {
      await this.runDailyTracking();
    });
    
    // 매시간 우선순위 키워드 추적
    cron.schedule('0 * * * *', async () => {
      await this.runHourlyTracking();
    });
  }
  
  private async runDailyTracking() {
    console.log('Starting daily tracking...');
    
    // 1. 활성 프로젝트의 모든 키워드 조회
    const activeKeywords = await this.getActiveKeywords();
    
    // 2. 환경에 따른 적응형 처리
    const adaptiveService = new AdaptiveRankingService();
    
    // 3. 배치 단위로 처리 (메모리 효율성)
    const batchSize = process.env.NODE_ENV === 'production' ? 100 : 20;
    const batches = this.chunkArray(activeKeywords, batchSize);
    
    for (const batch of batches) {
      try {
        const results = await adaptiveService.checkRankings(batch);
        await this.saveRankingResults(results);
        
        // 배치 간 대기 (Rate Limiting)
        await this.delay(5000);
      } catch (error) {
        console.error('Batch processing failed:', error);
      }
    }
    
    console.log('Daily tracking completed');
  }
}
```

## 7. 데이터 캐싱 전략

### 메모리 캐시 서비스
```typescript
class MemoryCache {
  private cache: Map<string, CacheItem> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5분
  
  set(key: string, value: any, ttl?: number): void {
    const expiration = Date.now() + (ttl || this.TTL);
    this.cache.set(key, {
      value,
      expiration
    });
  }
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item || Date.now() > item.expiration) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }
  
  // 키워드 검색 결과 캐싱
  async getCachedSearch(keyword: string, location: string): Promise<SearchResult | null> {
    const cacheKey = `search:${keyword}:${location}`;
    return this.get<SearchResult>(cacheKey);
  }
  
  async setCachedSearch(keyword: string, location: string, result: SearchResult): void {
    const cacheKey = `search:${keyword}:${location}`;
    this.set(cacheKey, result, 10 * 60 * 1000); // 10분 캐시
  }
}
```

## 8. 에러 처리 및 복구 로직

### 크롤러 에러 핸들러
```typescript
class CrawlerErrorHandler {
  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        // 특정 에러는 즉시 실패
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // 마지막 시도가 아니면 대기 후 재시도
        if (attempt < maxRetries) {
          await this.delay(delay * attempt); // 지수 백오프
        }
      }
    }
    
    throw lastError!;
  }
  
  private static isNonRetryableError(error: Error): boolean {
    const nonRetryableMessages = [
      'INSUFFICIENT_COINS',
      'INVALID_PLACE_ID',
      'USER_NOT_FOUND'
    ];
    
    return nonRetryableMessages.some(msg => 
      error.message.includes(msg)
    );
  }
}
```

이러한 비즈니스 로직들이 MarketingPlat의 핵심 기능들을 구현하며, 확장 가능하고 유지보수하기 쉬운 아키텍처를 제공합니다.