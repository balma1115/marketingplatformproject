# AWS Access Key 생성 및 관리 가이드

## 🚨 현재 상황
- AWS Access Key ID를 모름
- AWS Secret Access Key를 모름
- AWS 계정은 있음 (EC2, RDS 사용 중)

## ✅ 해결 방법: 새 Access Key 생성

### Step 1: AWS Console 로그인
1. 브라우저에서 https://console.aws.amazon.com 접속
2. 루트 사용자 또는 IAM 사용자로 로그인
   - 이메일/비밀번호 입력
   - MFA 코드 입력 (설정된 경우)

### Step 2: IAM 서비스로 이동
1. 로그인 후 상단 검색창에 **"IAM"** 입력
2. 서비스 목록에서 **"IAM"** 클릭
   ![IAM 검색](https://docs.aws.amazon.com/images/IAM/latest/UserGuide/images/iam-search.png)

### Step 3: 사용자 확인
1. 좌측 메뉴에서 **"사용자"** 클릭
2. 사용자 목록 확인
   - 본인 IAM 사용자가 있는 경우 → Step 4로
   - 루트 계정만 사용 중인 경우 → Step 3-1로

#### Step 3-1: IAM 사용자 생성 (루트 계정 사용 중인 경우)
1. **"사용자 추가"** 버튼 클릭
2. 사용자 세부 정보:
   - 사용자 이름: `lambda-deploy-user` (또는 원하는 이름)
   - AWS 액세스 유형: ✅ **"프로그래밍 방식 액세스"** 체크
3. 권한 설정:
   - **"기존 정책 직접 연결"** 선택
   - 검색창에 "AdministratorAccess" 입력
   - **AdministratorAccess** 정책 체크 (임시, 나중에 권한 축소)
4. 태그 추가: (선택사항) 건너뛰기
5. 검토: 설정 확인 후 **"사용자 만들기"** 클릭
6. ⚠️ **중요**: Access Key 저장 → Step 5로 이동

### Step 4: 기존 사용자의 새 Access Key 생성

1. 사용자 목록에서 본인 사용자 이름 클릭
2. **"보안 자격 증명"** 탭 클릭
3. **"액세스 키"** 섹션으로 스크롤
4. 기존 액세스 키 확인:
   - 이미 2개가 있는 경우: 사용하지 않는 것 삭제
   - 삭제: "작업" → "삭제" → 확인

### Step 5: 새 Access Key 생성

1. **"액세스 키 만들기"** 버튼 클릭

2. 사용 사례 선택:
   ```
   ✅ Command Line Interface (CLI)
   ```
   - 하단 확인 메시지:
     "위 권장 사항을 이해했으며 액세스 키를 생성하려고 합니다."
   - ✅ 체크박스 체크
   - **"다음"** 클릭

3. 설명 태그 설정 (선택사항):
   - 태그 값: `Lambda deployment 2025-01` (용도와 날짜)
   - **"액세스 키 만들기"** 클릭

4. ⚠️ **매우 중요 - 액세스 키 저장**:
   ```
   액세스 키: AKIA3EXAMPLE5NEWKEY
   비밀 액세스 키: wJalrXUtnFEMI/K7MDENG/bPxRfiCYNEWSECRET
   ```

   저장 방법:
   - **".csv 파일 다운로드"** 클릭 (권장)
   - 또는 수동으로 메모장에 복사
   - 안전한 장소에 저장 (예: 비밀번호 관리자)

5. **"완료"** 클릭

### Step 6: AWS CLI에 설정

터미널/명령 프롬프트 열기:
```bash
aws configure
```

입력:
```
AWS Access Key ID [None]: AKIA3EXAMPLE5NEWKEY
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYNEWSECRET
Default region name [None]: ap-northeast-2
Default output format [None]: json
```

### Step 7: 연결 테스트
```bash
# 설정 확인
aws configure list

# 계정 정보 확인
aws sts get-caller-identity
```

성공 시 출력:
```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/lambda-deploy-user"
}
```

---

## 🔍 기존 Access Key 찾기 (불가능한 경우)

### Secret Access Key를 잊어버린 경우
- **복구 불가능** - AWS는 Secret Key를 저장하지 않음
- 유일한 방법: 새 Access Key 생성

### Access Key ID만 알고 있는 경우
1. IAM → 사용자 → 본인 사용자 선택
2. "보안 자격 증명" 탭
3. 액세스 키 섹션에서 Access Key ID 확인 가능
4. 하지만 Secret Key는 볼 수 없음 → 새로 생성 필요

---

## 📝 자주 묻는 질문

### Q1: 루트 계정의 Access Key를 만들어도 되나요?
**A: 절대 권장하지 않습니다!**
- 보안상 매우 위험
- IAM 사용자를 만들어서 사용하세요

### Q2: Access Key를 몇 개까지 만들 수 있나요?
**A: IAM 사용자당 최대 2개**
- 키 교체 시 임시로 2개 유지
- 평소에는 1개만 사용 권장

### Q3: 회사/팀에서 AWS를 사용 중인데 어떻게 하나요?
**A: AWS 관리자에게 문의**
```
요청 내용:
- Lambda 배포를 위한 IAM 사용자 생성 요청
- 필요한 권한: Lambda, SQS, VPC, CloudWatch, S3
- 또는 임시 AdministratorAccess 권한
```

### Q4: Access Key를 실수로 GitHub에 올렸어요!
**A: 즉시 조치 필요**
1. IAM에서 해당 Access Key 즉시 **삭제**
2. 새 Access Key 생성
3. GitHub에서 해당 커밋 삭제
4. AWS에서 이상 활동 확인

---

## 🛡️ 보안 체크리스트

- [ ] Access Key를 생성했나요?
- [ ] CSV 파일을 안전한 곳에 저장했나요?
- [ ] AWS CLI에 설정했나요?
- [ ] `aws sts get-caller-identity` 테스트 성공했나요?
- [ ] 불필요한 이전 Access Key는 삭제했나요?
- [ ] .gitignore에 AWS 관련 파일 추가했나요?

---

## 🚀 다음 단계

Access Key 생성 완료 후:
1. `AWS_CLI_DETAILED_GUIDE.md`의 Section 2 참조
2. `aws configure` 실행
3. `LAMBDA_DEPLOYMENT_GUIDE.md`의 Step 5부터 진행

---

## 💡 Pro Tips

### 여러 환경 관리하기
```bash
# 개발용 프로파일
aws configure --profile dev

# 프로덕션용 프로파일
aws configure --profile prod

# 사용 시
aws s3 ls --profile dev
```

### Access Key 정기 교체
- 90일마다 교체 권장
- 새 키 생성 → 설정 변경 → 이전 키 삭제

### 환경 변수로 임시 사용
```bash
export AWS_ACCESS_KEY_ID=AKIA3EXAMPLE5NEWKEY
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYNEWSECRET
aws s3 ls
```

---

**도움이 필요하신가요?**
- AWS Support: https://console.aws.amazon.com/support
- AWS 문서: https://docs.aws.amazon.com/IAM/latest/UserGuide/
- 커뮤니티: https://repost.aws/

**문서 버전**: 1.0.0
**작성일**: 2025년 1월 18일