/**
 * 블로그 추적 테스트 스크립트
 * 전체 순위 추적에서 블로그 추적이 제대로 작동하는지 확인
 */

import { prisma } from './lib/db';
import { trackBlogForUser, trackAllUsers } from './lib/services/simple-tracking-service';

async function main() {
  console.log('=== 블로그 추적 테스트 시작 ===\n');

  try {
    // 1. 블로그가 등록된 사용자 확인
    console.log('1. 블로그가 등록된 사용자 조회...');
    const usersWithBlog = await prisma.user.findMany({
      where: {
        role: { in: ['user', 'academy', 'branch'] },
        isActive: true,
        OR: [
          { blogTrackingProjects: { some: {} } },
          { blogProjects: { some: {} } }
        ]
      },
      include: {
        blogTrackingProjects: {
          include: {
            keywords: {
              where: { isActive: true },
              take: 5
            }
          }
        },
        blogProjects: {
          include: {
            keywords: {
              where: { isActive: true },
              take: 5
            }
          }
        }
      }
    });

    console.log(`\n블로그가 등록된 사용자 수: ${usersWithBlog.length}명`);

    for (const user of usersWithBlog) {
      const blogProject = user.blogTrackingProjects[0] || user.blogProjects[0];
      const projectType = user.blogTrackingProjects[0] ? 'BlogTrackingProject' : 'BlogProject';

      if (blogProject) {
        console.log(`\n사용자: ${user.name} (${user.email})`);
        console.log(`- 프로젝트 타입: ${projectType}`);
        console.log(`- 블로그 URL: ${blogProject.blogUrl}`);
        console.log(`- 활성 키워드 수: ${blogProject.keywords.length}개`);

        if (blogProject.keywords.length > 0) {
          console.log('- 키워드 예시:');
          blogProject.keywords.slice(0, 3).forEach(kw => {
            console.log(`  • ${kw.keyword}`);
          });
        }
      }
    }

    // 2. 단일 사용자 블로그 추적 테스트
    if (usersWithBlog.length > 0) {
      const testUser = usersWithBlog[0];
      console.log(`\n2. 단일 사용자 블로그 추적 테스트 (${testUser.name})...`);

      const result = await trackBlogForUser(testUser.id, testUser.name);
      console.log('추적 결과:', result);

      // 3. 최신 추적 결과 확인
      console.log('\n3. 최신 추적 결과 확인...');

      const blogProject = testUser.blogTrackingProjects[0] || testUser.blogProjects[0];
      if (blogProject) {
        const isTrackingProject = !!testUser.blogTrackingProjects[0];

        if (isTrackingProject) {
          // BlogTrackingProject의 경우
          const latestResults = await prisma.blogTrackingResult.findMany({
            where: {
              keyword: {
                projectId: blogProject.id
              }
            },
            orderBy: { trackingDate: 'desc' },
            take: 5,
            include: {
              keyword: true
            }
          });

          console.log(`\nBlogTrackingResult 테이블의 최신 결과 (${latestResults.length}개):`);
          latestResults.forEach(result => {
            console.log(`- ${result.keyword.keyword}:`);
            console.log(`  메인탭: ${result.mainTabRank || '-'}, 블로그탭: ${result.blogTabRank || '-'}, View탭: ${result.viewTabRank || '-'}`);
            console.log(`  추적 시간: ${result.trackingDate.toLocaleString('ko-KR')}`);
          });
        } else {
          // BlogProject의 경우
          const latestResults = await prisma.blogRanking.findMany({
            where: {
              keyword: {
                projectId: blogProject.id
              }
            },
            orderBy: { trackingDate: 'desc' },
            take: 5,
            include: {
              keyword: true
            }
          });

          console.log(`\nBlogRanking 테이블의 최신 결과 (${latestResults.length}개):`);
          latestResults.forEach(result => {
            console.log(`- ${result.keyword.keyword}:`);
            console.log(`  메인탭: ${result.mainTabRank || '-'}, 블로그탭: ${result.blogTabRank || '-'}, View탭: ${result.viewTabRank || '-'}`);
            console.log(`  추적 시간: ${result.trackingDate.toLocaleString('ko-KR')}`);
          });
        }
      }
    }

    // 4. 전체 추적 테스트 (블로그만)
    console.log('\n4. 전체 블로그 추적 테스트...');
    const allResults = await trackAllUsers('blog');
    console.log(`\n전체 추적 결과:`);
    console.log(`- 성공: ${allResults.success}개`);
    console.log(`- 실패: ${allResults.failed}개`);
    console.log(`- 총 결과: ${allResults.results.length}개`);

    // 블로그 추적 결과만 필터링
    const blogResults = allResults.results.filter(r => r.type === 'blog');
    console.log(`\n블로그 추적 결과 상세:`);
    blogResults.forEach(result => {
      console.log(`- ${result.userName}: ${result.success ? '성공' : '실패'} (${result.resultsCount || 0}개 키워드)`);
      if (!result.success && result.error) {
        console.log(`  에러: ${result.error}`);
      }
    });

  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();