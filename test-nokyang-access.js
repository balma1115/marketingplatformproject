const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNokyangData() {
  console.log('Testing nokyang data access in PostgreSQL...\n');

  try {
    // Test nokyang user
    const user = await prisma.user.findUnique({
      where: { id: 16 },
      include: {
        blogTrackingProjects: {
          include: {
            keywords: true
          }
        },
        smartPlace: {
          include: {
            keywords: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ Nokyang user (ID: 16) not found in database');
      return;
    }

    console.log('✅ Nokyang user found!');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('\n📝 Blog Projects:', user.blogTrackingProjects.length);

    user.blogTrackingProjects.forEach(project => {
      console.log('  - Blog Name:', project.blogName);
      console.log('    Blog URL:', project.blogUrl);
      console.log('    Keywords:', project.keywords.length);
      project.keywords.forEach(kw => {
        console.log('      •', kw.keyword, '(Active:', kw.isActive, ')');
      });
    });

    console.log('\n🏪 SmartPlaces:', user.smartPlace ? 1 : 0);

    if (user.smartPlace) {
      const place = user.smartPlace;
      console.log('  - Place Name:', place.placeName);
      console.log('    Place ID:', place.placeId);
      console.log('    Keywords:', place.keywords.length);
      place.keywords.forEach(kw => {
        console.log('      •', kw.keyword, '(Active:', kw.isActive, ')');
      });
    }

  } catch (error) {
    console.error('❌ Error accessing database:', error.message);
    console.error('Make sure PostgreSQL is running and DATABASE_URL is correct');
  } finally {
    await prisma.$disconnect();
  }
}

testNokyangData();