# 키워드 관리 모듈 완전 분리 가이드

## 📦 모듈 구성 개요

각 키워드 관리 기능이 **완전히 독립적으로** 실행 가능한 3개의 모듈로 분리되었습니다.

```
MODULE_EXPORTS/
├── focus-keyword-module/        # 중점키워드 통합 관리
├── blog-keyword-module/         # 블로그 순위 추적
├── smartplace-keyword-module/   # 스마트플레이스 순위 추적
├── database-schema.sql          # 통합 DB 스키마
└── README.md                    # 통합 가이드
```

---

## 🎯 1. 중점키워드 관리 모듈

### 주요 기능
- ✅ 스마트플레이스와 블로그 키워드 통합 관리
- ✅ 중복 키워드 자동 감지 및 표시
- ✅ 통합 대시보드 (전체/스마트플레이스/블로그/중복)
- ✅ CSV 내보내기

### 폴더 구조
```
focus-keyword-module/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── focus-keywords-unified.routes.ts
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts
│   │   ├── config/
│   │   │   └── database.ts
│   │   └── index.ts
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FocusKeywordUnified.tsx
│   │   │   ├── FocusKeywordUnified.css
│   │   │   ├── Login.tsx
│   │   │   └── Login.css
│   │   ├── App.tsx
│   │   └── App.css
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
└── README.md
```

### UI 컴포넌트 특징
- **통계 카드**: 전체/스마트플레이스/블로그/중복 키워드 수
- **필터링**: 전체/스마트플레이스만/블로그만/중복등록
- **순위 표시**: 색상 코드 (Top5/Top10/Top20/기타)
- **모달 시스템**: 키워드 추가 시 대상 선택

### 설치 및 실행
```bash
# Backend
cd focus-keyword-module/backend
npm install
npm run dev  # 포트 3010

# Frontend
cd focus-keyword-module/frontend
npm install
npm run dev  # 포트 3020
```

---

## 📝 2. 블로그 키워드 관리 모듈

### 주요 기능
- ✅ 네이버 블로그 순위 추적 (통합검색/블로그탭/VIEW탭)
- ✅ 광고 필터링 기능
- ✅ 스케줄링 시스템
- ✅ 순위 변동 차트
- ✅ CSV 내보내기

### 폴더 구조
```
blog-keyword-module/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── blog-tracking.routes.ts
│   │   ├── services/
│   │   │   ├── blogTrackingService.ts
│   │   │   ├── naverBlogScraper.ts
│   │   │   └── trackingScheduler.ts
│   │   ├── middleware/
│   │   ├── config/
│   │   └── index.ts
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BlogKeywordTracker.tsx
│   │   │   ├── BlogKeywordTracker.css
│   │   │   ├── BlogRegistration.tsx
│   │   │   ├── KeywordManager.tsx
│   │   │   ├── RankingDisplay.tsx
│   │   │   ├── TrackingSchedule.tsx
│   │   │   └── RankingChart.tsx
│   │   ├── App.tsx
│   │   └── App.css
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
└── README.md
```

### UI 컴포넌트 특징
- **블로그 등록**: URL과 이름 입력 폼
- **키워드 관리**: 일괄 추가/삭제 기능
- **3탭 순위 표시**: 
  - 통합검색 (main_tab)
  - 블로그탭 (blog_tab)
  - VIEW탭 (view_tab)
- **순위 변동 표시**: ▲▼ 아이콘과 변동폭
- **차트**: Chart.js 기반 30일 트렌드

### 스크래핑 설정
```javascript
// 광고 필터링 규칙
const adSelectors = [
  '.splink_ad',
  '.link_ad',
  '[data-ad]',
  '.power_link',
  '.brand_search'
];

// Puppeteer 설정
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

### 설치 및 실행
```bash
# Backend (Puppeteer 포함)
cd blog-keyword-module/backend
npm install
npm run dev  # 포트 3011

# Frontend
cd blog-keyword-module/frontend
npm install
npm run dev  # 포트 3021
```

---

## 🗺️ 3. 스마트플레이스 키워드 관리 모듈

### 주요 기능
- ✅ 네이버 지도 순위 추적
- ✅ 통합검색 순위 확인
- ✅ Lambda 병렬 처리 지원
- ✅ 경쟁업체 분석
- ✅ 실시간 진행상황 표시

### 폴더 구조
```
smartplace-keyword-module/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── smartplace.tracking.routes.ts
│   │   │   └── smartplace.routes.ts
│   │   ├── services/
│   │   │   ├── smartPlaceService.ts
│   │   │   ├── adaptiveRankingService.ts
│   │   │   ├── lambdaSchedulerService.ts
│   │   │   └── puppeteerCrawler.ts
│   │   ├── middleware/
│   │   ├── config/
│   │   └── index.ts
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SmartPlaceTracker.tsx
│   │   │   ├── SmartPlaceTracker.css
│   │   │   ├── PlaceRegistration.tsx
│   │   │   ├── KeywordManager.tsx
│   │   │   ├── RankingDisplay.tsx
│   │   │   ├── ProgressTracker.tsx
│   │   │   └── CompetitorAnalysis.tsx
│   │   ├── App.tsx
│   │   └── App.css
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
└── README.md
```

### UI 컴포넌트 특징
- **장소 등록**: Place ID와 이름 입력
- **순위 표시**: 지도순위/통합순위 구분
- **진행상황**: 실시간 프로그레스바
- **경쟁분석**: 상위 랭킹 업체 정보
- **세션 관리**: UUID 기반 추적

### 환경별 처리
```javascript
// 적응형 랭킹 서비스
if (process.env.USE_LAMBDA === 'true') {
  // AWS Lambda 사용 (프로덕션)
  return lambdaSchedulerService.checkRankings(keywords);
} else {
  // Puppeteer 직접 크롤링 (개발)
  return puppeteerCrawler.checkRankings(keywords);
}
```

### 설치 및 실행
```bash
# Backend (Puppeteer/Playwright 포함)
cd smartplace-keyword-module/backend
npm install
npm run dev  # 포트 3012

