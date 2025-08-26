# MarketingPlat 모듈 패키지

## 개요
MarketingPlat 프로젝트의 모든 기능을 독립적인 모듈로 패키징한 완전한 모듈 컬렉션입니다. 각 모듈은 특정 기능 영역을 담당하며, 독립적으로 설치하고 사용할 수 있도록 설계되었습니다.

## 모듈 구조

### 📁 00_공통_인증 (Authentication System)
**사용자 인증 및 권한 관리 핵심 시스템**
- JWT 기반 인증
- 계층형 권한 시스템
- 세션 관리 및 보안
- 2FA 지원

**주요 컴포넌트:**
- AuthContext.tsx (인증 상태 관리)
- ProtectedRoute.tsx (라우트 보호)
- authMiddleware.ts (서버 인증)
- hierarchicalAuthMiddleware.ts (권한 관리)

### 📁 00_공통_코인시스템 (Coin System)
**서비스 이용을 위한 가상화폐 시스템**
- 코인 잔액 관리
- 서비스별 차등 요금제
- 자동 충전 기능
- 사용량 분석 및 예측

**주요 서비스:**
- coinService.ts (코인 관리)
- usageTrackingService.ts (사용량 추적)
- coinAnalyticsService.ts (분석)
- autoChargeService.ts (자동 충전)

### 📁 01_AI_글쓰기 (AI Writing)
**Gemini AI 기반 콘텐츠 생성**
- 블로그 글 자동 생성
- 제목 및 키워드 생성
- AI 키워드 추천
- 토큰 사용량 추적

**핵심 파일:**
- AIWritingPage.tsx (메인 UI)
- geminiService.ts (AI 서비스)
- AIKeywordRecommend.tsx (키워드 추천)

### 📁 02_스마트플레이스 (SmartPlace Analysis)
**네이버 스마트플레이스 분석 및 순위 추적**
- 스마트플레이스 정보 분석
- 키워드별 순위 확인
- 추적 스케줄 관리
- AWS Lambda 연동 (대규모 처리)

**주요 기능:**
- SmartPlaceAnalysis.tsx (분석 UI)
- adaptiveRankingService.ts (순위 체크)
- lambdaSchedulerService.ts (스케줄링)

### 📁 03_이미지생성 (Image Generation)
**Flux API 기반 AI 이미지 생성**
- 3가지 모델 지원 (Dev/Pro/Max)
- 이미지 편집 도구
- 썸네일 생성
- CORS 프록시 서버

**핵심 컴포넌트:**
- ImageGenerationPage.tsx (생성 UI)
- ImageEditor.tsx (편집 도구)
- fluxTracker.ts (사용량 추적)

### 📁 04_키워드분석기 (Keyword Analysis)
**AI 기반 키워드 분석 및 추천**
- 키워드 트렌드 분석
- AI 키워드 추천
- 일괄 분석 기능
- 네이버 DataLab 연동

**주요 기능:**
- KeywordAnalysis.tsx (분석 UI)
- KeywordBulkAnalysis.tsx (일괄 분석)
- aiKeywordRecommendService.ts (AI 추천)

### 📁 05_분석도구 (Analysis Tools)
**블로그 키워드 추적 및 분석**
- 블로그 순위 추적
- 키워드 성과 분석
- 경쟁업체 모니터링
- 실시간 업데이트

**핵심 서비스:**
- BlogKeywordTracking.tsx (추적 UI)
- blogAnalysisService.ts (분석)
- naverBlogScraper.ts (스크래핑)

### 📁 06_키워드관리 (Keyword Management)
**핵심 키워드 관리 및 개인 블로그 추적**
- 키워드 그룹 관리
- 드래그앤드롭 인터페이스
- 성과 분석 대시보드
- 자동 키워드 제안

**주요 컴포넌트:**
- FocusKeywords.tsx (키워드 관리)
- MyBlogTracking.tsx (블로그 추적)
- keywordPerformanceAnalyzer.ts (성과 분석)

### 📁 07_광고대시보드 (Ads Dashboard)
**네이버 검색광고 관리 시스템**
- 네이버 검색광고 API 연동
- 캠페인 및 키워드 관리
- 성과 분석 대시보드
- 자동 입찰 조정

**핵심 서비스:**
- AdsDashboard.tsx (대시보드 UI)
- naverAdsService.ts (광고 API)
- autoБiddingManager.ts (자동 입찰)

### 📁 08_관리자_대시보드 (Admin Dashboard)
**시스템 전반 모니터링 및 관리**
- 실시간 시스템 모니터링
- 사용자 활동 분석
- 수익 분석 리포트
- 알림 관리 시스템

