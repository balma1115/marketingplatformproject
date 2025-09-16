import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkFinalData() {
  try {
    console.log('=== PostgreSQL 최종 데이터 확인 ===\n')

    // 블로그 데이터
    const blogProjects = await prisma.blogTrackingProject.count()
    const blogKeywords = await prisma.blogTrackingKeyword.count()
    const blogResults = await prisma.blogTrackingResult.count()

    console.log('블로그 데이터:')
    console.log(`  - 프로젝트: ${blogProjects}개`)
    console.log(`  - 키워드: ${blogKeywords}개`)
    console.log(`  - 결과: ${blogResults}개`)

    // 블로그 프로젝트 상세
    const blogProjectList = await prisma.blogTrackingProject.findMany({
      include: {
        user: {
          select: { email: true }
        },
        keywords: {
          select: { keyword: true }
        }
      }
    })

    console.log('\n블로그 프로젝트 상세:')
    blogProjectList.forEach(p => {
      console.log(`  - ${p.blogUrl} (${p.user.email}) - 키워드: ${p.keywords.length}개`)
    })

    // 스마트플레이스 데이터
    const smartPlaces = await prisma.smartPlace.count()
    const smartKeywords = await prisma.smartPlaceKeyword.count()
    const smartRankings = await prisma.smartPlaceRanking.count()

    console.log('\n스마트플레이스 데이터:')
    console.log(`  - 업체: ${smartPlaces}개`)
    console.log(`  - 키워드: ${smartKeywords}개`)
    console.log(`  - 순위: ${smartRankings}개`)

    // 스마트플레이스 상세
    const smartPlaceList = await prisma.smartPlace.findMany({
      include: {
        user: {
          select: { email: true }
        },
        keywords: {
          select: { keyword: true }
        }
      }
    })

    console.log('\n스마트플레이스 상세:')
    smartPlaceList.forEach(s => {
      console.log(`  - ${s.placeName} (${s.user.email}) - 키워드: ${s.keywords.length}개`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkFinalData()