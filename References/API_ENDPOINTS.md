# MarketingPlat API 엔드포인트 가이드

## API 개요
- **Base URL**: `http://localhost:3010/api` (개발) / `https://your-domain.com/api` (프로덕션)
- **인증 방식**: JWT (httpOnly 쿠키)
- **Content-Type**: `application/json`
- **Rate Limiting**: 엔드포인트별 다양한 제한

## 인증 시스템

### 공개 엔드포인트 (인증 불필요)
- `/api/health`
- `/api/auth/*`
- `/api/magazine` (읽기 전용)

### 인증 필수 엔드포인트
- `/api/*` (공개 엔드포인트 제외 모든 API)

## 1. 인증 (Authentication) - `/api/auth`

### POST `/api/auth/register`
사용자 회원가입

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "name": "홍길동",
  "phone": "010-1234-5678",
  "subject": "미래엔영어",
  "branch_id": 1,
  "academy_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "role": "user"
  }
}
```

**Rate Limit:** 5 requests/15min

### POST `/api/auth/login`
사용자 로그인

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "로그인 성공",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "role": "user",
    "coin": 100.00
  }
}
```

### POST `/api/auth/logout`
사용자 로그아웃

**Response:**
```json
{
  "success": true,
  "message": "로그아웃되었습니다."
}
```

### GET `/api/auth/me`
현재 사용자 정보 조회

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "role": "user",
    "coin": 97.50
  }
}
```

## 2. AI 서비스 - `/api/ai`

**Rate Limit:** 20 requests/15min

### POST `/api/ai/generate-titles`
블로그 제목 생성

**Request Body:**
```json
{
  "topic": "영어학원 마케팅",
  "gptType": "english-branch",
  "saveToDatabase": true
}
```

**Response:**
```json
{
  "success": true,
  "titles": [
    "영어학원 성공 마케팅의 핵심 전략 5가지",
    "학부모가 선택하는 영어학원의 특징",
    "온라인과 오프라인을 결합한 영어학원 운영법"
  ],
  "tokensUsed": 150,
  "costInNyang": 3.0
}
```

### POST `/api/ai/generate-content`
블로그 콘텐츠 생성

**Request Body:**
```json
{
  "title": "영어학원 성공 마케팅의 핵심 전략 5가지",
  "gptType": "english-branch",
  "includeToc": true
}
```

**Response:**
```json
{
  "success": true,
  "content": "## 영어학원 성공 마케팅의 핵심 전략...",
  "toc": [
    "1. 타겟 학습자 분석",
    "2. 차별화된 커리큘럼 개발",
    "3. 디지털 마케팅 활용"
  ],
  "tokensUsed": 800,
  "costInNyang": 3.0
}
```

### POST `/api/ai/generate-keywords`
키워드 생성

**Request Body:**
```json
{
  "topic": "영어학원",
  "count": 10
}
```

**Response:**
```json
{
  "success": true,
  "keywords": [
    "영어학원",
    "영어 과외",
    "토익 학원",
    "영어회화",
    "수능영어"
  ],
  "tokensUsed": 100
}
```

## 3. 이미지 생성 - `/api/flux-image`

**Rate Limit:** 10 requests/15min

### POST `/api/flux-image/generate`
이미지 생성 요청

**Request Body:**
```json
{
  "prompt": "modern english academy classroom",
  "model": "flux-dev",
  "width": 1024,
  "height": 768
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "task_123456789",
  "estimatedTime": 30,
  "costInNyang": 1.0
}
```

### GET `/api/flux-image/result/:taskId`
이미지 생성 결과 조회

**Response:**
```json
{
  "success": true,
  "status": "completed",
  "imageUrl": "https://api.flux.com/images/generated_image.jpg",
  "proxyUrl": "/api/flux-image/proxy?url=https://api.flux.com/images/generated_image.jpg"
}
```

### GET `/api/flux-image/proxy`
이미지 프록시 (CORS 해결용)

**Query Parameters:**
- `url`: 원본 이미지 URL

**Response:** Binary image data

## 4. 스마트플레이스 - `/api/smartplace`

### GET `/api/smartplace/info/:placeId`
스마트플레이스 정보 조회

**Response:**
```json
{
  "success": true,
  "placeInfo": {
    "name": "ABC영어학원",
    "address": "서울특별시 강남구...",
    "phone": "02-1234-5678",
    "rating": 4.5,
    "reviewCount": 152
  }
}
```

### POST `/api/smartplace/check`
순위 확인 요청

**Request Body:**
```json
{
  "placeId": "12345",
  "keywords": [
    {
      "keyword": "강남 영어학원",
      "location": "강남구"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_123456",
  "message": "순위 확인이 시작되었습니다."
}
```

### GET `/api/smartplace/progress/:sessionId`
진행 상황 조회

**Response:**
```json
{
  "sessionId": "session_123456",
  "status": "in_progress",
  "progress": {
    "total": 5,
    "completed": 3,
    "percentage": 60
  },
  "results": [
    {
      "keyword": "강남 영어학원",
      "rank": 3,
      "found": true
    }
  ]
}
```

## 5. 순위 확인 - `/api/ranking`

**Rate Limit:** 30 requests/15min

### POST `/api/ranking/check`
순위 체크 (적응형 서비스)

**Request Body:**
```json
{
  "keywords": [
    {
      "keyword": "영어학원",
      "location": "서울",
      "placeId": "12345"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "keyword": "영어학원",
      "rank": 5,
      "found": true,
      "type": "organic"
    }
  ]
}
```

## 6. 키워드 관리 - `/api/keyword`

### POST `/api/keyword/search`
키워드 검색

**Request Body:**
```json
{
  "query": "영어학원",
  "limit": 20
}
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "keyword": "영어학원",
      "searchVolume": 1000,
      "competition": "medium"
    }
  ]
}
```

### GET `/api/keyword/analytics`
키워드 분석 데이터

**Query Parameters:**
- `keyword`: 분석할 키워드
- `period`: 기간 (7d, 30d, 90d)

**Response:**
```json
{
  "keyword": "영어학원",
  "analytics": {
    "searchVolume": 1000,
    "trend": "increasing",
    "competitorCount": 250,
    "avgCpc": 850
  }
}
```

## 7. 블로그 관리 - `/api/blog`

### GET `/api/blog/projects`
블로그 추적 프로젝트 목록

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "id": 1,
      "name": "ABC영어학원 블로그",
      "url": "https://blog.example.com",
      "keywordCount": 15,
      "isActive": true
    }
  ]
}
```

