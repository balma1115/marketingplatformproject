import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

const db = new Database('prisma/dev.db')
const prisma = new PrismaClient()

async function migrateNaverAds() {
  try {
    console.log('=== 네이버 광고 데이터 마이그레이션 시작 ===\n')

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

    // 2. 네이버 광고 캠페인 마이그레이션
    console.log('📌 네이버 광고 캠페인 마이그레이션...')

    const sqliteCampaigns = db.prepare(`
      SELECT * FROM naver_ads_campaigns
    `).all() as any[]

    console.log(`  SQLite 캠페인 수: ${sqliteCampaigns.length}개`)

    for (const campaign of sqliteCampaigns) {
      const newUserId = userIdMap.get(campaign.user_id)
      if (!newUserId) {
        console.log(`  ⚠️ 사용자 ID ${campaign.user_id} 매핑 실패 - 건너뜀`)
        continue
      }

      try {
        // 이미 존재하는지 확인
        const existing = await prisma.naverAdsCampaign.findFirst({
          where: {
            campaignId: campaign.campaign_id,  // 수정: campaign_id 사용
            userId: newUserId
          }
        })

        if (!existing) {
          await prisma.naverAdsCampaign.create({
            data: {
              userId: newUserId,
              campaignId: campaign.campaign_id,  // 필수 필드
              name: campaign.name,
              campaignType: campaign.campaign_type || 'WEB_SITE',
              dailyBudget: campaign.daily_budget || 0,
              status: campaign.status || 'ENABLED',
              createdAt: campaign.created_at ? new Date(campaign.created_at) : new Date()
            }
          })
          console.log(`  ✅ 캠페인 마이그레이션: ${campaign.name}`)
        } else {
          console.log(`  ⏭️ 이미 존재하는 캠페인: ${campaign.name}`)
        }
      } catch (error: any) {
        console.log(`  ❌ 캠페인 마이그레이션 실패: ${campaign.name}`)
        console.log(`     오류: ${error.message}`)
      }
    }

    // 3. 네이버 광고 데이터는 JSON 형태로 저장되어 있어 스킵
    console.log('\n📌 네이버 광고 데이터 (naver_ads_data)')
    console.log('  ℹ️ naver_ads_data는 JSON 통계 데이터로, 광고그룹 구조와 다릅니다.')
    console.log('  광고그룹과 키워드는 별도 마이그레이션이 필요합니다.')

    const sqliteAdData = db.prepare(`
      SELECT COUNT(*) as count FROM naver_ads_data
    `).get() as any

    console.log(`  SQLite 광고 통계 데이터: ${sqliteAdData.count}개`)

    // 4. 결과 확인
    console.log('\n📊 마이그레이션 결과:')
    console.log('='.repeat(60))

    const pgCampaignCount = await prisma.naverAdsCampaign.count()

    console.log(`SQLite → PostgreSQL:`)
    console.log(`  캠페인: ${sqliteCampaigns.length}개 → ${pgCampaignCount}개`)
    console.log(`  광고 통계 데이터: ${sqliteAdData.count}개 (JSON 데이터, 별도 처리 필요)`)

    if (pgCampaignCount === sqliteCampaigns.length) {
      console.log('\n✅ 네이버 광고 캠페인 마이그레이션 완료!')
    } else {
      console.log('\n⚠️ 일부 캠페인이 마이그레이션되지 않았습니다.')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
    await prisma.$disconnect()
  }
}

migrateNaverAds()