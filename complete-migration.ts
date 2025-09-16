import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

const db = new Database('prisma/dev.db')
const prisma = new PrismaClient()

async function completeMigration() {
  try {
    console.log('=== 완전한 데이터 마이그레이션 시작 ===\n')

    // 1. 사용자 ID 매핑 생성
    const sqliteUsers = db.prepare('SELECT id, email FROM users').all() as any[]
    const pgUsers = await prisma.user.findMany({
      select: { id: true, email: true }
    })

    const userIdMap = new Map<number, number>()
    for (const sqliteUser of sqliteUsers) {
      const pgUser = pgUsers.find(u => u.email === sqliteUser.email)
      if (pgUser) {
        userIdMap.set(sqliteUser.id, pgUser.id)
      }
    }

    // 2. 기존 데이터 삭제 (깨끗한 마이그레이션을 위해)
    console.log('기존 데이터 정리...')
    await prisma.blogTrackingResult.deleteMany()
    await prisma.blogTrackingKeyword.deleteMany()
    await prisma.smartPlaceRanking.deleteMany()
    await prisma.smartPlaceKeyword.deleteMany()
    await prisma.smartPlace.deleteMany()

    // 3. 블로그 프로젝트 마이그레이션
    console.log('\n블로그 프로젝트 마이그레이션...')
    const blogProjects = db.prepare('SELECT * FROM blog_tracking_projects').all() as any[]
    const projectIdMap = new Map<number, number>()

    for (const project of blogProjects) {
      const pgUserId = userIdMap.get(project.user_id)
      if (!pgUserId) continue

      const created = await prisma.blogTrackingProject.upsert({
        where: {
          id: project.id
        },
        update: {
          blogUrl: project.blog_url,
          blogName: project.blog_name || '블로그',
          blogId: project.blog_id || project.blog_url.split('/').pop() || 'unknown'
        },
        create: {
          userId: pgUserId,
          blogUrl: project.blog_url,
          blogName: project.blog_name || '블로그',
          blogId: project.blog_id || project.blog_url.split('/').pop() || 'unknown',
          createdAt: project.created_at ? new Date(project.created_at) : new Date(),
          lastTrackedAt: project.last_tracked_at ? new Date(project.last_tracked_at) : null
        }
      })

      projectIdMap.set(project.id, created.id)
      console.log(`  ✅ 블로그: ${project.blog_url}`)
    }

    // 4. 블로그 키워드 마이그레이션
    console.log('\n블로그 키워드 마이그레이션...')
    const blogKeywords = db.prepare('SELECT * FROM blog_tracking_keywords').all() as any[]
    const keywordIdMap = new Map<number, number>()

    for (const keyword of blogKeywords) {
      const pgProjectId = projectIdMap.get(keyword.project_id)
      if (!pgProjectId) continue

      try {
        const created = await prisma.blogTrackingKeyword.create({
          data: {
            projectId: pgProjectId,
            keyword: keyword.keyword,
            isActive: keyword.is_active === 1,
            addedDate: keyword.added_date ? new Date(keyword.added_date) : new Date(),
            createdAt: keyword.created_at ? new Date(keyword.created_at) : new Date()
          }
        })

        keywordIdMap.set(keyword.id, created.id)
        console.log(`  ✅ 키워드: ${keyword.keyword}`)
      } catch (error) {
        console.log(`  ⚠️ 키워드 스킵 (중복): ${keyword.keyword}`)
      }
    }

    // 5. 블로그 결과 마이그레이션 (최근 30개씩만)
    console.log('\n블로그 결과 마이그레이션...')
    let resultCount = 0

    for (const [oldId, newId] of keywordIdMap) {
      const results = db.prepare(
        'SELECT * FROM blog_tracking_results WHERE keyword_id = ? ORDER BY tracking_date DESC LIMIT 30'
      ).all(oldId) as any[]

      for (const result of results) {
        await prisma.blogTrackingResult.create({
          data: {
            keywordId: newId,
            trackingDate: new Date(result.tracking_date),
            mainTabExposed: result.main_tab_exposed === 1,
            mainTabRank: result.main_tab_rank,
            blogTabRank: result.blog_tab_rank,
            viewTabRank: result.view_tab_rank,
            adRank: result.ad_rank,
            rankingType: 'organic',
            createdAt: result.created_at ? new Date(result.created_at) : new Date()
          }
        })
        resultCount++
      }
    }
    console.log(`  ✅ 총 ${resultCount}개 결과 마이그레이션`)

    // 6. 스마트플레이스 마이그레이션
    console.log('\n스마트플레이스 마이그레이션...')
    const smartplaces = db.prepare('SELECT * FROM smartplaces').all() as any[]
    const smartplaceIdMap = new Map<number, string>()

    for (const sp of smartplaces) {
      const pgUserId = userIdMap.get(sp.user_id)
      if (!pgUserId) continue

      // SmartPlace는 userId가 unique이므로 처리 필요
      const existing = await prisma.smartPlace.findUnique({
        where: { userId: pgUserId }
      })

      if (!existing) {
        const created = await prisma.smartPlace.create({
          data: {
            userId: pgUserId,
            placeId: sp.place_id,
            placeName: sp.place_name,
            address: sp.address || '',
            phone: sp.phone || '',
            rating: sp.rating ? parseFloat(sp.rating) : null,
            reviewCount: sp.review_count || 0,
            category: sp.category || '',
            lastUpdated: sp.updated_at ? new Date(sp.updated_at) : null,
            createdAt: sp.created_at ? new Date(sp.created_at) : new Date()
          }
        })

        smartplaceIdMap.set(sp.id, created.id)
        console.log(`  ✅ 스마트플레이스: ${sp.place_name}`)
      } else {
        smartplaceIdMap.set(sp.id, existing.id)
        console.log(`  ⏩ 이미 존재: ${sp.place_name}`)
      }
    }

    // 7. 스마트플레이스 키워드 마이그레이션
    console.log('\n스마트플레이스 키워드 마이그레이션...')
    const spKeywords = db.prepare('SELECT * FROM smartplace_keywords').all() as any[]
    const spKeywordIdMap = new Map<number, string>()

    for (const keyword of spKeywords) {
      const pgSmartPlaceId = smartplaceIdMap.get(keyword.smartplace_id)
      if (!pgSmartPlaceId) continue

      // userId 찾기
      const smartplace = await prisma.smartPlace.findUnique({
        where: { id: pgSmartPlaceId },
        select: { userId: true }
      })

      if (!smartplace) continue

      const created = await prisma.smartPlaceKeyword.create({
        data: {
          userId: smartplace.userId,
          smartPlaceId: pgSmartPlaceId,
          keyword: keyword.keyword,
          isActive: keyword.is_active === 1,
          lastChecked: keyword.last_checked ? new Date(keyword.last_checked) : null,
          createdAt: keyword.created_at ? new Date(keyword.created_at) : new Date()
        }
      })

      spKeywordIdMap.set(keyword.id, created.id)
      console.log(`  ✅ 키워드: ${keyword.keyword}`)
    }

    // 8. 스마트플레이스 순위 마이그레이션 (최근 30개씩만)
    console.log('\n스마트플레이스 순위 마이그레이션...')
    let rankingCount = 0

    for (const [oldId, newId] of spKeywordIdMap) {
      const rankings = db.prepare(
        'SELECT * FROM smartplace_rankings WHERE keyword_id = ? ORDER BY check_date DESC LIMIT 30'
      ).all(oldId) as any[]

      for (const ranking of rankings) {
        await prisma.smartPlaceRanking.create({
          data: {
            keywordId: newId,
            checkDate: new Date(ranking.check_date),
            organicRank: ranking.organic_rank,
            adRank: ranking.ad_rank,
            totalResults: ranking.total_results || 0,
            topTenPlaces: ranking.top_ten_places ? JSON.parse(ranking.top_ten_places) : [],
            createdAt: ranking.created_at ? new Date(ranking.created_at) : new Date()
          }
        })
        rankingCount++
      }
    }
    console.log(`  ✅ 총 ${rankingCount}개 순위 마이그레이션`)

    // 9. 최종 확인
    console.log('\n=== 마이그레이션 최종 결과 ===')

    const finalStats = await Promise.all([
      prisma.blogTrackingProject.count(),
      prisma.blogTrackingKeyword.count(),
      prisma.blogTrackingResult.count(),
      prisma.smartPlace.count(),
      prisma.smartPlaceKeyword.count(),
      prisma.smartPlaceRanking.count()
    ])

    console.log(`\n블로그:`)
    console.log(`  - 프로젝트: ${finalStats[0]}개`)
    console.log(`  - 키워드: ${finalStats[1]}개`)
    console.log(`  - 결과: ${finalStats[2]}개`)

    console.log(`\n스마트플레이스:`)
    console.log(`  - 업체: ${finalStats[3]}개`)
    console.log(`  - 키워드: ${finalStats[4]}개`)
    console.log(`  - 순위: ${finalStats[5]}개`)

    console.log('\n✅ 마이그레이션 완료!')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
    await prisma.$disconnect()
  }
}

completeMigration()