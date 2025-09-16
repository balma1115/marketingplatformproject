import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

const db = new Database('prisma/dev.db')
const prisma = new PrismaClient()

interface DataStats {
  users: number
  blogProjects: number
  blogKeywords: number
  blogResults: number
  smartPlaces: number
  smartPlaceKeywords: number
  smartPlaceRankings: number
  naverAdsCampaigns?: number
  naverAdsData?: number
  naverAdsAdGroups?: number
  naverAdsKeywords?: number
}

async function compareDatabases() {
  try {
    console.log('=== 데이터베이스 마이그레이션 완전성 검증 ===\n')
    console.log('비교 시작 시간:', new Date().toLocaleString('ko-KR'))
    console.log('='.repeat(60))

    // 1. SQLite 데이터 통계
    console.log('\n📊 SQLite 데이터베이스 통계:')
    console.log('-'.repeat(60))

    const sqliteStats: DataStats = {
      users: (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count,
      blogProjects: (db.prepare('SELECT COUNT(*) as count FROM blog_tracking_projects').get() as any).count,
      blogKeywords: (db.prepare('SELECT COUNT(*) as count FROM blog_tracking_keywords').get() as any).count,
      blogResults: (db.prepare('SELECT COUNT(*) as count FROM blog_tracking_results').get() as any).count,
      smartPlaces: (db.prepare('SELECT COUNT(*) as count FROM smartplaces').get() as any).count,
      smartPlaceKeywords: (db.prepare('SELECT COUNT(*) as count FROM smartplace_keywords').get() as any).count,
      smartPlaceRankings: (db.prepare('SELECT COUNT(*) as count FROM smartplace_rankings').get() as any).count,
    }

    // 네이버 광고 테이블 확인
    try {
      sqliteStats.naverAdsCampaigns = (db.prepare('SELECT COUNT(*) as count FROM naver_ads_campaigns').get() as any).count
      sqliteStats.naverAdsData = (db.prepare('SELECT COUNT(*) as count FROM naver_ads_data').get() as any).count
    } catch (e) {
      // 테이블이 없을 수 있음
    }

    console.log(`사용자: ${sqliteStats.users}명`)
    console.log(`블로그 프로젝트: ${sqliteStats.blogProjects}개`)
    console.log(`블로그 키워드: ${sqliteStats.blogKeywords}개`)
    console.log(`블로그 추적 결과: ${sqliteStats.blogResults}개`)
    console.log(`스마트플레이스: ${sqliteStats.smartPlaces}개`)
    console.log(`스마트플레이스 키워드: ${sqliteStats.smartPlaceKeywords}개`)
    console.log(`스마트플레이스 순위: ${sqliteStats.smartPlaceRankings}개`)
    if (sqliteStats.naverAdsCampaigns !== undefined) {
      console.log(`네이버 광고 캠페인: ${sqliteStats.naverAdsCampaigns}개`)
      console.log(`네이버 광고 통계 데이터: ${sqliteStats.naverAdsData}개`)
    }

    // 2. PostgreSQL 데이터 통계
    console.log('\n📊 PostgreSQL 데이터베이스 통계:')
    console.log('-'.repeat(60))

    const pgStats: DataStats = {
      users: await prisma.user.count(),
      blogProjects: await prisma.blogTrackingProject.count(),
      blogKeywords: await prisma.blogTrackingKeyword.count(),
      blogResults: await prisma.blogTrackingResult.count(),
      smartPlaces: await prisma.smartPlace.count(),
      smartPlaceKeywords: await prisma.smartPlaceKeyword.count(),
      smartPlaceRankings: await prisma.smartPlaceRanking.count(),
    }

    // 네이버 광고 테이블 확인
    try {
      pgStats.naverAdsCampaigns = await prisma.naverAdsCampaign.count()
      pgStats.naverAdsData = await prisma.naverAdsData.count()
      pgStats.naverAdsAdGroups = await prisma.naverAdsAdGroup.count()
      pgStats.naverAdsKeywords = await prisma.naverAdsKeyword.count()
    } catch (e) {
      // 테이블이 없을 수 있음
    }

    console.log(`사용자: ${pgStats.users}명`)
    console.log(`블로그 프로젝트: ${pgStats.blogProjects}개`)
    console.log(`블로그 키워드: ${pgStats.blogKeywords}개`)
    console.log(`블로그 추적 결과: ${pgStats.blogResults}개`)
    console.log(`스마트플레이스: ${pgStats.smartPlaces}개`)
    console.log(`스마트플레이스 키워드: ${pgStats.smartPlaceKeywords}개`)
    console.log(`스마트플레이스 순위: ${pgStats.smartPlaceRankings}개`)
    if (pgStats.naverAdsCampaigns !== undefined) {
      console.log(`네이버 광고 캠페인: ${pgStats.naverAdsCampaigns}개`)
      console.log(`네이버 광고 통계 데이터: ${pgStats.naverAdsData}개`)
      console.log(`네이버 광고그룹: ${pgStats.naverAdsAdGroups}개`)
      console.log(`네이버 광고 키워드: ${pgStats.naverAdsKeywords}개`)
    }

    // 3. 비교 분석
    console.log('\n📈 마이그레이션 분석:')
    console.log('='.repeat(60))

    const compareItem = (name: string, sqlite: number, pg: number) => {
      const diff = pg - sqlite
      const percentage = sqlite > 0 ? ((pg / sqlite) * 100).toFixed(1) : '100'
      const status = diff === 0 ? '✅' : diff > 0 ? '➕' : '⚠️'

      console.log(`${status} ${name}:`)
      console.log(`   SQLite: ${sqlite} → PostgreSQL: ${pg} (${diff >= 0 ? '+' : ''}${diff}, ${percentage}%)`)
    }

    compareItem('사용자', sqliteStats.users, pgStats.users)
    compareItem('블로그 프로젝트', sqliteStats.blogProjects, pgStats.blogProjects)
    compareItem('블로그 키워드', sqliteStats.blogKeywords, pgStats.blogKeywords)
    compareItem('블로그 추적 결과', sqliteStats.blogResults, pgStats.blogResults)
    compareItem('스마트플레이스', sqliteStats.smartPlaces, pgStats.smartPlaces)
    compareItem('스마트플레이스 키워드', sqliteStats.smartPlaceKeywords, pgStats.smartPlaceKeywords)
    compareItem('스마트플레이스 순위', sqliteStats.smartPlaceRankings, pgStats.smartPlaceRankings)

    if (sqliteStats.naverAdsCampaigns !== undefined && pgStats.naverAdsCampaigns !== undefined) {
      compareItem('네이버 광고 캠페인', sqliteStats.naverAdsCampaigns, pgStats.naverAdsCampaigns)
    }
    if (sqliteStats.naverAdsData !== undefined && pgStats.naverAdsData !== undefined) {
      compareItem('네이버 광고 통계 데이터', sqliteStats.naverAdsData, pgStats.naverAdsData)
    }

    // 4. 상세 사용자 비교
    console.log('\n👥 사용자별 데이터 비교:')
    console.log('='.repeat(60))

    const sqliteUsers = db.prepare('SELECT id, email FROM users ORDER BY id').all() as any[]
    const pgUsers = await prisma.user.findMany({
      select: { id: true, email: true },
      orderBy: { email: 'asc' }
    })

    for (const sqliteUser of sqliteUsers) {
      const pgUser = pgUsers.find(u => u.email === sqliteUser.email)
      if (!pgUser) {
        console.log(`❌ 누락된 사용자: ${sqliteUser.email}`)
        continue
      }

      // SQLite 데이터
      const sqliteBlogCount = (db.prepare('SELECT COUNT(*) as count FROM blog_tracking_projects WHERE user_id = ?').get(sqliteUser.id) as any).count
      const sqliteSmartCount = (db.prepare('SELECT COUNT(*) as count FROM smartplaces WHERE user_id = ?').get(sqliteUser.id) as any).count

      // PostgreSQL 데이터
      const pgBlogCount = await prisma.blogTrackingProject.count({ where: { userId: pgUser.id } })
      const pgSmartCount = await prisma.smartPlace.count({ where: { userId: pgUser.id } })

      if (sqliteBlogCount !== pgBlogCount || sqliteSmartCount !== pgSmartCount) {
        console.log(`\n${pgUser.email}:`)
        if (sqliteBlogCount !== pgBlogCount) {
          console.log(`  블로그: SQLite ${sqliteBlogCount} → PostgreSQL ${pgBlogCount}`)
        }
        if (sqliteSmartCount !== pgSmartCount) {
          console.log(`  스마트플레이스: SQLite ${sqliteSmartCount} → PostgreSQL ${pgSmartCount}`)
        }
      }
    }

    // 5. 키워드 상세 비교
    console.log('\n🔍 키워드 데이터 상세:')
    console.log('='.repeat(60))

    // 블로그 키워드 샘플
    const sampleBlogKeywords = db.prepare(`
      SELECT bk.keyword, COUNT(br.id) as result_count
      FROM blog_tracking_keywords bk
      LEFT JOIN blog_tracking_results br ON bk.id = br.keyword_id
      GROUP BY bk.keyword
      ORDER BY result_count DESC
      LIMIT 5
    `).all() as any[]

    console.log('\n블로그 키워드 TOP 5 (결과 수 기준):')
    for (const kw of sampleBlogKeywords) {
      console.log(`  - ${kw.keyword}: ${kw.result_count}개 결과`)
    }

    // 스마트플레이스 키워드 샘플
    const sampleSmartKeywords = db.prepare(`
      SELECT sk.keyword, COUNT(sr.id) as ranking_count
      FROM smartplace_keywords sk
      LEFT JOIN smartplace_rankings sr ON sk.id = sr.keyword_id
      GROUP BY sk.keyword
      ORDER BY ranking_count DESC
      LIMIT 5
    `).all() as any[]

    console.log('\n스마트플레이스 키워드 TOP 5 (순위 데이터 수 기준):')
    for (const kw of sampleSmartKeywords) {
      console.log(`  - ${kw.keyword}: ${kw.ranking_count}개 순위 데이터`)
    }

    // 6. 최종 평가
    console.log('\n✨ 최종 마이그레이션 평가:')
    console.log('='.repeat(60))

    const totalSqlite = sqliteStats.users + sqliteStats.blogProjects + sqliteStats.blogKeywords +
                       sqliteStats.blogResults + sqliteStats.smartPlaces + sqliteStats.smartPlaceKeywords +
                       sqliteStats.smartPlaceRankings

    const totalPg = pgStats.users + pgStats.blogProjects + pgStats.blogKeywords +
                   pgStats.blogResults + pgStats.smartPlaces + pgStats.smartPlaceKeywords +
                   pgStats.smartPlaceRankings

    const completeness = ((totalPg / totalSqlite) * 100).toFixed(2)

    console.log(`SQLite 총 레코드: ${totalSqlite.toLocaleString()}개`)
    console.log(`PostgreSQL 총 레코드: ${totalPg.toLocaleString()}개`)
    console.log(`마이그레이션 완성도: ${completeness}%`)

    if (parseFloat(completeness) >= 95) {
      console.log('\n🎉 마이그레이션 성공!')
    } else if (parseFloat(completeness) >= 80) {
      console.log('\n⚠️ 마이그레이션 부분 성공 - 일부 데이터 확인 필요')
    } else {
      console.log('\n❌ 마이그레이션 실패 - 데이터 재확인 필요')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
    await prisma.$disconnect()
  }
}

compareDatabases()