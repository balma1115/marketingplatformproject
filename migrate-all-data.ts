import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

const db = new Database('prisma/dev.db')
const prisma = new PrismaClient()

async function migrateAllData() {
  try {
    console.log('=== 데이터 마이그레이션 시작 ===\n')

    // 1. 블로그 프로젝트 마이그레이션
    console.log('1. 블로그 프로젝트 마이그레이션...')
    const blogProjects = db.prepare('SELECT * FROM blog_tracking_projects').all() as any[]

    for (const project of blogProjects) {
      const existing = await prisma.blogTrackingProject.findFirst({
        where: {
          userId: project.user_id,
          blogUrl: project.blog_url
        }
      })

      if (!existing) {
        const created = await prisma.blogTrackingProject.create({
          data: {
            userId: project.user_id,
            blogUrl: project.blog_url,
            blogName: project.blog_name,
            blogId: project.blog_id,
            createdAt: project.created_at ? new Date(project.created_at) : new Date(),
            updatedAt: project.updated_at ? new Date(project.updated_at) : new Date()
          }
        })
        console.log(`  ✅ 블로그 프로젝트: ${project.blog_url}`)

        // 블로그 키워드 마이그레이션
        const keywords = db.prepare('SELECT * FROM blog_tracking_keywords WHERE project_id = ?').all(project.id) as any[]

        for (const keyword of keywords) {
          const createdKeyword = await prisma.blogTrackingKeyword.create({
            data: {
              projectId: created.id,
              keyword: keyword.keyword,
              isActive: keyword.is_active === 1,
              addedDate: keyword.added_date ? new Date(keyword.added_date) : new Date(),
              lastChecked: keyword.last_checked ? new Date(keyword.last_checked) : null
            }
          })

          // 블로그 결과 마이그레이션
          const results = db.prepare('SELECT * FROM blog_tracking_results WHERE keyword_id = ?').all(keyword.id) as any[]

          for (const result of results) {
            await prisma.blogTrackingResult.create({
              data: {
                keywordId: createdKeyword.id,
                trackingDate: new Date(result.tracking_date),
                mainTabExposed: result.main_tab_exposed === 1,
                mainTabRank: result.main_tab_rank,
                blogTabRank: result.blog_tab_rank,
                viewTabRank: result.view_tab_rank,
                adRank: result.ad_rank,
                found: result.found === 1,
                url: result.url
              }
            })
          }
        }
      } else {
        console.log(`  ⏩ 이미 존재: ${project.blog_url}`)
      }
    }

    // 2. 스마트플레이스 마이그레이션
    console.log('\n2. 스마트플레이스 마이그레이션...')
    const smartplaces = db.prepare('SELECT * FROM smartplaces').all() as any[]

    for (const sp of smartplaces) {
      const existing = await prisma.smartPlace.findFirst({
        where: {
          userId: sp.user_id,
          placeId: sp.place_id
        }
      })

      if (!existing) {
        const created = await prisma.smartPlace.create({
          data: {
            userId: sp.user_id,
            placeId: sp.place_id,
            placeName: sp.place_name,
            address: sp.address,
            phone: sp.phone,
            rating: sp.rating ? parseFloat(sp.rating) : null,
            reviewCount: sp.review_count,
            category: sp.category,
            createdAt: sp.created_at ? new Date(sp.created_at) : new Date(),
            updatedAt: sp.updated_at ? new Date(sp.updated_at) : new Date()
          }
        })
        console.log(`  ✅ 스마트플레이스: ${sp.place_name}`)

        // 스마트플레이스 키워드 마이그레이션
        const keywords = db.prepare('SELECT * FROM smartplace_keywords WHERE smartplace_id = ?').all(sp.id) as any[]

        for (const keyword of keywords) {
          const createdKeyword = await prisma.smartPlaceKeyword.create({
            data: {
              userId: sp.user_id,
              smartPlaceId: created.id,
              keyword: keyword.keyword,
              isActive: keyword.is_active === 1,
              lastChecked: keyword.last_checked ? new Date(keyword.last_checked) : null
            }
          })

          // 스마트플레이스 순위 마이그레이션
          const rankings = db.prepare('SELECT * FROM smartplace_rankings WHERE keyword_id = ?').all(keyword.id) as any[]

          for (const ranking of rankings) {
            await prisma.smartPlaceRanking.create({
              data: {
                keywordId: createdKeyword.id,
                checkDate: new Date(ranking.check_date),
                organicRank: ranking.organic_rank,
                adRank: ranking.ad_rank,
                topTenPlaces: ranking.top_ten_places ? JSON.parse(ranking.top_ten_places) : []
              }
            })
          }
        }
      } else {
        console.log(`  ⏩ 이미 존재: ${sp.place_name}`)
      }
    }

    // 3. 최종 확인
    console.log('\n=== 마이그레이션 결과 ===')

    const totalBlogProjects = await prisma.blogTrackingProject.count()
    const totalBlogKeywords = await prisma.blogTrackingKeyword.count()
    const totalBlogResults = await prisma.blogTrackingResult.count()

    console.log(`\n블로그:`)
    console.log(`  - 프로젝트: ${totalBlogProjects}개`)
    console.log(`  - 키워드: ${totalBlogKeywords}개`)
    console.log(`  - 결과: ${totalBlogResults}개`)

    const totalSmartPlaces = await prisma.smartPlace.count()
    const totalSmartKeywords = await prisma.smartPlaceKeyword.count()
    const totalSmartRankings = await prisma.smartPlaceRanking.count()

    console.log(`\n스마트플레이스:`)
    console.log(`  - 업체: ${totalSmartPlaces}개`)
    console.log(`  - 키워드: ${totalSmartKeywords}개`)
    console.log(`  - 순위: ${totalSmartRankings}개`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
    await prisma.$disconnect()
  }
}

migrateAllData()