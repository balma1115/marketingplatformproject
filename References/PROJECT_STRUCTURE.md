# MarketingPlat 프로젝트 전체 구조

## 프로젝트 개요
마케팅플랫(MarketingPlat)은 AI 기반 마케팅 도구를 제공하는 풀스택 웹 애플리케이션입니다.

## 전체 아키텍처
```
marketingplat/
├── marketingplat-frontend/      # React TypeScript 프론트엔드
├── marketingplat-backend/       # Express TypeScript 백엔드
├── marketingplat-nlp/          # Python NLP 서비스
└── PROJECT_ASSETS/             # 프로젝트 문서
```

## 기술 스택

### Frontend (React + TypeScript)
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **State Management**: React Context API
- **Styling**: CSS Modules + Tailwind CSS
- **UI Components**: Lucide React, Chart.js
- **HTTP Client**: Axios
- **Rich Text Editor**: TipTap
- **Image Processing**: Fabric.js
- **Animation**: Framer Motion
- **Testing**: Vitest + Testing Library

### Backend (Node.js + TypeScript)
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MySQL (mysql2 with connection pooling)
- **Authentication**: JWT with httpOnly cookies
- **Password Hashing**: bcrypt
- **File Upload**: Multer
- **Rate Limiting**: express-rate-limit
- **Process Management**: PM2
- **WebSockets**: Socket.io
- **Crawler**: Playwright, Puppeteer
- **Environment**: dotenv

### External Services & APIs
- **AI Services**:
  - Google Gemini API (텍스트 생성)
  - Flux API by Black Forest Labs (이미지 생성)
- **Search & Analytics**:
  - Naver Search API
  - Naver DataLab API
  - Naver Ads API
- **Infrastructure**:
  - AWS Lambda (for ranking checks)
  - AWS EC2 (deployment)

### NLP Service (Python)
- **Framework**: Flask
- **NLP Libraries**: Kiwi (Korean morphological analyzer)
- **Analysis**: TF-IDF, Topic Modeling

## 프론트엔드 구조 (marketingplat-frontend/)

### 디렉토리 구조
```
src/
├── components/                 # 재사용 가능한 컴포넌트
│   ├── common/                # 기본 UI 컴포넌트
│   ├── layout/                # 레이아웃 컴포넌트
│   ├── modals/                # 모달 컴포넌트
│   └── analysis/              # 분석 관련 컴포넌트
├── pages/                     # 페이지 컴포넌트
│   ├── Admin/                 # 관리자 페이지
│   ├── Agency/                # 대행사 페이지
│   └── SmartPlace/            # 스마트플레이스 페이지
├── contexts/                  # React Context
├── hooks/                     # Custom Hooks
├── services/                  # API 서비스
├── styles/                    # CSS 파일
└── utils/                     # 유틸리티 함수
```

### 주요 컴포넌트

#### Layout Components
- `Layout.tsx`: 메인 레이아웃 (Header + Sidebar + Content)
- `Header.tsx`: 상단 네비게이션
- `Sidebar.tsx`: 사이드바 메뉴
- `MobileNavigation.tsx`: 모바일 네비게이션

#### Common Components
- `Button.tsx`: 재사용 가능한 버튼
- `Modal.tsx`: 기본 모달
- `Skeleton.tsx`: 로딩 스켈레톤
- `ServiceCard.tsx`: 서비스 카드
- `LoadingOverlay.tsx`: 로딩 오버레이

#### Analysis Components
- `KeywordCloud.tsx`: 키워드 클라우드
- `WordCloud.tsx`: 워드 클라우드
- `RealtimeAnalyzer.tsx`: 실시간 분석기

### Context Providers
- `AuthContext.tsx`: 사용자 인증 상태 관리
- `AnalysisContext.tsx`: 분석 데이터 상태 관리
- `SnsAnalysisContext.tsx`: SNS 분석 상태 관리
- `GlobalContext.tsx`: 전역 상태 관리

### 주요 페이지
- `HomePage.tsx`: 메인 대시보드
- `AIWritingPage.tsx`: AI 글쓰기
- `ImageGenerationPage.tsx`: 이미지 생성
- `SmartPlaceRanking.tsx`: 스마트플레이스 순위 확인
- `BlogTracking.tsx`: 블로그 추적
- `AdminDashboard.tsx`: 관리자 대시보드

## 백엔드 구조 (marketingplat-backend/)

### 디렉토리 구조
```
src/
├── config/                    # 설정 파일
├── controllers/               # 컨트롤러 (비어있음 - routes에 직접 구현)
├── middleware/                # Express 미들웨어
├── models/                    # 데이터 모델
├── routes/                    # API 라우트
├── services/                  # 비즈니스 로직
├── scripts/                   # 유틸리티 스크립트
├── utils/                     # 유틸리티 함수
├── websocket/                 # WebSocket 서버
└── index.ts                   # 애플리케이션 진입점
```

### Configuration
- `database.ts`: MySQL 연결 설정
- `gpt-prompts.ts`: AI 프롬프트 템플릿

### Middleware
- `authMiddleware.ts`: JWT 인증 미들웨어
- `hierarchicalAuthMiddleware.ts`: 계층적 권한 체크
- `adminMiddleware.ts`: 관리자 권한 확인
- `rateLimiter.ts`: API 요청 제한

### Models
- `User.ts`: 사용자 모델
- `Organization.ts`: 조직 구조 모델

### Services (주요 비즈니스 로직)

