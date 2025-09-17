import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 테스트 계정 생성 시작...');

  // 공통 비밀번호
  const password = 'test1234';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 테스트 계정 데이터
  const testAccounts = [
    {
      email: 'admin@test.aws.com',
      password: hashedPassword,
      name: '테스트 관리자',
      phone: '010-1111-1111',
      role: 'admin',
      plan: 'enterprise',
      academyName: 'MarketingPlat 관리',
      coin: 10000.00,
      isApproved: true,
      ktPassVerified: true,
    },
    {
      email: 'agency@test.aws.com',
      password: hashedPassword,
      name: '테스트 대행사',
      phone: '010-2222-2222',
      role: 'agency',
      plan: 'enterprise',
      academyName: '마케팅프로 대행사',
      coin: 5000.00,
      isApproved: true,
      ktPassVerified: true,
    },
    {
      email: 'branch@test.aws.com',
      password: hashedPassword,
      name: '테스트 지사',
      phone: '010-3333-3333',
      role: 'branch',
      plan: 'professional',
      academyName: '서울 강남지사',
      coin: 3000.00,
      isApproved: true,
      ktPassVerified: true,
    },
    {
      email: 'academy@test.aws.com',
      password: hashedPassword,
      name: '테스트 학원장',
      phone: '010-4444-4444',
      role: 'academy',
      plan: 'professional',
      academyName: '테스트 영어학원',
      academyAddress: '서울시 강남구 테헤란로 123',
      coin: 1000.00,
      isApproved: true,
      ktPassVerified: false,
    },
    {
      email: 'user@test.aws.com',
      password: hashedPassword,
      name: '테스트 사용자',
      phone: '010-5555-5555',
      role: 'user',
      plan: 'basic',
      academyName: null,
      academyAddress: null,
      coin: 100.00,
      isApproved: false,
      ktPassVerified: false,
    },
  ];

  // 각 계정 생성 또는 업데이트
  for (const account of testAccounts) {
    try {
      const user = await prisma.user.upsert({
        where: { email: account.email },
        update: {
          password: account.password,
          name: account.name,
          phone: account.phone,
          role: account.role,
          plan: account.plan,
          academyName: account.academyName,
          academyAddress: account.academyAddress,
          coin: account.coin,
          isApproved: account.isApproved,
          ktPassVerified: account.ktPassVerified,
        },
        create: account,
      });

      console.log(`✅ ${account.role} 계정 생성/업데이트: ${user.email}`);
    } catch (error) {
      console.error(`❌ ${account.email} 생성 실패:`, error);
    }
  }

  // 생성된 계정 확인
  console.log('\n📋 생성된 테스트 계정 목록:');
  const testUsers = await prisma.user.findMany({
    where: {
      email: {
        endsWith: '@test.aws.com',
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      coin: true,
      isApproved: true,
      ktPassVerified: true,
    },
  });

  console.table(testUsers);
}

main()
  .catch((e) => {
    console.error('❌ 에러 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// 실행 방법:
// npx tsx scripts/seed-test-accounts.ts