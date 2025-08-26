# MarketingPlat 프로젝트 문서

이 폴더에는 MarketingPlat 프로젝트의 완전한 아키텍처 문서가 포함되어 있습니다. 새 프로젝트 개발 시 참조 자료로 활용할 수 있습니다.

## 📋 문서 목록

### 1. [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- 전체 프로젝트 구조 및 아키텍처
- 기술 스택 상세 설명
- 디렉토리 구조 및 컴포넌트 배치
- 성능 최적화 전략

### 2. [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- 완전한 데이터베이스 스키마
- 테이블 관계 및 인덱스 설계
- 데이터 무결성 제약조건
- 성능 최적화를 위한 인덱싱 전략

### 3. [API_ENDPOINTS.md](./API_ENDPOINTS.md)
- 모든 REST API 엔드포인트
- 요청/응답 형식 및 예제
- 인증 및 권한 시스템
- Rate Limiting 정책

### 4. [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md)
- 핵심 비즈니스 로직 구현
- 냥 코인 시스템
- AI 콘텐츠 생성 워크플로우
- 네이버 검색 분석 알고리즘
- 스마트플레이스 순위 추적 시스템

### 5. [UI_COMPONENTS.md](./UI_COMPONENTS.md)
- 재사용 가능한 UI 컴포넌트 라이브러리
- 디자인 시스템 가이드라인
- 반응형 디자인 패턴
- 접근성 및 사용성 최적화

### 6. [EXTERNAL_APIS.md](./EXTERNAL_APIS.md)
- 외부 API 연동 가이드
- Google Gemini AI API
- Flux 이미지 생성 API
- 네이버 API 생태계 (검색, 광고, 데이터랩)
- AWS Lambda 활용

### 7. [ENVIRONMENT_CONFIG.md](./ENVIRONMENT_CONFIG.md)
- 개발 및 프로덕션 환경 설정
- 환경 변수 관리
- Docker 및 배포 설정
- 보안 설정 가이드

## 🚀 빠른 시작 가이드

### 새 프로젝트를 시작할 때:

1. **아키텍처 설계**: `PROJECT_STRUCTURE.md` 참조
2. **데이터베이스 설계**: `DATABASE_SCHEMA.md`의 스키마 패턴 활용
3. **API 설계**: `API_ENDPOINTS.md`의 RESTful 패턴 적용
4. **비즈니스 로직**: `BUSINESS_LOGIC.md`의 설계 패턴 참조
5. **UI 개발**: `UI_COMPONENTS.md`의 컴포넌트 시스템 구축
6. **외부 연동**: `EXTERNAL_APIS.md`의 통합 패턴 적용
7. **환경 설정**: `ENVIRONMENT_CONFIG.md`로 개발환경 구축

## 🎯 주요 특징

### 기술적 강점
- **풀스택 TypeScript**: 타입 안전성과 개발 생산성
- **마이크로서비스 지향**: 확장 가능한 아키텍처
- **AI 통합**: 최신 AI API들과의 효율적 통합
- **성능 최적화**: 캐싱, 로드 밸런싱, 병렬 처리
- **보안**: JWT, Rate Limiting, SQL Injection 방지

### 비즈니스 강점
- **냥 코인 시스템**: 독특한 가상화폐 경제 모델
- **네이버 생태계**: 한국 시장에 최적화된 마케팅 도구
- **실시간 분석**: WebSocket 기반 실시간 데이터 처리
- **확장성**: AWS 클라우드 인프라 활용

## 📊 기술 통계

### 코드베이스 규모
- **백엔드**: 150+ API 엔드포인트
- **프론트엔드**: 50+ React 컴포넌트
- **데이터베이스**: 30+ 테이블
- **외부 API**: 8개 서비스 통합

### 성능 지표
- **응답시간**: 평균 200ms 이하
- **동시접속**: 1,000명 지원
- **데이터 처리**: 100개 키워드 2분 내 처리 (Lambda)
- **가용성**: 99.9% 업타임 목표

## 🔧 개발 도구 및 라이브러리

### 프론트엔드
```json
{
  "react": "^19.1.0",
  "typescript": "~5.8.3",
  "vite": "^7.0.4",
  "react-router-dom": "^7.7.0",
  "axios": "^1.11.0",
  "chart.js": "^4.5.0",
  "lucide-react": "^0.525.0"
}
```

### 백엔드
```json
{
  "express": "^4.19.2",
  "typescript": "^5.4.2",
  "mysql2": "^3.9.2",
  "jsonwebtoken": "^9.0.2",
  "@google/generative-ai": "^0.24.0",
  "playwright": "^1.44.0",
  "socket.io": "^4.7.5"
}
```

## 🎨 UI/UX 가이드라인

### 디자인 시스템
- **테마**: 다크 테마 기반 (#0f0e24)
- **브랜딩**: Ultrathink 스타일
- **컬러**: 네이비 배경 + 노랑/주황 액센트
- **타이포그래피**: Pretendard 폰트
- **아이콘**: Lucide React 라이브러리

### 사용자 경험
- **반응형**: 모바일 퍼스트 디자인
- **접근성**: WCAG 2.1 AA 준수
- **성능**: 로딩 시간 3초 이내
- **인터랙션**: 직관적인 사용자 플로우

## 🔒 보안 고려사항

### 인증 및 인가
- JWT 토큰 (httpOnly 쿠키)
- 역할 기반 접근 제어 (RBAC)
- API Rate Limiting
- CORS 정책 설정

### 데이터 보호
- SQL Injection 방지
- XSS 공격 차단
- 민감한 정보 암호화
- 정기적인 보안 업데이트

## 📈 확장성 고려사항

### 수평적 확장
- Microservices 아키텍처 준비
- AWS Lambda 병렬 처리
- Database Sharding 고려
- CDN 활용 계획

### 수직적 확장
- Redis 캐시 도입 예정
- Database Connection Pooling
- 이미지 최적화 및 압축
- GraphQL API 도입 검토

## 📝 라이센스 및 저작권

이 프로젝트 문서는 MarketingPlat의 아키텍처를 학습 및 참조 목적으로 정리한 것입니다. 
새로운 프로젝트에서 자유롭게 참조하고 활용할 수 있습니다.

---

**문서 작성일**: 2025년 1월
**마지막 업데이트**: 프로젝트 분석 완료 시점
**작성자**: Claude Code AI Assistant

새 프로젝트 개발 시 이 문서들을 참조하여 견고하고 확장 가능한 시스템을 구축하시기 바랍니다.