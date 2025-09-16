import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBlogOwnership() {
  try {
    console.log('=== 블로그 프로젝트 소유권 확인 ===\n')

    // nokyang 사용자 확인
    const nokyang = await prisma.user.findUnique({
      where: { email: 'nokyang@marketingplat.com' },
      select: { id: true, email: true }
    })

    console.log(`nokyang 사용자 ID: ${nokyang?.id}\n`)

    // 모든 블로그 프로젝트 확인
    const allProjects = await prisma.blogTrackingProject.findMany({
      include: {
        user: {
          select: { email: true, name: true }
        },
        _count: {
          select: { keywords: true }
        }
      }
    })

    console.log('모든 블로그 프로젝트:')
    allProjects.forEach(p => {
      console.log(`ID: ${p.id}, URL: ${p.blogUrl}`)
      console.log(`  소유자: ${p.user.email} (userId: ${p.userId})`)
      console.log(`  키워드 수: ${p._count.keywords}개`)
      console.log(`  nokyang 소유: ${p.userId === nokyang?.id ? '✅' : '❌'}`)
      console.log('-'.repeat(60))
    })

    // nokyang의 실제 블로그 프로젝트만 확인
    if (nokyang) {
      const nokyangProjects = await prisma.blogTrackingProject.findMany({
        where: { userId: nokyang.id },
        include: {
          keywords: {
            select: { keyword: true }
          }
        }
      })

      console.log(`\nnokyang@marketingplat.com의 실제 블로그 프로젝트:`)
      nokyangProjects.forEach(p => {
        console.log(`- ${p.blogUrl} (${p.keywords.length}개 키워드)`)
        if (p.keywords.length > 0) {
          console.log(`  키워드: ${p.keywords.map(k => k.keyword).join(', ')}`)
        }
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBlogOwnership()