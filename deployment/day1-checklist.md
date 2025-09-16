# Day 1 배포 체크리스트

## ✅ 완료된 작업

### 1. AWS 계정 및 IAM 설정
- [ ] AWS 콘솔 로그인
- [ ] 리전 설정 (ap-northeast-2)
- [ ] IAM 사용자 생성 (marketingplat-admin)
- [ ] Access Key 다운로드 및 보관
- [ ] AWS CLI 설정 확인

#### 확인 명령어
```bash
# AWS CLI 설정 확인
aws sts get-caller-identity

# 출력 예시:
# {
#     "UserId": "AIDACKCEVSQ6C2EXAMPLE",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/marketingplat-admin"
# }
```

## 📝 중요 정보 기록

### AWS 계정 정보
- Account ID: superysm@miraenplus.co.kr
- IAM User: marketingplat-admin
- Region: ap-northeast-2

### Access Keys (안전하게 보관!)
- Access Key ID: marketingplat-admin
- Secret Access Key: aMarketing77A#

---

## 다음 단계: RDS PostgreSQL 생성

준비되셨으면 진행하세요!