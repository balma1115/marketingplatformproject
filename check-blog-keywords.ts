import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBlogKeywords() {
  try {
    console.log('=== 블로그 키워드 상세 확인 ===\n')

    // 1. 모든 블로그 프로젝트와 키워드 확인
    const projects = await prisma.blogTrackingProject.findMany({
      include: {
        user: {
          select: { email: true, name: true }
        },
        keywords: {
          include: {
            results: {
              take: 1,
              orderBy: { trackingDate: 'desc' }
            }
          }
        }
      }
    })

    console.log(`총 ${projects.length}개 블로그 프로젝트\n`)

    projects.forEach((project, idx) => {
      console.log(`${idx + 1}. ${project.blogUrl}`)
      console.log(`   사용자: ${project.user.email} (${project.user.name})`)
      console.log(`   프로젝트 ID: ${project.id}`)
      console.log(`   블로그 이름: ${project.blogName}`)
      console.log(`   키워드 수: ${project.keywords.length}개`)

      if (project.keywords.length > 0) {
        console.log(`   키워드 목록:`)
        project.keywords.forEach(kw => {
          console.log(`     - ${kw.keyword} (활성: ${kw.isActive}, 결과: ${kw.results.length}개)`)
        })
      }
      console.log('-'.repeat(60))
    })

    // 2. 직접 키워드 테이블 확인
    console.log('\n=== BlogTrackingKeyword 테이블 직접 확인 ===')
    const allKeywords = await prisma.blogTrackingKeyword.findMany({
      include: {
        project: {
          select: {
            blogUrl: true,
            user: { select: { email: true } }
          }
        }
      }
    })

    console.log(`총 키워드 수: ${allKeywords.length}개\n`)

    // 프로젝트별로 그룹화
    const keywordsByProject = new Map<number, any[]>()
    allKeywords.forEach(kw => {
      if (!keywordsByProject.has(kw.projectId)) {
        keywordsByProject.set(kw.projectId, [])
      }
      keywordsByProject.get(kw.projectId)!.push(kw)
    })

    console.log('프로젝트별 키워드 분포:')
    for (const [projectId, keywords] of keywordsByProject) {
      const firstKw = keywords[0]
      console.log(`\nProject ID ${projectId} (${firstKw.project.blogUrl}):`)
      console.log(`  사용자: ${firstKw.project.user.email}`)
      console.log(`  키워드 ${keywords.length}개:`)
      keywords.slice(0, 5).forEach(kw => {
        console.log(`    - ${kw.keyword}`)
      })
      if (keywords.length > 5) {
        console.log(`    ... 외 ${keywords.length - 5}개`)
      }
    }

    // 3. 사용자별 확인
    console.log('\n=== 사용자별 블로그 키워드 현황 ===')
    const userStats = await prisma.user.findMany({
      where: {
        blogTrackingProjects: {
          some: {}
        }
      },
      select: {
        email: true,
        name: true,
        blogTrackingProjects: {
          select: {
            id: true,
            blogUrl: true,
            _count: {
              select: { keywords: true }
            }
          }
        }
      }
    })

    userStats.forEach(user => {
      console.log(`\n${user.email} (${user.name}):`)
      user.blogTrackingProjects.forEach(project => {
        console.log(`  - ${project.blogUrl}: ${project._count.keywords}개 키워드`)
      })
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBlogKeywords()