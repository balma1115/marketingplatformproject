import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

const db = new Database('prisma/dev.db')
const prisma = new PrismaClient()

async function migrateApiKeys() {
  try {
    console.log('=== 네이버 API 키 마이그레이션 시작 ===\n')

    // 1. SQLite에서 API 키가 있는 모든 사용자 조회
    const sqliteUsersWithKeys = db.prepare(`
      SELECT
        id,
        email,
        name,
        naver_ad_api_key,
        naver_ad_secret,
        naver_ad_customer_id,
        naver_ads_access_key,
        naver_ads_secret_key,
        naver_ads_customer_id
      FROM users
      WHERE
        naver_ad_api_key IS NOT NULL OR
        naver_ad_secret IS NOT NULL OR
        naver_ad_customer_id IS NOT NULL OR
        naver_ads_access_key IS NOT NULL OR
        naver_ads_secret_key IS NOT NULL OR
        naver_ads_customer_id IS NOT NULL
    `).all() as any[]

    console.log(`SQLite에서 API 키를 가진 사용자: ${sqliteUsersWithKeys.length}명`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (const sqliteUser of sqliteUsersWithKeys) {
      console.log(`\n처리중: ${sqliteUser.email}`)

      try {
        // PostgreSQL에서 같은 이메일의 사용자 찾기
        const pgUser = await prisma.user.findUnique({
          where: { email: sqliteUser.email }
        })

        if (!pgUser) {
          console.log(`  ❌ PostgreSQL에 사용자 없음: ${sqliteUser.email}`)
          errorCount++
          continue
        }

        // API 키 업데이트 필요 여부 확인
        const needsUpdate =
          sqliteUser.naver_ad_api_key !== pgUser.naverAdApiKey ||
          sqliteUser.naver_ad_secret !== pgUser.naverAdSecret ||
          sqliteUser.naver_ad_customer_id !== pgUser.naverAdCustomerId ||
          sqliteUser.naver_ads_access_key !== pgUser.naverAdsAccessKey ||
          sqliteUser.naver_ads_secret_key !== pgUser.naverAdsSecretKey ||
          sqliteUser.naver_ads_customer_id !== pgUser.naverAdsCustomerId

        if (needsUpdate) {
          await prisma.user.update({
            where: { id: pgUser.id },
            data: {
              naverAdApiKey: sqliteUser.naver_ad_api_key,
              naverAdSecret: sqliteUser.naver_ad_secret,
              naverAdCustomerId: sqliteUser.naver_ad_customer_id,
              naverAdsAccessKey: sqliteUser.naver_ads_access_key,
              naverAdsSecretKey: sqliteUser.naver_ads_secret_key,
              naverAdsCustomerId: sqliteUser.naver_ads_customer_id
            }
          })
          console.log(`  ✅ API 키 업데이트 완료`)
          successCount++
        } else {
          console.log(`  ⏭️ 이미 동일한 API 키 보유`)
          skipCount++
        }
      } catch (error: any) {
        console.log(`  ❌ 오류 발생: ${error.message}`)
        errorCount++
      }
    }

    // 2. 결과 요약
    console.log('\n📊 마이그레이션 결과:')
    console.log('='.repeat(60))
    console.log(`전체 사용자: ${sqliteUsersWithKeys.length}명`)
    console.log(`  ✅ 업데이트: ${successCount}명`)
    console.log(`  ⏭️ 스킵: ${skipCount}명`)
    console.log(`  ❌ 실패: ${errorCount}명`)

    // 3. 최종 확인
    console.log('\n📌 최종 API 키 보유 현황:')
    console.log('-'.repeat(60))

    const pgUsersWithKeys = await prisma.user.findMany({
      where: {
        OR: [
          { naverAdApiKey: { not: null } },
          { naverAdsAccessKey: { not: null } }
        ]
      },
      select: {
        email: true,
        naverAdCustomerId: true,
        naverAdsCustomerId: true,
        _count: {
          select: {
            naverAdsCampaigns: true
          }
        }
      }
    })

    pgUsersWithKeys.forEach(user => {
      console.log(`${user.email}:`)
      console.log(`  - Customer ID (구): ${user.naverAdCustomerId || '없음'}`)
      console.log(`  - Customer ID (신): ${user.naverAdsCustomerId || '없음'}`)
      console.log(`  - 광고 캠페인: ${user._count.naverAdsCampaigns}개`)
    })

    if (successCount > 0) {
      console.log('\n✅ API 키 마이그레이션 완료!')
    } else if (skipCount === sqliteUsersWithKeys.length) {
      console.log('\n✅ 모든 API 키가 이미 최신 상태입니다.')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
    await prisma.$disconnect()
  }
}

migrateApiKeys()