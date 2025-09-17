#!/usr/bin/env node
/**
 * AWS RDS 초기 계정 설정 스크립트
 *
 * 사용법:
 * - 로컬: npx tsx scripts/init-aws-accounts.ts
 * - EC2: cd ~/marketingplatformproject && npx tsx scripts/init-aws-accounts.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드 (로컬 및 EC2 환경 지원)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// Prisma 클라이언트 설정
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: ['error', 'warn']
});

// 계정 정보 타입
interface AccountInfo {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'academy' | 'user';  // 소문자로 통일 (DB 스키마와 일치)
  description: string;
}

// 초기 계정 목록
const accounts: AccountInfo[] = [
  {
    email: 'admin@marketingplat.com',
    password: 'admin123',
    name: '관리자',
    role: 'admin',
    description: '시스템 관리자 계정'
  },
  {
    email: 'academy@marketingplat.com',
    password: 'academy123',
    name: '테스트학원',
    role: 'academy',
    description: '학원 테스트 계정'
  },
  {
    email: 'nokyang@marketingplat.com',
    password: 'nokyang123',
    name: '녹양학원',
    role: 'academy',
    description: '녹양학원 전용 계정'
  },
  {
    email: 'user@test.com',
    password: 'test1234',
    name: '일반사용자',
    role: 'user',
    description: '일반 사용자 테스트 계정'
  }
];

async function initAccounts() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           AWS RDS 초기 계정 설정 시스템                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // 환경 정보 출력
  const dbUrl = process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'Not configured';
  const environment = process.env.NODE_ENV || 'development';

  console.log('📍 환경 정보:');
  console.log(`   - Environment: ${environment}`);
  console.log(`   - Database: ${dbUrl}`);
  console.log(`   - Timestamp: ${new Date().toISOString()}`);
  console.log();

  try {
    // 데이터베이스 연결 테스트
    console.log('🔌 데이터베이스 연결 중...');
    await prisma.$connect();
    console.log('✅ 데이터베이스 연결 성공!');
    console.log();

    // 계정 처리
    console.log('👤 계정 처리 시작:');
    console.log('─'.repeat(60));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const account of accounts) {
      try {
        // 기존 계정 확인
        const existingUser = await prisma.user.findUnique({
          where: { email: account.email }
        });

        if (existingUser) {
          // 비밀번호 확인 및 업데이트
          const hashedPassword = await bcrypt.hash(account.password, 10);
          const passwordMatch = await bcrypt.compare(account.password, existingUser.password);

          if (!passwordMatch) {
            await prisma.user.update({
              where: { email: account.email },
              data: {
                password: hashedPassword,
                name: account.name,
                role: account.role,
                updatedAt: new Date()
              }
            });
            console.log(`🔄 업데이트: ${account.email} (ID: ${existingUser.id})`);
            updated++;
          } else {
            console.log(`⏭️  건너뜀: ${account.email} (ID: ${existingUser.id}) - 이미 최신`);
            skipped++;
          }
        } else {
          // 새 계정 생성
          const hashedPassword = await bcrypt.hash(account.password, 10);
          const newUser = await prisma.user.create({
            data: {
              email: account.email,
              password: hashedPassword,
              name: account.name,
              role: account.role,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          console.log(`✅ 생성: ${account.email} (ID: ${newUser.id})`);
          created++;
        }
      } catch (error: any) {
        console.error(`❌ 오류 (${account.email}): ${error.message}`);
      }
    }

    console.log('─'.repeat(60));
    console.log(`📊 결과: 생성 ${created}개, 업데이트 ${updated}개, 건너뜀 ${skipped}개`);
    console.log();

    // 전체 사용자 목록 조회
    console.log('📋 전체 사용자 목록:');
    console.log('─'.repeat(80));
    console.log('ID │ 이메일                        │ 이름         │ 역할     │ 프로젝트');
    console.log('─'.repeat(80));

    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            smartplaceInfo: true,
            trackingProjects: true,
            blogTrackingProjects: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });

    for (const user of allUsers) {
      const id = user.id.toString().padStart(2);
      const email = user.email.padEnd(29);
      const name = (user.name || '-').padEnd(12);
      const role = user.role.padEnd(8);
      const sp = user._count.smartplaceInfo.toString().padStart(2);
      const tp = user._count.trackingProjects.toString().padStart(2);
      const bl = user._count.blogTrackingProjects.toString().padStart(2);

      console.log(`${id} │ ${email} │ ${name} │ ${role} │ SP:${sp} TP:${tp} BL:${bl}`);
    }

    console.log('─'.repeat(80));
    console.log(`📊 총 ${allUsers.length}개 계정`);
    console.log();

    // 로그인 정보 요약
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    🔐 테스트 로그인 정보                      ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    for (const account of accounts) {
      const roleStr = account.role.toUpperCase().padEnd(7);
      const emailStr = account.email.padEnd(27);
      console.log(`║ ${roleStr} │ ${emailStr} │ ${account.password.padEnd(10)} ║`);
    }

    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log();

    console.log('✨ 초기 계정 설정 완료!');
    console.log('🌐 웹사이트: https://marketingplat.shop');
    console.log('📧 관리자: admin@marketingplat.com / admin123');
    console.log();

  } catch (error: any) {
    console.error('❌ 초기화 실패:', error.message);
    console.error('상세 오류:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 메인 실행
initAccounts().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});