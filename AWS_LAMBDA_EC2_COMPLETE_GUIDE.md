# 🚀 AWS Lambda & EC2 완벽 가이드 - 인터넷에서 실행하기

> 🎯 **목표**: Lambda를 AWS 클라우드에서 실행하고, EC2와 함께 관리하는 방법을 초등학생도 이해할 수 있게 설명합니다.

---

## 📚 목차
1. [Lambda와 EC2가 뭔가요?](#-lambda와-ec2가-뭔가요)
2. [Lambda를 인터넷에서 실행하기](#-lambda를-인터넷에서-실행하기)
3. [EC2 서버 접속하고 관리하기](#-ec2-서버-접속하고-관리하기)
4. [Lambda와 EC2의 관계](#-lambda와-ec2의-관계)
5. [문제 해결 가이드](#-문제-해결-가이드)

---

## 🤔 Lambda와 EC2가 뭔가요?

### Lambda (람다)
- **쉽게 말하면**: 코드를 실행해주는 **자동 실행기**
- **비유**: 자판기처럼 동전(요청)을 넣으면 음료수(결과)가 나옴
- **장점**:
  - 서버 관리 불필요
  - 사용한 만큼만 비용 지불
  - 자동으로 확장/축소

### EC2 (이씨투)
- **쉽게 말하면**: AWS에 있는 **가상 컴퓨터**
- **비유**: 집에 있는 컴퓨터를 AWS 클라우드에 옮겨놓은 것
- **장점**:
  - 24시간 실행 가능
  - 어디서든 접속 가능
  - 성능 조절 가능

### 🔗 현재 프로젝트 구조
```
인터넷
  ↓
Next.js 앱 (로컬 또는 Vercel)
  ↓
Lambda 함수들 (AWS 클라우드)
  ↓
데이터베이스 (AWS RDS 또는 로컬)
```

---

## 🌐 Lambda를 인터넷에서 실행하기

### 📋 Step 1: Lambda 함수 확인하기

#### 1-1. AWS Console 로그인
1. 브라우저 열기
2. 주소창에 입력: `https://console.aws.amazon.com`
3. 로그인하기

#### 1-2. Lambda 서비스로 이동
1. 상단 검색창에 `Lambda` 입력
2. **Lambda** 클릭
3. 지역이 **Asia Pacific (Seoul) ap-northeast-2** 인지 확인

#### 1-3. 현재 Lambda 함수 목록
```
현재 배포된 Lambda 함수들:
├── marketingplat-tracking-production-orchestrator (오케스트레이터)
├── marketingplat-tracking-production-blogTracker (블로그 추적)
├── marketingplat-tracking-production-smartplaceTracker (스마트플레이스 추적)
└── marketingplat-tracking-production-scheduledTrigger (스케줄 트리거)
```

---

### 🔧 Step 2: Lambda 함수 테스트하기

#### 2-1. 함수 선택
1. 함수 목록에서 `marketingplat-tracking-production-orchestrator` 클릭
2. **테스트** 탭 클릭

#### 2-2. 테스트 이벤트 생성
1. **테스트 이벤트 구성** 클릭
2. 이벤트 이름: `TestEvent1`
3. 이벤트 JSON:
```json
{
  "type": "smartplace",
  "keywords": []
}
```
4. **생성** 클릭

#### 2-3. 테스트 실행
1. **테스트** 버튼 클릭
2. 결과 확인:
   - ✅ 성공: "Execution result: succeeded"
   - ❌ 실패: 로그 확인 필요

---

### 📡 Step 3: Lambda를 Next.js 앱에서 호출하기

#### 3-1. 환경 변수 확인 (.env.local)
```env
# AWS Lambda 설정
AWS_ACCESS_KEY_ID="AKIA로시작하는20자"
AWS_SECRET_ACCESS_KEY="40자리긴문자열"
AWS_REGION="ap-northeast-2"

# Lambda 함수 ARN들
LAMBDA_ORCHESTRATOR_ARN="arn:aws:lambda:ap-northeast-2:계정ID:function:marketingplat-tracking-production-orchestrator"
```

#### 3-2. API 라우트에서 Lambda 호출
```typescript
// app/api/lambda/trigger-tracking/route.ts
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  const body = await request.json();

  const command = new InvokeCommand({
    FunctionName: process.env.LAMBDA_ORCHESTRATOR_ARN,
    InvocationType: "Event", // 비동기 실행
    Payload: JSON.stringify(body),
  });

  const response = await lambda.send(command);

  return Response.json({
    success: true,
    statusCode: response.StatusCode,
  });
}
```

---

### 🔄 Step 4: Lambda 코드 업데이트하기

#### 4-1. 로컬에서 코드 수정
```bash
# 1. Lambda 함수 폴더로 이동
cd D:\marketingplatformproject\lambda-functions

# 2. 코드 수정 (예: orchestrator/index.ts)
# VSCode나 메모장으로 파일 편집

# 3. TypeScript 컴파일
npm run build
```

#### 4-2. AWS에 배포하기

**방법 1: Serverless Framework 사용 (권장)**
```bash
# Windows PowerShell에서
cd D:\marketingplatformproject\lambda-functions

# 배포 스크립트 실행
.\deploy-windows.ps1

# 또는 배치 파일 실행
deploy-windows.bat
```

**방법 2: AWS Console에서 직접 업데이트**
1. Lambda 콘솔에서 함수 선택
2. **코드** 탭 클릭
3. **업로드** → **.zip 파일 업로드**
4. `lambda-functions/.serverless/marketingplat-tracking-production.zip` 선택
5. **저장** 클릭

#### 4-3. 배포 확인
1. Lambda 콘솔에서 함수 선택
2. **모니터링** 탭 확인
3. CloudWatch 로그 확인

---

### ⏰ Step 5: 자동 실행 설정 (EventBridge)

#### 5-1. EventBridge 규칙 확인
1. AWS Console에서 `EventBridge` 검색
2. **규칙** → **marketingplat-scheduler** 확인
3. 현재 설정: 매일 오전 9시, 오후 3시, 오후 9시 실행

#### 5-2. 스케줄 변경하기
1. 규칙 선택 → **편집**
2. 크론 표현식 수정:
```
# 현재 (하루 3번)
cron(0 0,6,12 * * ? *)  # UTC 기준

# 예시: 매시간 실행
cron(0 * * * ? *)

# 예시: 평일 오전 9시
cron(0 0 ? * MON-FRI *)  # UTC 0시 = 한국 오전 9시
```
3. **다음** → **업데이트**

---

## 💻 EC2 서버 접속하고 관리하기

### 🔑 Step 1: SSH 키 준비하기

#### 1-1. 키 파일 다운로드
1. AWS Console → EC2
2. **키 페어** 메뉴
3. `marketingplat-key.pem` 파일 확인
4. 없으면 새로 생성:
   - **키 페어 생성** 클릭
   - 이름: `marketingplat-key`
   - 키 페어 유형: RSA
   - 파일 형식: .pem (Mac/Linux) 또는 .ppk (Windows)
   - **키 페어 생성** → 자동 다운로드

#### 1-2. 키 파일 저장 위치
```
Windows 추천 위치:
C:\Users\사용자명\.ssh\marketingplat-key.pem
```

---

### 🖥️ Step 2: EC2 접속하기

#### 2-1. EC2 인스턴스 정보 확인
1. AWS Console → EC2
2. **인스턴스** 클릭
3. 인스턴스 선택
4. **퍼블릭 IPv4 주소** 복사 (예: 54.123.456.789)

#### 2-2. Windows에서 접속

**방법 1: PowerShell 사용**
```powershell
# 1. PowerShell 열기 (Windows + X → Windows PowerShell)

# 2. SSH 접속 명령
ssh -i "C:\Users\사용자명\.ssh\marketingplat-key.pem" ubuntu@54.123.456.789

# 3. 처음 접속 시 "yes" 입력

# 4. 접속 성공!
ubuntu@ip-172-31-0-100:~$
```

**방법 2: PuTTY 사용 (Windows 전용)**
1. PuTTY 다운로드: https://www.putty.org/
2. PuTTYgen으로 .pem을 .ppk로 변환:
   - PuTTYgen 실행
   - **Load** → marketingplat-key.pem 선택
   - **Save private key** → marketingplat-key.ppk 저장
3. PuTTY 실행:
   - Host Name: `ubuntu@54.123.456.789`
   - Port: 22
   - Connection → SSH → Auth → Private key file: marketingplat-key.ppk 선택
   - **Open** 클릭

---

### 📁 Step 3: EC2에서 파일 관리하기

#### 3-1. 기본 명령어 모음
```bash
# 현재 위치 확인
pwd
# 결과: /home/ubuntu

# 파일 목록 보기
ls -la

# 폴더 이동
cd /var/www/html  # 웹 서버 폴더로 이동
cd ~              # 홈 폴더로 돌아가기
cd ..             # 상위 폴더로 이동

# 파일 내용 보기
cat 파일이름.txt        # 전체 내용
head -10 파일이름.txt   # 처음 10줄
tail -10 파일이름.txt   # 마지막 10줄
less 파일이름.txt       # 페이지 단위로 보기 (q로 종료)

# 파일 검색
find . -name "*.js"     # 현재 폴더에서 .js 파일 찾기
grep "검색어" 파일이름    # 파일 내 텍스트 검색
```

#### 3-2. 프로젝트 파일 확인
```bash
# 프로젝트 폴더로 이동 (예시)
cd /home/ubuntu/marketingplat

# 프로젝트 구조 확인
tree -L 2  # 2단계 깊이까지 표시

# Git 상태 확인
git status
git log --oneline -5  # 최근 5개 커밋

# Node.js 프로젝트 확인
npm list --depth=0  # 설치된 패키지
pm2 list           # 실행 중인 Node 프로세스
```

#### 3-3. 파일 편집하기
```bash
# nano 에디터 사용 (초보자 추천)
nano 파일이름.txt
# Ctrl+O: 저장, Ctrl+X: 종료

# vim 에디터 사용
vim 파일이름.txt
# i: 편집 모드, ESC: 명령 모드, :wq: 저장 후 종료

# 간단한 수정
echo "새로운 내용" >> 파일이름.txt  # 파일 끝에 추가
echo "새로운 내용" > 파일이름.txt   # 파일 덮어쓰기
```

---

### 🔄 Step 4: EC2에서 애플리케이션 관리

#### 4-1. Node.js 앱 재시작
```bash
# PM2로 관리되는 앱 확인
pm2 list

# 앱 재시작
pm2 restart app-name
pm2 restart 0  # ID로 재시작

# 로그 확인
pm2 logs
pm2 logs app-name --lines 50

# 앱 중지/시작
pm2 stop app-name
pm2 start app-name
```

#### 4-2. 시스템 상태 확인
```bash
# 디스크 사용량
df -h

# 메모리 사용량
free -h

# CPU 사용률
top  # q로 종료

# 프로세스 확인
ps aux | grep node

# 포트 사용 확인
sudo netstat -tlnp
```

#### 4-3. 로그 파일 확인
```bash
# 시스템 로그
sudo tail -f /var/log/syslog

# Nginx 로그 (웹서버)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 애플리케이션 로그
cd /home/ubuntu/marketingplat
tail -f logs/application.log
```

---

### 📤 Step 5: 파일 업로드/다운로드

#### 5-1. Windows에서 EC2로 파일 업로드

**PowerShell 사용:**
```powershell
# 단일 파일 업로드
scp -i "C:\Users\사용자명\.ssh\marketingplat-key.pem" `
    "D:\파일.txt" `
    ubuntu@54.123.456.789:/home/ubuntu/

# 폴더 전체 업로드
scp -r -i "C:\Users\사용자명\.ssh\marketingplat-key.pem" `
    "D:\프로젝트폴더" `
    ubuntu@54.123.456.789:/home/ubuntu/
```

**FileZilla 사용 (GUI):**
1. FileZilla 다운로드: https://filezilla-project.org/
2. 사이트 관리자 설정:
   - 프로토콜: SFTP
   - 호스트: 54.123.456.789
   - 로그온 유형: 키 파일
   - 사용자: ubuntu
   - 키 파일: marketingplat-key.ppk
3. 연결 후 드래그&드롭으로 파일 전송

#### 5-2. EC2에서 Windows로 파일 다운로드
```powershell
# 단일 파일 다운로드
scp -i "C:\Users\사용자명\.ssh\marketingplat-key.pem" `
    ubuntu@54.123.456.789:/home/ubuntu/파일.txt `
    "D:\다운로드\"

# 폴더 전체 다운로드
scp -r -i "C:\Users\사용자명\.ssh\marketingplat-key.pem" `
    ubuntu@54.123.456.789:/home/ubuntu/프로젝트폴더 `
    "D:\다운로드\"
```

---

## 🔗 Lambda와 EC2의 관계

### 📊 현재 프로젝트 아키텍처

```
[사용자 브라우저]
       ↓
[Next.js 앱] (로컬 개발 또는 Vercel)
       ↓
    분기점
    ├─→ [Lambda 함수들] (AWS)
    │     ├─ Orchestrator (조정자)
    │     ├─ Blog Tracker (블로그 추적)
    │     └─ SmartPlace Tracker (스마트플레이스 추적)
    │
    └─→ [EC2 서버] (선택적 사용)
          ├─ 백엔드 API 서버
          ├─ 데이터베이스 (MySQL/PostgreSQL)
          └─ 파일 저장소
```

### 🤝 Lambda와 EC2의 역할 분담

| 구분 | Lambda | EC2 |
|------|--------|-----|
| **용도** | 단기 실행 작업 | 장기 실행 서버 |
| **예시** | 키워드 추적, 데이터 수집 | 웹서버, DB 서버 |
| **실행 시간** | 최대 15분 | 24시간 365일 |
| **비용** | 실행한 만큼만 | 시간당 과금 |
| **관리** | AWS가 관리 | 직접 관리 필요 |
| **확장성** | 자동 확장 | 수동 확장 |

### 💡 언제 무엇을 사용하나요?

#### Lambda를 사용하는 경우:
- ✅ 주기적인 데이터 수집 (키워드 순위 추적)
- ✅ 이벤트 기반 처리 (파일 업로드 시 처리)
- ✅ 단기 실행 작업 (이메일 발송)
- ✅ API 요청 처리 (간단한 CRUD)

#### EC2를 사용하는 경우:
- ✅ 웹 애플리케이션 서버
- ✅ 데이터베이스 서버
- ✅ WebSocket 서버 (실시간 통신)
- ✅ 복잡한 백그라운드 작업

### 🔄 Lambda와 EC2 연동 예시

#### 시나리오 1: Lambda → EC2 데이터베이스
```javascript
// Lambda 함수에서 EC2의 DB 접속
const mysql = require('mysql2/promise');

exports.handler = async (event) => {
    const connection = await mysql.createConnection({
        host: '172.31.0.100',  // EC2 Private IP
        user: 'dbuser',
        password: 'dbpass',
        database: 'marketingplat'
    });

    const [rows] = await connection.execute('SELECT * FROM keywords');
    await connection.end();

    return rows;
};
```

#### 시나리오 2: EC2 → Lambda 호출
```javascript
// EC2의 Node.js 앱에서 Lambda 호출
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const lambda = new LambdaClient({ region: "ap-northeast-2" });

async function callLambda() {
    const command = new InvokeCommand({
        FunctionName: "marketingplat-tracking-production-orchestrator",
        Payload: JSON.stringify({ type: "smartplace" })
    });

    const response = await lambda.send(command);
    console.log(response);
}
```

---

## 🚨 문제 해결 가이드

### Lambda 문제 해결

#### 오류: "Task timed out"
**원인**: Lambda 실행 시간 초과 (기본 3초)
**해결**:
1. Lambda 콘솔 → 함수 선택
2. **구성** → **일반 구성** → **편집**
3. 제한 시간: 5분(300초)로 증가
4. **저장**

#### 오류: "AccessDeniedException"
**원인**: IAM 권한 부족
**해결**:
1. Lambda 콘솔 → 함수 선택
2. **구성** → **권한**
3. 실행 역할 클릭
4. **권한 추가** → 필요한 정책 추가
   - AmazonSQSFullAccess
   - AmazonDynamoDBFullAccess

#### 오류: "Cannot find module"
**원인**: 의존성 패키지 누락
**해결**:
```bash
cd lambda-functions
npm install
npm run build
npm run deploy
```

### EC2 문제 해결

#### 문제: SSH 접속 안 됨
**체크리스트**:
1. ✅ 인스턴스 상태: "running"
2. ✅ 보안 그룹: 포트 22 열려있는지
3. ✅ 키 파일 권한 (Linux/Mac):
   ```bash
   chmod 400 marketingplat-key.pem
   ```
4. ✅ 공인 IP 주소 확인

#### 문제: 웹사이트 접속 안 됨
**체크리스트**:
1. ✅ 보안 그룹: 포트 80/443 열려있는지
2. ✅ Nginx/Apache 실행 중인지:
   ```bash
   sudo systemctl status nginx
   sudo systemctl start nginx
   ```
3. ✅ 방화벽 설정:
   ```bash
   sudo ufw status
   ```

#### 문제: 디스크 공간 부족
**해결**:
```bash
# 큰 파일 찾기
sudo du -h / | grep G

# 로그 파일 정리
sudo rm -rf /var/log/*.gz
sudo journalctl --vacuum-time=7d

# Docker 정리
docker system prune -a
```

---

## 📈 모니터링 및 로그

### CloudWatch 로그 확인

#### Lambda 로그
1. AWS Console → CloudWatch
2. **로그 그룹** 클릭
3. `/aws/lambda/함수이름` 선택
4. 최신 로그 스트림 클릭

#### 로그 검색
```
# CloudWatch Insights 쿼리
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

### EC2 모니터링

#### CloudWatch 메트릭
1. EC2 콘솔 → 인스턴스 선택
2. **모니터링** 탭
3. 확인 항목:
   - CPU 사용률
   - 네트워크 입/출력
   - 디스크 읽기/쓰기

#### 상세 모니터링 설정
```bash
# EC2에 CloudWatch 에이전트 설치
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# 구성 및 시작
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
sudo systemctl start amazon-cloudwatch-agent
```

---

## 💰 비용 관리

### Lambda 비용
- **무료 티어**: 월 100만 요청, 400,000 GB-초
- **추가 비용**: $0.20 / 100만 요청
- **예상 비용**: 월 $0~5 (대부분 무료 티어 내)

### EC2 비용
- **t2.micro**: 무료 티어 (첫 1년)
- **t3.small**: 월 약 $15
- **저장소(EBS)**: 30GB 무료, 추가 GB당 $0.10

### 비용 절감 팁
1. **Lambda**: 메모리 최적화 (512MB면 충분)
2. **EC2**: 예약 인스턴스 또는 스팟 인스턴스 사용
3. **자동 중지**: 개발 서버는 야간에 자동 중지
   ```bash
   # EC2 자동 중지 스케줄 (CloudWatch Events)
   0 22 * * * aws ec2 stop-instances --instance-ids i-1234567890
   ```

---

## 🎯 체크리스트

### Lambda 설정 완료
- [ ] AWS 자격 증명 설정 (.env.local)
- [ ] Lambda 함수 테스트 성공
- [ ] API 라우트에서 Lambda 호출 성공
- [ ] EventBridge 스케줄 확인
- [ ] CloudWatch 로그 확인

### EC2 설정 완료
- [ ] SSH 키 파일 저장
- [ ] SSH 접속 성공
- [ ] 기본 명령어 실행
- [ ] 파일 업로드/다운로드 테스트
- [ ] 애플리케이션 상태 확인

### 연동 확인
- [ ] Lambda → DB 연결 (필요시)
- [ ] EC2 → Lambda 호출 (필요시)
- [ ] 모니터링 대시보드 설정
- [ ] 알람 설정

---

## 📞 추가 도움말

### 유용한 링크
- [AWS Lambda 문서](https://docs.aws.amazon.com/lambda/)
- [EC2 사용 설명서](https://docs.aws.amazon.com/ec2/)
- [CloudWatch 로그](https://docs.aws.amazon.com/cloudwatch/)
- [AWS 요금 계산기](https://calculator.aws/)

### 자주 사용하는 AWS CLI 명령어
```bash
# Lambda 함수 목록
aws lambda list-functions --region ap-northeast-2

# Lambda 함수 호출
aws lambda invoke --function-name marketingplat-tracking-production-orchestrator output.json

# EC2 인스턴스 목록
aws ec2 describe-instances --region ap-northeast-2

# S3 버킷 목록
aws s3 ls
```

---

**작성일**: 2025년 1월 19일
**환경**: Windows 11, AWS Lambda, EC2 (Ubuntu)
**프로젝트**: MarketingPlat

> 💡 **팁**: 이 문서를 인쇄하거나 PDF로 저장해두면 인터넷이 안 될 때도 참고할 수 있습니다!