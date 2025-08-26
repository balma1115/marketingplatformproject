# MarketingPlat 환경 설정 가이드

## 개요
MarketingPlat의 개발 및 프로덕션 환경 설정에 대한 완전한 가이드입니다.

## 시스템 요구사항

### 개발 환경
- **Node.js**: 18.0.0 이상
- **Python**: 3.9 이상 (NLP 서비스용)
- **MySQL**: 8.0 이상
- **Git**: 2.30 이상
- **OS**: Windows 10/11, macOS 10.15+, Ubuntu 20.04+

### 프로덕션 환경
- **서버**: AWS EC2 t3.medium 이상 권장
- **메모리**: 4GB RAM 이상
- **스토리지**: 20GB SSD 이상
- **네트워크**: 1Gbps 이상

## 포트 설정 (절대 변경 금지!)

```
포트 할당 규칙:
- Backend: 3010 (Express 서버)
- Frontend: 3020 (Vite Dev Server)
- WebSocket: 3021 (Socket.io)
- HMR: 3022 (Vite Hot Module Replacement)
- NLP Service: 5000 (Python Flask)
```

**⚠️ 중요: 포트는 절대 변경하지 마세요!**
- 다른 애플리케이션과 충돌 시 해당 애플리케이션의 포트를 변경하세요
- 포트 변경 시 전체 시스템이 작동하지 않을 수 있습니다

## 백엔드 환경 설정

### 1. 환경 변수 파일

#### `.env.development` (개발 환경)
```env
# 서버 설정
NODE_ENV=development
PORT=3010

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_NAME=marketingplat_dev
DB_USER=root
DB_PASSWORD=your_database_password

# JWT 설정
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=7d
COOKIE_SECRET=your-cookie-secret-key

# Google Gemini AI API
GEMINI_API_KEY=your_google_gemini_api_key

# Flux API (이미지 생성)
FLUX_API_KEY=your_flux_api_key

# 네이버 API 설정
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# 네이버 광고 API 설정
NAVER_ADS_API_KEY=your_naver_ads_api_key
NAVER_ADS_SECRET_KEY=your_naver_ads_secret_key
NAVER_ADS_CUSTOMER_ID=your_naver_ads_customer_id

# AWS 설정 (순위 체크용)
USE_LAMBDA=false
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-northeast-2
LAMBDA_FUNCTION_NAME=smartplace-ranking-checker

# NLP 서비스 설정
NLP_SERVICE_URL=http://localhost:5000

# CORS 설정
CORS_ORIGIN=http://localhost:3020

# Rate Limiting 설정
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### `.env.production` (프로덕션 환경)
```env
# 서버 설정
NODE_ENV=production
PORT=3010

# 데이터베이스 설정 (보안 강화)
DB_HOST=your_production_db_host
DB_PORT=3306
DB_NAME=marketingplat_prod
DB_USER=marketingplat_user
DB_PASSWORD=super_secure_production_password

# JWT 설정 (더 강력한 시크릿)
JWT_SECRET=your-super-secure-production-jwt-key-with-64-characters-or-more
JWT_EXPIRES_IN=24h
COOKIE_SECRET=your-production-cookie-secret

# API 키들 (프로덕션용)
GEMINI_API_KEY=prod_gemini_api_key
FLUX_API_KEY=prod_flux_api_key
NAVER_CLIENT_ID=prod_naver_client_id
NAVER_CLIENT_SECRET=prod_naver_client_secret

# AWS 설정 (Lambda 사용)
USE_LAMBDA=true
AWS_ACCESS_KEY_ID=prod_aws_access_key
AWS_SECRET_ACCESS_KEY=prod_aws_secret_key
AWS_REGION=ap-northeast-2

# CORS 설정 (도메인 지정)
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# 보안 설정
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
```

### 2. TypeScript 설정 (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "typeRoots": ["./node_modules/@types", "./src/types"]
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests"
  ]
}
```

