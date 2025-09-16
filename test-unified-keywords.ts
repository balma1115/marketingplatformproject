import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testUnifiedKeywords() {
  try {
    console.log('=== 중점 키워드 통합 테스트 ===\n')

    // nokyang 사용자 확인
    const nokyang = await prisma.user.findUnique({
      where: { email: 'nokyang@marketingplat.com' },
      select: { id: true, email: true, name: true }
    })

    if (!nokyang) {
      console.log('nokyang 사용자를 찾을 수 없습니다.')
      return
    }

    console.log(`테스트 사용자: ${nokyang.email} (ID: ${nokyang.id})\n`)

    // 1. 블로그 프로젝트와 키워드 확인
    console.log('=== 블로그 키워드 ===')
    const blogProjects = await prisma.blogTrackingProject.findMany({
      where: { userId: nokyang.id },
      include: {
        keywords: {
          where: { isActive: true },
          include: {
            results: {
              orderBy: { trackingDate: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    console.log(`블로그 프로젝트 수: ${blogProjects.length}개`)

    let totalBlogKeywords = 0
    blogProjects.forEach(project => {
      if (project.keywords.length > 0) {
        console.log(`\n프로젝트: ${project.blogUrl}`)
        console.log(`  블로그명: ${project.blogName}`)
        console.log(`  활성 키워드 ${project.keywords.length}개:`)
        project.keywords.forEach(kw => {
          const lastResult = kw.results[0]
          console.log(`    - ${kw.keyword}`)
          if (lastResult) {
            console.log(`      메인탭: ${lastResult.mainTabExposed ? `${lastResult.mainTabRank}위` : '노출안됨'}`)
            console.log(`      블로그탭: ${lastResult.blogTabRank || '-'}위`)
          }
        })
        totalBlogKeywords += project.keywords.length
      }
    })

    // 2. 스마트플레이스와 키워드 확인
    console.log('\n=== 스마트플레이스 키워드 ===')
    const smartPlace = await prisma.smartPlace.findUnique({
      where: { userId: nokyang.id },
      include: {
        keywords: {
          where: { isActive: true },
          include: {
            rankings: {
              orderBy: { checkDate: 'desc' },
              take: 1
            }
          }
        }
      }
    })

    let totalSmartKeywords = 0
    if (smartPlace) {
      console.log(`스마트플레이스: ${smartPlace.placeName}`)
      console.log(`  활성 키워드 ${smartPlace.keywords.length}개:`)
      smartPlace.keywords.forEach(kw => {
        const lastRanking = kw.rankings[0]
        console.log(`    - ${kw.keyword}`)
        if (lastRanking) {
          console.log(`      오가닉: ${lastRanking.organicRank || '-'}위`)
          console.log(`      광고: ${lastRanking.adRank || '-'}위`)
        }
      })
      totalSmartKeywords = smartPlace.keywords.length
    } else {
      console.log('스마트플레이스 없음')
    }

    // 3. 중복 키워드 확인
    console.log('\n=== 중복 키워드 분석 ===')
    const allBlogKeywords = blogProjects.flatMap(p => p.keywords.map(k => k.keyword))
    const allSmartKeywords = smartPlace?.keywords.map(k => k.keyword) || []

    const duplicates = allBlogKeywords.filter(k => allSmartKeywords.includes(k))

    console.log(`\n총 블로그 키워드: ${totalBlogKeywords}개`)
    console.log(`총 스마트플레이스 키워드: ${totalSmartKeywords}개`)
    console.log(`중복 키워드: ${duplicates.length}개`)
    if (duplicates.length > 0) {
      console.log(`중복 키워드 목록: ${duplicates.join(', ')}`)
    }
    console.log(`고유 키워드 총계: ${totalBlogKeywords + totalSmartKeywords - duplicates.length}개`)

    // 4. 예상 중점 키워드 관리 표시
    console.log('\n=== 예상 중점 키워드 관리 표시 ===')
    console.log(`- 블로그만: ${totalBlogKeywords - duplicates.length}개`)
    console.log(`- 스마트플레이스만: ${totalSmartKeywords - duplicates.length}개`)
    console.log(`- 둘 다: ${duplicates.length}개`)
    console.log(`- 전체: ${totalBlogKeywords + totalSmartKeywords - duplicates.length}개`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testUnifiedKeywords()