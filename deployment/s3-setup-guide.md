# S3 버킷 설정 가이드

## 1️⃣ S3 버킷 생성

### AWS Console에서 진행
1. **Services > S3 > Create bucket** 클릭

## 2️⃣ 버킷 설정

### General configuration
- **Bucket name**: `marketingplat-assets`
  - 주의: 버킷 이름은 전 세계적으로 고유해야 함
  - 사용 불가시: `marketingplat-assets-[your-unique-id]` 사용
- **AWS Region**: Asia Pacific (Seoul) ap-northeast-2

### Object Ownership
- **ACLs disabled (recommended)** 선택

### Block Public Access settings for this bucket
- ✅ Block all public access (기본값 유지)
  - CloudFront를 통해서만 접근하도록 설정할 예정

### Bucket Versioning
- **Versioning**: Enable (권장)
  - 파일 실수로 삭제/덮어쓰기 방지

### Tags (선택사항)
- Key: `Project`, Value: `MarketingPlat`
- Key: `Environment`, Value: `Production`

### Default encryption
- **Encryption type**: Server-side encryption with Amazon S3 managed keys (SSE-S3)
- **Bucket Key**: Enable

### Advanced settings
- 기본값 유지

## 3️⃣ Create bucket 클릭

## 4️⃣ 버킷 정책 설정 (CloudFront 연동용)

생성 후 설정할 내용 (나중에 CloudFront 생성 후):

### Permissions > Bucket policy
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontAccess",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::marketingplat-assets/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::YOUR-ACCOUNT-ID:distribution/YOUR-DISTRIBUTION-ID"
                }
            }
        }
    ]
}
```

## 5️⃣ 폴더 구조 생성 (선택사항)

S3 콘솔에서 폴더 생성:
- `images/` - 이미지 파일
- `documents/` - 문서 파일
- `backups/` - 백업 파일
- `logs/` - 로그 파일

## 6️⃣ 라이프사이클 규칙 설정 (비용 절감)

### Management > Lifecycle rules > Create lifecycle rule

#### Rule 1: 오래된 파일 삭제
- **Rule name**: `delete-old-logs`
- **Status**: Enabled
- **Rule scope**: Limit to specific prefix: `logs/`
- **Lifecycle rule actions**:
  - ✅ Expire current versions of objects
  - Days after object creation: 30

#### Rule 2: 백업 파일 Glacier 전환
- **Rule name**: `archive-old-backups`
- **Status**: Enabled
- **Rule scope**: Limit to specific prefix: `backups/`
- **Lifecycle rule actions**:
  - ✅ Transition current versions to Glacier Flexible
  - Days after object creation: 30

## 7️⃣ CORS 설정 (필요시)

### Permissions > Cross-origin resource sharing (CORS)
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["https://marketingplat.com"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

## 📝 생성 후 정보 저장

### S3 버킷 정보
```
Bucket Name: marketingplat-assets
Region: ap-northeast-2
ARN: arn:aws:s3:::marketingplat-assets
URL: https://marketingplat-assets.s3.ap-northeast-2.amazonaws.com/
```

## 🧪 업로드 테스트

### AWS CLI로 테스트
```bash
# 테스트 파일 생성
echo "Hello S3" > test.txt

# 업로드
aws s3 cp test.txt s3://marketingplat-assets/test.txt

# 확인
aws s3 ls s3://marketingplat-assets/

# 다운로드
aws s3 cp s3://marketingplat-assets/test.txt downloaded.txt

# 삭제
aws s3 rm s3://marketingplat-assets/test.txt
```

### Node.js에서 사용 (예시)
```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  region: 'ap-northeast-2'
});

// 업로드
const params = {
  Bucket: 'marketingplat-assets',
  Key: 'images/logo.png',
  Body: fileBuffer,
  ContentType: 'image/png'
};

s3.upload(params, (err, data) => {
  if (err) console.error(err);
  else console.log('Uploaded:', data.Location);
});
```

## ✅ 체크리스트

- [ ] S3 버킷 생성 시작
- [ ] 고유한 버킷 이름 설정
- [ ] ap-northeast-2 리전 선택
- [ ] Block all public access 활성화
- [ ] Versioning 활성화
- [ ] 암호화 설정 (SSE-S3)
- [ ] Create bucket 클릭
- [ ] 버킷 생성 완료
- [ ] (선택) 폴더 구조 생성
- [ ] (선택) 라이프사이클 규칙 설정

## 💰 비용 관리

### 프리티어 한도
- 5GB 스토리지
- 20,000 GET 요청
- 2,000 PUT 요청
- 15GB 데이터 전송

### 비용 절감 팁
1. 불필요한 파일 정기 삭제
2. 큰 파일은 압축 후 업로드
3. CloudFront 캐싱 활용
4. 라이프사이클 정책으로 자동 관리

## 다음 단계
S3 버킷 생성이 완료되면 SQS 큐 생성으로 진행합니다.