**주요 기능:**
- AdminDashboard.tsx (관리자 UI)
- systemMonitoringService.ts (모니터링)
- revenueAnalysisService.ts (수익 분석)

### 📁 09_관리자_사용자관리 (User Management)
**사용자 계정 및 권한 관리**
- 사용자 CRUD 관리
- 코인 충전/차감 관리
- 대량 작업 처리
- 활동 로그 추적

**핵심 컴포넌트:**
- UserManagement.tsx (사용자 관리 UI)
- userManagementService.ts (사용자 서비스)
- bulkOperationService.ts (대량 작업)

### 📁 10_관리자_조직구조 (Organization Management)
**계층형 조직 구조 관리**
- 과목-지사-학원 3단계 구조
- CSV 일괄 등록 기능
- 가입 코드 관리
- 사용자 조직 배정

**주요 서비스:**
- OrganizationManagement.tsx (조직 관리 UI)
- organizationService.ts (조직 관리)
- csvParsingService.ts (CSV 처리)

## 설치 및 사용 가이드

### 전체 모듈 설치
```bash
# 프로젝트 루트에서
git clone [repository-url]
cd marketingplat

# 백엔드 설치
cd marketingplat-backend
npm install

# 프론트엔드 설치
cd ../marketingplat-frontend
npm install

# NLP 서비스 설치 (선택적)
cd ../marketingplat-nlp
pip install -r requirements.txt
```

### 개별 모듈 사용
각 모듈은 독립적으로 사용할 수 있습니다:

```bash
# 예시: AI 글쓰기 모듈만 사용
cp -r MODULE_EXPORTS/01_AI_글쓰기/* your-project/
cp -r MODULE_EXPORTS/00_공통_인증/* your-project/
cp -r MODULE_EXPORTS/00_공통_코인시스템/* your-project/
```

### 환경 설정
```bash
# 환경 변수 복사
cp .env.example .env.development
# 필요한 API 키와 설정값 입력
```

## 모듈 간 의존성

### 의존성 관계도
```
00_공통_인증 ←─── 모든 모듈
00_공통_코인시스템 ←─── 유료 서비스 모듈
├── 01_AI_글쓰기
├── 02_스마트플레이스
├── 03_이미지생성
├── 04_키워드분석기
├── 05_분석도구
├── 06_키워드관리
└── 07_광고대시보드

08_관리자_대시보드 ←─── 모든 데이터 모듈
09_관리자_사용자관리 ←─── 인증 시스템
10_관리자_조직구조 ←─── 인증 시스템
```

### 필수 모듈 (Core)
모든 기능을 사용하려면 다음 모듈은 필수입니다:
- `00_공통_인증` (인증 시스템)
- `00_공통_코인시스템` (결제 시스템)

### 선택적 모듈 (Optional)
필요에 따라 선택적으로 사용할 수 있습니다:
- 기능별 모듈 (01~07)
- 관리자 모듈 (08~10)

## 기술 스택 요약

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: React Context API
- **Styling**: CSS Modules
- **Charts**: Chart.js with react-chartjs-2
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MySQL (mysql2)
- **Authentication**: JWT with httpOnly cookies
- **Security**: bcrypt, express-rate-limit
- **File Upload**: Multer
- **Scheduling**: node-cron

### External APIs
- **AI Services**: Google Gemini API, Flux API
- **Search APIs**: Naver Search API, Naver DataLab API
- **Ads API**: Naver Search AD API
- **Cloud**: AWS Lambda (optional)

### Development Tools
- **Web Scraping**: Playwright, Puppeteer, Cheerio
- **Process Management**: PM2
- **Monitoring**: Custom monitoring services

## 데이터베이스 스키마

각 모듈은 독립적인 데이터베이스 스키마를 제공합니다:

### 공통 테이블
- `users` - 사용자 정보
- `coin_transactions` - 코인 거래 내역
- `user_activity_logs` - 사용자 활동 로그

### 서비스별 테이블
- `ai_content_generations` - AI 글쓰기 기록
- `image_generations` - 이미지 생성 기록
- `smartplace_rankings` - 스마트플레이스 순위
- `keyword_analysis` - 키워드 분석 결과
- `blog_tracking` - 블로그 추적 데이터
- `ad_campaigns` - 광고 캠페인 정보

## 성능 및 확장성

### 성능 최적화
- **캐싱**: Redis 기반 데이터 캐싱
- **데이터베이스**: 인덱스 최적화, 쿼리 최적화
- **API**: Rate limiting, 배치 처리
- **이미지**: 최적화 및 CDN 연동 준비

