import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const results = await prisma.blogTrackingResult.findMany({
    where: {
      keyword: {
        project: {
          userId: 10
        }
      }
    },
    orderBy: { trackingDate: 'desc' },
    take: 10,
    include: {
      keyword: true
    }
  });

  console.log('Recent blog tracking results for user@test.com:', results.length);

  if (results.length > 0) {
    console.log('\nLatest tracking results:');
    results.forEach(r => {
      console.log(`- ${r.keyword.keyword}:`);
      console.log(`  Main Tab: ${r.mainTabExposed ? 'Yes' : 'No'} (Rank: ${r.mainTabRank || '-'})`);
      console.log(`  Blog Tab: ${r.blogTabRank || '-'}`);
      console.log(`  Time: ${r.trackingDate.toLocaleString('ko-KR')}`);
    });
  } else {
    console.log('No tracking results found');
  }
}

check().finally(() => prisma.$disconnect());