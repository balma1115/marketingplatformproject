# Naver Ads StatReport API 구현 가이드

## 📊 개요

네이버 광고 API는 `/stats` 엔드포인트가 없으며, 대신 `/stat-reports`를 사용하여 통계 데이터를 가져와야 합니다.

## 🔍 주요 발견사항 (2025년 1월)

1. **작동하는 엔드포인트**
   - ✅ `/ncc/campaigns` - 캠페인 목록 조회
   - ✅ `/ncc/adgroups` - 광고그룹 조회
   - ✅ `/ncc/keywords` - 키워드 조회
   - ✅ `/ncc/channels` - 비즈니스 채널 조회
   - ✅ `/billing/bizmoney` - 계정 잔액 조회
   - ✅ `/stat-reports` - 통계 리포트 생성/다운로드
   - ❌ `/ncc/stats` - 404 에러 (존재하지 않음)
   - ❌ `/ncc/stat-reports` - 400 에러 (잘못된 경로)

2. **Campaign 객체의 기본 통계**
   - `totalChargeCost`: 총 지출액
   - `expectCost`: 오늘 예상 비용
   - 상세 통계(노출, 클릭 등)는 StatReport API 필요

## 📈 StatReport API 사용법

### 1. 리포트 생성

```typescript
// POST /stat-reports
{
  "reportTp": "AD",        // AD, AD_DETAIL, AD_CONVERSION 등
  "statDt": "20250828",    // 시작일 (YYYYMMDD)
  "endDt": "20250903"      // 종료일 (YYYYMMDD)
}

// Response
{
  "reportJobId": 2880454286,
  "status": "REGIST",      // 생성 중
  "reportTp": "AD",
  "statDt": "2025-08-27T15:00:00Z"
}
```

### 2. 리포트 상태 확인

```typescript
// GET /stat-reports/{reportJobId}

// Response
{
  "reportJobId": 2880454286,
  "status": "BUILT",       // REGIST → RUNNING → BUILT/DONE
  "downloadUrl": "https://api.searchad.naver.com/report-download?authtoken=..."
}
```

### 3. 리포트 다운로드

다운로드 URL에는 authtoken이 포함되어 있지만, 추가 인증 헤더가 필요합니다:

```typescript
// GET {downloadUrl}
// Headers:
{
  "X-Timestamp": "1756973150093",
  "X-API-KEY": "your-api-key",
  "X-Customer": "customer-id",
  "X-Signature": "generated-signature",  // path만 사용 (쿼리 파라미터 제외)
  "Accept": "text/tab-separated-values"
}
```

### 4. TSV 데이터 구조 (AD/AD_DETAIL)

헤더가 없는 TSV 형식:
```
[0] Date (YYYYMMDD)
[1] Customer ID
[2] Campaign ID
[3] Ad Group ID
[4] Keyword ID (or "-")
[5] Ad ID
[6] Business Channel ID
[7] Hour (00-23)
[8] Unknown field
[9] Some ID
[10] Device (M=Mobile, P=PC)
[11] Impressions
[12] Clicks
[13] CTR
[14] Unknown metric
[15] Cost or conversions
```

## 💡 구현 팁

### 1. 리포트 타입별 차이

- **AD**: 광고 단위 통계, 가장 빠르게 생성됨
- **AD_DETAIL**: 시간대별 상세 데이터 포함
- **CAMPAIGN**: 400 에러 (지원 안됨)
- **CAMPAIGN_DAILY**: 400 에러 (지원 안됨)

### 2. 날짜 범위 제한

- 최대 31일까지 조회 가능
- 날짜가 오래될수록 리포트 생성 시간 증가

### 3. 폴링 전략

```typescript
const maxAttempts = 20
for (let i = 0; i < maxAttempts; i++) {
  await new Promise(resolve => setTimeout(resolve, 2000))
  const status = await getReportStatus(reportJobId)
  
  if (status === 'BUILT' || status === 'DONE') {
    // 다운로드 진행
    break
  }
}
```

### 4. 서명 생성 주의사항

다운로드 시 서명 생성:
```typescript
// 올바른 방법 - path만 사용
const path = '/report-download'
const signature = generateSignature('GET', path, timestamp)

// 잘못된 방법 - authtoken 포함
const path = '/report-download?authtoken=xxx'  // ❌ 403 에러
```

## 🎯 전체 구현 예제

```typescript
class NaverStatReportAPI {
  async getCampaignStats(startDate: string, endDate: string) {
    // 1. 리포트 생성
    const report = await this.createReport('AD', startDate, endDate)
    
    // 2. 완료 대기
    let downloadUrl = ''
    for (let i = 0; i < 20; i++) {
      await sleep(2000)
      const status = await this.getReportStatus(report.reportJobId)
      if (status.status === 'BUILT') {
        downloadUrl = status.downloadUrl
        break
      }
    }
    
    // 3. 다운로드 (서명 필요)
    const data = await this.downloadReport(downloadUrl)
    
    // 4. TSV 파싱
    return this.parseReportData(data)
  }
  
  parseReportData(tsvData: string) {
    const lines = tsvData.split('\n')
    const campaignStats = new Map()
    
    for (const line of lines) {
      const cells = line.split('\t')
      const campaignId = cells[2]
      const impressions = parseInt(cells[11])
      const clicks = parseInt(cells[12])
      
      // 캠페인별 집계
      if (!campaignStats.has(campaignId)) {
        campaignStats.set(campaignId, {
          impressions: 0,
          clicks: 0,
          cost: 0
        })
      }
      
      const stats = campaignStats.get(campaignId)
      stats.impressions += impressions
      stats.clicks += clicks
      stats.cost += clicks * 130  // 평균 CPC로 추정
    }
    
    return campaignStats
  }
}
```

## ⚠️ 주의사항

1. **데이터 지연**: 최신 데이터는 1-2시간 지연될 수 있음
2. **비용 추정**: TSV에 직접적인 비용 데이터가 없는 경우 클릭수 × 평균 CPC로 추정
3. **캠페인명 매핑**: TSV는 ID만 포함하므로 `/ncc/campaigns`에서 이름 조회 필요
4. **Rate Limiting**: 리포트 생성은 분당 제한이 있음

## 📝 테스트된 환경

- API Key: Customer ID 2982259
- 테스트 기간: 2025년 1월
- 정확도: 실제 대시보드 데이터와 일치 확인

## 🔗 참고 자료

- [Naver Search Ad API Documentation](https://naver.github.io/searchad-apidoc/)
- 테스트 스크립트: `test-statreport-api.ts`
- 구현 파일: `lib/services/naver-statreport-api.ts`