# Frontend
cd smartplace-keyword-module/frontend
npm install
npm run dev  # 포트 3022
```

---

## 🔧 공통 설정

### Backend 환경변수 (.env)
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=keyword_management_db
DB_PORT=3306

# JWT
JWT_SECRET=your-secret-key

# Server
PORT=3010

# Scraping
PUPPETEER_HEADLESS=true
MAX_CONCURRENT_SEARCHES=3

# AWS Lambda (Optional)
USE_LAMBDA=false
LAMBDA_FUNCTION_NAME=
AWS_REGION=ap-northeast-2
```

### Frontend 환경변수 (.env)
```env
VITE_API_URL=http://localhost:3010
```

### 데이터베이스 초기화
```bash
# MySQL 데이터베이스 생성
mysql -u root -p < MODULE_EXPORTS/database-schema.sql
```

---

## 🚀 통합 실행 (모든 모듈)

### 1. Docker Compose 사용
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: keyword_management_db
    ports:
      - "3306:3306"

  focus-backend:
    build: ./focus-keyword-module/backend
    ports:
      - "3010:3010"
    depends_on:
      - mysql

  focus-frontend:
    build: ./focus-keyword-module/frontend
    ports:
      - "3020:3020"

  blog-backend:
    build: ./blog-keyword-module/backend
    ports:
      - "3011:3011"
    depends_on:
      - mysql

  blog-frontend:
    build: ./blog-keyword-module/frontend
    ports:
      - "3021:3021"

  smartplace-backend:
    build: ./smartplace-keyword-module/backend
    ports:
      - "3012:3012"
    depends_on:
      - mysql

  smartplace-frontend:
    build: ./smartplace-keyword-module/frontend
    ports:
      - "3022:3022"
```

### 2. PM2 사용
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'focus-backend',
      script: './focus-keyword-module/backend/dist/index.js',
      env: { PORT: 3010 }
    },
    {
      name: 'blog-backend',
      script: './blog-keyword-module/backend/dist/index.js',
      env: { PORT: 3011 }
    },
    {
      name: 'smartplace-backend',
      script: './smartplace-keyword-module/backend/dist/index.js',
      env: { PORT: 3012 }
    }
  ]
};
```

---

## 📊 UI/UX 디자인 시스템

### 색상 팔레트
```css
:root {
  /* Primary Colors */
  --primary-color: #4A90E2;
  --secondary-color: #7B68EE;
  
  /* Status Colors */
  --success-color: #4CAF50;
  --warning-color: #FFC107;
  --danger-color: #F44336;
  
  /* Background Colors */
  --bg-primary: #f5f7fa;
  --bg-secondary: #ffffff;
  --bg-dark: #2c3e50;
  
  /* Text Colors */
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;
}
```

### 컴포넌트 스타일
```css
/* Card Component */
.card {
  background: var(--bg-secondary);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Button Component */
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
```

### 반응형 브레이크포인트
```css
/* Desktop */
@media (min-width: 1024px) { }

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Mobile */
@media (max-width: 767px) { }
```

---

## 🔒 보안 고려사항

### 1. 인증 시스템
- JWT 토큰 기반 인증
- httpOnly 쿠키 사용
- Refresh Token 구현

### 2. API 보안
```javascript
// Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Helmet Security Headers
const helmet = require('helmet');
app.use(helmet());
```

### 3. 데이터 검증
```javascript
// Input Validation
const { body, validationResult } = require('express-validator');

router.post('/keywords',
  body('keyword').isString().trim().isLength({ min: 1, max: 100 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  }
);
```

---

## 📈 성능 최적화

### 1. 데이터베이스
- 인덱스 최적화
- 쿼리 캐싱
- Connection Pooling

### 2. 프론트엔드
- React.memo 사용
- 가상 스크롤링
- 이미지 lazy loading

### 3. 백엔드
- Redis 캐싱
- 비동기 처리
- Worker threads

---

## 🧪 테스트

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

---

## 📦 배포

### 1. Build
```bash
# Backend
npm run build

# Frontend
npm run build
```

### 2. Deploy to AWS
```bash
# EC2 배포
scp -r ./dist ec2-user@your-server:/app

# S3 + CloudFront (Frontend)
aws s3 sync ./dist s3://your-bucket
```

### 3. Deploy to Vercel
```bash
vercel --prod
```

---

## 📚 문서 및 지원

- **API 문서**: 각 모듈의 README.md 참조
- **문제 해결**: TROUBLESHOOTING.md 참조
- **기여 가이드**: CONTRIBUTING.md 참조

---

## 🎉 완성도

각 모듈은 다음을 포함하여 **100% 독립적으로 실행 가능**합니다:

✅ **Backend**: Express + TypeScript + MySQL  
✅ **Frontend**: React + TypeScript + Vite  
✅ **UI/UX**: 완성된 디자인 시스템  
✅ **데이터베이스**: 스키마 및 마이그레이션  
✅ **인증**: JWT 기반 로그인 시스템  
✅ **스크래핑**: Puppeteer/Playwright  
✅ **차트**: Chart.js 통합  
✅ **CSV Export**: 한글 인코딩 지원  
✅ **반응형**: 모바일/태블릿/데스크톱  
✅ **문서화**: 완전한 README 및 가이드