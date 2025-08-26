# 02_스마트플레이스 모듈

## 개요
네이버 스마트플레이스 분석 및 순위 추적 기능을 제공하는 모듈입니다.

## 주요 기능
- 스마트플레이스 정보 분석
- 키워드별 순위 확인 및 추적
- 순위 변동 모니터링
- 추적 스케줄 관리
- 경쟁업체 분석

## 기술 스택

### Frontend
- React 18 with TypeScript
- CSS Modules
- Chart.js for ranking visualization
- React Router for navigation

### Backend
- Node.js with Express
- TypeScript
- Puppeteer/Playwright for web scraping
- AWS Lambda for scalable ranking checks

## 프로젝트 구조

```
02_스마트플레이스/
├── frontend/
│   ├── components/
│   │   ├── RankingProgressOverlay.tsx
│   │   └── DateRangePicker.tsx
│   ├── pages/
│   │   ├── SmartPlaceAnalysis.tsx
│   │   ├── SmartPlaceRanking.tsx
│   │   ├── TrackingSchedule.tsx
│   │   ├── DataTrackingManagement.tsx
│   │   └── DebugRanking.tsx
│   └── styles/
│       ├── SmartPlace.css
│       └── Tracking.css
├── backend/
│   ├── routes/
│   │   ├── smartplace.routes.ts
│   │   ├── ranking.ts
│   │   └── smartplace.tracking.routes.ts
│   ├── services/
│   │   ├── adaptiveRankingService.ts
│   │   ├── lambdaSchedulerService.ts
│   │   ├── naverMapSearchService.ts
│   │   └── trackingScheduler.ts
│   └── config/
│       └── selectors.json
└── database/
    └── smartplace_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Frontend 의존성
npm install react react-dom chart.js react-chartjs-2

# Backend 의존성  
npm install puppeteer playwright aws-sdk cheerio
```

### 환경 변수
```env
# AWS Lambda 설정 (프로덕션)
USE_LAMBDA=true
LAMBDA_FUNCTION_NAME=smartplace-ranking-checker
AWS_REGION=ap-northeast-2

# 로컬 개발 설정
USE_LAMBDA=false
```

## API 엔드포인트

### 스마트플레이스 정보 조회
```http
GET /api/smartplace/info/:placeId
```

### 순위 확인
```http
POST /api/smartplace/check
Content-Type: application/json

{
  "keyword": "강남 영어학원",
  "placeName": "ABC영어학원",
  "location": "강남구"
}
```

### 진행 상황 조회
```http
GET /api/smartplace/progress/:sessionId
```

### 추적 스케줄 관리
```http
GET /api/smartplace/tracking/schedules
POST /api/smartplace/tracking/schedule
PUT /api/smartplace/tracking/schedule/:id
DELETE /api/smartplace/tracking/schedule/:id
```

## 데이터베이스 스키마

### smartplace_info 테이블
```sql
CREATE TABLE smartplace_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    place_id VARCHAR(255) NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    rating DECIMAL(2,1),
    review_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### ranking_results 테이블
```sql
CREATE TABLE ranking_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    ranking INT,
    ranking_type ENUM('overall', 'mobile', 'desktop') DEFAULT 'overall',
    search_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### tracking_schedules 테이블
```sql
CREATE TABLE tracking_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    schedule_type ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
    is_active BOOLEAN DEFAULT TRUE,
    last_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 사용 방법

### 1. 스마트플레이스 분석
```typescript
// 스마트플레이스 정보 조회
const placeInfo = await api.get(`/smartplace/info/${placeId}`);
```

### 2. 순위 확인
```typescript
// 키워드별 순위 확인
const rankingResult = await api.post('/smartplace/check', {
  keyword: '강남 영어학원',
  placeName: 'ABC영어학원',
  location: '강남구'
});
```

### 3. 추적 스케줄 설정
```typescript
// 정기 추적 스케줄 등록
const schedule = await api.post('/smartplace/tracking/schedule', {
  keyword: '강남 영어학원',
  placeName: 'ABC영어학원',
  scheduleType: 'daily'
});
```

## 성능 최적화

### Lambda vs 로컬 크롤링
- **로컬 환경**: Puppeteer 직접 사용 (순차 처리)
- **프로덕션**: AWS Lambda 사용 (대량 병렬 처리)
- **성능 비교**: 100개 키워드 기준 로컬 30분 → Lambda 2분

### 캐싱 전략
- 스마트플레이스 정보: 1시간 캐시
- 순위 결과: 실시간 조회, 데이터베이스 저장

## 주의사항

1. **Rate Limiting**: 네이버 서버 부하 방지를 위한 요청 제한
2. **AWS Lambda**: 프로덕션 환경에서만 사용
3. **데이터 정확도**: 광고와 일반 검색 결과 구분
4. **리소스 관리**: 브라우저 인스턴스 적절한 해제

## 트러블슈팅

### 일반적인 문제
1. **순위 조회 실패**: 네트워크 연결 또는 셀렉터 변경 확인
2. **Lambda 타임아웃**: 함수 실행 시간 증가 또는 배치 크기 감소
3. **데이터베이스 락**: 동시 접근 제한 및 트랜잭션 최적화

### 로그 확인
```bash
# 백엔드 로그 확인
tail -f logs/ranking_check_*.log

# Lambda 로그 확인 (AWS CloudWatch)
aws logs tail /aws/lambda/smartplace-ranking-checker
```

## 업데이트 로그

### v1.2.0 (2025-08-07)
- 적응형 순위 체크 서비스 추가
- Lambda/로컬 환경 자동 분기 처리
- 광고 필터링 정확도 개선

### v1.1.0 (2025-07-25)
- 모바일/데스크톱 구분 순위 체크
- 추적 스케줄 관리 기능 추가
- 성능 최적화 (병렬 처리)

### v1.0.0 (2025-07-01)
- 기본 스마트플레이스 분석 기능
- 순위 확인 및 추적 기능
- 관리자 대시보드 연동