#### AI Services
- `geminiService.ts`: Google Gemini AI 서비스
- `fluxTracker.ts`: Flux 이미지 생성 사용량 추적
- `tokenTrackingService.ts`: 토큰 사용량 추적

#### Analysis Services
- `blogAnalysisService.ts`: 블로그 분석
- `blogKeywordAnalyzer.ts`: 블로그 키워드 분석
- `keywordSearchService.ts`: 키워드 검색
- `koreanAnalyzer.ts`: 한국어 분석
- `trendAnalysisService.ts`: 트렌드 분석

#### Crawler Services
- `naverSearchAnalyzer.ts`: 네이버 검색 분석
- `naverBlogScraper.ts`: 네이버 블로그 크롤링
- `naverMapSearchService.ts`: 네이버 지도 검색
- `playwrightCrawlerService.ts`: Playwright 크롤러

#### Naver API Services
- `naverSearchService.ts`: 네이버 검색 API
- `naverAdsService.ts`: 네이버 광고 API
- `naverDataLabService.ts`: 네이버 데이터랩 API
- `naverAdsSyncService.ts`: 네이버 광고 데이터 동기화

#### Ranking & Tracking Services
- `adaptiveRankingService.ts`: 적응형 순위 체크
- `lambdaSchedulerService.ts`: AWS Lambda 스케줄러
- `trackingScheduler.ts`: 추적 스케줄러
- `continuousTrackingScheduler.ts`: 연속 추적 스케줄러

### API Routes Structure
```
/api/
├── auth/                      # 인증 (로그인, 회원가입)
├── admin/                     # 관리자 기능
├── ai/                        # AI 서비스
├── smartplace/                # 스마트플레이스
├── ranking/                   # 순위 체크
├── flux-image/                # 이미지 생성
├── keyword/                   # 키워드 관리
├── blog/                      # 블로그 관리
├── magazine/                  # 매거진
├── ads/                       # 광고 관리
├── agency/                    # 대행사 관리
├── organization/              # 조직 관리
├── datalab/                   # 데이터랩
└── usage/                     # 사용량 추적
```

## NLP 서비스 구조 (marketingplat-nlp/)

### 디렉토리 구조
```
marketingplat-nlp/
├── app.py                     # Flask 메인 애플리케이션
├── services/                  # NLP 서비스 모듈
├── models/                    # 모델 및 설정
├── utils/                     # 유틸리티
└── requirements.txt           # Python 의존성
```

### NLP Services
- `keyword_extractor.py`: 키워드 추출
- `tfidf_analyzer.py`: TF-IDF 분석
- `topic_modeler.py`: 토픽 모델링
- `trend_analyzer.py`: 트렌드 분석
- `kiwi_preprocessor.py`: 한국어 전처리

## 배포 구조

### Development
- Frontend: Vite Dev Server (포트 3020)
- Backend: Nodemon (포트 3010)
- WebSocket: Socket.io (포트 3021)
- NLP Service: Flask (포트 5000)

### Production
- Frontend: Nginx 정적 파일 서빙
- Backend: PM2 프로세스 관리
- Database: MySQL 8.0
- Infrastructure: AWS EC2
- Load Balancer: Nginx reverse proxy

## 보안 및 인증

### Authentication Flow
1. 사용자 로그인 → JWT 토큰 생성
2. JWT는 httpOnly 쿠키에 저장
3. 모든 API 요청에 쿠키 자동 포함
4. 서버에서 토큰 검증 및 사용자 식별

### Authorization Levels
- **user**: 일반 사용자 (기본 서비스 이용)
- **branch**: 지사 관리자 (지사 데이터 관리)
- **agency**: 대행사 (광고 계정 관리)
- **admin**: 시스템 관리자 (전체 권한)

### Rate Limiting
- 기본 API: 100 requests/15min
- AI 서비스: 20 requests/15min
- 이미지 생성: 10 requests/15min
- 인증: 5 requests/15min
- 순위 체크: 30 requests/15min

## 성능 최적화

### Frontend Optimizations
- Code Splitting with React.lazy
- Image Optimization with Sharp
- Bundle Analysis with webpack-bundle-analyzer
- Service Worker for caching
- Framer Motion for smooth animations

### Backend Optimizations
- MySQL Connection Pooling
- Redis Caching (planned)
- AWS Lambda for parallel processing
- Database indexing
- API response caching

## 개발 환경 설정

### 필수 도구
- Node.js 18+
- Python 3.9+
- MySQL 8.0
- Git

### 환경 변수
- Frontend: `VITE_API_URL`
- Backend: Database, API keys, JWT secret
- NLP: Flask configuration

### 개발 서버 시작 순서
1. MySQL 데이터베이스 시작
2. Backend 서버 시작 (`npm run dev`)
3. Frontend 서버 시작 (`npm run dev`)
4. NLP 서비스 시작 (선택적)

## 모니터링 및 로깅

### 로깅 시스템
- 개발 환경: Console logging
- 프로덕션 환경: File-based logging
- 에러 추적: 상세한 스택 트레이스

### 성능 모니터링
- API 응답 시간 추적
- 데이터베이스 쿼리 성능
- 메모리 사용량 모니터링
- 크롤러 성능 추적

## 향후 계획

### 기술적 개선
- TypeScript 엄격 모드 활성화
- GraphQL API 도입 검토
- Microservices 아키텍처 전환
- Docker 컨테이너화
- Kubernetes 배포

### 기능적 확장
- 실시간 알림 시스템
- 고급 대시보드 분석
- 머신러닝 기반 예측
- 다국어 지원