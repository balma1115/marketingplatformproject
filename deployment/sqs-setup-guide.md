# SQS 큐 설정 가이드

## 1️⃣ SQS 큐 생성

### AWS Console에서 진행
1. **Services > SQS (Simple Queue Service) > Create queue** 클릭

## 2️⃣ 메인 큐 설정

### Details
- **Type**: Standard (더 높은 처리량)
- **Name**: `ranking-tracking-queue`

### Configuration
- **Visibility timeout**: 300 seconds (5분)
  - Lambda 함수 실행 시간보다 길게 설정
- **Message retention period**: 4 days (기본값)
- **Delivery delay**: 0 seconds
- **Maximum message size**: 256 KB (기본값)
- **Receive message wait time**: 0 seconds

### Encryption (선택사항)
- **Server-side encryption**: Disabled (프리티어)
  - 프로덕션에서는 활성화 권장

### Access policy
- **Method**: Basic
- **Define who can send messages**: Only the specified AWS accounts
  - Your AWS account ID 입력
- **Define who can receive messages**: Only the specified AWS accounts
  - Your AWS account ID 입력

### Redrive policy (Dead Letter Queue)
- **Enable**: Yes ✅
- 먼저 DLQ를 생성해야 함 (아래 참조)

### Create queue 클릭

## 3️⃣ Dead Letter Queue (DLQ) 생성

실패한 메시지를 저장할 큐:

### Details
- **Type**: Standard
- **Name**: `ranking-tracking-dlq`

### Configuration
- **Visibility timeout**: 300 seconds
- **Message retention period**: 14 days (최대값)
- 나머지 기본값 유지

### Create queue 클릭

## 4️⃣ 메인 큐에 DLQ 연결

1. **ranking-tracking-queue** 선택
2. **Dead-letter queue** 탭
3. **Edit** 클릭
4. **Redrive policy**:
   - Enable redrive policy: Yes
   - Dead-letter queue: `ranking-tracking-dlq` 선택
   - Maximum receives: 3 (3번 실패시 DLQ로 이동)
5. **Save** 클릭

## 5️⃣ 추가 큐 생성 (선택사항)

### 블로그 추적용 큐
- **Name**: `blog-tracking-queue`
- **DLQ**: `blog-tracking-dlq`
- 나머지 설정 동일

### 스케줄러용 큐
- **Name**: `scheduled-tasks-queue`
- **DLQ**: `scheduled-tasks-dlq`
- 나머지 설정 동일

## 📝 생성 후 정보 저장

### SQS 큐 정보
```
Main Queue URL: https://sqs.ap-northeast-2.amazonaws.com/[ACCOUNT-ID]/ranking-tracking-queue
DLQ URL: https://sqs.ap-northeast-2.amazonaws.com/[ACCOUNT-ID]/ranking-tracking-dlq
ARN: arn:aws:sqs:ap-northeast-2:[ACCOUNT-ID]:ranking-tracking-queue
```

## 🧪 메시지 테스트

### AWS CLI로 테스트
```bash
# 메시지 전송
aws sqs send-message \
  --queue-url https://sqs.ap-northeast-2.amazonaws.com/[ACCOUNT-ID]/ranking-tracking-queue \
  --message-body '{"keywordId": 1, "keyword": "테스트 키워드", "userId": 1}'

# 메시지 수신
aws sqs receive-message \
  --queue-url https://sqs.ap-northeast-2.amazonaws.com/[ACCOUNT-ID]/ranking-tracking-queue

# 메시지 삭제
aws sqs delete-message \
  --queue-url https://sqs.ap-northeast-2.amazonaws.com/[ACCOUNT-ID]/ranking-tracking-queue \
  --receipt-handle [RECEIPT-HANDLE]
```

### Node.js에서 사용 (예시)
```javascript
const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ region: 'ap-northeast-2' });

// 메시지 전송
const params = {
  QueueUrl: 'https://sqs.ap-northeast-2.amazonaws.com/[ACCOUNT-ID]/ranking-tracking-queue',
  MessageBody: JSON.stringify({
    type: 'SMARTPLACE_TRACKING',
    keywordId: 1,
    keyword: '학원',
    userId: 1
  })
};

sqs.sendMessage(params, (err, data) => {
  if (err) console.error('Error:', err);
  else console.log('Message sent:', data.MessageId);
});

// 메시지 수신
const receiveParams = {
  QueueUrl: 'https://sqs.ap-northeast-2.amazonaws.com/[ACCOUNT-ID]/ranking-tracking-queue',
  MaxNumberOfMessages: 10,
  WaitTimeSeconds: 20
};

sqs.receiveMessage(receiveParams, (err, data) => {
  if (err) console.error('Error:', err);
  else if (data.Messages) {
    data.Messages.forEach(message => {
      console.log('Received:', JSON.parse(message.Body));

      // 메시지 처리 후 삭제
      const deleteParams = {
        QueueUrl: receiveParams.QueueUrl,
        ReceiptHandle: message.ReceiptHandle
      };

      sqs.deleteMessage(deleteParams, (err) => {
        if (err) console.error('Delete error:', err);
        else console.log('Message deleted');
      });
    });
  }
});
```

## 💰 비용 관리

### 프리티어 한도
- **1백만 요청/월 무료** (영구)
- Standard Queue 기준

### 비용 계산 예시
- 100명 사용자 × 50 키워드 × 30일 × 24회 = 3,600,000 요청
- 프리티어 초과분: 2,600,000 요청
- 추가 비용: $1.04/월 (백만 요청당 $0.40)

## ✅ 체크리스트

- [ ] SQS 콘솔 접속
- [ ] ranking-tracking-dlq (DLQ) 생성
- [ ] ranking-tracking-queue (메인 큐) 생성
- [ ] DLQ 연결 설정
- [ ] Queue URL 저장
- [ ] AWS CLI로 메시지 테스트
- [ ] (선택) 추가 큐 생성

## 🔐 보안 설정

### IAM 권한 예시
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:ap-northeast-2:*:ranking-tracking-*"
    }
  ]
}
```

## 🔗 Lambda 연동 (다음 단계)

Lambda 함수 생성 후:
1. Lambda > Functions > [Function name]
2. Configuration > Triggers
3. Add trigger > SQS
4. Queue: ranking-tracking-queue 선택
5. Batch size: 5
6. Add

## 다음 단계
SQS 큐 생성이 완료되면 Lambda 레이어 준비로 진행합니다.