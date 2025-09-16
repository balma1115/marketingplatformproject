import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkBlogData() {
  const user = await prisma.user.findUnique({
    where: { email: 'user@test.com' },
    include: {
      blogProjects: {
        include: {
          keywords: true
        }
      },
      blogTrackingProjects: {
        include: {
          keywords: true
        }
      }
    }
  });

  console.log('=== User Blog Data ===');
  console.log('User ID:', user?.id);
  console.log('User Name:', user?.name);
  console.log('\n=== BlogProjects (Old Table) ===');
  console.log('Count:', user?.blogProjects?.length || 0);
  user?.blogProjects?.forEach(p => {
    console.log('- Project:', p.blogName, '| URL:', p.blogUrl);
    console.log('  Keywords:', p.keywords.length);
    p.keywords.forEach(k => {
      console.log('    •', k.keyword);
    });
  });

  console.log('\n=== BlogTrackingProjects (New Table) ===');
  console.log('Count:', user?.blogTrackingProjects?.length || 0);
  user?.blogTrackingProjects?.forEach(p => {
    console.log('- Project:', p.blogName, '| URL:', p.blogUrl);
    console.log('  Keywords:', p.keywords.length);
    p.keywords.forEach(k => {
      console.log('    •', k.keyword, '| Active:', k.isActive);
    });
  });
}

checkBlogData().finally(() => prisma.$disconnect());