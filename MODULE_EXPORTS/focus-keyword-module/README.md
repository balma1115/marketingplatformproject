# 중점키워드 관리 모듈 (Focus Keyword Module)

## 개요
중점키워드 관리 모듈은 스마트플레이스와 블로그 키워드를 통합 관리하는 독립적인 모듈입니다.

## 기능
- 스마트플레이스 키워드와 블로그 키워드 통합 조회
- 키워드별 순위 추적 현황 확인
- 키워드 추가/삭제
- 중복 키워드 관리

## 폴더 구조
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
│   │   └── types/
│   │       └── index.d.ts
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── FocusKeywordUnified.tsx
│   │   ├── styles/
│   │   │   └── FocusKeywordUnified.css
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── .env.example
├── database/
│   └── schema.sql
└── README.md
```

## 필요한 데이터베이스 테이블

### 1. tracking_projects (스마트플레이스 프로젝트)
```sql
CREATE TABLE tracking_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  place_name VARCHAR(255) NOT NULL,
  place_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 2. tracking_keywords (스마트플레이스 키워드)
```sql
CREATE TABLE tracking_keywords (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (project_id) REFERENCES tracking_projects(id),
  UNIQUE KEY unique_project_keyword (project_id, keyword)
);
```

### 3. tracking_rankings (스마트플레이스 순위)
```sql
CREATE TABLE tracking_rankings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  keyword_id INT NOT NULL,
  `rank` INT,
  overall_rank INT,
  check_date DATE NOT NULL,
  ranking_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES tracking_keywords(id)
);
```

### 4. blog_tracking_projects (블로그 프로젝트)
```sql
CREATE TABLE blog_tracking_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  blog_name VARCHAR(255) NOT NULL,
  blog_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 5. blog_tracking_keywords (블로그 키워드)
```sql
CREATE TABLE blog_tracking_keywords (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (project_id) REFERENCES blog_tracking_projects(id),
  UNIQUE KEY unique_project_keyword (project_id, keyword)
);
```

### 6. blog_tracking_results (블로그 순위)
```sql
CREATE TABLE blog_tracking_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  keyword_id INT NOT NULL,
  main_tab_rank INT,
  blog_tab_rank INT,
  view_tab_rank INT,
  tracking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES blog_tracking_keywords(id)
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

### 1. 통합 키워드 조회
- **GET** `/api/focus-keywords/unified`
- 인증 필요
- Response:
```json
{
  "keywords": [
    {
      "keyword": "예시 키워드",
      "smartplace": {
        "id": 1,
        "projectName": "스마트플레이스명",
        "projectId": "place_id",
        "addedDate": "2025-01-01",
        "currentRank": 5,
        "overallRank": 10,
        "rankingType": "organic",
        "lastTracked": "2025-01-15"
      },
      "blog": {
        "id": 2,
        "projectName": "블로그명",
        "projectId": "blog_url",
        "addedDate": "2025-01-01",
        "mainTabRank": 3,
        "blogTabRank": 2,
        "viewTabRank": 5,
        "lastTracked": "2025-01-15"
      }
    }
  ],
  "stats": {
    "totalKeywords": 50,
    "smartplaceOnly": 20,
    "blogOnly": 15,
    "both": 15
  }
}
```

### 2. 스마트플레이스에 키워드 추가
- **POST** `/api/focus-keywords/add-to-smartplace`
- Body: `{ "keywords": ["키워드1", "키워드2"] }`

### 3. 블로그에 키워드 추가
- **POST** `/api/focus-keywords/add-to-blog`
- Body: `{ "keywords": ["키워드1", "키워드2"] }`

### 4. 키워드 삭제
- **DELETE** `/api/focus-keywords/:source/:keywordId`
- source: "smartplace" 또는 "blog"

## 의존성

### Backend
- express
- mysql2
- jsonwebtoken
- bcrypt
- dotenv
- cors
- typescript

### Frontend
- react
- typescript
- lucide-react
- axios
- vite

## 제한사항
- 스마트플레이스: 최대 30개 키워드
- 블로그: 최대 50개 키워드