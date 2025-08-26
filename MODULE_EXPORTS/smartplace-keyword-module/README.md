# 스마트플레이스 키워드 관리 모듈 (SmartPlace Keyword Module)

## 개요
네이버 스마트플레이스의 키워드별 검색 순위를 추적하고 관리하는 독립적인 모듈입니다.

## 기능
- 스마트플레이스 등록 및 관리
- 키워드별 순위 추적 (지도순위, 통합순위)
- 순위 변동 내역 조회 및 차트 분석
- 키워드 일괄 추가/삭제
- 순위 추적 스케줄링
- 경쟁업체 분석
- CSV/Excel 내보내기

## 폴더 구조
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
│   │   │   └── improvedTrackingScheduler.ts
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts
│   │   ├── config/
│   │   │   └── database.ts
│   │   └── types/
│   │       └── index.d.ts
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SmartPlaceAnalysis.tsx
│   │   │   ├── SmartPlaceRanking.tsx
│   │   │   └── TrackingSchedule.tsx
│   │   ├── styles/
│   │   │   ├── SmartPlaceAnalysis.css
│   │   │   ├── SmartPlaceRanking.css
│   │   │   └── TrackingSchedule.css
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── .env.example
├── database/
│   └── schema.sql
└── README.md
```

## 필요한 데이터베이스 테이블

### 1. tracking_projects
```sql
CREATE TABLE tracking_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  place_name VARCHAR(255) NOT NULL,
  place_id VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_place (user_id, place_id)
);
```

### 2. tracking_keywords
```sql
CREATE TABLE tracking_keywords (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  added_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES tracking_projects(id),
  UNIQUE KEY unique_project_keyword (project_id, keyword)
);
```

### 3. tracking_results
```sql
CREATE TABLE tracking_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  keyword_id INT NOT NULL,
  rank INT,
  overall_rank INT,
  check_date DATE NOT NULL,
  ranking_type ENUM('organic', 'ad', 'both') DEFAULT 'organic',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES tracking_keywords(id),
  INDEX idx_check_date (check_date),
  INDEX idx_keyword_date (keyword_id, check_date)
);
```

### 4. tracking_rankings (신규 테이블)
```sql
CREATE TABLE tracking_rankings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  keyword_id INT NOT NULL,
  rank INT,
  overall_rank INT,
  check_date DATE NOT NULL,
  ranking_type VARCHAR(50) DEFAULT 'organic',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES tracking_keywords(id),
  UNIQUE KEY unique_keyword_date_type (keyword_id, check_date, ranking_type)
);
```

### 5. tracking_schedules
```sql
CREATE TABLE tracking_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  schedule_name VARCHAR(100),
  schedule_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES tracking_projects(id)
);
```

### 6. tracking_sessions
```sql
CREATE TABLE tracking_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  total_keywords INT NOT NULL,
  completed_keywords INT DEFAULT 0,
  status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 환경 설정

### Backend .env
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=marketingplat
DB_PORT=3306

# JWT
JWT_SECRET=your-secret-key

# Server
PORT=3010

# Scraping
PUPPETEER_HEADLESS=true
MAX_CONCURRENT_SEARCHES=3

# AWS Lambda (Production)
USE_LAMBDA=false  # true in production
LAMBDA_FUNCTION_NAME=smartplace-ranking-checker
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

### Frontend .env
```env
VITE_API_URL=http://localhost:3010
```

## 설치 및 실행

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API 엔드포인트

### 1. 프로젝트 조회
- **GET** `/api/smartplace/tracking`
- 인증 필요
- Query Parameters:
  - `page`: 페이지 번호 (기본값: 1)
  - `limit`: 페이지당 항목 수 (기본값: 50)
- Response:
```json
{
  "project": {
    "id": 1,
    "placeName": "우리 가게",
    "placeId": "123456",
    "totalKeywords": 30,
    "keywords": [
      {
        "id": 1,
        "keyword": "용인 맛집",
        "addedDate": "2025-01-01",
        "rankings": [
          {
            "date": "2025-01-15",
            "rank": 5,
            "overallRank": 10,
            "rankingType": "organic"
          }
        ]
      }
    ]
  }
}
```

