# CLAUDE.md - MarketingPlat 프로젝트 가이드 (최적화 버전)

## 🎯 프로젝트 개요
MarketingPlat - AI 기반 학원 마케팅 플랫폼 (Next.js 15 + AWS)

## ⚠️ 절대 규칙 (CRITICAL - DO NOT MODIFY)

### 🔴 데이터 무결성 원칙
- **절대 금지**: 목업/가짜/시뮬레이션 데이터 생성
- **필수 준수**: 실제 API 호출과 스크래핑 데이터만 사용
- **날짜 원칙**: 오늘 데이터만 현재 순위, 과거는 날짜 표시

### 🔴 Next.js 15 params 처리 (변경 금지)
```typescript
// 모든 동적 라우트에서 필수
const params = await props.params  // Promise 처리 필수!
```

## 🛡️ 핵심 기능 상세 구조 (2025년 9월 완성 - 절대 수정 금지)

### ✅ 1. 스마트플레이스 진단 시스템
**상태**: 완벽 작동 중 - 수정 금지
#### 📁 파일 구조
- **UI 페이지**: `app/diagnosis/smartplace/page.tsx`
- **API Routes**: 
  - `app/api/diagnosis/smartplace/route.ts` - 진단 실행
  - `app/api/smartplace/info/[placeId]/route.ts` - 업체 정보 조회
- **서비스**: `lib/services/playwrightCrawler.ts` - 업체 상세정보 크롤링
#### 💾 데이터베이스
- 진단 결과는 실시간 크롤링 (DB 저장 없음)
#### 🎨 UI 컴포넌트
- 진단 카드 컴포넌트
- 결과 표시 섹션 (업체정보, 이미지, 리뷰 등)

### ✅ 2. 스마트플레이스 순위 관리 및 추적
**상태**: 100% 정확도 달성 - 수정 금지
#### 📁 파일 구조
- **UI 페이지**: 
  - `app/smartplace/keywords/page.tsx` - 메인 대시보드
  - `app/smartplace/keywords/trend/[keywordId]/page.tsx` - 추세 분석
  - `app/smartplace/keywords/monthly/page.tsx` - 월간 통계
- **API Routes**:
  - `app/api/smartplace-keywords/register-place/route.ts` - 업체 등록
  - `app/api/smartplace-keywords/my-place/route.ts` - 내 업체 조회
  - `app/api/smartplace-keywords/list/route.ts` - 키워드 목록
  - `app/api/smartplace-keywords/add/route.ts` - 키워드 추가
  - `app/api/smartplace-keywords/track-all/route.ts` - 전체 추적
  - `app/api/smartplace-keywords/[keywordId]/route.ts` - 키워드 삭제
  - `app/api/smartplace-keywords/[keywordId]/toggle/route.ts` - 활성화 토글
  - `app/api/smartplace-keywords/[keywordId]/trend/route.ts` - 추세 데이터
  - `app/api/smartplace-keywords/monthly-data/route.ts` - 월간 데이터
- **서비스**: 
  - `lib/services/improved-scraper-v3.ts` - 메인 스크래퍼 (수정 금지!)
  - `lib/services/BrowserManager.ts` - 브라우저 리소스 관리
#### 💾 데이터베이스
```prisma
SmartPlace {
  id, userId, placeId, placeName, address, phone, rating, reviewCount, category
}
SmartPlaceKeyword {
  id, userId, smartPlaceId, keyword, isActive, lastChecked
}
SmartPlaceRanking {
  id, keywordId, checkDate, organicRank, adRank, topTenPlaces(JSON)
}
```
#### 🎨 UI 컴포넌트
- 키워드 등록 모달
- 순위 표시 테이블 (광고/오가닉 구분)
- 추세 차트 (Recharts)
- 상위 10개 업체 표시

