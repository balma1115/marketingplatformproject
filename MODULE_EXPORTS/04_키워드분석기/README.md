# 04_키워드분석기 모듈

## 개요
AI 기반 키워드 분석 및 추천 시스템을 제공하는 모듈입니다.

## 주요 기능
- 키워드 트렌드 분석
- AI 키워드 추천
- 키워드 일괄 분석
- 경쟁 키워드 분석
- 검색량 및 경쟁도 분석

## 기술 스택

### Frontend
- React 18 with TypeScript
- Chart.js for data visualization
- CSS Modules for styling
- Debounced search functionality

### Backend
- Node.js with Express
- Gemini AI API for keyword analysis
- Naver DataLab API
- Naver Search API
- Custom NLP service integration

## 프로젝트 구조

```
04_키워드분석기/
├── frontend/
│   ├── components/
│   │   ├── KeywordSearch.tsx
│   │   ├── AIKeywordRecommend.tsx
│   │   └── KeywordChart.tsx
│   ├── pages/
│   │   ├── KeywordAnalysis.tsx
│   │   ├── KeywordRecommend.tsx
│   │   ├── KeywordBulkAnalysis.tsx
│   │   └── KeywordAnalytics.tsx
│   └── styles/
│       ├── KeywordAnalysis.css
│       ├── KeywordBulkAnalysis.css
│       └── KeywordSearch.css
├── backend/
│   ├── routes/
│   │   ├── keyword.routes.ts
│   │   ├── keyword-search.routes.ts
│   │   ├── keyword-bulk-analysis.routes.ts
│   │   └── datalab.routes.ts
│   ├── services/
│   │   ├── aiKeywordRecommendService.ts
│   │   ├── naverDataLabService.ts
│   │   ├── keywordSearchService.ts
│   │   ├── synonymDictionary.ts
│   │   └── trendAnalysisService.ts
│   └── config/
│       └── keyword-prompts.ts
└── database/
    └── keyword_analysis_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Frontend 의존성
npm install react react-dom chart.js react-chartjs-2 lodash

# Backend 의존성
npm install axios natural koalanlp hangul-js
```

### 환경 변수
```env
# AI 서비스 설정
GEMINI_API_KEY=your-gemini-api-key

# 네이버 API 설정
NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret
NAVER_DATALAB_CLIENT_ID=your-datalab-client-id
NAVER_DATALAB_CLIENT_SECRET=your-datalab-client-secret

# NLP 서비스
NLP_SERVICE_URL=http://localhost:5000
```

## API 엔드포인트

### 키워드 분석
```http
POST /api/keyword/analyze
Content-Type: application/json

{
  "keywords": ["영어학원", "토익학원"],
  "period": "3months",
  "device": "all"
}
```

### AI 키워드 추천
```http
POST /api/keyword/recommend
Content-Type: application/json

{
  "seedKeyword": "영어학원",
  "category": "education",
  "count": 20
}
```

### 일괄 키워드 분석
```http
POST /api/keyword/bulk-analyze
Content-Type: multipart/form-data

{
  "file": [CSV 파일],
  "analysisType": "trend"
}
```

### 검색량 조회
```http
GET /api/keyword/search-volume
?keywords=영어학원,토익학원&period=1month
```

## 데이터베이스 스키마

### keyword_analysis 테이블
```sql
CREATE TABLE keyword_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    search_volume INT,
    competition_level ENUM('low', 'medium', 'high'),
    trend_score DECIMAL(5,2),
    related_keywords JSON,
    analysis_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_keyword_date (keyword, analysis_date)
);
```

### keyword_trends 테이블
```sql
CREATE TABLE keyword_trends (
    id INT PRIMARY KEY AUTO_INCREMENT,
    keyword VARCHAR(255) NOT NULL,
    trend_data JSON NOT NULL,
    period ENUM('1week', '1month', '3months', '1year') DEFAULT '1month',
    device ENUM('pc', 'mobile', 'all') DEFAULT 'all',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_keyword_period (keyword, period)
);
```

### ai_keyword_recommendations 테이블
```sql
CREATE TABLE ai_keyword_recommendations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    seed_keyword VARCHAR(255) NOT NULL,
    recommended_keywords JSON NOT NULL,
    category VARCHAR(100),
    relevance_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 사용 방법

### 1. 키워드 분석
```typescript
// 키워드 트렌드 분석
const analysis = await api.post('/keyword/analyze', {
  keywords: ['영어학원', '토익학원'],
  period: '3months',
  device: 'all'
});

console.log(analysis.data.trends); // 트렌드 데이터
console.log(analysis.data.competition); // 경쟁도 분석
```

### 2. AI 키워드 추천
```typescript
// AI 기반 키워드 추천
const recommendations = await api.post('/keyword/recommend', {
  seedKeyword: '영어학원',
  category: 'education',
  count: 20
});

recommendations.data.forEach(keyword => {
  console.log(`${keyword.text} (관련도: ${keyword.relevance})`);
});
```

### 3. 일괄 분석
```typescript
// CSV 파일 일괄 분석
const formData = new FormData();
formData.append('file', csvFile);
formData.append('analysisType', 'trend');

