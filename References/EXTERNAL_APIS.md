# MarketingPlat 외부 API 연동 가이드

## 개요
MarketingPlat은 다양한 외부 API와 연동하여 AI 기반 콘텐츠 생성, 이미지 생성, 네이버 서비스 분석 등의 기능을 제공합니다.

## 1. Google Gemini AI API

### 개요
- **목적**: AI 기반 블로그 콘텐츠 생성, 키워드 추출
- **모델**: gemini-2.0-flash-exp (기본), gemini-1.5-pro (고급)
- **비용**: 입력 $0.075/1M tokens, 출력 $0.30/1M tokens

### 설정
```typescript
// 환경변수
GEMINI_API_KEY=your_google_gemini_api_key

// 서비스 초기화
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
```

### 주요 기능

#### 1. 블로그 제목 생성
```typescript
async generateBlogTitles(topic: string, gptType: string): Promise<string[]> {
  const gptPrompts = getGPTPrompts(gptType);
  const referenceContent = await this.getReferenceContent(gptType, 'title');
  
  const prompt = `${gptPrompts.titleGeneration}
${referenceContent}
주제: ${topic}

5개의 매력적인 블로그 제목을 생성하세요.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // 토큰 사용량 추적
  await tokenTrackingService.trackUsage({
    inputTokens: result.response.usageMetadata?.promptTokenCount || 0,
    outputTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
    totalTokens: result.response.usageMetadata?.totalTokenCount || 0,
    model: 'gemini-2.0-flash-exp'
  });
  
  return this.parseTitlesFromResponse(text);
}
```

#### 2. 블로그 콘텐츠 생성
```typescript
async generateBlogContent(title: string, gptType: string): Promise<string> {
  const gptPrompts = getGPTPrompts(gptType);
  const referenceContent = await this.getReferenceContent(gptType, 'content');
  
  const prompt = `${gptPrompts.contentGeneration}
${referenceContent}
제목: ${title}

전문적이고 상세한 블로그 글을 작성하세요.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

### GPT 타입별 프롬프트 시스템
```typescript
interface GPTPromptConfig {
  titleGeneration: string;
  contentGeneration: string;
  tocGeneration: string;
  keywordExtraction: string;
  referenceFiles: Array<{
    path: string;
    description: string;
    useFor: ('title' | 'toc' | 'content')[];
  }>;
}

const gptTypes = {
  'english-branch': {
    titleGeneration: `영어 지사 관점에서 학부모와 학생들에게 매력적인 블로그 제목을 생성하세요. 
    - SEO 최적화된 키워드 포함
    - 클릭을 유도하는 감정적 어필
    - 영어 교육의 전문성 어필`,
    
    contentGeneration: `영어 교육 전문가의 시각에서 상세하고 전문적인 블로그 글을 작성하세요.
    - 교육학적 근거 제시
    - 구체적인 사례와 팁
    - 학부모 관심사 반영`,
    
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

## 2. Flux API (Black Forest Labs)

### 개요
- **목적**: 고품질 AI 이미지 생성
- **모델**: flux-dev (1냥), flux-pro (1.3냥), flux-max (2.1냥)
- **API URL**: https://api.bfl.ml

### 설정
```typescript
// 환경변수
FLUX_API_KEY=your_flux_api_key

// 서비스 설정
interface FluxConfig {
  apiKey: string;
  baseUrl: string;
  models: {
    'flux-dev': { cost: 1.0 };
    'flux-pro': { cost: 1.3 };
    'flux-max': { cost: 2.1 };
  };
}
```

### 이미지 생성 워크플로우
```typescript
// 1. 이미지 생성 요청
async generateImage(prompt: string, model: string): Promise<string> {
  const response = await axios.post(`${this.baseUrl}/generate`, {
    model,
    prompt,
    width: 1024,
    height: 768,
    steps: 20
  }, {
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.taskId;
}

// 2. 생성 결과 조회
async getGenerationResult(taskId: string): Promise<FluxResult> {
  const response = await axios.get(`${this.baseUrl}/result/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${this.apiKey}`
    }
  });
  
  return response.data;
}

// 3. 이미지 프록시 (CORS 해결)
async proxyImage(imageUrl: string): Promise<Buffer> {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'MarketingPlat/1.0'
    }
  });
  
  return Buffer.from(response.data);
}
```

### 사용량 추적 시스템
```typescript
interface FluxUsageData {
  daily: {
    [date: string]: {
      requestCount: number;
      freeCount: number;
      proCount: number;
      totalCost: number;
      requests: FluxRequest[];
    };
  };
  monthly: { [month: string]: FluxSummary };
  lifetime: FluxSummary;
}

export function trackFluxUsage(taskId: string, model: string, cost: number) {
  const data = readFluxUsage();
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  
  // 일별 사용량 업데이트
  if (!data.daily[today]) {
    data.daily[today] = {
      requestCount: 0,
      freeCount: 0,
      proCount: 0,
      totalCost: 0,
      requests: []
    };
  }
  
  data.daily[today].requestCount++;
  data.daily[today].totalCost += cost;
  data.daily[today].requests.push({
    timestamp: new Date().toISOString(),
    model,
    taskId,
    status: 'pending',
    cost
  });
  
  // 월별 및 총 사용량 업데이트
  updateMonthlySummary(data, month, cost);
  updateLifetimeSummary(data, cost);
  
  writeFluxUsage(data);
}
```

## 3. 네이버 검색광고 API

### 개요
- **목적**: 키워드 분석, 광고 관리, 성과 데이터 수집
- **API URL**: https://api.searchad.naver.com
- **인증**: HMAC-SHA256 서명 방식

### 인증 시스템
```typescript
class NaverAdsService {
  private generateSignature(timestamp: string, method: string, uri: string): string {
    const message = `${timestamp}.${method}.${uri}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
    
    return signature;
  }
  
  private getAuthHeaders(method: string, uri: string): object {
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
}
```

### 주요 기능

#### 1. 키워드 도구 (관련 키워드 검색)
```typescript
async getRelatedKeywords(
  keywords: string[], 
  hintKeywords?: string[], 
  includeMonthlySummary = true
): Promise<RelatedKeywordResult[]> {
  const uri = '/keywordstool';
  const headers = this.getAuthHeaders('GET', uri);
  
  const params = {
    hintKeywords: keywords.join(','),
    includeHintKeywords: hintKeywords ? hintKeywords.join(',') : '',
    showDetail: '1'
  };
  
  const response = await axios.get(`${this.baseUrl}${uri}`, {
    headers,
    params
  });
  
  return response.data.keywordList.map(this.transformKeywordResult);
}

private transformKeywordResult(item: any): RelatedKeywordResult {
  return {
    relatedKeyword: item.relKeyword,
    monthlySearchCount: parseInt(item.monthlyPcQcCnt) + parseInt(item.monthlyMobileQcCnt),
    monthlyMobileSearchCount: parseInt(item.monthlyMobileQcCnt),
    monthlyPcSearchCount: parseInt(item.monthlyPcQcCnt),
    competitionLevel: this.getCompetitionLevel(item.compIdx)
  };
}
```

#### 2. 광고주 관리
```typescript
async getAdvertisers(): Promise<Advertiser[]> {
  const uri = '/ncc/advertisers';
  const headers = this.getAuthHeaders('GET', uri);
  
  const response = await axios.get(`${this.baseUrl}${uri}`, { headers });
  return response.data.data;
}

async createCampaign(advertiserId: string, campaignData: CampaignData): Promise<Campaign> {
  const uri = `/ncc/campaigns`;
  const headers = this.getAuthHeaders('POST', uri);
  
  const response = await axios.post(`${this.baseUrl}${uri}`, {
    customerId: advertiserId,
    ...campaignData
  }, { headers });
  
  return response.data.data;
}
```

#### 3. 성과 데이터 수집
```typescript
async getPerformanceReport(
  advertiserId: string,
  startDate: string,
  endDate: string,
  groupBy: 'campaign' | 'adgroup' | 'keyword' = 'campaign'
): Promise<PerformanceData[]> {
  const uri = '/ncc/reports';
  const headers = this.getAuthHeaders('POST', uri);
  
  const reportData = {
    reportTp: 'PERFORMANCE',
    statDt: startDate,
    statEdDt: endDate,
    customerId: advertiserId,
    dimensions: [groupBy.toUpperCase()],
    metrics: ['CLICK', 'IMPRESSION', 'COST', 'CPC', 'CTR', 'AVG_RANK']
  };
  
  const response = await axios.post(`${this.baseUrl}${uri}`, reportData, { headers });
  return response.data.data;
}
```

## 4. 네이버 검색 API

### 개요
- **목적**: 네이버 검색 결과 분석, 블로그 검색
- **API URL**: https://openapi.naver.com
- **인증**: Client ID/Secret 방식

### 설정
```typescript
// 환경변수
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

// 서비스 초기화
class NaverSearchService {
  private headers = {
    'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
    'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
  };
}
```

### 블로그 검색
```typescript
async searchBlogs(query: string, display = 20, start = 1): Promise<BlogSearchResult[]> {
  const params = {
    query: encodeURIComponent(query),
    display,
    start,
    sort: 'date'
  };
  
  const response = await axios.get('https://openapi.naver.com/v1/search/blog.json', {
    headers: this.headers,
    params
  });
  
  return response.data.items.map(item => ({
    title: this.cleanHtmlTags(item.title),
    link: item.link,
    description: this.cleanHtmlTags(item.description),
    bloggername: item.bloggername,
    bloggerlink: item.bloggerlink,
    postdate: item.postdate
  }));
}

private cleanHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
}
```

## 5. 네이버 데이터랩 API

### 개요
- **목적**: 키워드 트렌드 분석, 검색량 데이터
- **API URL**: https://openapi.naver.com/v1/datalab
- **제한**: 일 1,000회, 키워드 그룹 최대 5개

### 키워드 트렌드 분석
```typescript
async getKeywordTrends(
  startDate: string,
  endDate: string,
  keywords: string[],
  timeUnit: 'date' | 'week' | 'month' = 'month',
  device?: 'pc' | 'mo',
  ages?: string[],
  gender?: 'm' | 'f'
): Promise<TrendResult> {
  const body = {
    startDate,
    endDate,
    timeUnit,
    keywordGroups: keywords.map((keyword, index) => ({
      groupName: `keyword${index + 1}`,
      keywords: [keyword]
    })),
    device,
    ages,
    gender
  };
  
  const response = await axios.post(
    'https://openapi.naver.com/v1/datalab/search',
    body,
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}
```

## 6. AWS Lambda (순위 체크)

### 개요
- **목적**: 대규모 병렬 순위 체크 처리
- **장점**: 100개 키워드를 2분 내 처리 (vs 로컬 30분)
- **함수**: smartplace-ranking-checker

### Lambda 함수 호출
```typescript
class LambdaSchedulerService {
  private lambda = new AWS.Lambda({
    region: process.env.AWS_REGION || 'ap-northeast-2'
  });
  
  async invokeBatchRankingCheck(keywords: KeywordRequest[]): Promise<RankingResult[]> {
    const batchSize = 10;
    const batches = this.chunkArray(keywords, batchSize);
    
    const promises = batches.map(batch => 
      this.lambda.invoke({
        FunctionName: process.env.LAMBDA_FUNCTION_NAME,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
          keywords: batch,
          config: {
            timeout: 30000,
            retries: 2
          }
        })
      }).promise()
    );
    
    const results = await Promise.all(promises);
    
    return results.flatMap(result => {
      if (result.Payload) {
        const payload = JSON.parse(result.Payload as string);
        return payload.statusCode === 200 ? JSON.parse(payload.body) : [];
      }
      return [];
    });
  }
}
```

## 7. NLP 서비스 (Python Flask)

### 개요
- **목적**: 한국어 형태소 분석, 키워드 추출
- **포트**: 5000
- **라이브러리**: Kiwi, scikit-learn

### 연동 설정
```typescript
class NLPConnector {
  private nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://localhost:5000';
  