### ✅ 3. 블로그 순위 관리 및 추적
**상태**: 완벽 작동 중 - 수정 금지
#### 📁 파일 구조
- **UI 페이지**:
  - `app/blog/keywords/page.tsx` - 메인 대시보드
  - `app/blog/keywords/trend/[keywordId]/page.tsx` - 추세 분석
- **API Routes**:
  - `app/api/blog-keywords/register-blog/route.ts` - 블로그 등록
  - `app/api/blog-keywords/my-blog/route.ts` - 내 블로그 조회
  - `app/api/blog-keywords/list/route.ts` - 키워드 목록
  - `app/api/blog-keywords/add/route.ts` - 키워드 추가
  - `app/api/blog-keywords/track-all/route.ts` - 전체 추적
  - `app/api/blog-keywords/[keywordId]/route.ts` - 키워드 삭제
  - `app/api/blog-keywords/[keywordId]/toggle/route.ts` - 활성화 토글
- **서비스**: 
  - `lib/services/naver-blog-scraper-v2.ts` - 메인 스크래퍼 (수정 금지!)
#### 💾 데이터베이스
```prisma
BlogTrackingProject {
  id, userId, blogUrl, blogName, blogId
}
BlogTrackingKeyword {
  id, projectId, keyword, isActive, addedDate
}
BlogTrackingResult {
  id, keywordId, trackingDate, mainTabExposed, mainTabRank, 
  blogTabRank, viewTabRank, adRank, found, url
}
```
#### 🎨 UI 컴포넌트
- 블로그 URL 등록 폼
- 순위 표시 테이블 (메인탭/블로그탭/View탭)
- 추세 차트
- 노출 상태 표시기

### ✅ 4. 중점관리 키워드 통합
**상태**: 완벽 작동 중 - 수정 금지
#### 📁 파일 구조
- **UI 페이지**: `app/management/keywords/page.tsx`
- **API Routes**: `app/api/focus-keywords/unified/route.ts`
#### 💾 데이터베이스
- SmartPlaceKeyword + BlogTrackingKeyword 통합 조회
#### 🎨 UI 컴포넌트
- 통합 키워드 테이블
- 출처별 필터링 (스마트플레이스/블로그/둘다)
- 통계 대시보드

### ✅ 5. 네이버 광고 관리
**상태**: 완벽 작동 중 - 수정 금지
#### 📁 파일 구조
- **UI 페이지**:
  - `app/dashboard/ads/page.tsx` - 메인 대시보드
  - `app/dashboard/ads/campaigns/page.tsx` - 캠페인 관리
  - `app/dashboard/ads/adgroups/page.tsx` - 광고그룹 관리
- **API Routes**:
  - `app/api/ads/stats/route.ts` - 통계 조회
  - `app/api/ads/campaigns/route.ts` - 캠페인 CRUD
  - `app/api/ads/campaigns/[id]/route.ts` - 캠페인 상세
  - `app/api/ads/adgroups/route.ts` - 광고그룹 CRUD
  - `app/api/ads/keywords/stats/route.ts` - 키워드 통계
- **서비스**: 
  - `lib/services/naver-ads-api.ts` - API 클라이언트 (수정 금지!)
  - `lib/services/naver-ads-unified-processor.ts` - 데이터 처리
#### 💾 데이터베이스
```prisma
NaverAdsCampaign {
  id, userId, nccCampaignId, name, campaignType, dailyBudget, status
}
NaverAdsAdGroup {
  id, campaignId, nccAdGroupId, name, adGroupType, status
}
NaverAdsKeyword {
  id, adGroupId, nccKeywordId, keyword, bidAmt, status
}
```
#### 🎨 UI 컴포넌트
- 캠페인 카드 리스트
- 광고그룹 테이블
- 키워드 성과 차트
- 예산 사용률 게이지
- 통계 요약 카드

## 📊 데이터베이스 테이블 매핑 (최종 확정)

