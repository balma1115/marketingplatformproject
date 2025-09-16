# 보안 체크리스트

## 즉시 수행해야 할 작업

### 1. API 키 재발급 (필수!)
- [ ] Google Gemini API 키 재발급
- [ ] Naver API Client ID/Secret 재발급
- [ ] Naver Ads API 키 재발급
- [ ] Flux API 키 재발급
- [ ] Toss Secret 키 재발급

### 2. 환경 변수 설정
- [ ] 새 API 키로 .env.local 업데이트
- [ ] .env.production 생성 (프로덕션용)
- [ ] AWS Secrets Manager 또는 환경 변수 사용

### 3. Git 히스토리 정리
```bash
# 주의: 팀원과 조율 후 실행
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env* SECURE-*" \
  --prune-empty --tag-name-filter cat -- --all
```

### 4. 보안 강화
- [ ] 모든 API 엔드포인트에 인증 추가
- [ ] Rate Limiting 전체 적용
- [ ] 테스트 계정 비밀번호 변경

### 5. 모니터링
- [ ] 비정상 API 사용 모니터링
- [ ] 로그 검토
- [ ] 보안 알림 설정
