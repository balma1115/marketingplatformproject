import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Delete all existing data
  await prisma.rankingResult.deleteMany()
  await prisma.keyword.deleteMany()
  await prisma.blogProject.deleteMany()
  await prisma.blogContent.deleteMany()
  await prisma.smartplaceInfo.deleteMany()
  await prisma.aIGenerationLog.deleteMany()
  await prisma.aPIUsageLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const users = [
    {
      email: 'admin@marketingplat.com',
      password: await bcrypt.hash('admin123', 10),
      name: '관리자',
      phone: '010-1111-1111',
      role: 'admin',
      plan: 'premium',
      academyName: 'MarketingPlat 본사',
      coin: 999999
    },
    {
      email: 'agency@marketingplat.com',
      password: await bcrypt.hash('agency123', 10),
      name: '김대행',
      phone: '010-2222-2222',
      role: 'agency',
      plan: 'premium',
      academyName: '스마트 마케팅 에이전시',
      coin: 5000
    },
    {
      email: 'branch@marketingplat.com',
      password: await bcrypt.hash('branch123', 10),
      name: '이지사',
      phone: '010-3333-3333',
      role: 'branch',
      plan: 'platinum',
      academyName: '강남교육지사',
      coin: 2000
    },
    {
      email: 'academy@marketingplat.com',
      password: await bcrypt.hash('academy123', 10),
      name: '박원장',
      phone: '010-4444-4444',
      role: 'academy',
      plan: 'platinum',
      academyName: 'ABC영어학원',
      academyAddress: '서울시 송파구 잠실동',
      coin: 500
    },
    {
      email: 'user@marketingplat.com',
      password: await bcrypt.hash('user123', 10),
      name: '일반회원',
      phone: '010-5555-5555',
      role: 'user',
      plan: 'basic',
      coin: 100
    }
  ]

  for (const userData of users) {
    const user = await prisma.user.create({
      data: userData
    })
    console.log(`Created user: ${user.email}`)
  }

  // Create sample blog projects for academy user
  const academyUser = await prisma.user.findUnique({
    where: { email: 'academy@marketingplat.com' }
  })

  if (academyUser) {
    const blogProject = await prisma.blogProject.create({
      data: {
        userId: academyUser.id,
        name: 'ABC영어학원 블로그',
        targetBlogUrl: 'https://blog.naver.com/abc_english',
        description: '영어학원 블로그 프로젝트'
      }
    })

    // Create sample keywords
    await prisma.keyword.createMany({
      data: [
        {
          projectId: blogProject.id,
          userId: academyUser.id,
          keyword: '송파 영어학원',
          location: '서울시 송파구',
          type: 'blog',
          searchVolume: 1300,
          competition: 'medium',
          avgCpc: 2500
        },
        {
          projectId: blogProject.id,
          userId: academyUser.id,
          keyword: '잠실 영어학원',
          location: '서울시 송파구',
          type: 'blog',
          searchVolume: 2100,
          competition: 'high',
          avgCpc: 3200
        },
        {
          userId: academyUser.id,
          keyword: '초등영어',
          type: 'general',
          searchVolume: 5400,
          competition: 'high',
          avgCpc: 1800
        }
      ]
    })

    // Create sample blog content
    await prisma.blogContent.create({
      data: {
        userId: academyUser.id,
        title: '초등학생 영어 공부법: 재미있게 시작하는 영어 학습',
        content: '초등학생 영어 교육의 중요성과 효과적인 학습 방법에 대해 알아보겠습니다...',
        keywords: '초등영어, 영어공부법, 어린이영어',
        status: 'published',
        publishedAt: new Date()
      }
    })

    // Create sample smartplace info
    await prisma.smartplaceInfo.create({
      data: {
        userId: academyUser.id,
        placeId: 'naver_place_123456',
        name: 'ABC영어학원 송파점',
        address: '서울시 송파구 잠실동 123-45',
        phone: '02-1234-5678',
        rating: 4.8,
        reviewCount: 127,
        category: '어학원'
      }
    })
  }

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })