# AWS Lambda 기반 순위 추적 시스템 아키텍처 제안

## 📋 목차
1. [현재 시스템 문제점](#현재-시스템-문제점)
2. [제안하는 AWS 아키텍처](#제안하는-aws-아키텍처)
3. [Lambda 함수 분리 전략](#lambda-함수-분리-전략)
4. [구현 방법](#구현-방법)
5. [배포 가이드](#배포-가이드)
6. [비용 최적화](#비용-최적화)

## 🔍 현재 시스템 문제점

### 현재 구조
- **단일 서버**에서 모든 순위 추적 실행
- **동시성 제한**: Queue로 3개씩만 처리 (브라우저 리소스 제한)
- **처리 시간**: 키워드당 평균 8.2초
- **총 소요 시간**: 100개 키워드 시 약 5분 (3개씩 병렬 처리)

### 주요 병목
1. Playwright 브라우저 인스턴스 제한
2. 단일 서버 CPU/메모리 한계
3. 순차 처리로 인한 대기 시간

## 🏗️ 제안하는 AWS 아키텍처

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Next.js   │────▶│   API        │────▶│   SQS Queue     │
│   Frontend  │     │   Gateway    │     │  (키워드 대기열) │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                  │
                                                  ▼
                                        ┌─────────────────┐
                                        │  Lambda 트리거   │
                                        │  (SQS 이벤트)    │
                                        └─────────────────┘
                                                  │
                        ┌─────────────────────────┼─────────────────────────┐
                        ▼                         ▼                         ▼
                ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
                │ Lambda #1    │         │ Lambda #2    │         │ Lambda #N    │
                │ (스크래핑)   │         │ (스크래핑)   │         │ (스크래핑)   │
                └──────────────┘         └──────────────┘         └──────────────┘
                        │                         │                         │
                        └─────────────────────────┼─────────────────────────┘
                                                  ▼
                                        ┌─────────────────┐
                                        │   RDS/Aurora    │
                                        │   PostgreSQL    │
                                        └─────────────────┘
```

## 🎯 Lambda 함수 분리 전략

### 1. **메인 API 서버** (EC2/ECS)
```typescript
// app/api/smartplace-keywords/track-all/route.ts
export async function POST(req: NextRequest) {
  // 1. 추적할 키워드 목록 조회
  const keywords = await prisma.smartPlaceKeyword.findMany({
    where: { isActive: true }
  })

  // 2. SQS에 각 키워드를 메시지로 전송
  for (const keyword of keywords) {
    await sqs.sendMessage({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({
        type: 'SMARTPLACE_TRACKING',
        keywordId: keyword.id,
        keyword: keyword.keyword,
        userId: keyword.userId
      })
    })
  }

  return NextResponse.json({
    message: `${keywords.length}개 키워드 추적 시작됨`
  })
}
```

### 2. **Lambda 함수** (순위 추적 워커)
```typescript
// lambda/smartplace-tracker/index.ts
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const handler = async (event: any) => {
  // SQS 메시지 파싱
  const message = JSON.parse(event.Records[0].body)
  const { keywordId, keyword, userId } = message

  let browser = null

  try {
    // Lambda용 Chromium 실행
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    })

    const page = await browser.newPage()

    // 스크래핑 로직 (기존 improved-scraper-v3.ts 코드 재사용)
    await page.goto(`https://map.naver.com/v5/search/${encodeURIComponent(keyword)}`)
    await page.waitForSelector('div.CHC5F', { timeout: 10000 })

    // 순위 데이터 추출...
    const rankings = await extractRankings(page)

    // DB 저장
    await prisma.smartPlaceRanking.create({
      data: {
        keywordId,
        checkDate: new Date(),
        organicRank: rankings.organicRank,
        adRank: rankings.adRank,
        topTenPlaces: rankings.topTenPlaces
      }
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, keywordId })
    }

  } catch (error) {
    console.error('Tracking error:', error)
    throw error
  } finally {
    if (browser) await browser.close()
  }
}
```

### 3. **블로그 추적 Lambda**
```typescript
// lambda/blog-tracker/index.ts
export const handler = async (event: any) => {
  const message = JSON.parse(event.Records[0].body)
  const { keywordId, keyword, blogUrl } = message

  // 네이버 검색 API 사용 (브라우저 불필요)
  const searchResults = await searchNaverBlog(keyword)

  // 순위 확인 및 저장
  const ranking = findBlogRanking(searchResults, blogUrl)

  await prisma.blogTrackingResult.create({
    data: {
      keywordId,
      trackingDate: new Date(),
      mainTabRank: ranking.mainTab,
      blogTabRank: ranking.blogTab,
      // ...
    }
  })
}
```

## 📦 구현 방법

### 1. **Lambda Layer 생성** (공통 의존성)
```bash
# Chromium Layer
mkdir nodejs
npm install @sparticuz/chromium puppeteer-core
zip -r chromium-layer.zip nodejs

# Prisma Layer
npx prisma generate --generator client
cp -r node_modules/.prisma nodejs/
cp -r node_modules/@prisma nodejs/
zip -r prisma-layer.zip nodejs
```

### 2. **SQS 대기열 설정**
```yaml
# serverless.yml 또는 CloudFormation
Resources:
  TrackingQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: ranking-tracking-queue
      VisibilityTimeout: 300  # 5분 (Lambda 타임아웃보다 길게)
      MessageRetentionPeriod: 1209600  # 14일
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
        maxReceiveCount: 3
```

### 3. **Lambda 함수 설정**
```yaml
functions:
  smartplaceTracker:
    handler: smartplace-tracker/index.handler
    runtime: nodejs18.x
    timeout: 120  # 2분
    memorySize: 2048  # Chromium 실행용
    environment:
      DATABASE_URL: ${env:DATABASE_URL}
    layers:
      - !Ref ChromiumLayer
      - !Ref PrismaLayer
    events:
      - sqs:
          arn: !GetAtt TrackingQueue.Arn
          batchSize: 1  # 한 번에 1개씩 처리
    reservedConcurrentExecutions: 50  # 동시 실행 제한
```

## 🚀 배포 가이드

### 1. **사전 준비**
```bash
# 1. AWS CLI 설정
aws configure

# 2. Serverless Framework 설치
npm install -g serverless

# 3. 프로젝트 구조 생성
mkdir lambda-functions
cd lambda-functions
npm init -y
```

### 2. **Lambda 함수 작성**
```bash
# 각 Lambda 함수 디렉토리 생성
mkdir smartplace-tracker blog-tracker

# 필요한 패키지 설치
npm install @sparticuz/chromium puppeteer-core @prisma/client
```

### 3. **환경 변수 설정**
```env
# .env.production
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/marketingplat
SQS_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/xxx/ranking-tracking-queue
```

### 4. **배포**
```bash
# Serverless Framework 사용
serverless deploy --stage production

# 또는 AWS SAM 사용
sam build
sam deploy --guided
```

## 💰 비용 최적화

### 예상 비용 (월간, 100명 사용자 기준)
```
Lambda 실행:
- 요청: 100명 × 50키워드 × 30일 × 24회 = 3,600,000 요청
- 비용: $0.20 per 1M requests = $0.72

Lambda 실행 시간:
- 시간: 3,600,000 × 10초 × 2048MB = 약 $300

SQS:
- 메시지: 3,600,000 메시지
- 비용: $0.40 per 1M = $1.44

RDS (db.t3.micro):
- 비용: 약 $15/월

총 예상 비용: 약 $320/월
```

### 비용 절감 방법
1. **Reserved Concurrency**: Lambda 동시 실행 제한
2. **Spot Instances**: EC2 사용 시 스팟 인스턴스 활용
3. **시간대별 스케줄링**: 새벽 시간대 집중 실행
4. **캐싱**: 중복 키워드 결과 캐싱

## 🔧 추가 최적화

### 1. **EventBridge 스케줄러**
```yaml
# 매일 새벽 2시 자동 실행
ScheduledTrackingRule:
  Type: AWS::Events::Rule
  Properties:
    ScheduleExpression: "cron(0 17 * * ? *)"  # UTC 17:00 = KST 02:00
    Targets:
      - Arn: !GetAtt TrackingLambda.Arn
```

### 2. **DynamoDB 캐싱**
```typescript
// 중복 키워드 캐싱
const cache = await dynamodb.getItem({
  TableName: 'KeywordCache',
  Key: { keyword: { S: keyword } }
}).promise()

if (cache.Item && isRecent(cache.Item.timestamp)) {
  return cache.Item.result
}
```

### 3. **Step Functions** (복잡한 워크플로우)
```json
{
  "StartAt": "CheckKeywords",
  "States": {
    "CheckKeywords": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:GetKeywords",
      "Next": "ParallelTracking"
    },
    "ParallelTracking": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "SmartPlaceTracking",
          "States": {
            "SmartPlaceTracking": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:SmartPlaceTracker",
              "End": true
            }
          }
        },
        {
          "StartAt": "BlogTracking",
          "States": {
            "BlogTracking": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:BlogTracker",
              "End": true
            }
          }
        }
      ],
      "End": true
    }
  }
}
```

## 📊 모니터링

### CloudWatch 대시보드 설정
```typescript
// Lambda 함수에 메트릭 추가
await cloudwatch.putMetricData({
  Namespace: 'RankingTracker',
  MetricData: [{
    MetricName: 'TrackingDuration',
    Value: duration,
    Unit: 'Seconds',
    Dimensions: [{
      Name: 'KeywordType',
      Value: 'SmartPlace'
    }]
  }]
}).promise()
```

### 알람 설정
- Lambda 에러율 > 1%
- SQS DLQ 메시지 > 0
- Lambda 실행 시간 > 60초
- 동시 실행 수 > 40

## 🎯 예상 성능 개선

### 현재
- **처리 시간**: 100개 키워드 = 약 5분
- **동시성**: 3개

### Lambda 적용 후
- **처리 시간**: 100개 키워드 = 약 20초 (50개 동시 실행)
- **동시성**: 50개 (조정 가능)
- **확장성**: 자동 스케일링

## 📝 주의사항

1. **Lambda 콜드 스타트**: 첫 실행 시 10-15초 추가 소요
2. **RDS 연결 제한**: RDS Proxy 사용 권장
3. **Chromium 크기**: Layer 크기 제한 (250MB) 주의
4. **VPC 설정**: RDS 접근을 위한 VPC 구성 필요

---

이 아키텍처를 적용하면 순위 추적 성능이 크게 개선되고, 사용자가 늘어나도 자동으로 확장됩니다.