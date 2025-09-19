# 기존 IAM 사용자 권한 확인 및 추가 가이드

## 🔍 현재 IAM 사용자 권한 확인

### 1. AWS Console에서 확인
1. AWS Console 로그인
2. IAM 서비스 접속
3. 좌측 메뉴 "사용자" 클릭
4. 현재 사용 중인 사용자 클릭
5. "권한" 탭에서 현재 정책 확인

### 2. AWS CLI로 확인
```bash
# 현재 사용자 정보 확인
aws iam get-user

# 현재 사용자의 정책 목록 확인
aws iam list-attached-user-policies --user-name YOUR_USER_NAME

# 그룹 정책 확인 (그룹에 속한 경우)
aws iam list-groups-for-user --user-name YOUR_USER_NAME
aws iam list-attached-group-policies --group-name YOUR_GROUP_NAME
```

## ✅ Lambda 배포에 필요한 최소 권한

### 필수 정책 목록:
1. **Lambda 관련**
   - `AWSLambdaFullAccess` 또는 커스텀 Lambda 정책

2. **SQS 관련**
   - `AmazonSQSFullAccess` 또는 커스텀 SQS 정책

3. **VPC 관련** (RDS 연결 시)
   - `AmazonVPCFullAccess` 또는 커스텀 VPC 정책

4. **CloudWatch 관련**
   - `CloudWatchLogsFullAccess`

5. **S3 관련** (Serverless 배포용)
   - `AmazonS3FullAccess` 또는 특정 버킷 접근 권한

## 🔧 권한 추가 방법

### 옵션 1: AWS Console에서 정책 추가
1. IAM → 사용자 → 해당 사용자 선택
2. "권한 추가" 버튼 클릭
3. "기존 정책 직접 연결" 선택
4. 위의 필수 정책들을 검색하여 체크
5. "다음: 검토" → "권한 추가"

### 옵션 2: 커스텀 정책 생성 (보안 강화)
Lambda 배포에만 필요한 최소 권한 정책:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "lambda:CreateFunction",
                "lambda:UpdateFunctionCode",
                "lambda:UpdateFunctionConfiguration",
                "lambda:GetFunction",
                "lambda:GetFunctionConfiguration",
                "lambda:ListFunctions",
                "lambda:DeleteFunction",
                "lambda:InvokeFunction",
                "lambda:AddPermission",
                "lambda:RemovePermission",
                "lambda:CreateEventSourceMapping",
                "lambda:DeleteEventSourceMapping",
                "lambda:GetEventSourceMapping",
                "lambda:ListEventSourceMappings",
                "lambda:PublishLayerVersion",
                "lambda:DeleteLayerVersion",
                "lambda:GetLayerVersion"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "sqs:CreateQueue",
                "sqs:DeleteQueue",
                "sqs:GetQueueAttributes",
                "sqs:SetQueueAttributes",
                "sqs:SendMessage",
                "sqs:ReceiveMessage",
                "sqs:DeleteMessage",
                "sqs:GetQueueUrl",
                "sqs:ListQueues"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "iam:PassRole",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:PutRolePolicy",
                "iam:GetRole",
                "iam:GetRolePolicy"
            ],
            "Resource": "arn:aws:iam::*:role/marketingplat-*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:CreateStack",
                "cloudformation:UpdateStack",
                "cloudformation:DeleteStack",
                "cloudformation:DescribeStacks",
                "cloudformation:DescribeStackEvents",
                "cloudformation:DescribeStackResources",
                "cloudformation:ListStackResources",
                "cloudformation:GetTemplate",
                "cloudformation:ValidateTemplate"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::marketingplat-*",
                "arn:aws:s3:::marketingplat-*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "ec2:CreateNetworkInterface",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DeleteNetworkInterface"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudwatch:PutMetricData",
                "cloudwatch:GetMetricStatistics",
                "cloudwatch:ListMetrics",
                "cloudwatch:PutMetricAlarm"
            ],
            "Resource": "*"
        }
    ]
}
```

### 옵션 3: 임시 권한 추가 (테스트용)
```bash
# AdministratorAccess 임시 추가 (프로덕션에서는 권장하지 않음)
aws iam attach-user-policy \
  --user-name YOUR_USER_NAME \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

## 🚦 다음 단계

권한 확인/추가가 완료되면:

1. **이미 AWS CLI가 설정되어 있다면** → Step 2로 이동
   ```bash
   aws configure list  # 현재 설정 확인
   ```

2. **VPC와 보안 그룹이 이미 있다면** → Step 3-4 확인 후 Step 5로 이동
   ```bash
   # VPC 목록 확인
   aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value]' --output table

   # 보안 그룹 확인
   aws ec2 describe-security-groups --query 'SecurityGroups[*].[GroupId,GroupName]' --output table
   ```

3. **바로 Lambda 배포 시작** → Step 5부터 진행

## ⚠️ 주의사항

- EC2와 RDS가 이미 운영 중이라면, 같은 VPC와 보안 그룹을 사용하는 것이 좋습니다
- 기존 RDS 보안 그룹에 Lambda 보안 그룹 인바운드 규칙만 추가하면 됩니다
- Serverless Framework은 CloudFormation을 사용하므로 CloudFormation 권한이 필요합니다

## 🔍 권한 문제 발생 시 디버깅

```bash
# 특정 작업 시뮬레이션 (실제 실행 없이 권한만 체크)
aws lambda create-function --dry-run \
  --function-name test \
  --runtime nodejs18.x \
  --role arn:aws:iam::123456789:role/test \
  --handler index.handler \
  --zip-file fileb://test.zip

# 에러 메시지에서 필요한 권한 확인
```

---

**요약**:
- 기존 IAM 사용자가 있으면 **권한만 추가**하면 됩니다
- 최소 권한: Lambda, SQS, VPC, CloudWatch, S3 관련 정책
- AWS CLI가 이미 설정되어 있다면 **Step 5 (Lambda 함수 배포)부터 시작**하세요