#!/usr/bin/env node
/**
 * 로그인 문제 디버깅 스크립트
 * 데이터베이스 연결, 사용자 확인, 비밀번호 검증 등을 단계별로 테스트
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: ['query', 'info', 'warn', 'error']
});

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function debugLogin() {
  log('\n🔍 로그인 디버깅 시작', 'cyan');
  log('=' .repeat(80), 'cyan');

  // 1. 환경 정보 확인
  log('\n📍 1. 환경 정보 확인', 'yellow');
  const dbUrl = process.env.DATABASE_URL || 'Not configured';
  const isLocalhost = dbUrl.includes('localhost');
  const isRDS = dbUrl.includes('rds.amazonaws.com');

  log(`   DATABASE_URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`, 'blue');
  log(`   환경: ${process.env.NODE_ENV || 'development'}`, 'blue');

  if (isLocalhost) {
    log('   ⚠️  WARNING: localhost 데이터베이스 사용 중!', 'red');
  } else if (isRDS) {
    log('   ✅ AWS RDS 데이터베이스 사용 중', 'green');
  }

  // 2. 데이터베이스 연결 테스트
  log('\n📍 2. 데이터베이스 연결 테스트', 'yellow');
  try {
    await prisma.$connect();
    log('   ✅ 데이터베이스 연결 성공', 'green');

    // 연결 정보
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('   데이터베이스 정보:', result);
  } catch (error: any) {
    log('   ❌ 데이터베이스 연결 실패!', 'red');
    console.error('   오류:', error.message);
    process.exit(1);
  }

  // 3. 사용자 테이블 확인
  log('\n📍 3. 사용자 테이블 확인', 'yellow');
  try {
    const userCount = await prisma.user.count();
    log(`   총 사용자 수: ${userCount}명`, 'blue');

    if (userCount === 0) {
      log('   ⚠️  WARNING: 사용자가 없습니다! 계정 생성이 필요합니다.', 'red');
      log('   실행: npx tsx scripts/init-aws-accounts.ts', 'yellow');
    }
  } catch (error: any) {
    log('   ❌ 사용자 테이블 조회 실패!', 'red');
    console.error('   오류:', error.message);
  }

  // 4. 테스트 계정 확인
  log('\n📍 4. 테스트 계정 상세 확인', 'yellow');
  const testAccounts = [
    { email: 'admin@marketingplat.com', password: 'admin123' },
    { email: 'academy@marketingplat.com', password: 'academy123' },
    { email: 'nokyang@marketingplat.com', password: 'nokyang123' },
    { email: 'user@test.com', password: 'test1234' }
  ];

  for (const account of testAccounts) {
    log(`\n   📧 ${account.email}`, 'cyan');

    try {
      const user = await prisma.user.findUnique({
        where: { email: account.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        log('      ❌ 사용자 없음', 'red');
        continue;
      }

      log(`      ID: ${user.id}`, 'blue');
      log(`      이름: ${user.name}`, 'blue');
      log(`      역할: ${user.role}`, 'blue');
      log(`      활성: ${user.isActive ? '✅' : '❌'}`, user.isActive ? 'green' : 'red');
      log(`      생성: ${user.createdAt.toLocaleString()}`, 'blue');
      log(`      수정: ${user.updatedAt.toLocaleString()}`, 'blue');

      // 비밀번호 해시 정보
      log(`      해시: ${user.password.substring(0, 20)}...`, 'magenta');
      const hashInfo = user.password.match(/^\$2[aby]\$(\d+)\$/);
      if (hashInfo) {
        log(`      해시 타입: bcrypt, rounds: ${hashInfo[1]}`, 'magenta');
      }

      // 비밀번호 검증
      const isValid = await bcrypt.compare(account.password, user.password);
      log(`      비밀번호 검증: ${isValid ? '✅ 성공' : '❌ 실패'}`, isValid ? 'green' : 'red');

      if (!isValid) {
        // 새로운 해시 생성
        const newHash = await bcrypt.hash(account.password, 10);
        log(`      🔄 새 해시 필요: ${newHash.substring(0, 20)}...`, 'yellow');
      }
    } catch (error: any) {
      log(`      ❌ 오류: ${error.message}`, 'red');
    }
  }

  // 5. API 엔드포인트 테스트
  log('\n📍 5. API 엔드포인트 직접 테스트', 'yellow');
  log('   다음 curl 명령어로 테스트:', 'blue');

  for (const account of testAccounts) {
    console.log(`
   # ${account.email} 테스트
   curl -X POST https://marketingplat.shop/api/auth/login \\
     -H "Content-Type: application/json" \\
     -d '{"email":"${account.email}","password":"${account.password}"}' \\
     -c cookies.txt -v
   `);
  }

  // 6. 로그 파일 위치
  log('\n📍 6. 로그 확인 방법', 'yellow');
  log('   EC2에서 실행:', 'blue');
  log('     pm2 logs marketingplat --lines 100', 'cyan');
  log('     pm2 monit', 'cyan');
  log('     tail -f ~/.pm2/logs/marketingplat-error.log', 'cyan');
  log('     tail -f ~/.pm2/logs/marketingplat-out.log', 'cyan');

  // 7. 비밀번호 강제 리셋 옵션
  log('\n📍 7. 비밀번호 강제 리셋', 'yellow');
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>(resolve => {
    readline.question('   모든 테스트 계정의 비밀번호를 리셋하시겠습니까? (y/n): ', resolve);
  });

  if (answer.toLowerCase() === 'y') {
    log('\n   🔄 비밀번호 리셋 중...', 'yellow');

    for (const account of testAccounts) {
      try {
        const hashedPassword = await bcrypt.hash(account.password, 10);
        await prisma.user.update({
          where: { email: account.email },
          data: {
            password: hashedPassword,
            updatedAt: new Date()
          }
        });
        log(`   ✅ ${account.email} 리셋 완료`, 'green');
      } catch (error: any) {
        log(`   ❌ ${account.email} 리셋 실패: ${error.message}`, 'red');
      }
    }

    log('\n   ✨ 비밀번호 리셋 완료!', 'green');
  }

  readline.close();

  // 8. 최종 요약
  log('\n📍 8. 디버깅 요약', 'yellow');
  log('=' .repeat(80), 'cyan');

  const issues: string[] = [];

  if (isLocalhost) {
    issues.push('DATABASE_URL이 localhost를 가리킴 (AWS RDS로 변경 필요)');
  }

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    issues.push('사용자가 없음 (초기 계정 생성 필요)');
  }

  if (issues.length > 0) {
    log('\n   발견된 문제:', 'red');
    issues.forEach(issue => {
      log(`   - ${issue}`, 'red');
    });

    log('\n   해결 방법:', 'yellow');
    if (isLocalhost) {
      log('   1. .env 파일에서 DATABASE_URL을 AWS RDS로 변경', 'cyan');
    }
    if (userCount === 0) {
      log('   2. npx tsx scripts/init-aws-accounts.ts 실행', 'cyan');
    }
    log('   3. pm2 restart marketingplat', 'cyan');
  } else {
    log('\n   ✅ 시스템 정상', 'green');
    log('   브라우저에서 로그인 테스트를 진행하세요.', 'blue');
  }

  await prisma.$disconnect();
}

// 실행
debugLogin().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});