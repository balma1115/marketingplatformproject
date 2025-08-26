# 블로그 키워드 관리 모듈 (Blog Keyword Module)

## 개요
네이버 블로그의 키워드별 검색 순위를 추적하고 관리하는 독립적인 모듈입니다.

## 기능
- 블로그 URL 등록 및 관리
- 키워드별 순위 추적 (통합검색, 블로그탭, VIEW탭)
- 순위 변동 내역 조회
- 키워드 일괄 추가/삭제
- 순위 추적 스케줄링
- CSV 내보내기

## 폴더 구조
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
│   │   │   └── BlogKeywordList.tsx
│   │   ├── styles/
│   │   │   └── BlogKeywordList.css
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── .env.example
├── database/
│   └── schema.sql
└── README.md
```

## 필요한 데이터베이스 테이블

### 1. blog_tracking_projects
```sql
CREATE TABLE blog_tracking_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  blog_url VARCHAR(500) NOT NULL,
  blog_name VARCHAR(255) NOT NULL,
  blog_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_tracked_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 2. blog_tracking_keywords
```sql
CREATE TABLE blog_tracking_keywords (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  added_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES blog_tracking_projects(id),
  UNIQUE KEY unique_project_keyword (project_id, keyword)
);
```

### 3. blog_tracking_results
```sql
CREATE TABLE blog_tracking_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  keyword_id INT NOT NULL,
  main_tab_exposed BOOLEAN DEFAULT FALSE,
  main_tab_rank INT,
  blog_tab_rank INT,
  view_tab_rank INT,
  ad_rank INT,
  ranking_type VARCHAR(50) DEFAULT 'organic',
  tracking_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES blog_tracking_keywords(id),
  INDEX idx_tracking_date (tracking_date),
  INDEX idx_keyword_date (keyword_id, tracking_date)
);
```

### 4. blog_tracking_schedules
```sql
CREATE TABLE blog_tracking_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  schedule_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES blog_tracking_projects(id),
  UNIQUE KEY unique_project_schedule (project_id, schedule_time)
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
- **GET** `/api/blog/tracking`
- 인증 필요
- Response:
```json
{
  "project": {
    "id": 1,
    "blogUrl": "https://blog.naver.com/example",
    "blogName": "예제 블로그",
    "blogId": "example",
    "keywords": [
      {
        "id": 1,
        "keyword": "검색 키워드",
        "addedDate": "2025-01-01",
        "rankings": [
          {
            "date": "2025-01-15",
            "main_tab_exposed": true,
            "main_tab_rank": 5,
            "blog_tab_rank": 3,
            "view_tab_rank": 8
          }
        ]
      }
    ],
    "createdAt": "2025-01-01",
    "lastUpdated": "2025-01-15"
  }
}
```

### 2. 블로그 등록/수정
- **POST** `/api/blog/tracking/register`
- Body:
```json
{
  "blogUrl": "https://blog.naver.com/example",
  "blogName": "예제 블로그",
  "blogId": "example"
}
```

### 3. 키워드 추가
- **POST** `/api/blog/tracking/keywords`
- Body:
```json
{
  "keywords": ["키워드1", "키워드2", "키워드3"]
}
```

### 4. 키워드 삭제
- **DELETE** `/api/blog/tracking/keywords/:keywordId`

### 5. 순위 추적 실행
- **POST** `/api/blog/tracking/track`
- Body:
```json
{
  "keywordIds": [1, 2, 3]  // 선택적, 없으면 모든 키워드
}
```

### 6. 스케줄 관리
- **GET** `/api/blog/tracking/schedules` - 스케줄 조회
- **POST** `/api/blog/tracking/schedules` - 스케줄 추가
- **DELETE** `/api/blog/tracking/schedules/:scheduleId` - 스케줄 삭제

### 7. 통계 조회
- **GET** `/api/blog/tracking/stats`
- Response:
```json
{
  "totalKeywords": 50,
  "trackedToday": 45,
  "averageMainRank": 15.3,
  "averageBlogRank": 8.5,
  "topKeywords": [
    {
      "keyword": "인기 키워드",
      "mainRank": 3,
      "blogRank": 1
    }
  ]
}
```

### 8. CSV 내보내기
- **GET** `/api/blog/tracking/export?format=csv`

## 서비스 로직

### 순위 추적 프로세스
1. 키워드별로 네이버 검색 수행
2. 통합검색(main_tab) 결과에서 블로그 노출 여부 및 순위 확인
3. 블로그탭(blog_tab) 검색 결과 확인
4. VIEW탭(view_tab) 검색 결과 확인
5. 광고 블록 필터링
6. 결과를 데이터베이스에 저장

### 광고 필터링 규칙
- `.splink_ad` 클래스 제외
- `.link_ad` 클래스 제외
- `[data-ad]` 속성 제외
- 파워링크, 브랜드검색 섹션 제외

## 의존성

### Backend
- express
- mysql2
- puppeteer (네이버 스크래핑)
- cheerio (HTML 파싱)
- jsonwebtoken
- bcrypt
- node-cron (스케줄링)
- json2csv (CSV 내보내기)
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
- vite

## 제한사항
- 최대 50개 키워드 등록 가능
- 하루 최대 10회 자동 추적
- 동시 검색 3개 제한 (서버 부하 방지)

## 주의사항
- 네이버 검색 결과 페이지 구조가 변경되면 스크래핑 로직 업데이트 필요
- 과도한 요청 시 IP 차단 가능성 있음
- 프록시 사용 권장