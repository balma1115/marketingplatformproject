# 네이버 광고 API 성과 데이터 문제 분석 및 해결 방안

## 📊 현재 상황 분석

### ✅ 작동하는 것
1. **캠페인 기본 데이터**: 정상 조회 (8개 캠페인)
2. **광고그룹 기본 데이터**: 정상 조회
3. **최근 날짜 성과 데이터**: 일부 성공
   - 2025년 8월~9월: 성과 데이터 있음 (3,140 노출, 13 클릭)
   - 2025년 1월~8월: 성과 데이터 있음 (14,333 노출, 41 클릭)

### ❌ 문제점
1. **2024년 8월 데이터**: API 400 에러 발생
2. **광고그룹/키워드 성과**: stats 필드가 없거나 0값
3. **날짜 범위 제한**: 특정 기간에만 데이터 존재

## 🔬 가설 및 테스트 결과

### 가설 1: 날짜 범위 제한 (✅ 확인됨)
**문제**: StatReport API는 최대 31일 데이터만 조회 가능
**증거**: 
- 2024-08-01 ~ 2025-09-05 (400일+): ❌ 400 에러
- 2025-08-29 ~ 2025-09-05 (7일): ✅ 성공
- 2025-08-06 ~ 2025-09-05 (30일): ✅ 성공

**해결책**: 날짜 범위를 31일 이내로 제한

### 가설 2: 실제 데이터 없음 (⚠️ 부분 확인)
**문제**: 특정 기간에 광고를 운영하지 않음
**증거**:
- 2024년 8월: 데이터 없음 (캠페인이 2025년 3월에 생성됨)
- 2025년 8~9월: 데이터 있음

### 가설 3: API 파라미터 문제 (🔍 확인 필요)
**문제**: reportTp, dateFormat 등 파라미터 오류
**현재 사용**:
- reportTp: 'CAMPAIGN', 'ADGROUP', 'KEYWORD'
- 날짜 형식: YYYYMMDD (대시 제거됨)

## 📝 데이터 가용성 현황

### 캠페인별 데이터 현황 (2025년 8~9월)
| 캠페인명 | 노출수 | 클릭수 | 비용 | 상태 |
|---------|--------|--------|------|------|
| 녹양역학원 파워링크#1 | 137 | 3 | ₩374 | ✅ |
| 플레이스#1 | 2,310 | 6 | ₩1,247 | ✅ |
| 가능동 녹양동 영수학원 | 334 | 1 | ₩121 | ✅ |
| 소상공인플레이스#2 | 359 | 3 | ₩330 | ✅ |
| 테스트 캠페인들 | 0 | 0 | ₩0 | ⚠️ |

### 날짜별 데이터 가용성
- ✅ 2025년 1월 ~ 현재: 데이터 있음
- ❌ 2024년 전체: 데이터 없음 (캠페인 미존재)
- ⚠️ 31일 이상 범위: API 에러

## 🛠️ 해결 방안

### 1. 즉시 적용 가능한 수정

#### A. 날짜 범위 검증 및 제한
```typescript
// API 호출 전 날짜 범위 체크
const daysDiff = (new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24);
if (daysDiff > 31) {
  // 31일씩 분할하여 여러 번 호출
  const chunks = splitDateRange(dateFrom, dateTo, 31);
  const results = await Promise.all(chunks.map(chunk => 
    getStatReports(chunk)
  ));
  return mergeResults(results);
}
```

#### B. 에러 처리 개선
```typescript
try {
  const stats = await naverAdsApi.getStatReports({
    reportTp: 'CAMPAIGN',
    dateRange: {
      since: dateFrom.replace(/-/g, ''),
      until: dateTo.replace(/-/g, '')
    },
    ids: [campaignId]
  });
  return stats;
} catch (error) {
  // 400 에러인 경우 빈 데이터 반환
  if (error.status === 400) {
    console.log('No data available for this date range');
    return {
      impCnt: 0,
      clkCnt: 0,
      salesAmt: 0,
      ctr: 0,
      cpc: 0
    };
  }
  throw error;
}
```

### 2. API 수정 필요 사항

#### campaigns/route.ts
- ✅ 날짜 범위를 31일로 제한
- ✅ 에러 시 기본값 반환

#### adgroups/[adgroupId]/keywords/route.ts
- ⚠️ StatReport API 호출 추가 필요
- ⚠️ 키워드별 성과 데이터 매핑 필요

#### 테스트된 작동 코드 패턴
```typescript
// 작동 확인된 StatReport 호출
const statReports = await naverAdsApi.getStatReports({
  reportTp: 'CAMPAIGN',  // 또는 'ADGROUP', 'KEYWORD'
  dateRange: {
    since: '20250829',  // YYYYMMDD 형식
    until: '20250905'   // 최대 31일
  },
  ids: campaignIds      // 배열로 전달
});
```

## 📋 체크리스트

### 우선순위 1 (즉시 수정)
- [ ] 날짜 범위 31일 제한 적용
- [ ] 400 에러 처리 로직 추가
- [ ] 기본값 반환 처리

### 우선순위 2 (기능 개선)
- [ ] 키워드별 StatReport 구현
- [ ] 광고그룹별 세부 성과 추가
- [ ] 날짜 범위 자동 분할 처리

### 우선순위 3 (UX 개선)
- [ ] 데이터 없음 메시지 표시
- [ ] 로딩 상태 표시
- [ ] 에러 메시지 사용자 친화적으로

## 🎯 결론

**핵심 문제**: StatReport API의 31일 제한과 2024년 데이터 부재

**즉각 해결 가능**: 날짜 범위 제한 및 에러 처리로 대부분 해결

**추가 작업 필요**: 키워드/광고그룹 레벨 성과 데이터 구현