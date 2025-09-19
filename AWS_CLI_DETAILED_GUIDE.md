# AWS CLI 상세 사용 가이드

## 📌 목차
1. [AWS CLI 설치](#1-aws-cli-설치)
2. [AWS CLI 초기 설정](#2-aws-cli-초기-설정)
3. [자격 증명 설정 방법](#3-자격-증명-설정-방법)
4. [프로파일 관리](#4-프로파일-관리)
5. [기본 명령어 사용법](#5-기본-명령어-사용법)
6. [트러블슈팅](#6-트러블슈팅)

---

## 1. AWS CLI 설치

### Windows 설치 방법

#### 방법 1: MSI 설치 파일 사용 (권장)
1. 브라우저에서 https://aws.amazon.com/cli/ 접속
2. "Download" 버튼 클릭
3. Windows 64-bit 선택
4. `AWSCLIV2.msi` 파일 다운로드
5. 다운로드한 파일 실행
6. 설치 마법사 따라 진행:
   - "Next" 클릭
   - 라이선스 동의 체크
   - 설치 경로 확인 (기본: `C:\Program Files\Amazon\AWSCLIV2\`)
   - "Install" 클릭
   - 관리자 권한 요청 시 "예" 클릭
7. 설치 완료 후 "Finish" 클릭

#### 방법 2: PowerShell 사용
```powershell
# PowerShell 관리자 권한으로 실행
# Chocolatey가 설치되어 있는 경우
choco install awscli

# 또는 직접 다운로드
Invoke-WebRequest -Uri https://awscli.amazonaws.com/AWSCLIV2.msi -OutFile AWSCLIV2.msi
Start-Process msiexec.exe -ArgumentList '/i', 'AWSCLIV2.msi', '/quiet' -Wait
Remove-Item AWSCLIV2.msi
```

#### 설치 확인
```cmd
# 명령 프롬프트 새로 열기 (중요!)
# Windows + R → cmd → Enter

aws --version

# 예상 출력:
# aws-cli/2.15.10 Python/3.11.6 Windows/10 exe/AMD64 prompt/off
```

⚠️ **주의**: 설치 후 반드시 명령 프롬프트를 새로 열어야 합니다!

### Mac 설치 방법

#### 방법 1: Homebrew 사용 (권장)
```bash
# Homebrew가 없는 경우 먼저 설치
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# AWS CLI 설치
brew install awscli

# 설치 확인
aws --version
```

#### 방법 2: 공식 설치 파일 사용
```bash
# 다운로드
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"

# 설치
sudo installer -pkg AWSCLIV2.pkg -target /

# 확인
which aws
aws --version
```

### Linux 설치 방법

#### Ubuntu/Debian
```bash
# 방법 1: apt 사용
sudo apt update
sudo apt install awscli -y

# 방법 2: 최신 버전 직접 설치
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 설치 확인
aws --version
```

---

## 2. AWS CLI 초기 설정

### 기본 설정 명령어
```bash
aws configure
```

### 입력해야 할 정보

#### 2-1. AWS Access Key ID
```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
```
- 20자리 대문자와 숫자 조합
- "AKIA"로 시작
- IAM 사용자 생성 시 한 번만 확인 가능

#### 2-2. AWS Secret Access Key
```
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```
- 40자리 문자열
- 대소문자, 숫자, 특수문자 포함
- **절대 공개하면 안됨!**

#### 2-3. Default region name
```
Default region name [None]: ap-northeast-2
```
주요 리전 코드:
- `ap-northeast-2`: 서울
- `ap-northeast-1`: 도쿄
- `us-east-1`: 버지니아
- `us-west-2`: 오레곤
- `eu-west-1`: 아일랜드

#### 2-4. Default output format
```
Default output format [None]: json
```
출력 형식 옵션:
- `json`: JSON 형식 (프로그래밍에 유용)
- `text`: 탭으로 구분된 텍스트
- `table`: 읽기 쉬운 테이블 형식
- `yaml`: YAML 형식

### 전체 설정 예시
```bash
$ aws configure
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: ap-northeast-2
Default output format [None]: json
```

---

## 3. 자격 증명 설정 방법

### 방법 1: IAM 사용자의 Access Key 생성 (AWS Console)

1. **AWS Console 로그인**
   - https://console.aws.amazon.com 접속

2. **IAM 서비스 이동**
   - 상단 검색창에 "IAM" 입력
   - "IAM" 클릭

3. **사용자 선택**
   - 좌측 메뉴 "사용자" 클릭
   - 본인 사용자 이름 클릭

4. **보안 자격 증명 탭**
   - "보안 자격 증명" 탭 클릭
   - "액세스 키" 섹션으로 스크롤

5. **액세스 키 만들기**
   - "액세스 키 만들기" 버튼 클릭
   - 사용 사례 선택:
     - "Command Line Interface (CLI)" 선택
     - 하단 체크박스 체크
     - "다음" 클릭

6. **설명 태그 추가 (선택)**
   - 태그 값: "Lambda deployment" 등 용도 입력
   - "액세스 키 만들기" 클릭

7. **액세스 키 저장**
   ```
   액세스 키: AKIAIOSFODNN7EXAMPLE
   비밀 액세스 키: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```
   - ⚠️ **중요**: 이 화면을 벗어나면 비밀 액세스 키를 다시 볼 수 없음!
   - ".csv 파일 다운로드" 클릭하여 안전한 곳에 저장

### 방법 2: 기존 자격 증명 파일 직접 편집

#### Windows
```powershell
# 자격 증명 파일 위치
notepad %USERPROFILE%\.aws\credentials

# 또는 PowerShell
notepad $env:USERPROFILE\.aws\credentials
```

#### Mac/Linux
```bash
# 자격 증명 파일 편집
nano ~/.aws/credentials
# 또는
vim ~/.aws/credentials
```

#### 파일 내용
```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[production]
aws_access_key_id = AKIAIOSFODNN7PROD
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYPRODKEY
```

### 방법 3: 환경 변수 사용

#### Windows (명령 프롬프트)
```cmd
set AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
set AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
set AWS_DEFAULT_REGION=ap-northeast-2
```

#### Windows (PowerShell)
```powershell
$env:AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
$env:AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
$env:AWS_DEFAULT_REGION="ap-northeast-2"
```

#### Mac/Linux
```bash
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_DEFAULT_REGION=ap-northeast-2

# 영구 설정 (.bashrc 또는 .zshrc에 추가)
echo 'export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE' >> ~/.bashrc
echo 'export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' >> ~/.bashrc
echo 'export AWS_DEFAULT_REGION=ap-northeast-2' >> ~/.bashrc
source ~/.bashrc
```

---

## 4. 프로파일 관리

### 여러 AWS 계정/환경 관리

#### 프로파일 추가
```bash
# 개발 환경 프로파일 추가
aws configure --profile dev
AWS Access Key ID [None]: AKIADEV123456
AWS Secret Access Key [None]: devSecretKey123
Default region name [None]: ap-northeast-2
Default output format [None]: json

# 프로덕션 환경 프로파일 추가
aws configure --profile prod
AWS Access Key ID [None]: AKIAPROD789012
AWS Secret Access Key [None]: prodSecretKey456
Default region name [None]: ap-northeast-2
Default output format [None]: json
```

#### 프로파일 사용
```bash
# 기본 프로파일 사용
aws s3 ls

# 특정 프로파일 사용
aws s3 ls --profile dev
aws lambda list-functions --profile prod

# 환경 변수로 프로파일 설정
export AWS_PROFILE=dev
aws s3 ls  # dev 프로파일 사용
```

#### 프로파일 목록 확인
```bash
# 모든 프로파일 보기
aws configure list-profiles

# 특정 프로파일 설정 확인
aws configure list --profile dev
```

---

## 5. 기본 명령어 사용법

### 설정 확인
```bash
# 현재 설정 확인
aws configure list

# 출력 예시:
#       Name                    Value             Type    Location
#       ----                    -----             ----    --------
#    profile                <not set>             None    None
# access_key     ****************MPLE shared-credentials-file
# secret_key     ****************EKEY shared-credentials-file
#     region           ap-northeast-2      config-file    ~/.aws/config
```

### 계정 정보 확인
```bash
# 현재 사용자 정보 확인
aws sts get-caller-identity

# 출력 예시:
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/username"
}
```

### Lambda 관련 명령어
```bash
# Lambda 함수 목록
aws lambda list-functions --region ap-northeast-2

# Lambda 함수 생성
aws lambda create-function \
    --function-name my-function \
    --runtime nodejs18.x \
    --role arn:aws:iam::123456789012:role/lambda-role \
    --handler index.handler \
    --zip-file fileb://function.zip

# Lambda 함수 실행
aws lambda invoke \
    --function-name my-function \
    --payload '{"key": "value"}' \
    output.json

# Lambda 로그 보기
aws logs tail /aws/lambda/my-function --follow
```

### S3 관련 명령어
```bash
# S3 버킷 목록
aws s3 ls

# 특정 버킷 내용 보기
aws s3 ls s3://my-bucket/

# 파일 업로드
aws s3 cp file.txt s3://my-bucket/

# 파일 다운로드
aws s3 cp s3://my-bucket/file.txt ./

# 동기화
aws s3 sync ./local-folder s3://my-bucket/
```

### SQS 관련 명령어
```bash
# Queue 목록
aws sqs list-queues

# 메시지 전송
aws sqs send-message \
    --queue-url https://sqs.ap-northeast-2.amazonaws.com/123456789012/my-queue \
    --message-body "Hello World"

# 메시지 수신
aws sqs receive-message \
    --queue-url https://sqs.ap-northeast-2.amazonaws.com/123456789012/my-queue
```

---

## 6. 트러블슈팅

### 문제 1: "aws: command not found"
**원인**: AWS CLI가 설치되지 않았거나 PATH에 없음

**해결 방법**:
```bash
# Windows: 환경 변수 PATH 확인
echo %PATH%

# PATH에 AWS CLI 경로 추가
setx PATH "%PATH%;C:\Program Files\Amazon\AWSCLIV2\"

# Mac/Linux: PATH 확인
echo $PATH

# PATH에 추가 (.bashrc 또는 .zshrc에 추가)
export PATH=$PATH:/usr/local/bin/aws
```

### 문제 2: "Unable to locate credentials"
**원인**: AWS 자격 증명이 설정되지 않음

**해결 방법**:
```bash
# 자격 증명 재설정
aws configure

# 또는 환경 변수 확인
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
```

### 문제 3: "The security token included in the request is invalid"
**원인**: 잘못된 Access Key 또는 Secret Key

**해결 방법**:
```bash
# 자격 증명 확인
aws configure list

# 새로운 Access Key 생성 후 재설정
aws configure
```

### 문제 4: "An error occurred (UnauthorizedOperation)"
**원인**: IAM 권한 부족

**해결 방법**:
```bash
# 현재 권한 확인
aws iam list-attached-user-policies --user-name YOUR_USERNAME

# 필요한 정책 추가 (AWS Console에서)
```

### 문제 5: Windows에서 인증서 오류
**원인**: SSL 인증서 검증 실패

**임시 해결**:
```cmd
set AWS_CA_BUNDLE=""
set NO_PROXY=*

# 또는 PowerShell
$env:AWS_CA_BUNDLE=""
$env:NO_PROXY="*"
```

**영구 해결**:
```bash
# pip 업그레이드
pip install --upgrade certifi
```

---

## 📌 보안 주의사항

### ⚠️ 절대 하지 말아야 할 것들

1. **Access Key를 코드에 하드코딩하지 마세요**
   ```javascript
   // ❌ 잘못된 예
   const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"

   // ✅ 올바른 예
   const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID
   ```

2. **Git에 커밋하지 마세요**
   ```bash
   # .gitignore에 추가
   .aws/
   *.pem
   credentials
   ```

3. **공개 저장소에 업로드하지 마세요**
   - GitHub, GitLab 등 공개 저장소
   - 블로그, 포럼 등

4. **이메일이나 메신저로 전송하지 마세요**

### ✅ 권장 보안 방법

1. **IAM Role 사용 (EC2인 경우)**
2. **환경 변수 사용**
3. **AWS Secrets Manager 사용**
4. **정기적인 Access Key 교체**
5. **MFA (Multi-Factor Authentication) 활성화**

---

## 🎯 Quick Start 체크리스트

- [ ] AWS CLI 설치 완료
- [ ] `aws --version` 명령어 작동 확인
- [ ] IAM 사용자 Access Key 생성
- [ ] `aws configure` 실행 및 설정 완료
- [ ] `aws sts get-caller-identity` 로 연결 확인
- [ ] 필요한 IAM 권한 확인

모든 체크리스트가 완료되면 Lambda 배포를 시작할 수 있습니다!

---

**문서 버전**: 1.0.0
**작성일**: 2025년 1월 18일
**작성자**: Claude Code Assistant