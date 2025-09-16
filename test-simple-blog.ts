import { trackBlogForUser } from './lib/services/simple-tracking-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findUnique({
    where: { email: 'user@test.com' }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('Testing blog tracking for:', user.name);
  const result = await trackBlogForUser(user.id, user.name!);

  console.log('\nResult:', result);
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());