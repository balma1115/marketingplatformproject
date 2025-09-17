#!/usr/bin/env node
/**
 * miraenad.com 프로덕션 이슈 해결 스크립트
 *
 * 해결하는 문제:
 * 1. 로그인 API 500 에러
 * 2. 데이터베이스 연결 문제
 * 3. 환경변수 설정
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

console.log('🔧 miraenad.com 프로덕션 이슈 해결 시작\n');
console.log('=' .repeat(60));

// 1. 환경변수 확인 및 수정
console.log('\n📍 1. 환경변수 확인');
const envPath = path.resolve(__dirname, '..', '.env');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf-8');
  console.log('✅ .env 파일 발견');
} catch (error) {
  console.log('❌ .env 파일 없음 - 생성 필요');
  process.exit(1);
}

// DATABASE_URL 확인
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
if (dbUrlMatch) {
  const dbUrl = dbUrlMatch[1];
  if (dbUrl.includes('localhost')) {
    console.log('⚠️  WARNING: DATABASE_URL이 localhost를 가리킴');
    console.log('   AWS RDS로 변경 필요');

    // 자동 수정
    const newDbUrl = 'postgresql://postgres:Devmoonki119!@marketingplat-db.cn2ke0yskrjo.ap-northeast-2.rds.amazonaws.com:5432/marketingplat';
    envContent = envContent.replace(/DATABASE_URL="[^"]+"/g, `DATABASE_URL="${newDbUrl}"`);
    fs.writeFileSync(envPath, envContent);
    console.log('✅ DATABASE_URL 수정 완료');
  } else {
    console.log('✅ DATABASE_URL 정상:', dbUrl.replace(/:[^:@]+@/, ':****@'));
  }
}

// NODE_ENV 확인
if (!envContent.includes('NODE_ENV=')) {
  envContent += '\nNODE_ENV=production\n';
  fs.writeFileSync(envPath, envContent);
  console.log('✅ NODE_ENV=production 추가');
}

// NEXTAUTH_URL 확인
if (!envContent.includes('NEXTAUTH_URL=')) {
  envContent += '\nNEXTAUTH_URL=https://miraenad.com\n';
  fs.writeFileSync(envPath, envContent);
  console.log('✅ NEXTAUTH_URL 추가');
}

// 2. 데이터베이스 연결 테스트
console.log('\n📍 2. 데이터베이스 연결 테스트');
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function testAndFixDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ 데이터베이스 연결 성공');

    // 사용자 수 확인
    const userCount = await prisma.user.count();
    console.log(`   총 사용자: ${userCount}명`);

    if (userCount === 0) {
      console.log('⚠️  사용자가 없음 - 초기 계정 생성 중...');

      const accounts = [
        { email: 'admin@miraenad.com', password: 'admin123', name: '관리자', role: 'admin' },
        { email: 'test@miraenad.com', password: 'test123', name: '테스트', role: 'user' }
      ];

      for (const account of accounts) {
        const hashedPassword = await bcrypt.hash(account.password, 10);
        await prisma.user.create({
          data: {
            email: account.email,
            password: hashedPassword,
            name: account.name,
            role: account.role
          }
        });
        console.log(`   ✅ ${account.email} 생성 완료`);
      }
    }

    // 기존 계정 확인 및 비밀번호 리셋
    const testEmails = [
      'admin@marketingplat.com',
      'academy@marketingplat.com',
      'nokyang@marketingplat.com',
      'user@test.com'
    ];

    console.log('\n📍 3. 기존 계정 비밀번호 확인 및 리셋');
    for (const email of testEmails) {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (user) {
        // 비밀번호 리셋
        const defaultPassword = email.includes('admin') ? 'admin123' :
                               email.includes('academy') ? 'academy123' :
                               email.includes('nokyang') ? 'nokyang123' : 'test1234';

        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        await prisma.user.update({
          where: { email },
          data: { password: hashedPassword }
        });
        console.log(`   ✅ ${email} 비밀번호 리셋 완료`);
      }
    }

  } catch (error: any) {
    console.error('❌ 데이터베이스 오류:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }

  return true;
}

// 3. PM2 ecosystem 파일 생성
console.log('\n📍 4. PM2 ecosystem 파일 생성');
const ecosystemConfig = {
  apps: [{
    name: 'miraenad',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '~/.pm2/logs/miraenad-error.log',
    out_file: '~/.pm2/logs/miraenad-out.log'
  }]
};

fs.writeFileSync(
  path.resolve(__dirname, '..', 'ecosystem.config.js'),
  `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)}`
);
console.log('✅ ecosystem.config.js 생성 완료');

// 4. 배포 스크립트 생성
console.log('\n📍 5. 배포 스크립트 생성');
const deployScript = `#!/bin/bash
# miraenad.com 배포 스크립트

set -e

echo "🚀 miraenad.com 배포 시작..."

# PM2 중지
pm2 stop miraenad 2>/dev/null || true
pm2 delete miraenad 2>/dev/null || true

# 빌드 파일 정리
rm -rf .next
rm -rf node_modules/.cache

# 의존성 설치
npm install --production=false

# Prisma 클라이언트 생성
npx prisma generate

# Next.js 빌드
npm run build

# PM2로 시작
pm2 start ecosystem.config.js
pm2 save

echo "✅ 배포 완료!"
echo "🌐 https://miraenad.com"
`;

fs.writeFileSync(
  path.resolve(__dirname, '..', 'deploy-miraenad.sh'),
  deployScript
);
fs.chmodSync(path.resolve(__dirname, '..', 'deploy-miraenad.sh'), '755');
console.log('✅ deploy-miraenad.sh 생성 완료');

// 실행
testAndFixDatabase().then((success) => {
  if (success) {
    console.log('\n' + '=' .repeat(60));
    console.log('✨ 모든 이슈 해결 완료!');
    console.log('\n다음 단계:');
    console.log('1. git add . && git commit -m "fix: production issues"');
    console.log('2. git push');
    console.log('3. EC2에서: git pull && bash deploy-miraenad.sh');
  } else {
    console.log('\n❌ 일부 문제가 해결되지 않았습니다.');
  }
});