  async analyzeKeywords(text: string): Promise<KeywordAnalysisResult> {
    try {
      const response = await axios.post(`${this.nlpServiceUrl}/analyze-keywords`, {
        text,
        options: {
          extract_keywords: true,
          pos_filter: ['NNG', 'NNP', 'VV', 'VA'],
          max_keywords: 20
        }
      }, {
        timeout: 30000
      });
      
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.warn('NLP service unavailable, using fallback');
        return this.fallbackKeywordExtraction(text);
      }
      throw error;
    }
  }
  
  private fallbackKeywordExtraction(text: string): KeywordAnalysisResult {
    // 간단한 정규식 기반 키워드 추출 대체
    const words = text.match(/[가-힣]{2,}/g) || [];
    const frequency = this.calculateFrequency(words);
    
    return {
      keywords: Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, freq]) => ({ word, frequency: freq }))
    };
  }
}
```

## 8. 에러 처리 및 재시도 로직

### 공통 에러 핸들러
```typescript
class APIErrorHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    backoffMs = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // 재시도하지 않을 에러들
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        if (attempt === maxRetries) break;
        
        // 지수 백오프
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }
  
  private static isNonRetryableError(error: any): boolean {
    // 401, 403, 400 등은 재시도 없음
    return error.response?.status && [400, 401, 403].includes(error.response.status);
  }
}
```

### API별 Rate Limiting
```typescript
class RateLimiter {
  private limits: Map<string, { count: number; resetTime: number }> = new Map();
  
