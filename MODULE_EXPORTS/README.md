# 키워드 관리 모듈 통합 가이드

## 개요
마케팅플랫의 3가지 키워드 관리 기능을 독립적으로 이식 가능한 모듈로 분리 정리한 문서입니다.

## 모듈 구성

### 1. 중점키워드 관리 모듈 (Focus Keyword Module)
- **목적**: 스마트플레이스와 블로그 키워드를 통합 관리
- **특징**: 중복 키워드 관리, 통합 대시보드
- **폴더**: `focus-keyword-module/`

### 2. 블로그 키워드 관리 모듈 (Blog Keyword Module)
- **목적**: 네이버 블로그 검색 순위 추적
- **특징**: 통합검색/블로그탭/VIEW탭 순위 추적
- **폴더**: `blog-keyword-module/`

### 3. 스마트플레이스 키워드 관리 모듈 (SmartPlace Keyword Module)
- **목적**: 네이버 스마트플레이스 순위 추적
- **특징**: 지도순위/통합순위, Lambda 병렬 처리
- **폴더**: `smartplace-keyword-module/`

## 공통 의존성

### Backend 공통
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mysql2": "^3.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "dotenv": "^16.0.0",
    "cors": "^2.8.5",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "nodemon": "^3.0.0",
    "ts-node": "^10.9.0"
  }
}
```

### Frontend 공통
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "lucide-react": "^0.300.0",
    "axios": "^1.6.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

## 독립 실행을 위한 설정

### 1. 데이터베이스 설정
각 모듈은 독립적인 데이터베이스 또는 공유 데이터베이스를 사용할 수 있습니다.

#### 독립 데이터베이스 사용 시
```sql
-- 각 모듈별 데이터베이스 생성
CREATE DATABASE focus_keyword_db;
CREATE DATABASE blog_keyword_db;
CREATE DATABASE smartplace_keyword_db;

-- 사용자 테이블 (각 DB에 생성)
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 공유 데이터베이스 사용 시
```sql
-- 단일 데이터베이스 사용
CREATE DATABASE keyword_management_db;

-- 테이블 프리픽스로 구분
-- focus_ : 중점키워드
-- blog_ : 블로그
-- smartplace_ : 스마트플레이스
```

### 2. 환경 변수 설정

#### 개발 환경 (.env.development)
```env
# Server
NODE_ENV=development
PORT=3010

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=keyword_management_db
DB_PORT=3306

# JWT
JWT_SECRET=dev-secret-key-change-in-production

# CORS
CLIENT_URL=http://localhost:3020
```

#### 프로덕션 환경 (.env.production)
```env
# Server
NODE_ENV=production
PORT=3010

# Database
DB_HOST=your-rds-endpoint.amazonaws.com
DB_USER=admin
DB_PASSWORD=secure-password
DB_NAME=keyword_management_db
DB_PORT=3306

# JWT
JWT_SECRET=production-secret-key-very-secure

# CORS
CLIENT_URL=https://your-domain.com
```

### 3. 모듈별 독립 실행 스크립트

#### 중점키워드 모듈
```bash
# setup.sh
#!/bin/bash
cd focus-keyword-module

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your settings

# Frontend setup
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your settings

echo "Focus Keyword Module setup complete!"
```

#### 블로그 키워드 모듈
```bash
# setup.sh
#!/bin/bash
cd blog-keyword-module

# Backend setup
cd backend
npm install
cp .env.example .env

# Install additional dependencies for scraping
npm install puppeteer cheerio

# Frontend setup
cd ../frontend
npm install
cp .env.example .env

echo "Blog Keyword Module setup complete!"
```

#### 스마트플레이스 모듈
```bash
# setup.sh
#!/bin/bash
cd smartplace-keyword-module

# Backend setup
cd backend
npm install
cp .env.example .env

# Install additional dependencies
npm install puppeteer playwright aws-sdk

# Frontend setup
cd ../frontend
npm install
cp .env.example .env

echo "SmartPlace Keyword Module setup complete!"
```

### 4. Docker 구성 (선택사항)