### 2. 스마트플레이스 등록
- **POST** `/api/smartplace/tracking/register`
- Body:
```json
{
  "placeId": "123456",
  "placeName": "우리 가게"
}
```

### 3. 키워드 추가
- **POST** `/api/smartplace/tracking/keywords`
- Body:
```json
{
  "keywords": ["키워드1", "키워드2", "키워드3"]
}
```

### 4. 키워드 삭제
- **DELETE** `/api/smartplace/tracking/keywords/:keywordId`

### 5. 순위 확인
- **POST** `/api/smartplace/check`
- Body:
```json
{
  "placeId": "123456",
  "keywords": ["키워드1", "키워드2"]
}
```

### 6. 진행 상황 조회
- **GET** `/api/smartplace/progress/:sessionId`
- Response:
```json
{
  "status": "in_progress",
  "totalKeywords": 30,
  "completedKeywords": 15,
  "progress": 50,
  "results": []
}
```

### 7. 스케줄 관리
- **GET** `/api/smartplace/tracking/schedules` - 스케줄 조회
- **POST** `/api/smartplace/tracking/schedules` - 스케줄 추가
- **PUT** `/api/smartplace/tracking/schedules/:id` - 스케줄 수정
- **DELETE** `/api/smartplace/tracking/schedules/:id` - 스케줄 삭제

### 8. 통계 조회
- **GET** `/api/smartplace/tracking/stats`
- Response:
```json
{
  "totalKeywords": 30,
  "trackedToday": 25,
  "averageRank": 12.5,
  "topKeywords": [
    {
      "keyword": "인기 키워드",
      "rank": 1,
      "overallRank": 3
    }
  ],
  "rankDistribution": {
    "top3": 5,
    "top10": 12,
    "top30": 25,
    "outOfRange": 5
  }
}
```

### 9. 경쟁업체 분석
- **GET** `/api/smartplace/competitors?keyword=키워드`
- Response:
```json
{
  "competitors": [
    {
      "rank": 1,
      "placeName": "경쟁업체A",
      "placeId": "comp123",
      "category": "음식점"
    }
  ]
}
```

### 10. CSV 내보내기
- **GET** `/api/smartplace/tracking/export?format=csv`

## 서비스 로직

### 순위 추적 프로세스
1. 키워드별로 네이버 지도 검색 수행
2. 지도 순위(map_rank) 확인
3. 통합검색 순위(overall_rank) 확인
4. 광고/오가닉 구분
5. 결과를 데이터베이스에 저장

### 적응형 랭킹 서비스
- **개발 환경**: Puppeteer 직접 크롤링
- **프로덕션 환경**: AWS Lambda 병렬 처리
- 환경 변수 `USE_LAMBDA`로 자동 전환

## 의존성

### Backend
- express
- mysql2
- puppeteer (지도 스크래핑)
- playwright (대안 스크래핑)
- cheerio (HTML 파싱)
- jsonwebtoken
- bcrypt
- node-cron (스케줄링)
- uuid (세션 ID)
- json2csv (CSV 내보내기)
- aws-sdk (Lambda 연동)
- dotenv
- cors
- typescript

### Frontend
- react
- typescript
- lucide-react
- axios
- chart.js (순위 차트)
- react-chartjs-2
- date-fns
- vite

## 제한사항
- 최대 30개 키워드 등록 가능
- 하루 최대 10회 자동 추적
- 동시 검색 3개 제한 (서버 부하 방지)

## 성능 최적화
- **로컬 환경**: 100개 키워드 약 30분 (순차 처리)
- **Lambda 환경**: 100개 키워드 약 2분 (병렬 처리)
- 페이지네이션으로 대량 데이터 처리
- GROUP_CONCAT 최적화로 쿼리 성능 개선

## 주의사항
- 네이버 지도 페이지 구조가 변경되면 스크래핑 로직 업데이트 필요
- 과도한 요청 시 IP 차단 가능성
- 프록시 사용 권장
- Lambda 함수는 별도 배포 필요