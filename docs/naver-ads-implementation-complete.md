# 네이버 광고 대시보드 완전 구현 문서

## 🎯 구현 완료 사항

### 1. 핵심 API 서비스

#### NaverAdsAPI (기본)
**파일**: `lib/services/naver-ads-api.ts`
- HMAC-SHA256 서명 기반 인증
- 캠페인, 광고그룹, 키워드, 광고 관리
- StatReport API를 통한 성과 데이터 조회

#### NaverAdsAPIExtended (확장)
**파일**: `lib/services/naver-ads-api-extended.ts`
- 모든 기본 기능 포함
- BusinessChannel 관리
- ManagedKeyword (관리 키워드)
- IP 차단 관리
- 예산 추정 (Estimate)
- 대시보드 종합 데이터 조회

### 2. API 엔드포인트 구조

```
/api/ads/
├── campaigns/
│   ├── route.ts                    # 캠페인 목록 조회
│   ├── create/
│   │   └── route.ts                # ✅ 캠페인 생성
│   └── [campaignId]/
│       ├── route.ts                # 캠페인 상세
│       ├── toggle/route.ts         # 캠페인 ON/OFF
│       └── adgroups/route.ts       # 캠페인의 광고그룹 목록
├── adgroups/
│   ├── route.ts                    # 광고그룹 목록
│   ├── create/
│   │   └── route.ts                # ✅ 광고그룹 생성
│   └── [adgroupId]/
│       ├── route.ts                # 광고그룹 상세
│       ├── keywords/route.ts       # 키워드 관리
│       ├── ads/route.ts            # 광고 소재 관리
│       ├── restricted-keywords/    # ✅ 제외키워드
│       │   └── route.ts
│       ├── extensions/             # ✅ 확장소재
│       │   └── route.ts
│       └── products/route.ts       # 상품 관리
├── keywords/
│   ├── route.ts                    # 키워드 목록
│   └── [keywordId]/
│       └── toggle/route.ts         # 키워드 ON/OFF
└── dashboard/
    └── route.ts                    # 대시보드 종합 데이터
```

### 3. 구현된 주요 기능

#### 3.1 캠페인 관리
- ✅ 캠페인 목록 조회 (유형별)
- ✅ 캠페인 생성 (WEB_SITE, SHOPPING, POWER_CONTENTS, PLACE)
- ✅ 캠페인 ON/OFF 토글
- ✅ 일일 예산 관리
- ✅ 성과 데이터 연동 (날짜 필터)

#### 3.2 광고그룹 관리
- ✅ 광고그룹 목록 조회
- ✅ 광고그룹 생성
- ✅ 입찰가 관리
- ✅ 타겟팅 설정
- ✅ 성과 데이터 조회

#### 3.3 키워드 관리
- ✅ 키워드 목록 조회
- ✅ 입찰가 설정
- ✅ 키워드 ON/OFF
- ✅ 품질지수 표시
- ✅ 성과 데이터 (노출수, 클릭수, CTR, CPC)

#### 3.4 제외키워드 (Restricted Keywords)
- ✅ 제외키워드 조회 (GET)
- ✅ 제외키워드 추가 (POST)
- ✅ 제외키워드 삭제 (DELETE)
- ✅ 3가지 타입 지원:
  - KEYWORD_PLUS_RESTRICT (확장 제외)
  - PHRASE_KEYWORD_RESTRICT (구문 제외)
  - EXACT_KEYWORD_RESTRICT (정확 제외)

#### 3.5 확장소재 (Ad Extensions)
- ✅ 확장소재 조회
- ✅ 성과 데이터 포함
- ✅ 플레이스 광고 연동

#### 3.6 통계 및 리포트
- ✅ StatReport API 연동
- ✅ 날짜 범위 필터 (dateFrom, dateTo)
- ✅ 캠페인/광고그룹/키워드별 성과
- ✅ 실시간 데이터 조회

### 4. 테스트 계정 정보

```javascript
// 녹양역학원 계정
{
  email: 'nokyang@marketingplat.com',
  password: 'nokyang123',
  customerId: 2982259,
  // API 자격증명은 DB에 저장됨
}
```

### 5. Playwright 테스트 검증 결과

**파일**: `test-naver-ads-complete.ts`

#### 테스트 커버리지:
1. ✅ 로그인 프로세스
2. ✅ 광고 대시보드 접근
3. ✅ 날짜 필터 적용 (7일, 30일, 커스텀)
4. ✅ 캠페인 목록 표시 (8개 캠페인)
5. ✅ 캠페인 ON/OFF 토글
6. ✅ 광고그룹 상세 페이지
7. ✅ 키워드 탭 전환
8. ✅ 광고 소재 탭
9. ✅ 제외키워드 탭
10. ✅ 통계 섹션 확인

#### 실제 데이터 확인:
```
📊 발견된 캠페인: 8개
- 녹양역학원 파워링크#1 (일일예산: ₩30,000)
- 테스트_파워링크_* (일일예산: ₩10,000)
- 파워컨텐츠#1 (일일예산: ₩50)
- 테스트_파워콘텐츠_* (일일예산: ₩20,000)
- 플레이스#1 (일일예산: ₩3,000)
- 가능동 녹양동 초중등전문 영수학원 (일일예산: ₩3,000)
- 소상공인플레이스#2 (일일예산: ₩30,000)
- 테스트_플레이스_* (일일예산: ₩10,000)

📊 전체 통계 (최근 7일):
- 총 노출수: 3,140
- 총 클릭수: 13
- 총 비용: ₩2,071.85
- 일일예산 합계: ₩106,050
- 평균 클릭률: 0.41%
- 평균 클릭비용: ₩159
```

### 6. 데이터베이스 스키마

```typescript
// User 모델에 추가된 필드
model User {
  // 새로운 필드 (권장)
  naverAdsAccessKey    String?
  naverAdsSecretKey    String?
  naverAdsCustomerId   Int?
  
  // 기존 필드 (호환성)
  naverAdApiKey        String?
  naverAdSecret        String?
  naverAdCustomerId    Int?
}
```

### 7. 환경 변수 설정

```env
# JWT 인증
JWT_SECRET=your-jwt-secret-key

# 데이터베이스
DATABASE_URL=file:./dev.db

# 개발 환경
NODE_ENV=development
```

### 8. 주의사항 및 제한사항

#### API 제한사항:
- StatReport는 최대 31일 데이터만 조회 가능
- 실시간 데이터는 약 1-2시간 지연
- API 호출 제한: 초당 10회

#### 구현시 주의점:
- 날짜 형식: YYYYMMDD (대시 없음)
- 서명 생성시 쿼리 파라미터 제외
- Next.js 15의 params Promise 처리 필수

### 9. 추가 개선 가능 항목

- [ ] 캠페인 수정 기능
- [ ] 광고그룹 수정 기능
- [ ] 키워드 일괄 추가
- [ ] 광고 소재 생성/수정
- [ ] 리포트 다운로드 (CSV/Excel)
- [ ] 실시간 알림 기능
- [ ] 자동 입찰 조정

### 10. 문서 참조

- [Naver SearchAd API v2 공식 문서](https://developers.searchad.naver.com)
- [네이버 광고 시스템 가이드](https://searchad.naver.com)
- 내부 문서: `docs/naver-searchad-api-complete.md`

---

**구현 완료일**: 2025년 1월 9일
**테스트 완료**: Playwright E2E 테스트 통과
**작성자**: Claude Code Assistant