### 확장성 고려사항
- **마이크로서비스**: 각 모듈의 독립적 배포 가능
- **로드 밸런싱**: 다중 인스턴스 지원
- **클라우드 연동**: AWS Lambda, S3 등 활용
- **데이터베이스**: 샤딩 및 레플리케이션 지원

## 보안 가이드

### 인증 및 권한
- JWT 기반 무상태 인증
- httpOnly 쿠키로 XSS 방지
- CSRF 토큰 적용
- 역할 기반 접근 제어 (RBAC)

### 데이터 보안
- 비밀번호 bcrypt 해싱
- API 키 환경 변수 관리
- SQL Injection 방지
- 개인정보 암호화 저장

### 네트워크 보안
- HTTPS 강제 적용
- CORS 정책 설정
- Rate Limiting 적용
- 방화벽 설정 권장

## API 문서

### 인증 API
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET /api/auth/me
```

### 서비스 API
```http
# AI 글쓰기
POST /api/ai/generate-content
POST /api/ai/generate-titles

# 이미지 생성
POST /api/flux-image/generate
GET /api/flux-image/result/:taskId

# 키워드 분석
POST /api/keyword/analyze
POST /api/keyword/recommend

# 스마트플레이스
POST /api/smartplace/check
GET /api/smartplace/progress/:sessionId
```

### 관리자 API
```http
# 사용자 관리
GET /api/admin/users
POST /api/admin/users
PUT /api/admin/users/:id

# 시스템 모니터링
GET /api/admin/dashboard/stats
GET /api/admin/system/health
```

## 개발 가이드

### 새로운 모듈 추가
1. 모듈 폴더 구조 생성
2. README.md 작성 (이 템플릿 참조)
3. 데이터베이스 스키마 정의
4. 백엔드 서비스 구현
5. 프론트엔드 컴포넌트 구현
6. API 문서 작성
7. 테스트 코드 작성

### 코딩 컨벤션
- TypeScript Strict 모드 사용
- ESLint + Prettier 적용
- 함수명: camelCase
- 컴포넌트명: PascalCase
- 파일명: kebab-case 또는 PascalCase (컴포넌트)

### 테스트 가이드
- 단위 테스트: Jest + React Testing Library
- 통합 테스트: API 엔드포인트 테스트
- E2E 테스트: Playwright 사용

## 배포 가이드

### 개발 환경 실행
```bash
# 백엔드 실행 (포트 3010)
cd marketingplat-backend
npm run dev

# 프론트엔드 실행 (포트 3020)
cd marketingplat-frontend  
npm run dev
```

### 프로덕션 배포
```bash
# 빌드
npm run build

# PM2로 실행
pm2 start ecosystem.config.js
```

### Docker 배포 (선택적)
```bash
docker-compose up -d
```

## 문제 해결

### 일반적인 문제
1. **포트 충돌**: 3010, 3020 포트 사용 확인
2. **데이터베이스 연결**: MySQL 서비스 상태 확인
3. **API 키 오류**: .env 파일 설정 확인
4. **권한 오류**: 사용자 역할 및 권한 확인

### 로그 확인
```bash
# 백엔드 로그
tail -f logs/app.log

# PM2 로그
pm2 logs

# 에러 로그
tail -f logs/error.log
```

### 디버깅 도구
- Chrome DevTools (프론트엔드)
- Node.js Inspector (백엔드)
- MySQL Workbench (데이터베이스)

## 라이선스
이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 기여 가이드

### Pull Request 절차
1. Fork 생성
2. Feature 브랜치 생성
3. 변경 사항 커밋
4. Pull Request 생성
5. 코드 리뷰 후 병합

### 이슈 보고
GitHub Issues를 통해 버그 리포트나 기능 요청을 제출해주세요.

## 연락처

- **프로젝트 관리자**: [이메일]
- **개발팀**: [이메일]
- **기술 지원**: [이메일]

---

## 업데이트 로그

### v2.0.0 (2025-08-25) - 모듈 패키지 완성
- 11개 완전한 모듈 패키지 생성
- 상세 README 문서 완료
- 모듈 간 의존성 정리
- 설치 및 사용 가이드 제공

### v1.5.0 (2025-08-20) - 관리자 모듈 고도화
- 관리자 대시보드 실시간 모니터링
- 사용자 관리 대량 작업 기능
- 조직 구조 CSV 일괄 등록

### v1.0.0 (2025-07-01) - 초기 출시
- 기본 서비스 모듈 구현
- 인증 및 코인 시스템 구축
- AI 글쓰기, 이미지 생성 기능