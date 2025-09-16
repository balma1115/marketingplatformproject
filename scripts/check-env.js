#!/usr/bin/env node

/**
 * 환경 변수 확인 스크립트
 * 현재 환경 설정을 확인하고 필수 환경 변수를 검증합니다.
 */

const fs = require('fs');
const path = require('path');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

// 환경 변수 로드
require('dotenv').config({ path: '.env.local' });

console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
console.log(`${colors.blue}📋 환경 설정 확인${colors.reset}`);
console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

// 기본 환경 정보
console.log(`${colors.yellow}🔧 기본 환경 정보${colors.reset}`);
console.log(`NODE_ENV: ${colors.green}${process.env.NODE_ENV || 'development'}${colors.reset}`);
console.log(`APP_ENV: ${colors.green}${process.env.APP_ENV || 'local'}${colors.reset}`);
console.log(`NEXT_PUBLIC_APP_ENV: ${colors.green}${process.env.NEXT_PUBLIC_APP_ENV || 'local'}${colors.reset}`);
console.log();

// 추적 서비스 설정
console.log(`${colors.yellow}🚀 추적 서비스 설정${colors.reset}`);
console.log(`USE_LAMBDA_TRACKING: ${process.env.USE_LAMBDA_TRACKING === 'true' ? colors.green : colors.gray}${process.env.USE_LAMBDA_TRACKING || 'false'}${colors.reset}`);
console.log(`TRACKING_MODE: ${colors.green}${process.env.TRACKING_MODE || 'local'}${colors.reset}`);
console.log(`SQS_QUEUE_URL: ${process.env.SQS_QUEUE_URL ? colors.green + '설정됨' : colors.gray + '미설정'}${colors.reset}`);
console.log();

// 디버그 설정
console.log(`${colors.yellow}🐛 디버그 설정${colors.reset}`);
console.log(`DEBUG_MODE: ${process.env.DEBUG_MODE === 'true' ? colors.green : colors.gray}${process.env.DEBUG_MODE || 'false'}${colors.reset}`);
console.log(`SHOW_ERROR_DETAILS: ${process.env.SHOW_ERROR_DETAILS === 'true' ? colors.green : colors.gray}${process.env.SHOW_ERROR_DETAILS || 'false'}${colors.reset}`);
console.log();

// 필수 환경 변수 확인
console.log(`${colors.yellow}✅ 필수 환경 변수 확인${colors.reset}`);

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NEXT_PUBLIC_API_URL',
];

const optionalEnvVars = [
  'NAVER_CLIENT_ID',
  'NAVER_CLIENT_SECRET',
  'NAVER_ADS_API_KEY',
  'NAVER_ADS_SECRET_KEY',
  'NAVER_ADS_CUSTOMER_ID',
  'GEMINI_API_KEY',
  'AWS_REGION',
  'REDIS_URL',
];

let hasError = false;

// 필수 환경 변수 검사
requiredEnvVars.forEach((varName) => {
  if (process.env[varName]) {
    console.log(`${colors.green}✓${colors.reset} ${varName}: 설정됨`);
  } else {
    console.log(`${colors.red}✗${colors.reset} ${varName}: ${colors.red}미설정 (필수)${colors.reset}`);
    hasError = true;
  }
});

console.log();

// 선택적 환경 변수 검사
console.log(`${colors.yellow}📌 선택적 환경 변수${colors.reset}`);
optionalEnvVars.forEach((varName) => {
  if (process.env[varName]) {
    console.log(`${colors.green}✓${colors.reset} ${varName}: 설정됨`);
  } else {
    console.log(`${colors.gray}○${colors.reset} ${varName}: ${colors.gray}미설정 (선택)${colors.reset}`);
  }
});

console.log();

// URL 설정 확인
console.log(`${colors.yellow}🌐 URL 설정${colors.reset}`);
console.log(`API URL: ${colors.green}${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${colors.reset}`);
console.log(`BASE URL: ${colors.green}${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${colors.reset}`);
console.log();

// 데이터베이스 연결 확인
console.log(`${colors.yellow}💾 데이터베이스 설정${colors.reset}`);
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`Type: ${colors.green}${url.protocol.replace(':', '')}${colors.reset}`);
    console.log(`Host: ${colors.green}${url.hostname}${colors.reset}`);
    console.log(`Port: ${colors.green}${url.port || '기본 포트'}${colors.reset}`);
    console.log(`Database: ${colors.green}${url.pathname.replace('/', '')}${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}데이터베이스 URL 파싱 실패${colors.reset}`);
  }
} else {
  console.log(`${colors.red}DATABASE_URL이 설정되지 않았습니다${colors.reset}`);
}

console.log();

// 환경별 권장 설정
console.log(`${colors.yellow}💡 현재 환경에 대한 권장 설정${colors.reset}`);
const appEnv = process.env.APP_ENV || 'local';

if (appEnv === 'local') {
  console.log('로컬 개발 환경 설정:');
  console.log(`${colors.gray}- USE_LAMBDA_TRACKING: false`);
  console.log(`- TRACKING_MODE: local`);
  console.log(`- DEBUG_MODE: true`);
  console.log(`- SHOW_ERROR_DETAILS: true${colors.reset}`);
} else if (appEnv === 'staging') {
  console.log('스테이징 환경 설정:');
  console.log(`${colors.gray}- USE_LAMBDA_TRACKING: true (선택)`);
  console.log(`- TRACKING_MODE: lambda 또는 local`);
  console.log(`- DEBUG_MODE: true`);
  console.log(`- SHOW_ERROR_DETAILS: true${colors.reset}`);
} else if (appEnv === 'production') {
  console.log('프로덕션 환경 설정:');
  console.log(`${colors.gray}- USE_LAMBDA_TRACKING: true`);
  console.log(`- TRACKING_MODE: lambda`);
  console.log(`- DEBUG_MODE: false`);
  console.log(`- SHOW_ERROR_DETAILS: false${colors.reset}`);
}

console.log();
console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);

// 결과 출력
if (hasError) {
  console.log(`${colors.red}⚠️  필수 환경 변수가 누락되었습니다!${colors.reset}`);
  console.log(`${colors.yellow}.env.local 파일을 확인하고 필수 변수를 설정해주세요.${colors.reset}`);
  process.exit(1);
} else {
  console.log(`${colors.green}✅ 모든 필수 환경 변수가 설정되었습니다!${colors.reset}`);
  process.exit(0);
}