### POST `/api/blog/projects`
새 블로그 프로젝트 생성

**Request Body:**
```json
{
  "name": "새 블로그 프로젝트",
  "targetBlogUrl": "https://myblog.com",
  "description": "프로젝트 설명"
}
```

### POST `/api/blog/keywords`
블로그 키워드 추가

**Request Body:**
```json
{
  "projectId": 1,
  "keywords": [
    {
      "keyword": "영어학원 추천",
      "location": "서울"
    }
  ]
}
```

### GET `/api/blog/results`
블로그 추적 결과 조회

**Query Parameters:**
- `projectId`: 프로젝트 ID
- `startDate`: 시작 날짜 (YYYY-MM-DD)
- `endDate`: 종료 날짜 (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "keyword": "영어학원 추천",
      "date": "2024-01-15",
      "rank": 3,
      "url": "https://myblog.com/post1",
      "title": "최고의 영어학원을 찾는 방법"
    }
  ]
}
```

## 8. 관리자 - `/api/admin`

**Required Role:** admin

### GET `/api/admin/dashboard/stats`
관리자 대시보드 통계

**Response:**
```json
{
  "users": {
    "total": 1500,
    "activeToday": 120,
    "newThisMonth": 85
  },
  "usage": {
    "aiRequests": 2450,
    "imageGenerated": 180,
    "totalCostNyang": 15600
  },
  "revenue": {
    "thisMonth": 125000,
    "lastMonth": 98000,
    "growth": 27.5
  }
}
```

### GET `/api/admin/dashboard/revenue-chart`
매출 차트 데이터

**Query Parameters:**
- `period`: 기간 (7d, 30d, 90d)

**Response:**
```json
{
  "labels": ["2024-01-01", "2024-01-02", "..."],
  "datasets": [
    {
      "label": "일일 매출",
      "data": [12000, 15000, 18000],
      "backgroundColor": "rgba(74, 144, 226, 0.1)"
    }
  ]
}
```

### GET `/api/admin/users`
사용자 목록 조회

**Query Parameters:**
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 개수 (기본: 20)
- `role`: 역할 필터 (user, admin, agency, branch)
- `search`: 검색어 (이름, 이메일)

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "홍길동",
      "role": "user",
      "coin": 95.50,
      "lastLogin": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 75,
    "totalItems": 1500
  }
}
```

### POST `/api/admin/users/:id/coin`
사용자 코인 조정

**Request Body:**
```json
{
  "amount": 100.0,
  "reason": "관리자 지급"
}
```

## 9. 광고 관리 - `/api/ads`

**Required Role:** agency

### GET `/api/ads/advertisers`
광고주 목록

**Response:**
```json
{
  "advertisers": [
    {
      "id": 1,
      "name": "ABC영어학원",
      "type": "academy",
      "status": "active",
      "campaignCount": 3
    }
  ]
}
```

