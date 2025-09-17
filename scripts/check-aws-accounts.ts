import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 AWS RDS 데이터베이스 계정 조회');
  console.log('================================\n');

  try {
    // 1. 전체 계정 수 확인
    const totalUsers = await prisma.user.count();
    console.log(`📊 총 계정 수: ${totalUsers}개\n`);

    // 2. 역할별 계정 수
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    console.log('👥 역할별 계정 분포:');
    console.log('------------------------');
    roleStats.forEach(stat => {
      console.log(`${stat.role}: ${stat._count}개`);
    });
    console.log('');

    // 3. 플랜별 계정 수
    const planStats = await prisma.user.groupBy({
      by: ['plan'],
      _count: true,
    });

    console.log('💳 플랜별 계정 분포:');
    console.log('------------------------');
    planStats.forEach(stat => {
      console.log(`${stat.plan}: ${stat._count}개`);
    });
    console.log('');

    // 4. 모든 계정 목록 (민감정보 제외)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        academyName: true,
        coin: true,
        isActive: true,
        isApproved: true,
        ktPassVerified: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' }
      ],
    });

    console.log('📋 전체 계정 목록:');
    console.log('================================');

    // 역할별로 그룹화하여 표시
    const groupedUsers: { [key: string]: typeof users } = {};

    users.forEach(user => {
      if (!groupedUsers[user.role]) {
        groupedUsers[user.role] = [];
      }
      groupedUsers[user.role].push(user);
    });

    // 각 역할별로 출력
    for (const [role, userList] of Object.entries(groupedUsers)) {
      console.log(`\n🔹 ${role.toUpperCase()} 계정 (${userList.length}개)`);
      console.log('----------------------------------------');

      userList.forEach(user => {
        console.log(`ID: ${user.id} | Email: ${user.email}`);
        console.log(`  이름: ${user.name}`);
        console.log(`  학원: ${user.academyName || 'N/A'}`);
        console.log(`  플랜: ${user.plan} | 코인: ${user.coin}`);
        console.log(`  상태: ${user.isActive ? '✅ 활성' : '❌ 비활성'} | 승인: ${user.isApproved ? '✅' : '❌'} | KT인증: ${user.ktPassVerified ? '✅' : '❌'}`);
        console.log(`  가입일: ${user.createdAt.toLocaleDateString('ko-KR')}`);
        console.log('');
      });
    }

    // 5. 테스트 계정 확인
    const testAccounts = await prisma.user.findMany({
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
      },
    });

    if (testAccounts.length > 0) {
      console.log('\n🧪 테스트 계정 목록:');
      console.log('------------------------');
      console.table(testAccounts);
    }

    // 6. 최근 가입 계정 (최근 7일)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentUsers.length > 0) {
      console.log('\n📅 최근 7일 내 가입 계정:');
      console.log('------------------------');
      recentUsers.forEach(user => {
        console.log(`${user.createdAt.toLocaleDateString('ko-KR')} - ${user.email} (${user.name}) [${user.role}]`);
      });
    }

    // 7. 관리자 계정 목록
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'admin',
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    console.log('\n⚡ 관리자 계정 목록:');
    console.log('------------------------');
    adminUsers.forEach(admin => {
      console.log(`${admin.id}. ${admin.email} (${admin.name})`);
    });

  } catch (error) {
    console.error('❌ 조회 중 오류 발생:', error);
  }
}

main()
  .catch((e) => {
    console.error('❌ 실행 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// 실행: npx tsx scripts/check-aws-accounts.ts