### 사용해야 할 테이블 (✅ 올바른 테이블)
```typescript
// 블로그 관리
BlogTrackingProject    // BlogProject 아님!
BlogTrackingKeyword    // BlogKeyword 아님!
BlogTrackingResult     // BlogRanking 아님!

// 스마트플레이스 관리  
SmartPlace            // TrackingProject 아님!
SmartPlaceKeyword     // TrackingKeyword 아님!
SmartPlaceRanking     // TrackingRanking 아님!

// 광고 관리
NaverAdsCampaign
NaverAdsAdGroup
NaverAdsKeyword
```

### 관계 필드명 주의
- BlogTrackingKeyword → `results` (~~rankings~~ 아님)
- SmartPlaceKeyword → `rankings` 사용

## 🔧 최근 해결된 이슈 (2025년 9월 9일)

### 1. 인증 쿠키 호환성
```typescript
// 두 쿠키 이름 모두 확인 필수
const token = req.cookies.get('auth-token')?.value || req.cookies.get('token')?.value
```

### 2. SmartPlace place_id 충돌
```typescript
// 충돌 시 자동으로 고유 ID 생성
const newPlaceId = `${trackingProject.placeId}_user${userId}`
```

### 3. SmartPlaceKeyword userId 누락
```typescript
// userId 필드 필수 추가
await prisma.smartPlaceKeyword.create({
  data: {
    userId: parseInt(userId), // 필수!
    smartPlaceId,
    keyword,
    isActive: true
  }
})
```

## 🚀 개발 명령어
```bash
npm run dev        # 개발 서버 (포트 3000 고정)
npx prisma studio  # DB GUI
npx tsx test-*.ts  # 테스트 실행
```

## 🗂️ 프로젝트 구조 (핵심만)
```
app/
├── api/
│   ├── auth/                 # 인증
│   ├── blog-keywords/        # 블로그 순위 ✅
│   ├── smartplace-keywords/  # 스마트플레이스 ✅
│   ├── focus-keywords/       # 중점관리 ✅
│   └── ads/                  # 광고 관리 ✅
├── dashboard/                # 대시보드
├── management/              # 관리 페이지
└── blog/                    # 블로그 페이지

lib/
├── services/
│   ├── improved-scraper-v3.ts       # 스마트플레이스 스크래퍼 (수정 금지)
│   ├── naver-blog-scraper-v2.ts     # 블로그 스크래퍼 (수정 금지)
│   └── naver-ads-api.ts             # 광고 API (수정 금지)
└── db.ts                            # Prisma 클라이언트
```

## 📌 테스트 계정
```
관리자: admin@marketingplat.com / admin123
학원: academy@marketingplat.com / academy123
nokyang: nokyang@marketingplat.com / nokyang123
일반: user@test.com / test1234
```

## ⚡ 성능 지표
- 스마트플레이스 추적: 8.2초/키워드 (Queue 처리)
- 정확도: 100% (모든 테스트 케이스 통과)
- 동시 처리: 3개 키워드

## 🚨 성능 최적화 가이드 (2025년 9월 10일)

### 🔥 주요 성능 문제점 발견

#### 1. **과도한 API 호출 문제**
**문제**: `/api/admin/tracking/status` API가 수백 번 반복 호출됨
- 원인: 실시간 상태 업데이트를 위한 폴링 메커니즘이 너무 자주 실행
- 영향: 서버 부하 증가, 페이지 응답 속도 저하

**해결 방안**:
```typescript
// 🚫 문제가 있는 코드 (너무 자주 호출)
useEffect(() => {
  const interval = setInterval(() => {
    fetch('/api/admin/tracking/status')
  }, 100); // 0.1초마다 호출
}, []);

// ✅ 개선된 코드
useEffect(() => {
  const interval = setInterval(() => {
    fetch('/api/admin/tracking/status')
  }, 5000); // 5초마다 호출로 변경
}, []);
```

#### 2. **데이터베이스 쿼리 최적화 필요**
**문제**: 각 사용자별로 개별 쿼리 실행
- 현재: N+1 쿼리 문제 발생
- 영향: 사용자가 많을수록 로딩 시간 급증