  async checkLimit(apiKey: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const limit = this.limits.get(apiKey);
    
    if (!limit || now > limit.resetTime) {
      this.limits.set(apiKey, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (limit.count >= maxRequests) {
      return false;
    }
    
    limit.count++;
    return true;
  }
}

// 사용 예시
const naverApiLimiter = new RateLimiter();

async function callNaverAPI() {
  const canProceed = await naverApiLimiter.checkLimit('naver_search', 1000, 24 * 60 * 60 * 1000);
  
  if (!canProceed) {
    throw new Error('네이버 API 일일 한도 초과');
  }
  
  return await APIErrorHandler.withRetry(() => naverSearchService.searchBlogs(query));
}
```

## 9. 모니터링 및 로깅

### API 사용량 모니터링
```typescript
class APIUsageMonitor {
  async logAPIUsage(service: string, endpoint: string, success: boolean, responseTime: number) {
    const log = {
      service,
      endpoint,
      success,
      responseTime,
      timestamp: new Date().toISOString()
    };
    
    // 데이터베이스 로깅
    await this.saveToDatabase(log);
    
    // 실시간 메트릭 업데이트
    await this.updateMetrics(service, success, responseTime);
  }
  
  async generateUsageReport(period: 'daily' | 'weekly' | 'monthly'): Promise<UsageReport> {
    // 기간별 사용량 리포트 생성
    return await this.aggregateUsageData(period);
  }
}
```

이러한 외부 API 연동 시스템을 통해 MarketingPlat은 강력하고 안정적인 서비스를 제공하며, 확장 가능한 아키텍처를 유지합니다.