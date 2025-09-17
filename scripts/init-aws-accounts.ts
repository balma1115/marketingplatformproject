import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 색상 코드 정의
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

async function main() {
  console.log(`${colors.cyan}${colors.bright}=================================${colors.reset}`);
  console.log(`${colors.yellow}🚀 AWS RDS 초기 계정 설정 시작${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}=================================${colors.reset}\n`);

  // 초기 계정 데이터 정의
  const initialAccounts = [
    // 1. 관리자 계정
    {
      email: 'admin@marketingplat.com',
      password: 'admin123!@#',
      name: 'MarketingPlat 관리자',
      phone: '010-1000-0001',
      role: 'admin',
      plan: 'enterprise',
      academyName: 'MarketingPlat 본사',
      academyAddress: '서울시 강남구 테헤란로 123',
      coin: 999999.00,
      isActive: true,
      isApproved: true,
      ktPassVerified: true,
    },
    // 2. 대행사 계정
    {
      email: 'agency@marketingplat.com',
      password: 'agency123!@#',
      name: '서울마케팅 대행사',
      phone: '010-2000-0001',
      role: 'agency',
      plan: 'enterprise',
      academyName: '서울마케팅 대행사',
      academyAddress: '서울시 서초구 서초대로 456',
      coin: 50000.00,
      isActive: true,
      isApproved: true,
      ktPassVerified: true,
    },
    // 3. 지사 계정
    {
      email: 'branch@marketingplat.com',
      password: 'branch123!@#',
      name: '강남지사',
      phone: '010-3000-0001',
      role: 'branch',
      plan: 'professional',
      academyName: '강남지사',
      academyAddress: '서울시 강남구 강남대로 789',
      coin: 30000.00,
      isActive: true,
      isApproved: true,
      ktPassVerified: true,
    },
    // 4. 학원 계정
    {
      email: 'academy@marketingplat.com',
      password: 'academy123!@#',
      name: '샘플 영어학원',
      phone: '010-4000-0001',
      role: 'academy',
      plan: 'professional',
      academyName: '샘플 영어학원',
      academyAddress: '서울시 송파구 올림픽로 321',
      coin: 10000.00,
      isActive: true,
      isApproved: true,
      ktPassVerified: false,
    },
    // 5. 일반회원 계정
    {
      email: 'user@marketingplat.com',
      password: 'user123!@#',
      name: '홍길동',
      phone: '010-5000-0001',
      role: 'user',
      plan: 'basic',
      academyName: null,
      academyAddress: null,
      coin: 100.00,
      isActive: true,
      isApproved: false,
      ktPassVerified: false,
    },
    // 추가 테스트 계정들
    {
      email: 'test.admin@marketingplat.com',
      password: 'test1234',
      name: '테스트 관리자',
      phone: '010-1111-1111',
      role: 'admin',
      plan: 'enterprise',
      academyName: '테스트 관리',
      coin: 100000.00,
      isActive: true,
      isApproved: true,
      ktPassVerified: true,
    },
    {
      email: 'test.agency@marketingplat.com',
      password: 'test1234',
      name: '테스트 대행사',
      phone: '010-2222-2222',
      role: 'agency',
      plan: 'enterprise',
      academyName: '테스트 마케팅 대행사',
      coin: 5000.00,
      isActive: true,
      isApproved: true,
      ktPassVerified: true,
    },
    {
      email: 'test.branch@marketingplat.com',
      password: 'test1234',
      name: '테스트 지사',
      phone: '010-3333-3333',
      role: 'branch',
      plan: 'professional',
      academyName: '테스트 강북지사',
      coin: 3000.00,
      isActive: true,
      isApproved: true,
      ktPassVerified: true,
    },
    {
      email: 'test.academy@marketingplat.com',
      password: 'test1234',
      name: '테스트 학원장',
      phone: '010-4444-4444',
      role: 'academy',
      plan: 'professional',
      academyName: '테스트 수학학원',
      academyAddress: '서울시 노원구 동일로 111',
      coin: 1000.00,
      isActive: true,
      isApproved: true,
      ktPassVerified: false,
    },
    {
      email: 'test.user@marketingplat.com',
      password: 'test1234',
      name: '테스트 사용자',
      phone: '010-5555-5555',
      role: 'user',
      plan: 'basic',
      coin: 100.00,
      isActive: true,
      isApproved: false,
      ktPassVerified: false,
    },
  ];

  console.log(`${colors.blue}📋 생성할 계정 수: ${initialAccounts.length}개${colors.reset}\n`);

  // 계정 생성 진행
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const accountData of initialAccounts) {
    try {
      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(accountData.password, 10);

      // upsert로 중복 방지하며 계정 생성/업데이트
      const user = await prisma.user.upsert({
        where: { email: accountData.email },
        update: {
          name: accountData.name,
          phone: accountData.phone,
          role: accountData.role,
          plan: accountData.plan,
          academyName: accountData.academyName,
          academyAddress: accountData.academyAddress,
          coin: accountData.coin,
          isActive: accountData.isActive,
          isApproved: accountData.isApproved,
          ktPassVerified: accountData.ktPassVerified,
        },
        create: {
          ...accountData,
          password: hashedPassword,
        },
      });

      const roleEmoji = {
        admin: '👑',
        agency: '🏢',
        branch: '🏪',
        academy: '🏫',
        user: '👤',
      }[accountData.role] || '👤';

      console.log(`${colors.green}✅ ${roleEmoji} [${accountData.role.toUpperCase()}] ${accountData.email}${colors.reset}`);
      console.log(`   비밀번호: ${accountData.password}`);
      console.log(`   이름: ${accountData.name}`);
      console.log(`   플랜: ${accountData.plan} | 코인: ${accountData.coin.toLocaleString('ko-KR')}`);
      console.log('');

      successCount++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`${colors.yellow}⏭️  [SKIP] ${accountData.email} - 이미 존재하는 계정${colors.reset}\n`);
        skipCount++;
      } else {
        console.error(`${colors.red}❌ [ERROR] ${accountData.email} 생성 실패:${colors.reset}`, error.message, '\n');
        errorCount++;
      }
    }
  }

  console.log(`${colors.cyan}${colors.bright}=================================${colors.reset}`);
  console.log(`${colors.magenta}📊 실행 결과${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}=================================${colors.reset}`);
  console.log(`${colors.green}✅ 성공: ${successCount}개${colors.reset}`);
  console.log(`${colors.yellow}⏭️  건너뜀: ${skipCount}개${colors.reset}`);
  console.log(`${colors.red}❌ 실패: ${errorCount}개${colors.reset}\n`);

  // 생성된 계정 확인
  const totalUsers = await prisma.user.count();
  const roleStats = await prisma.user.groupBy({
    by: ['role'],
    _count: true,
  });

  console.log(`${colors.blue}📈 현재 데이터베이스 상태${colors.reset}`);
  console.log(`총 계정 수: ${totalUsers}개`);
  console.log('\n역할별 분포:');
  console.log('------------------------');
  roleStats.forEach(stat => {
    const emoji = {
      admin: '👑',
      agency: '🏢',
      branch: '🏪',
      academy: '🏫',
      user: '👤',
    }[stat.role] || '👤';
    console.log(`${emoji} ${stat.role}: ${stat._count}개`);
  });

  console.log('\n');
  console.log(`${colors.cyan}${colors.bright}=================================${colors.reset}`);
  console.log(`${colors.green}✅ 초기 계정 설정 완료!${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}=================================${colors.reset}\n`);

  // 로그인 정보 출력
  console.log(`${colors.yellow}🔑 로그인 정보:${colors.reset}`);
  console.log('----------------------------------------');
  console.log('메인 계정:');
  console.log('  👑 관리자: admin@marketingplat.com / admin123!@#');
  console.log('  🏢 대행사: agency@marketingplat.com / agency123!@#');
  console.log('  🏪 지사: branch@marketingplat.com / branch123!@#');
  console.log('  🏫 학원: academy@marketingplat.com / academy123!@#');
  console.log('  👤 일반: user@marketingplat.com / user123!@#');
  console.log('\n테스트 계정:');
  console.log('  모든 테스트 계정 비밀번호: test1234');
  console.log('----------------------------------------\n');
}

main()
  .catch((e) => {
    console.error(`${colors.red}❌ 치명적 오류:${colors.reset}`, e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// 실행 방법:
// npx tsx scripts/init-aws-accounts.ts