**해결 방안**:
```typescript
// ✅ Prisma include를 활용한 Eager Loading
const users = await prisma.user.findMany({
  include: {
    smartPlace: {
      include: {
        keywords: {
          where: { isActive: true },
          include: {
            rankings: {
              orderBy: { checkDate: 'desc' },
              take: 1  // 최신 1개만 가져오기
            }
          }
        }
      }
    },
    blogTrackingProjects: {
      include: {
        keywords: {
          where: { isActive: true },
          include: {
            results: {
              orderBy: { trackingDate: 'desc' },
              take: 1  // 최신 1개만 가져오기
            }
          }
        }
      }
    }
  }
});
```

#### 3. **캐싱 전략 구현**
**문제**: 동일한 데이터를 반복 조회
- 영향: 불필요한 DB 부하, API 응답 지연

**해결 방안**:
```typescript
// ✅ Response 캐싱 헤더 추가
response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

// ✅ React Query 또는 SWR 사용 고려
import useSWR from 'swr';

const { data, error } = useSWR('/api/admin/tracking', fetcher, {
  refreshInterval: 30000,  // 30초마다 갱신
  revalidateOnFocus: false,
  dedupingInterval: 10000  // 10초 내 중복 요청 방지
});
```

### 📊 페이지별 성능 분석 및 개선 방안

#### 1. **관리자 추적 페이지** (`/dashboard/admin/tracking`)
- **문제**: 초기 로딩 3-5초 소요
- **원인**: 
  - 모든 사용자 데이터 한 번에 로딩
  - 중첩된 include로 인한 과도한 데이터 페치
- **해결**:
  ```typescript
  // ✅ 페이지네이션 구현
  const PAGE_SIZE = 20;
  const users = await prisma.user.findMany({
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    // ... includes
  });
  
  // ✅ 가상 스크롤 구현 고려
  ```

#### 2. **스마트플레이스 키워드 페이지** (`/smartplace/keywords`)
- **문제**: 키워드가 많을 때 렌더링 지연
- **해결**:
  ```typescript
  // ✅ React.memo로 불필요한 리렌더링 방지
  const KeywordRow = React.memo(({ keyword }) => {
    // 컴포넌트 내용
  }, (prevProps, nextProps) => {
    return prevProps.keyword.id === nextProps.keyword.id;
  });
  
  // ✅ 테이블 가상화 라이브러리 사용
  // react-window 또는 react-virtualized 도입
  ```

#### 3. **블로그 키워드 페이지** (`/blog/keywords`)
- **문제**: 차트 렌더링 시 버벅거림
- **해결**:
  ```typescript
  // ✅ 차트 데이터 메모이제이션
  const chartData = useMemo(() => {
    return processChartData(rankings);
  }, [rankings]);
  
  // ✅ 차트 lazy loading
  const Chart = lazy(() => import('@/components/Chart'));
  ```

#### 4. **광고 대시보드** (`/dashboard/ads`)
- **문제**: 90일 데이터 로딩 시간 과다
- **해결**:
  ```typescript
  // ✅ 초기 로딩은 최근 7일만, 나머지는 요청 시 로딩
  const [dateRange, setDateRange] = useState(7);
  
  // ✅ 데이터 집계는 서버에서 처리
  // 클라이언트는 이미 처리된 데이터만 받기
  ```

### 🛠️ 즉시 적용 가능한 최적화

1. **API 응답 크기 줄이기**
   ```typescript
   // ✅ 필요한 필드만 select
   select: {
     id: true,
     keyword: true,
     lastRanking: true
     // 불필요한 필드 제외
   }
   ```

2. **이미지 최적화**
   ```typescript
   // ✅ Next.js Image 컴포넌트 사용
   import Image from 'next/image';
   <Image 
     src={url} 
     width={200} 
     height={200}
     loading="lazy"
     placeholder="blur"
   />
   ```

