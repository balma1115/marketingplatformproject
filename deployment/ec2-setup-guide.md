# EC2 인스턴스 설정 가이드

## 1️⃣ EC2 인스턴스 생성

### AWS Console에서 진행
1. **Services > EC2 > Launch instance** 클릭

## 2️⃣ 인스턴스 설정

### Name and tags
- **Name**: `marketingplat-server`

### Application and OS Images (Amazon Machine Image)
- **Quick Start**: Ubuntu 선택
- **Amazon Machine Image (AMI)**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
- **Architecture**: 64-bit (x86)

### Instance type
- **Instance type**: t2.micro ✅ (프리티어 대상)
  - vCPUs: 1
  - Memory: 1 GiB
  - Network: Low to Moderate

### Key pair (login)
- **Key pair name**: Create new key pair 클릭
  - Key pair name: `marketingplat-key`
  - Key pair type: RSA
  - Private key file format:
    - Windows: .ppk (PuTTY 사용) 또는 .pem
    - Mac/Linux: .pem
- **중요**: 다운로드한 키 파일을 안전한 곳에 보관!

### Network settings
- **VPC**: Default VPC
- **Subnet**: No preference
- **Auto-assign public IP**: Enable ✅
- **Firewall (security groups)**: Create security group
  - Security group name: `marketingplat-ec2-sg`
  - Description: Security group for MarketingPlat EC2

#### Security group rules
**Add security group rule** 클릭하여 추가:

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|---------|-------------|
| SSH | TCP | 22 | My IP | SSH Access |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP Traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS Traffic |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | Next.js App (임시) |

### Configure storage
- **Root volume**:
  - Size: 30 GiB (프리티어는 30GB까지 무료)
  - Volume type: gp3
  - Delete on termination: ✅ Yes

### Advanced details (옵션 - 기본값 유지)
- User data: 비워둠 (나중에 스크립트로 설정)

## 3️⃣ Launch instance
- **Summary** 확인
- **Launch instance** 클릭

## 4️⃣ 인스턴스 접속 준비

### Windows (PuTTY 사용)
```bash
# PuTTY 다운로드: https://www.putty.org/

# PuTTYgen으로 .pem을 .ppk로 변환 (필요시)
1. PuTTYgen 실행
2. Load > .pem 파일 선택
3. Save private key > .ppk 저장

# PuTTY로 접속
Host Name: ubuntu@[EC2 Public IP]
Port: 22
Connection > SSH > Auth > Private key file: .ppk 파일 선택
```

### Mac/Linux (Terminal 사용)
```bash
# 키 파일 권한 설정
chmod 400 marketingplat-key.pem

# SSH 접속
ssh -i marketingplat-key.pem ubuntu@[EC2 Public IP]
```

## 5️⃣ Elastic IP 할당 (선택사항 - 권장)

고정 IP를 원하는 경우:
1. EC2 > Elastic IPs > Allocate Elastic IP address
2. Allocate 클릭
3. Actions > Associate Elastic IP address
4. Instance: marketingplat-server 선택
5. Associate 클릭

**주의**: Elastic IP는 EC2에 연결되어 있을 때는 무료, 미사용시 시간당 $0.005 과금

## 📝 생성 후 정보 저장

### EC2 정보 기록
```
Instance ID: i-xxxxxxxxx
Public IP: xx.xx.xx.xx (또는 Elastic IP)
Private IP: 172.31.xx.xx
Instance Type: t2.micro
Region: ap-northeast-2
```

### SSH 접속 테스트
```bash
# 접속 명령어
ssh -i marketingplat-key.pem ubuntu@[Public IP]

# 접속 성공시 출력
Welcome to Ubuntu 22.04 LTS (GNU/Linux 5.15.0-xxx-generic x86_64)
```

## ✅ 체크리스트

- [ ] EC2 인스턴스 시작
- [ ] Ubuntu 22.04 LTS 선택
- [ ] t2.micro 인스턴스 타입 선택 (프리티어)
- [ ] 키 페어 생성 및 다운로드
- [ ] 보안 그룹 규칙 설정 (22, 80, 443, 3000 포트)
- [ ] 30GB 스토리지 설정
- [ ] Launch instance 클릭
- [ ] 인스턴스 상태: Running 확인
- [ ] Public IP 확인
- [ ] SSH 접속 테스트 성공
- [ ] (선택) Elastic IP 할당

## 🔐 중요 정보 (안전하게 보관!)

```bash
# 접속 정보
Host: [Public IP 또는 Elastic IP]
User: ubuntu
Key: marketingplat-key.pem

# 접속 명령어
ssh -i marketingplat-key.pem ubuntu@[Public IP]
```

## ⚠️ 보안 주의사항

1. **키 파일 관리**
   - 절대 공유하지 않기
   - Git에 커밋하지 않기
   - 백업 보관

2. **보안 그룹**
   - SSH(22)는 My IP로만 제한
   - 3000 포트는 설정 완료 후 제거 예정

3. **정기 업데이트**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## 다음 단계
EC2 인스턴스가 Running 상태가 되면 초기 환경 설정으로 진행합니다.