### POST `/api/ads/campaigns`
새 캠페인 생성

**Request Body:**
```json
{
  "advertiserId": 1,
  "name": "영어학원 홍보 캠페인",
  "type": "power_link",
  "dailyBudget": 50000,
  "bidStrategy": "manual_cpc"
}
```

### GET `/api/ads/performance`
광고 성과 데이터

**Query Parameters:**
- `advertiserId`: 광고주 ID
- `startDate`: 시작 날짜
- `endDate`: 종료 날짜
- `groupBy`: 그룹화 기준 (campaign, adgroup, keyword)

**Response:**
```json
{
  "performance": [
    {
      "entityId": 1,
      "entityName": "영어학원 홍보 캠페인",
      "impressions": 12500,
      "clicks": 385,
      "cost": 45000,
      "ctr": 3.08,
      "cpc": 116.88
    }
  ]
}
```

## 10. 매거진 - `/api/magazine`

### GET `/api/magazine/articles`
매거진 기사 목록 (공개)

**Query Parameters:**
- `page`: 페이지 번호
- `limit`: 페이지당 개수
- `category`: 카테고리 필터
- `status`: 상태 필터 (published만 공개)

**Response:**
```json
{
  "articles": [
    {
      "id": 1,
      "title": "AI 마케팅의 미래",
      "slug": "ai-marketing-future",
      "excerpt": "AI 기술이 마케팅 업계에 미치는 영향...",
      "thumbnailUrl": "/uploads/thumbnails/article1.jpg",
      "publishedAt": "2024-01-15T09:00:00Z",
      "viewCount": 1250
    }
  ]
}
```

### GET `/api/magazine/articles/:slug`
매거진 기사 상세 (공개)

**Response:**
```json
{
  "article": {
    "id": 1,
    "title": "AI 마케팅의 미래",
    "content": "<html>기사 내용...</html>",
    "author": "마케팅 전문가",
    "publishedAt": "2024-01-15T09:00:00Z",
    "viewCount": 1251,
    "tags": ["AI", "마케팅", "미래"]
  }
}
```

## 11. 사용량 추적 - `/api/usage`

### GET `/api/usage/daily`
일일 사용량

**Response:**
```json
{
  "date": "2024-01-15",
  "usage": {
    "aiGeneration": 12,
    "imageGeneration": 3,
    "rankingCheck": 25,
    "totalCostNyang": 25.5
  }
}
```

### GET `/api/usage/monthly`
월별 사용량

**Query Parameters:**
- `year`: 연도 (기본: 현재 연도)
- `month`: 월 (기본: 현재 월)

**Response:**
```json
{
  "period": "2024-01",
  "usage": {
    "aiGeneration": 180,
    "imageGeneration": 45,
    "rankingCheck": 320,
    "totalCostNyang": 385.0
  },
  "dailyBreakdown": [
    {"date": "2024-01-01", "cost": 12.5},
    {"date": "2024-01-02", "cost": 18.0}
  ]
}
```

## 에러 응답 형식

모든 API는 에러 발생 시 다음 형식으로 응답합니다:

```json
{
  "success": false,
  "error": "에러 메시지",
  "code": "ERROR_CODE",
  "details": {
    "field": "잘못된 필드명",
    "value": "잘못된 값"
  }
}
```

### 공통 에러 코드
- `UNAUTHORIZED`: 인증 실패 (401)
- `FORBIDDEN`: 권한 없음 (403)
- `NOT_FOUND`: 리소스 없음 (404)
- `RATE_LIMIT_EXCEEDED`: 요청 제한 초과 (429)
- `INSUFFICIENT_COINS`: 코인 부족 (400)
- `VALIDATION_ERROR`: 유효성 검사 실패 (400)
- `INTERNAL_ERROR`: 서버 내부 오류 (500)

## Rate Limiting 정책

| 엔드포인트 그룹 | 제한 | 시간 |
|----------------|------|------|
| 기본 API | 100 requests | 15분 |
| AI 서비스 | 20 requests | 15분 |
| 이미지 생성 | 10 requests | 15분 |
| 인증 | 5 requests | 15분 |
| 순위 확인 | 30 requests | 15분 |
| 업로드 | 20 requests | 15분 |

## WebSocket 연결

실시간 업데이트를 위한 WebSocket 연결:
- **URL**: `ws://localhost:3021` (개발) / `wss://your-domain.com:3021` (프로덕션)
- **인증**: JWT 토큰 필요
- **이벤트**: 순위 확인 진행 상황, 이미지 생성 완료 알림 등

**연결 예시:**
```javascript
const socket = io('ws://localhost:3021', {
  withCredentials: true
});

socket.on('ranking_progress', (data) => {
  console.log('Ranking progress:', data);
});
```