### 3. Nodemon 설정 (`nodemon.json`)
```json
{
  "watch": ["src"],
  "ext": "ts,js,json",
  "ignore": ["src/**/*.spec.ts", "src/**/*.test.ts"],
  "exec": "ts-node src/index.ts",
  "env": {
    "NODE_ENV": "development"
  },
  "delay": 2000,
  "verbose": true
}
```

## 프론트엔드 환경 설정

### 1. 환경 변수 파일

#### `.env` (개발 환경)
```env
# API 베이스 URL
VITE_API_URL=http://localhost:3010

# 개발 모드 설정
VITE_NODE_ENV=development

# 디버그 모드
VITE_DEBUG=true

# 웹소켓 URL
VITE_WS_URL=ws://localhost:3021

# NLP 서비스 URL
VITE_NLP_URL=http://localhost:5000
```

#### `.env.production` (프로덕션 환경)
```env
# API 베이스 URL (프로덕션)
VITE_API_URL=https://api.your-domain.com

# 프로덕션 모드
VITE_NODE_ENV=production

# 디버그 모드 비활성화
VITE_DEBUG=false

# 웹소켓 URL (프로덕션)
VITE_WS_URL=wss://ws.your-domain.com

# NLP 서비스 URL (프로덕션)
VITE_NLP_URL=https://nlp.your-domain.com
```

### 2. Vite 설정 (`vite.config.ts`)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  
  // 개발 서버 설정
  server: {
    port: 3020, // 절대 변경 금지!
    strictPort: true,
    host: true, // 외부 접속 허용 (모바일 테스트용)
    
    // API 프록시 설정
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:3010',
        changeOrigin: true
      }
    },
    
    // HMR 설정
    hmr: {
      port: 3022, // WebSocket 충돌 방지
      overlay: true
    }
  },
  
  // 빌드 설정
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'chart.js'],
          utils: ['axios', 'date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  
  // 경로 별칭
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },
  
  // 환경 변수 타입 체크
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})
```

### 3. TypeScript 설정 (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@styles/*": ["src/styles/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## NLP 서비스 환경 설정

### 1. Python 요구사항 (`requirements.txt`)
```txt
Flask==3.0.0
Flask-CORS==4.0.0
kiwipiepy==0.17.0
scikit-learn==1.3.2
numpy==1.24.0
pandas==2.1.0
requests==2.31.0
python-dotenv==1.0.0
gunicorn==21.2.0
```

### 2. Flask 환경 설정 (`.env`)
```env
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_PORT=5000

# 데이터베이스 연결 (백엔드와 동일)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=marketingplat_dev
DB_USER=root
DB_PASSWORD=your_password

# 모델 설정
MAX_KEYWORDS=50
MIN_KEYWORD_LENGTH=2
STOPWORDS_FILE=models/stopwords.json
```

## 데이터베이스 설정

### 1. MySQL 설정 (`my.cnf` / `my.ini`)
```ini
[mysql]
default-character-set=utf8mb4