#### docker-compose.yml (각 모듈별)
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: keyword_db
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build: ./backend
    ports:
      - "3010:3010"
    environment:
      - NODE_ENV=development
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=root
      - DB_PASSWORD=root
      - DB_NAME=keyword_db
    depends_on:
      - mysql

  frontend:
    build: ./frontend
    ports:
      - "3020:3020"
    environment:
      - VITE_API_URL=http://localhost:3010
    depends_on:
      - backend

volumes:
  mysql_data:
```

## 모듈 간 통합

### API Gateway 패턴
```javascript
// api-gateway.js
const express = require('express');
const httpProxy = require('http-proxy-middleware');

const app = express();

// 중점키워드 모듈
app.use('/api/focus', httpProxy({
  target: 'http://localhost:3011',
  changeOrigin: true
}));

// 블로그 키워드 모듈
app.use('/api/blog', httpProxy({
  target: 'http://localhost:3012',
  changeOrigin: true
}));

// 스마트플레이스 모듈
app.use('/api/smartplace', httpProxy({
  target: 'http://localhost:3013',
  changeOrigin: true
}));

app.listen(3010);
```

### 공통 인증 서비스
```javascript
// auth-service.js
const jwt = require('jsonwebtoken');

class AuthService {
  static generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
  }

  static verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}

module.exports = AuthService;
```

## 배포 가이드

### 1. AWS EC2 배포
```bash
# EC2 인스턴스 설정
sudo apt update
sudo apt install nodejs npm mysql-server nginx

# PM2 설치
sudo npm install -g pm2

# 각 모듈 배포
git clone your-repo.git
cd MODULE_EXPORTS/[module-name]
npm install --production
pm2 start backend/src/index.js --name "keyword-module"
```

### 2. Vercel/Netlify (Frontend)
```bash
# Frontend 빌드
cd frontend
npm run build

# Vercel 배포
vercel --prod

# Netlify 배포
netlify deploy --prod
```

### 3. Railway/Render (Full Stack)
```yaml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 30
```

## 모니터링 및 로깅

### 1. 로깅 설정
```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### 2. 헬스체크 엔드포인트
```javascript
// health.js
router.get('/health', async (req, res) => {
  try {
    // DB 연결 확인
    await pool.execute('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## 보안 고려사항

### 1. 환경 변수 보안
- `.env` 파일을 절대 커밋하지 않기
- 프로덕션에서는 환경 변수 관리 서비스 사용 (AWS Secrets Manager, etc.)

### 2. API 보안
```javascript
// security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Security headers
app.use(helmet());
app.use('/api/', limiter);
```

### 3. SQL Injection 방지
```javascript
// 항상 Prepared Statements 사용
const [rows] = await pool.execute(
  'SELECT * FROM users WHERE email = ?',
  [email]
);
```

## 테스트

### 단위 테스트
```javascript
// test/keyword.test.js
const request = require('supertest');
const app = require('../src/app');

describe('Keyword API', () => {
  test('GET /api/keywords', async () => {
    const response = await request(app)
      .get('/api/keywords')
      .set('Authorization', 'Bearer token');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('keywords');
  });
});
```

### 통합 테스트
```bash
# 모든 모듈 테스트
npm run test:all

# 개별 모듈 테스트
npm run test:focus
npm run test:blog
npm run test:smartplace
```

## 문제 해결

### 일반적인 문제
1. **포트 충돌**: 각 모듈이 다른 포트 사용 확인
2. **DB 연결 실패**: 환경 변수 및 DB 권한 확인
3. **CORS 에러**: CLIENT_URL 환경 변수 확인

### 디버깅
```bash
# 로그 확인
pm2 logs [module-name]

# DB 쿼리 로깅
SET GLOBAL general_log = 'ON';
```

## 업데이트 및 유지보수

### 버전 관리
- Semantic Versioning (MAJOR.MINOR.PATCH) 사용
- 각 모듈 독립적인 버전 관리

### 마이그레이션
```bash
# DB 마이그레이션
npm run migrate:up
npm run migrate:down
```

## 라이선스 및 기여
각 모듈은 독립적으로 사용 가능하며, MIT 라이선스를 따릅니다.