3. **번들 크기 최적화**
   ```typescript
   // ✅ 동적 import 사용
   const HeavyComponent = dynamic(
     () => import('@/components/HeavyComponent'),
     { ssr: false }
   );
   ```

4. **데이터베이스 인덱스 추가**
   ```prisma
   // schema.prisma에 인덱스 추가
   @@index([userId, isActive])
   @@index([checkDate])
   @@index([keyword])
   ```

### 📈 성능 모니터링 도구 추천

1. **Next.js 내장 분석**
   ```bash
   npm run build
   npm run analyze  # 번들 크기 분석
   ```

2. **Chrome DevTools**
   - Performance 탭: 렌더링 성능 분석
   - Network 탭: API 호출 최적화
   - Lighthouse: 전반적인 성능 점수

3. **실시간 모니터링**
   ```typescript
   // ✅ Web Vitals 측정
   import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
   
   function sendToAnalytics(metric) {
     // Google Analytics 또는 커스텀 로깅
     console.log(metric);
   }
   
   getCLS(sendToAnalytics);
   getFID(sendToAnalytics);
   getFCP(sendToAnalytics);
   getLCP(sendToAnalytics);
   getTTFB(sendToAnalytics);
   ```

### 🎯 목표 성능 지표

- **초기 로딩**: < 1.5초
- **페이지 전환**: < 0.5초
- **API 응답**: < 200ms
- **First Contentful Paint**: < 1초
- **Time to Interactive**: < 2초

### 🔄 구현 우선순위

1. **즉시 구현** (영향도 높음, 구현 쉬움)
   - `/api/admin/tracking/status` 폴링 주기 조정
   - API 응답 캐싱 헤더 추가
   - 불필요한 데이터 필드 제거

2. **단기 구현** (1주일 내)
   - 페이지네이션 구현
   - React.memo 적용
   - 동적 import 적용

3. **중기 구현** (1개월 내)
   - 데이터베이스 인덱스 최적화
   - 가상 스크롤 구현
   - Redis 캐싱 레이어 추가

### 💡 추가 권장사항

1. **서버 사이드 최적화**
   - Edge Runtime 사용 검토
   - API Route 응답 스트리밍
   - Incremental Static Regeneration (ISR) 활용

2. **클라이언트 최적화**
   - Service Worker로 오프라인 캐싱
   - Prefetching 전략 구현
   - 이미지 lazy loading

3. **인프라 최적화**
   - CDN 활용 (정적 자산)
   - Database connection pooling
   - Rate limiting 구현

## 🔍 스마트플레이스 스크래퍼 핵심 로직 (절대 수정 금지)
```typescript
// 1. 이름 매칭: 정확한 매칭만 허용
const isMatch = resultNormalized === targetNormalized

// 2. 광고 판별 선택자
'div.iqAyT.JKKhR > a.gU6bV._DHlh'

// 3. 브라우저 설정
headless: false  // 필수!

// 4. Queue 동시성
concurrency: 3
```

## 🔑 네이버 광고 API 설정 (키워드 분석용)
```
CUSTOMER_ID: 1632045
API_KEY: 0100000000be03621f69dbe8d087552a0eb6e1ab802782d132380d44b19d2f74e8bfba27af  
SECRET_KEY: AQAAAAC+A2Ifadvo0IdVKg624auAzaqGRa5TqwNbPN6vZv/S3A==
```
**용도**: 키워드 분석 페이지 (`/keyword-analysis`)에서 영구적으로 사용
**적용 위치**: `.env.local` 파일의 `NAVER_ADS_*` 환경변수

---

**문서 작성일**: 2025년 1월  
**마지막 업데이트**: 2025년 9월 9일 - 모든 핵심 기능 완성 및 보호 설정  
**작성자**: Claude Code AI Assistant

> ⚠️ **중요**: 이 문서에 명시된 "완벽 작동 중" 기능들은 절대 수정하지 마세요. 새로운 기능 추가 시에만 이 문서를 업데이트하세요.