const bulkResult = await api.post('/keyword/bulk-analyze', formData);
```

## AI 분석 기능

### 키워드 추천 알고리즘
```typescript
// Gemini AI를 사용한 키워드 추천
const generateKeywordRecommendations = async (seedKeyword: string, category: string) => {
  const prompt = `
    다음 핵심 키워드와 관련된 검색 키워드 20개를 추천해주세요.
    핵심 키워드: ${seedKeyword}
    카테고리: ${category}
    
    조건:
    1. 검색량이 높을 것으로 예상되는 키워드
    2. 상업적 의도가 있는 키워드 우선
    3. 롱테일 키워드 포함
    4. JSON 형태로 반환: [{"keyword": "키워드", "relevance": 0.85}]
  `;
  
  const response = await geminiService.generateContent(prompt);
  return JSON.parse(response.text);
};
```

### 트렌드 분석
```typescript
// 키워드 트렌드 점수 계산
const calculateTrendScore = (trendData: number[]) => {
  if (trendData.length < 2) return 0;
  
  const recent = trendData.slice(-4); // 최근 4주
  const previous = trendData.slice(-8, -4); // 이전 4주
  
  const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
  const previousAvg = previous.reduce((a, b) => a + b) / previous.length;
  
  return ((recentAvg - previousAvg) / previousAvg * 100);
};
```

## 데이터 시각화

### Chart.js 설정
```typescript
// 트렌드 차트 구성
const trendChartConfig = {
  type: 'line',
  data: {
    labels: dateLabels,
    datasets: [{
      label: '검색 트렌드',
      data: trendData,
      borderColor: '#4A90E2',
      backgroundColor: 'rgba(74, 144, 226, 0.1)',
      fill: true
    }]
  },
  options: {
    responsive: true,
    interaction: {
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '상대적 검색량'
        }
      }
    }
  }
};
```

### 경쟁도 분석 차트
```typescript
// 키워드별 경쟁도 시각화
const competitionChart = {
  type: 'scatter',
  data: {
    datasets: [{
      label: '키워드 분석',
      data: keywords.map(k => ({
        x: k.searchVolume,
        y: k.competition,
        label: k.keyword
      }))
    }]
  }
};
```

## NLP 서비스 연동

### 한국어 키워드 처리
```typescript
// 한국어 키워드 전처리
const preprocessKeyword = async (keyword: string) => {
  // 형태소 분석
  const morphemes = await nlpService.analyze(keyword);
  
  // 불용어 제거
  const filtered = morphemes.filter(m => !stopwords.includes(m.surface));
  
  // 어간 추출
  const stems = filtered.map(m => m.lemma);
  
  return {
    original: keyword,
    morphemes: morphemes,
    stems: stems,
    cleaned: stems.join(' ')
  };
};
```

### 유사 키워드 찾기
```typescript
// 코사인 유사도를 사용한 키워드 유사성 계산
const findSimilarKeywords = async (targetKeyword: string, candidateKeywords: string[]) => {
  const similarities = [];
  
  for (const candidate of candidateKeywords) {
    const similarity = await calculateSimilarity(targetKeyword, candidate);
    similarities.push({
      keyword: candidate,
      similarity: similarity
    });
  }
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);
};
```

## 성능 최적화

### 캐싱 전략
```typescript
// Redis를 사용한 키워드 분석 결과 캐싱
const cacheKeywordAnalysis = async (keyword: string, result: any) => {
  const cacheKey = `keyword:analysis:${keyword}`;
  await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1시간 캐시
};

const getCachedAnalysis = async (keyword: string) => {
  const cacheKey = `keyword:analysis:${keyword}`;
  const cached = await redis.get(cacheKey);
  return cached ? JSON.parse(cached) : null;
};
```

### 배치 처리
```typescript
// 대량 키워드 분석을 위한 배치 처리
const processBatchKeywords = async (keywords: string[], batchSize = 50) => {
  const results = [];
  
  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(keyword => analyzeKeyword(keyword))
    );
    results.push(...batchResults);
    
    // API 제한 고려 (1초 대기)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
};
```

## 트러블슈팅

### 일반적인 문제
1. **API 제한 초과**: Rate limiting 및 배치 처리 구현
2. **한국어 처리 오류**: NLP 서비스 연결 상태 확인
3. **메모리 부족**: 대량 데이터 처리 시 스트리밍 방식 사용

### 모니터링
```typescript
// 키워드 분석 성능 모니터링
const monitorKeywordAnalysis = async (keyword: string, startTime: number) => {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  await db.query(`
    INSERT INTO analysis_performance_logs 
    (keyword, duration, timestamp) 
    VALUES (?, ?, NOW())
  `, [keyword, duration]);
  
  if (duration > 5000) { // 5초 이상 소요 시 알림
    console.warn(`Slow keyword analysis: ${keyword} took ${duration}ms`);
  }
};
```

## 업데이트 로그

### v1.3.0 (2025-08-01)
- AI 키워드 추천 정확도 개선
- NLP 서비스 연동 강화
- 배치 처리 성능 최적화

### v1.2.0 (2025-07-15)
- 일괄 분석 기능 추가
- 한국어 형태소 분석 개선
- 트렌드 점수 알고리즘 고도화

### v1.1.0 (2025-07-01)
- 키워드 유사성 분석 추가
- 경쟁도 분석 기능 구현
- 차트 시각화 개선

### v1.0.0 (2025-06-15)
- 기본 키워드 분석 기능
- 네이버 DataLab API 연동
- AI 기반 키워드 추천