[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
max_connections=200
innodb_buffer_pool_size=1G
innodb_log_file_size=256M
query_cache_size=128M
query_cache_type=1

# 성능 최적화
innodb_flush_log_at_trx_commit=1
sync_binlog=1
max_allowed_packet=64M

# 연결 타임아웃
wait_timeout=28800
interactive_timeout=28800
```

### 2. 데이터베이스 초기화 스크립트
```sql
-- 데이터베이스 생성
CREATE DATABASE marketingplat_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE marketingplat_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 사용자 생성
CREATE USER 'marketingplat_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON marketingplat_dev.* TO 'marketingplat_user'@'localhost';
GRANT ALL PRIVILEGES ON marketingplat_prod.* TO 'marketingplat_user'@'localhost';

-- 프로덕션용 사용자 (제한된 권한)
CREATE USER 'marketingplat_prod'@'%' IDENTIFIED BY 'super_secure_prod_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON marketingplat_prod.* TO 'marketingplat_prod'@'%';

FLUSH PRIVILEGES;
```

## Docker 설정 (선택사항)

### 1. 백엔드 Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 종속성 복사 및 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# TypeScript 빌드
RUN npm run build

# 포트 노출
EXPOSE 3010

# 프로덕션 실행
CMD ["npm", "start"]
```

### 2. 프론트엔드 Dockerfile
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  database:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: marketingplat_dev
      MYSQL_USER: marketingplat_user
      MYSQL_PASSWORD: userpassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build: ./marketingplat-backend
    ports:
      - "3010:3010"
    environment:
      - NODE_ENV=development
      - DB_HOST=database
    depends_on:
      - database

  frontend:
    build: ./marketingplat-frontend
    ports:
      - "3020:80"
    depends_on:
      - backend

  nlp:
    build: ./marketingplat-nlp
    ports:
      - "5000:5000"

volumes:
  mysql_data:
```

## 프로덕션 배포 설정

### 1. PM2 설정 (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    {
      name: 'marketingplat-backend',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3010
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

### 2. Nginx 설정 (`nginx.conf`)
```nginx
upstream backend {
    server 127.0.0.1:3010;
}

upstream websocket {
    server 127.0.0.1:3021;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # 정적 파일 서빙
    location / {
        root /var/www/marketingplat/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API 프록시
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket 프록시
    location /socket.io/ {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 개발 환경 설정 가이드

### 1. 초기 설정 단계
```bash
# 1. 저장소 클론
git clone https://github.com/your-org/marketingplat.git
cd marketingplat

# 2. 백엔드 설정
cd marketingplat-backend
npm install
cp .env.example .env.development
# .env.development 파일 편집

# 3. 프론트엔드 설정
cd ../marketingplat-frontend
npm install
cp .env.example .env
# .env 파일 편집

# 4. NLP 서비스 설정 (선택사항)
cd ../marketingplat-nlp
pip install -r requirements.txt
cp .env.example .env
```

### 2. 개발 서버 시작 순서 (중요!)
```bash
# 1단계: MySQL 데이터베이스 시작
sudo service mysql start
# 또는 Docker: docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password mysql:8.0

# 2단계: 백엔드 서버 시작 (가장 먼저!)
cd marketingplat-backend
npm run dev

# 3단계: 프론트엔드 서버 시작 (백엔드 다음)
cd marketingplat-frontend
npm run dev

# 4단계: NLP 서비스 시작 (선택사항)
cd marketingplat-nlp
python app.py
```

### 3. 트러블슈팅 가이드

#### 포트 충돌 문제
```bash
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr :3010
netstat -ano | findstr :3020
netstat -ano | findstr :3021

# Windows에서 프로세스 종료
taskkill /F /PID [PID_NUMBER]

# Linux/Mac에서 프로세스 종료
lsof -ti:3010 | xargs kill -9
```

#### 데이터베이스 연결 오류
```bash
# MySQL 서비스 상태 확인
sudo service mysql status

# 연결 테스트
mysql -u root -p -h localhost -P 3306

# 권한 확인
SHOW GRANTS FOR 'marketingplat_user'@'localhost';
```

## 환경별 체크리스트

### 개발 환경 체크리스트
- [ ] Node.js 18+ 설치
- [ ] MySQL 8.0+ 설치 및 실행
- [ ] 모든 환경 변수 설정
- [ ] 데이터베이스 생성 및 권한 설정
- [ ] 백엔드 서버 정상 시작 (포트 3010)
- [ ] 프론트엔드 서버 정상 시작 (포트 3020)
- [ ] API 통신 테스트
- [ ] WebSocket 연결 테스트

### 프로덕션 환경 체크리스트
- [ ] 서버 보안 설정 (방화벽, SSH 키)
- [ ] SSL 인증서 설치
- [ ] 도메인 DNS 설정
- [ ] 데이터베이스 백업 시스템 설정
- [ ] 모니터링 도구 설치 (로그, 성능)
- [ ] PM2 또는 Docker로 프로세스 관리
- [ ] Nginx 역방향 프록시 설정
- [ ] 자동 배포 스크립트 설정

이 환경 설정 가이드를 따라하면 MarketingPlat을 안정적으로 개발하고 배포할 수 있습니다.