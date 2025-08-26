# 03_이미지생성 모듈

## 개요
AI 기반 이미지 생성 및 썸네일 생성 기능을 제공하는 모듈입니다.

## 주요 기능
- AI 이미지 생성 (Flux API)
- 썸네일 자동 생성
- 이미지 편집 및 최적화
- 이미지 프록시 서버 (CORS 해결)
- 생성 기록 및 사용량 추적

## 기술 스택

### Frontend
- React 18 with TypeScript
- Canvas API for image editing
- CSS Modules for styling
- Image optimization components

### Backend
- Node.js with Express
- Flux API by Black Forest Labs
- Image proxy server
- File upload handling (Multer)

## 프로젝트 구조

```
03_이미지생성/
├── frontend/
│   ├── components/
│   │   ├── ImageEditor.tsx
│   │   ├── OptimizedImage.tsx
│   │   └── LoadingOverlay.tsx
│   ├── pages/
│   │   ├── ImageGenerationPage.tsx
│   │   ├── ThumbnailGenerationPage.tsx
│   │   └── ThumbnailUpdatePage.tsx
│   └── styles/
│       ├── ImageGeneration.css
│       ├── ImageEditor.css
│       └── OptimizedImage.css
├── backend/
│   ├── routes/
│   │   ├── flux-image.ts
│   │   └── image.routes.ts
│   ├── services/
│   │   ├── fluxTracker.ts
│   │   └── imageOptimizationService.ts
│   └── config/
│       └── flux-config.ts
└── database/
    └── image_generation_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Frontend 의존성
npm install react react-dom html2canvas

# Backend 의존성
npm install multer sharp axios form-data
```

### 환경 변수
```env
# Flux API 설정
FLUX_API_KEY=your-flux-api-key
FLUX_API_URL=https://api.bfl.ml

# 이미지 저장 경로
UPLOAD_PATH=./uploads/images
PROXY_PATH=/api/flux-image/proxy
```

## API 엔드포인트

### 이미지 생성
```http
POST /api/flux-image/generate
Content-Type: application/json

{
  "prompt": "아름다운 산 풍경",
  "model": "flux-dev",
  "width": 1024,
  "height": 1024,
  "steps": 50
}
```

### 생성 결과 조회
```http
GET /api/flux-image/result/:taskId
```

### 이미지 프록시
```http
GET /api/flux-image/proxy?url=https://example.com/image.jpg
```

### 썸네일 생성
```http
POST /api/image/thumbnail
Content-Type: multipart/form-data

{
  "file": [이미지 파일],
  "width": 300,
  "height": 200
}
```

## 데이터베이스 스키마

### image_generations 테이블
```sql
CREATE TABLE image_generations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    task_id VARCHAR(255) UNIQUE NOT NULL,
    prompt TEXT NOT NULL,
    model ENUM('flux-dev', 'flux-pro', 'flux-max') DEFAULT 'flux-dev',
    width INT DEFAULT 1024,
    height INT DEFAULT 1024,
    steps INT DEFAULT 50,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    image_url TEXT,
    cost DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### image_usage_tracking 테이블
```sql
CREATE TABLE image_usage_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    model_type ENUM('flux-dev', 'flux-pro', 'flux-max') NOT NULL,
    cost DECIMAL(10,3) NOT NULL,
    prompt_length INT,
    generation_time INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 사용 방법

### 1. AI 이미지 생성
```typescript
// 이미지 생성 요청
const generation = await api.post('/flux-image/generate', {
  prompt: '아름다운 산 풍경',
  model: 'flux-dev',
  width: 1024,
  height: 1024
});

// 생성 결과 확인
const result = await api.get(`/flux-image/result/${generation.data.taskId}`);
```

### 2. 썸네일 생성
```typescript
// 썸네일 생성
const formData = new FormData();
formData.append('file', imageFile);
formData.append('width', '300');
formData.append('height', '200');

const thumbnail = await api.post('/image/thumbnail', formData);
```

### 3. 이미지 편집
```typescript
// ImageEditor 컴포넌트 사용
<ImageEditor
  imageUrl={originalImage}
  onSave={handleImageSave}
  tools={['crop', 'resize', 'filter']}
/>
```

## 모델별 가격 정보

### Flux 모델 비교
- **Flux Dev**: 1냥 (빠른 생성, 기본 품질)
- **Flux Pro**: 1.3냥 (향상된 품질, 더 정확한 결과)
- **Flux Max**: 2.1냥 (최고 품질, 상세한 결과)

### 비용 계산
```typescript
const modelCosts = {
  'flux-dev': 1.0,
  'flux-pro': 1.3,
  'flux-max': 2.1
};

const calculateCost = (model: string) => {
  return modelCosts[model] || modelCosts['flux-dev'];
};
```

## 최적화 기능

### 이미지 압축
```typescript
// Sharp를 사용한 이미지 최적화
const optimizeImage = async (inputPath: string, outputPath: string) => {
  await sharp(inputPath)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
};
```

### 프록시 서버
CORS 문제 해결을 위한 이미지 프록시 서버:
```typescript
app.get('/api/flux-image/proxy', async (req, res) => {
  const imageUrl = req.query.url as string;
  const response = await axios.get(imageUrl, { responseType: 'stream' });
  response.data.pipe(res);
});
```

## 사용량 추적

### Flux 사용량 추적
```typescript
// 사용량 기록
const trackFluxUsage = async (userId: number, model: string, cost: number) => {
  await db.query(
    'INSERT INTO image_usage_tracking (user_id, model_type, cost) VALUES (?, ?, ?)',
    [userId, model, cost]
  );
};
```

### 일일 사용량 조회
```typescript
// 오늘의 이미지 생성 통계
const getTodayStats = async (userId: number) => {
  const stats = await db.query(`
    SELECT 
      COUNT(*) as total_generations,
      SUM(cost) as total_cost,
      model_type
    FROM image_generations 
    WHERE user_id = ? AND DATE(created_at) = CURDATE()
    GROUP BY model_type
  `, [userId]);
  
  return stats;
};
```

## 보안 고려사항

### 파일 업로드 보안
```typescript
// 안전한 파일 업로드 설정
const multerConfig = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  }
});
```

### API 키 보호
- 환경 변수로 API 키 관리
- 서버 사이드에서만 API 호출
- 프론트엔드에서는 결과만 받아서 표시

## 트러블슈팅

### 일반적인 문제
1. **생성 실패**: API 키 확인 및 프롬프트 길이 검증
2. **CORS 오류**: 프록시 서버 사용 확인
3. **파일 업로드 실패**: 파일 크기 및 형식 확인

### 성능 최적화
- 이미지 캐싱 구현
- 썸네일 미리 생성
- CDN 사용 고려

## 업데이트 로그

### v1.2.0 (2025-08-01)
- 이미지 편집 기능 추가
- 최적화 서비스 구현
- 사용량 추적 고도화

### v1.1.0 (2025-07-15)
- Flux Pro, Max 모델 추가
- 썸네일 생성 기능
- 프록시 서버 구현

### v1.0.0 (2025-07-01)
- 기본 AI 이미지 생성 기능
- Flux Dev 모델 연동
- 코인 시스템 연동