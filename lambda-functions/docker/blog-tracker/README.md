# Blog Tracker Lambda - Container Image Version

## 🎯 개요
AWS Lambda Container Image를 사용하여 Chromium 실행 환경 제약을 완전히 해결한 버전입니다.

## 🚀 장점
- **10GB 이미지 크기 제한** - 기존 250MB 제한 해결
- **완전한 Chrome 브라우저** - 모든 시스템 라이브러리 포함
- **안정적인 실행** - EC2와 동일한 환경
- **간편한 배포** - Docker 이미지로 관리

## 📦 구성 요소
- Base Image: AWS Lambda Node.js 18 Runtime
- Chrome: Google Chrome Stable (최신 버전)
- Puppeteer: Full version (not core)
- Prisma: Database ORM
- 한글 폰트: Google Noto CJK fonts

## 🛠️ 빌드 및 배포

### 사전 요구사항
- Docker Desktop 설치 및 실행
- AWS CLI 구성 완료
- ECR 접근 권한

### Windows (PowerShell)
```powershell
# Docker Desktop 시작 후
.\build-and-deploy.ps1
```

### Linux/Mac
```bash
# Docker 시작 후
chmod +x build-and-deploy.sh
./build-and-deploy.sh
```

## 🧪 로컬 테스트

### Docker Compose 사용
```bash
# .env 파일에 DATABASE_URL 설정 후
docker-compose up --build
```

### 테스트 요청 전송
```bash
curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -H "Content-Type: application/json" \
  -d @test-event.json
```

## 📊 성능 지표
- 이미지 크기: 약 2-3GB
- 콜드 스타트: 10-15초
- 실행 시간: 블로그당 5-10초
- 메모리 사용: 1.5-2GB

## 🔧 환경 변수
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `AWS_REGION`: ap-northeast-2
- `PUPPETEER_EXECUTABLE_PATH`: /opt/google/chrome/chrome (자동 설정됨)

## 📝 주의사항
1. **첫 배포 시간**: Docker 이미지 빌드로 10-20분 소요
2. **ECR 비용**: 이미지 저장소 사용료 발생 (GB당 $0.10/월)
3. **Lambda 비용**: Container Image는 일반 Lambda보다 콜드 스타트가 길어 비용 증가 가능

## 🚨 트러블슈팅

### Docker Desktop이 시작되지 않을 때
```powershell
# Windows
wsl --update
# Docker Desktop 재설치
```

### ECR 로그인 실패 시
```bash
aws ecr get-login-password --region ap-northeast-2
# 토큰이 정상 출력되는지 확인
```

### Lambda 업데이트 실패 시
- Lambda 함수가 Container Image를 지원하는지 확인
- 기존 ZIP 기반 함수는 삭제 후 재생성 필요

## 📚 참고 링크
- [AWS Lambda Container Image](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [Puppeteer on AWS Lambda](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-on-aws-lambda)
- [ECR Public Gallery](https://gallery.ecr.aws/lambda/nodejs)