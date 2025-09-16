# 키워드 분석 기능 구현 가이드

## 목차
1. [기능 개요](#기능-개요)
2. [아키텍처 구조](#아키텍처-구조)
3. [API 상세 사용 방식](#api-상세-사용-방식)
4. [UI/UX 구성](#uiux-구성)
5. [핵심 구현 코드](#핵심-구현-코드)
6. [설치 및 설정](#설치-및-설정)

## 기능 개요

키워드 분석 기능은 사용자가 입력한 키워드에 대해 다음 정보를 제공합니다:
- 월간 검색량 (PC/모바일 분리)
- 평균 클릭률 및 클릭수
- 경쟁 정도
- 연관 키워드 (자동완성 + 검색광고 API)
- 토큰 기반 키워드 그룹화
- 네이버 블로그 상위 랭킹 포스트

## 아키텍처 구조

```
Frontend (React + TypeScript)
    ↓
Backend API (Express + Node.js)
    ↓
External Services:
  - Naver Search API
  - Naver Ads API
  - Naver Autocomplete
  - Web Scraping (Playwright)
```

## API 상세 사용 방식

### 1. 네이버 검색광고 API (Naver Ads API)

**용도**: 키워드별 정확한 검색량, 클릭률, 경쟁도 데이터 조회

**엔드포인트**: `https://api.searchad.naver.com/keywordstool`

**인증 방식**: HMAC-SHA256 서명 기반
```typescript
// 서명 생성
const generateSignature = (timestamp: string, method: string, uri: string): string => {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');
};
```

**요청 헤더**:
- `X-Timestamp`: 현재 타임스탬프
- `X-API-KEY`: API 키
- `X-Customer`: 고객 ID
- `X-Signature`: HMAC 서명

**응답 데이터 구조**:
```json
{
  "keywordList": [
    {
      "relKeyword": "영어학원",
      "monthlyPcQcCnt": "12500",      // PC 월간 검색량
      "monthlyMobileQcCnt": "45300",   // 모바일 월간 검색량
      "monthlyAvePcCtr": "2.34",       // PC 평균 클릭률
      "monthlyAveMobileCtr": "3.12",   // 모바일 평균 클릭률
      "compIdx": "높음"                 // 경쟁 정도
    }
  ]
}
```

### 2. 네이버 자동완성 API

**용도**: 실시간 인기 연관 검색어 수집

**엔드포인트**: `https://ac.search.naver.com/nx/ac`

**파라미터 상세**:
```typescript
const params = {
  q: keyword,        // 검색 키워드
  con: '1',         // 컨텍스트 모드
  frm: 'nx',        // 출처
  ans: '2',         // 응답 타입
  r_format: 'json', // 응답 포맷
  st: '100',        // 시작 위치
  r_enc: 'UTF-8',   // 응답 인코딩
  q_enc: 'UTF-8'    // 쿼리 인코딩
};
```

**응답 구조**:
```json
{
  "items": [
    [
      ["영어학원 추천", 0],
      ["영어학원 비용", 1],
      ["영어학원 창업", 2]
    ]
  ]
}
```

### 3. 네이버 블로그 스크래핑 (Playwright)

**용도**: 실제 검색 결과 순위 및 상위 블로그 정보 수집

**구현 방식**:
```typescript
// Playwright로 실제 네이버 검색 페이지 크롤링
const searchUrl = `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${keyword}`;

// 광고 필터링 로직
const isAd = !!(
  item.querySelector('.link_ad') ||
  item.querySelector('.ad_label') ||
  item.querySelector('[class*="power_link"]') ||
  item.querySelector('[class*="splink"]')
);
```

**수집 데이터**:
- 블로그 제목
- URL
- 블로거 정보
- 발행일
- 설명 텍스트

### 4. 블로그 게시글 API 스크래핑

**용도**: 특정 블로그의 전체 게시글 목록 수집 (키워드 추천용)

**엔드포인트**: `https://blog.naver.com/PostTitleListAsync.naver`

**파라미터**:
```typescript
{
  blogId: 'blogname',      // 블로그 ID
  currentPage: 1,          // 현재 페이지
  countPerPage: 30,        // 페이지당 게시글 수
  categoryNo: 0            // 카테고리 번호 (0=전체)
}
```

## UI/UX 구성

### 1. 페이지 레이아웃

```
┌─────────────────────────────────────┐
│         페이지 헤더                  │
│   "키워드 분석"                      │
│   설명 텍스트                        │
├─────────────────────────────────────┤
│         검색 섹션                    │
│   [키워드 입력창] [분석하기 버튼]    │
├─────────────────────────────────────┤
│         통계 카드 그리드             │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │검색량 │ │클릭률 │ │경쟁도 │       │
│  └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────┤
│         블로그 순위 테이블           │
│  순위 | 제목 | 블로거 | 날짜        │
├─────────────────────────────────────┤
│         키워드 필터 버튼            │
│  [전체] [영어] [학원] [영어학원]     │
├─────────────────────────────────────┤
│         연관 키워드 테이블           │
│  키워드 | 검색량 | 그룹             │
│  + 페이지네이션                     │
└─────────────────────────────────────┘
```

### 2. 디자인 시스템

**색상 체계**:
```css
--primary-500: #6366f1;  /* 메인 색상 */
--primary-600: #4f46e5;  /* 호버 색상 */
--bg-secondary: #f9fafb; /* 섹션 배경 */
--border-color: #e5e7eb; /* 테두리 */
--text-primary: #111827; /* 주요 텍스트 */
--text-muted: #6b7280;   /* 부가 텍스트 */
```

**컴포넌트 스타일**:

1. **검색 입력창**:
   - 높이: 48px
   - 배경: 밝은 회색
   - 포커스 시 파란색 테두리 + 그림자

2. **분석 버튼**:
   - 그라데이션 배경
   - 호버 시 위로 2px 이동
   - 로딩 중 스피너 애니메이션

3. **통계 카드**:
   - 카드형 디자인
   - 호버 시 상승 효과
   - 큰 숫자 강조 (font-size: 3rem)

4. **필터 버튼**:
   - 알약 모양 (border-radius: full)
   - 선택 시 파란색 배경
   - 각 버튼에 개수 표시

5. **테이블**:
   - 스트라이프 배경
   - 호버 시 행 하이라이트
   - 반응형 스크롤

### 3. 인터랙션 패턴

**키워드 분석 플로우**:
1. 키워드 입력 → Enter 키 또는 버튼 클릭
2. 로딩 상태 표시 (스켈레톤 UI)
3. 결과 표시 (페이드인 애니메이션)
4. 필터 클릭 → 즉시 필터링
5. 연관 키워드 클릭 → 입력창에 자동 입력

**페이지네이션**:
- 한 페이지당 30개 항목
- 현재 페이지 중심 10개 버튼 표시
- 이전/다음 버튼

### 4. 반응형 디자인

**데스크톱 (1440px)**:
- 3열 통계 그리드
- 사이드 여백 충분

**태블릿 (768px-1024px)**:
- 2열 통계 그리드
- 컴팩트한 레이아웃

**모바일 (< 768px)**:
- 1열 통계 그리드
- 검색창과 버튼 세로 배치
- 테이블 가로 스크롤
- 터치 친화적 버튼 크기 (min 44px)

## 핵심 구현 코드

### 1. 프론트엔드 - 키워드 분석 페이지

```tsx
// KeywordAnalysis.tsx
import React, { useState } from 'react';

interface KeywordStats {
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  monthlyAvePcClkCnt: number;
  monthlyAveMobileClkCnt: number;
  monthlyAvePcCtr: number;
  monthlyAveMobileCtr: number;
  plAvgDepth: number;
  compIdx: string;
}

interface AnalysisResult {
  keyword: string;
  stats: KeywordStats;
  relatedKeywords: string[];
  relatedKeywordsDetail: Array<{
    keyword: string;
    monthlySearchVolume: number;
    groups?: string[];
  }>;
  keywordGroups: { [key: string]: any[] };
  tokenCombinations: string[];
  topBlogPosts: Array<{
    title: string;
    link: string;
    description: string;
    bloggername: string;
    bloggerlink: string;
    postdate: string;
  }>;
}

const KeywordAnalysis: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('전체');

  const handleAnalyze = async () => {
    if (!keyword.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/keyword/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ keyword })
      });

      const data = await response.json();
      if (data.success) {
        setAnalysisResult(data.data);
      }
    } catch (error) {
      console.error('키워드 분석 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="keyword-analysis">
      {/* 검색 입력 */}
      <div className="search-box">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="분석할 키워드를 입력하세요"
        />
        <button onClick={handleAnalyze} disabled={isLoading}>
          {isLoading ? '분석 중...' : '분석하기'}
        </button>
      </div>

      {/* 분석 결과 표시 */}
      {analysisResult && (
        <div className="results">
          {/* 핵심 지표 */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>월간 총 검색량</h3>
              <div>{analysisResult.stats.monthlyPcQcCnt + analysisResult.stats.monthlyMobileQcCnt}</div>
            </div>
            <div className="stat-card">
              <h3>경쟁 정도</h3>
              <div>{analysisResult.stats.compIdx}</div>
            </div>
          </div>

          {/* 키워드 그룹 필터 */}
          <div className="keyword-filters">
            <button
              className={selectedFilter === '전체' ? 'active' : ''}
              onClick={() => setSelectedFilter('전체')}
            >
              전체 ({analysisResult.keywordGroups['전체']?.length || 0})
            </button>
            {analysisResult.tokenCombinations.map(token => (
              <button
                key={token}
                className={selectedFilter === token ? 'active' : ''}
                onClick={() => setSelectedFilter(token)}
              >
                {token} ({analysisResult.keywordGroups[token]?.length || 0})
              </button>
            ))}
          </div>

          {/* 연관 키워드 테이블 */}
          <table>
            <thead>
              <tr>
                <th>키워드</th>
                <th>월간 검색량</th>
                <th>그룹</th>
              </tr>
            </thead>
            <tbody>
              {analysisResult.keywordGroups[selectedFilter]?.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.keyword}</td>
                  <td>{item.monthlySearchVolume}</td>
                  <td>{item.groups?.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
```

### 2. 백엔드 - API 라우트

```typescript
// keyword.routes.ts
import express from 'express';
import { naverSearchService } from '../services/naverSearchService';
import { naverAdsService } from '../services/naverAdsService';
import { naverAutocompleteService } from '../services/naverAutocompleteService';

const router = express.Router();

router.post('/analyze', async (req, res) => {
  try {
    const { keyword } = req.body;

    // 1. 네이버 검색광고 API로 키워드 통계 조회
    const keywordStats = await naverAdsService.getKeywordStats([keyword]);

    // 2. 연관 키워드 조회 (검색광고 API)
    const relatedKeywordsData = await naverAdsService.getRelatedKeywords(keyword);

    // 3. 자동완성 키워드 조회
    const autoCompleteKeywords = await naverAutocompleteService.getAutocompleteKeywords(keyword);

    // 4. 키워드 토큰화 및 그룹화
    const { keywordGroups, tokenCombinations } = groupKeywords(keyword, [
      ...autoCompleteKeywords,
      ...relatedKeywordsData.map(k => k.keyword)
    ]);

    // 5. 상위 블로그 포스트 조회
    const topBlogPosts = await naverSearchService.getTopBlogPosts(keyword);

    res.json({
      success: true,
      data: {
        keyword,
        stats: keywordStats[0],
        relatedKeywords: [...autoCompleteKeywords, ...relatedKeywordsData.map(k => k.keyword)],
        relatedKeywordsDetail: keywordGroups['전체'],
        keywordGroups,
        tokenCombinations,
        topBlogPosts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 키워드 그룹화 함수
function groupKeywords(mainKeyword: string, allKeywords: string[]) {
  // 메인 키워드 토큰화
  const mainTokens = tokenizeKeyword(mainKeyword);

  // 토큰 조합 생성
  const tokenCombinations = generateTokenCombinations(mainTokens);

  // 그룹 초기화
  const keywordGroups: { [key: string]: any[] } = { '전체': [] };
  tokenCombinations.forEach(token => {
    keywordGroups[token] = [];
  });

  // 각 키워드를 해당 그룹에 할당
  allKeywords.forEach(kw => {
    const kwDetail = {
      keyword: kw,
      monthlySearchVolume: Math.floor(Math.random() * 10000), // 실제로는 API 데이터 사용
      groups: [] as string[]
    };

    keywordGroups['전체'].push(kwDetail);

    tokenCombinations.forEach(token => {
      if (kw.includes(token)) {
        keywordGroups[token].push(kwDetail);
        kwDetail.groups.push(token);
      }
    });
  });

  return { keywordGroups, tokenCombinations };
}

function tokenizeKeyword(keyword: string): string[] {
  // 공백, 하이픈 등으로 분리
  let tokens = keyword.split(/[\s\-_]+/);

  // 한글 복합어 처리 (예: "영어학원창업" → ["영어", "학원", "창업"])
  const patterns = [
    {
      regex: /(영어|수학|국어)(학원|교육)(창업|운영)/,
      tokens: ['$1', '$2', '$3']
    }
  ];

  for (const pattern of patterns) {
    const match = keyword.match(pattern.regex);
    if (match) {
      tokens = [];
      for (let i = 1; i < match.length; i++) {
        if (match[i]) tokens.push(match[i]);
      }
      break;
    }
  }

  return tokens.filter(t => t && t.length > 1);
}

function generateTokenCombinations(tokens: string[]): string[] {
  const combinations: string[] = [];

  // 단일 토큰
  tokens.forEach(token => combinations.push(token));

  // 2개 조합
  for (let i = 0; i < tokens.length - 1; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      combinations.push(`${tokens[i]}${tokens[j]}`);
    }
  }

  return combinations;
}

export default router;
```

### 3. 네이버 API 서비스

```typescript
// naverAdsService.ts
import axios from 'axios';
import crypto from 'crypto';

export class NaverAdsService {
  private apiKey: string;
  private secretKey: string;
  private customerId: string;
  private baseUrl = 'https://api.searchad.naver.com';

  constructor() {
    this.apiKey = process.env.NAVER_ADS_API_KEY || '';
    this.secretKey = process.env.NAVER_ADS_SECRET_KEY || '';
    this.customerId = process.env.NAVER_ADS_CUSTOMER_ID || '';
  }

  private generateSignature(timestamp: string, method: string, uri: string): string {
    const message = `${timestamp}.${method}.${uri}`;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
  }

  async getKeywordStats(keywords: string[]): Promise<any[]> {
    const timestamp = Date.now().toString();
    const method = 'GET';
    const uri = '/keywordstool';

    const signature = this.generateSignature(timestamp, method, uri);

    const response = await axios.get(`${this.baseUrl}${uri}`, {
      params: {
        hintKeywords: keywords.join(','),
        showDetail: '1'
      },
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY': this.apiKey,
        'X-Customer': this.customerId,
        'X-Signature': signature
      }
    });

    return response.data.keywordList.map((item: any) => ({
      monthlyPcQcCnt: parseInt(item.monthlyPcQcCnt || '0'),
      monthlyMobileQcCnt: parseInt(item.monthlyMobileQcCnt || '0'),
      monthlyAvePcClkCnt: parseFloat(item.monthlyAvePcClkCnt || '0'),
      monthlyAveMobileClkCnt: parseFloat(item.monthlyAveMobileClkCnt || '0'),
      monthlyAvePcCtr: parseFloat(item.monthlyAvePcCtr || '0'),
      monthlyAveMobileCtr: parseFloat(item.monthlyAveMobileCtr || '0'),
      plAvgDepth: item.plAvgDepth || 0,
      compIdx: item.compIdx || '낮음'
    }));
  }

  async getRelatedKeywords(keyword: string): Promise<any[]> {
    // 연관 키워드 조회 로직
    const stats = await this.getKeywordStats([keyword]);
    return stats.map(s => ({
      keyword: s.relKeyword,
      monthlySearchCount: s.monthlyPcQcCnt + s.monthlyMobileQcCnt,
      competitionLevel: s.compIdx
    }));
  }
}
```

### 4. 자동완성 서비스

```typescript
// naverAutocompleteService.ts
import axios from 'axios';

export class NaverAutocompleteService {
  async getAutocompleteKeywords(keyword: string): Promise<string[]> {
    try {
      const response = await axios.get('https://ac.search.naver.com/nx/ac', {
        params: {
          q: keyword,
          con: '1',
          frm: 'nv',
          ans: '2',
          r_format: 'json',
          r_enc: 'UTF-8',
          st: '100',
          q_enc: 'UTF-8'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const items = response.data.items || [];
      return items[0]?.map((item: any[]) => item[0]) || [];
    } catch (error) {
      console.error('Autocomplete error:', error);
      return [];
    }
  }
}
```

## 데이터 처리 로직

### 1. 키워드 토큰화 알고리즘

**복합 키워드 분리 패턴**:
```typescript
const patterns = [
  // 3단어 패턴
  {
    regex: /(영어|수학|국어)(학원|교육|센터)(창업|운영|관리)/,
    tokens: ['$1', '$2', '$3']
  },
  // 2단어 패턴
  {
    regex: /(영어|수학|국어)(학원|교육|과외)/,
    tokens: ['$1', '$2']
  }
];

// "영어학원창업" → ["영어", "학원", "창업"]
```

### 2. 키워드 그룹화 로직

```typescript
// 토큰 조합 생성
function generateTokenCombinations(tokens: string[]): string[] {
  const combinations = [];

  // 단일 토큰: "영어", "학원", "창업"
  tokens.forEach(token => combinations.push(token));

  // 2개 조합: "영어학원", "영어창업", "학원창업"
  for (let i = 0; i < tokens.length - 1; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      combinations.push(tokens[i] + tokens[j]);
    }
  }

  return combinations;
}
```

### 3. API 우선순위 및 폴백

```
1순위: 네이버 블로그 스크래핑 (실제 순위)
  ↓ 실패 시
2순위: 네이버 검색 API (공식 API)
  ↓ 실패 시
3순위: 모의 데이터 반환 (개발용)
```

## 성능 최적화 전략

### 1. 병렬 API 호출

```typescript
// 동시에 여러 API 호출
const [keywordStats, relatedKeywords, autocomplete, blogPosts] =
  await Promise.all([
    naverAdsService.getKeywordStats([keyword]),
    naverAdsService.getRelatedKeywords(keyword),
    naverAutocompleteService.getAutocompleteKeywords(keyword),
    naverSearchService.getTopBlogPosts(keyword)
  ]);
```

### 2. 데이터 캐싱

- 자주 검색되는 키워드는 Redis/메모리 캐시
- TTL: 1시간 (검색량), 10분 (블로그 순위)

### 3. 페이지네이션

- 서버: 전체 데이터 한 번에 전송
- 클라이언트: 30개씩 페이지 분할 표시
- 장점: 추가 API 호출 없이 빠른 페이지 전환

## 필요한 API 키

1. **네이버 검색 API**
   - `NAVER_CLIENT_ID`
   - `NAVER_CLIENT_SECRET`
   - 용도: 블로그 검색 결과 조회

2. **네이버 검색광고 API**
   - `NAVER_ADS_API_KEY`
   - `NAVER_ADS_SECRET_KEY`
   - `NAVER_ADS_CUSTOMER_ID`
   - 용도: 키워드 검색량, 경쟁도 조회

### 환경 변수 설정 (.env)

```env
# 네이버 검색 API
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret

# 네이버 검색광고 API
NAVER_ADS_API_KEY=your_api_key
NAVER_ADS_SECRET_KEY=your_secret_key
NAVER_ADS_CUSTOMER_ID=your_customer_id
```

## 설치 및 설정

### 1. 필요한 패키지 설치

**백엔드:**
```bash
npm install express axios cheerio dotenv crypto
npm install --save-dev @types/express @types/node typescript
```

**프론트엔드:**
```bash
npm install axios react react-dom
npm install --save-dev @types/react @types/react-dom typescript
```

### 2. 프로젝트 구조

```
project/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── KeywordAnalysis.tsx
│   │   ├── styles/
│   │   │   └── KeywordAnalysis.css
│   │   └── services/
│   │       └── api.ts
│   └── package.json
│
└── backend/
    ├── src/
    │   ├── routes/
    │   │   └── keyword.routes.ts
    │   ├── services/
    │   │   ├── naverAdsService.ts
    │   │   ├── naverSearchService.ts
    │   │   └── naverAutocompleteService.ts
    │   └── index.ts
    ├── .env
    └── package.json
```

### 3. 서버 설정

```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import keywordRoutes from './routes/keyword.routes';

const app = express();

app.use(cors({ credentials: true }));
app.use(express.json());

// 라우트 연결
app.use('/api/keyword', keywordRoutes);

app.listen(3010, () => {
  console.log('Server running on port 3010');
});
```

## 주요 기능 특징

### 1. 토큰 기반 키워드 그룹화
- 메인 키워드를 의미 단위로 분리
- 연관 키워드를 토큰별로 자동 분류
- 사용자가 필터링하여 관련 키워드만 확인 가능

### 2. 다중 데이터 소스 통합
- 네이버 검색광고 API: 정확한 검색량 데이터
- 네이버 자동완성: 실시간 인기 키워드
- 웹 스크래핑: 실제 검색 결과 순위

### 3. 실시간 분석
- 키워드 입력 즉시 분석 시작
- 병렬 API 호출로 빠른 응답
- 실패 시 폴백 메커니즘

### 4. 확장 가능한 구조
- 서비스 레이어 분리로 쉬운 유지보수
- 새로운 API 추가 용이
- 모듈화된 컴포넌트 구조

## 작동 방식

1. **사용자 키워드 입력**
   - 프론트엔드에서 키워드 수집
   - API 엔드포인트로 POST 요청

2. **백엔드 처리**
   - 병렬로 여러 API 호출
   - 데이터 수집 및 정제
   - 토큰화 및 그룹화 처리

3. **결과 반환**
   - 구조화된 JSON 응답
   - 프론트엔드에서 시각화
   - 필터링 및 페이지네이션 적용

## 성능 최적화 팁

1. **API 호출 최적화**
   - Promise.all()로 병렬 처리
   - 캐싱 메커니즘 구현
   - Rate limiting 적용

2. **프론트엔드 최적화**
   - 페이지네이션으로 대량 데이터 처리
   - 디바운싱으로 불필요한 API 호출 방지
   - 스켈레톤 UI로 로딩 경험 개선

3. **에러 처리**
   - 각 API별 폴백 메커니즘
   - 사용자 친화적 에러 메시지
   - 로깅 시스템 구축

## 트러블슈팅

### 일반적인 문제 해결

1. **API 키 오류**
   - 환경 변수 확인
   - API 키 유효성 검증
   - 권한 설정 확인

2. **CORS 오류**
   - 백엔드 CORS 설정 확인
   - credentials: 'include' 설정
   - 프록시 설정 검토

3. **검색 결과 없음**
   - 네트워크 연결 확인
   - API 응답 형식 검증
   - 폴백 데이터 활용

## 라이선스 및 주의사항

- 네이버 API 사용 시 일일 호출 제한 확인
- 상업적 사용 시 라이선스 검토 필요
- 개인정보 처리 시 관련 법규 준수