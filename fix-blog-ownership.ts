import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixBlogOwnership() {
  try {
    console.log('=== 블로그 소유권 수정 ===\n')

    // 사용자 ID 확인
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['nokyang@marketingplat.com', 'user@test.com', 'academy@marketingplat.com']
        }
      },
      select: { id: true, email: true }
    })

    const userMap = new Map(users.map(u => [u.email, u.id]))

    console.log('사용자 ID 매핑:')
    users.forEach(u => console.log(`  ${u.email}: ${u.id}`))

    // 수정 대상 확인
    const wrongProject = await prisma.blogTrackingProject.findFirst({
      where: {
        id: 2,  // miraen_beolwon (27개 키워드 있는 것)
        blogUrl: 'https://blog.naver.com/miraen_beolwon'
      },
      include: {
        _count: {
          select: { keywords: true }
        }
      }
    })

    if (wrongProject) {
      console.log(`\n수정 대상 프로젝트:`)
      console.log(`  ID: ${wrongProject.id}`)
      console.log(`  URL: ${wrongProject.blogUrl}`)
      console.log(`  현재 userId: ${wrongProject.userId}`)
      console.log(`  키워드 수: ${wrongProject._count.keywords}개`)

      // user@test.com으로 소유권 변경
      const correctUserId = userMap.get('user@test.com')

      if (correctUserId) {
        const updated = await prisma.blogTrackingProject.update({
          where: { id: wrongProject.id },
          data: { userId: correctUserId }
        })

        console.log(`\n✅ 소유권 수정 완료:`)
        console.log(`  userId ${wrongProject.userId} → ${correctUserId}`)
        console.log(`  nokyang@marketingplat.com → user@test.com`)
      }
    }

    // 최종 확인
    console.log('\n=== 수정 후 블로그 프로젝트 상태 ===')

    const finalProjects = await prisma.blogTrackingProject.findMany({
      include: {
        user: {
          select: { email: true }
        },
        _count: {
          select: { keywords: true }
        }
      },
      orderBy: { id: 'asc' }
    })

    finalProjects.forEach(p => {
      console.log(`ID ${p.id}: ${p.blogUrl}`)
      console.log(`  소유자: ${p.user.email}`)
      console.log(`  키워드: ${p._count.keywords}개`)
      console.log('-'.repeat(40))
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixBlogOwnership()