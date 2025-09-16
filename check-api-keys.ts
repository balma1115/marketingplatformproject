import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

const db = new Database('prisma/dev.db')
const prisma = new PrismaClient()

async function checkApiKeys() {
  try {
    console.log('=== 네이버 API 키 마이그레이션 확인 ===\n')
    console.log('확인 시간:', new Date().toLocaleString('ko-KR'))
    console.log('='.repeat(60))

    // 1. SQLite API 키 데이터 확인
    console.log('\n📌 SQLite 네이버 API 키 데이터:')
    console.log('-'.repeat(60))

    const sqliteUsers = db.prepare(`
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

    console.log(`API 키가 있는 사용자 수: ${sqliteUsers.length}명`)

    sqliteUsers.forEach(user => {
      console.log(`\n사용자: ${user.email} (ID: ${user.id})`)
      if (user.naver_ad_api_key) {
        console.log(`  구 버전 API 키:`)
        console.log(`    - API Key: ${user.naver_ad_api_key?.substring(0, 20)}...`)
        console.log(`    - Secret: ${user.naver_ad_secret?.substring(0, 20)}...`)
        console.log(`    - Customer ID: ${user.naver_ad_customer_id}`)
      }
      if (user.naver_ads_access_key) {
        console.log(`  신 버전 API 키:`)
        console.log(`    - Access Key: ${user.naver_ads_access_key?.substring(0, 20)}...`)
        console.log(`    - Secret Key: ${user.naver_ads_secret_key?.substring(0, 20)}...`)
        console.log(`    - Customer ID: ${user.naver_ads_customer_id}`)
      }
    })

    // 2. PostgreSQL API 키 데이터 확인
    console.log('\n📌 PostgreSQL 네이버 API 키 데이터:')
    console.log('-'.repeat(60))

    const pgUsers = await prisma.user.findMany({
      where: {
        OR: [
          { naverAdApiKey: { not: null } },
          { naverAdSecret: { not: null } },
          { naverAdCustomerId: { not: null } },
          { naverAdsAccessKey: { not: null } },
          { naverAdsSecretKey: { not: null } },
          { naverAdsCustomerId: { not: null } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        naverAdApiKey: true,
        naverAdSecret: true,
        naverAdCustomerId: true,
        naverAdsAccessKey: true,
        naverAdsSecretKey: true,
        naverAdsCustomerId: true
      }
    })

    console.log(`API 키가 있는 사용자 수: ${pgUsers.length}명`)

    pgUsers.forEach(user => {
      console.log(`\n사용자: ${user.email} (ID: ${user.id})`)
      if (user.naverAdApiKey) {
        console.log(`  구 버전 API 키:`)
        console.log(`    - API Key: ${user.naverAdApiKey?.substring(0, 20)}...`)
        console.log(`    - Secret: ${user.naverAdSecret?.substring(0, 20)}...`)
        console.log(`    - Customer ID: ${user.naverAdCustomerId}`)
      }
      if (user.naverAdsAccessKey) {
        console.log(`  신 버전 API 키:`)
        console.log(`    - Access Key: ${user.naverAdsAccessKey?.substring(0, 20)}...`)
        console.log(`    - Secret Key: ${user.naverAdsSecretKey?.substring(0, 20)}...`)
        console.log(`    - Customer ID: ${user.naverAdsCustomerId}`)
      }
    })

    // 3. 마이그레이션 상태 비교
    console.log('\n📊 마이그레이션 상태 비교:')
    console.log('='.repeat(60))

    // SQLite 사용자 이메일 집합
    const sqliteEmails = new Set(sqliteUsers.map(u => u.email))

    // PostgreSQL에서 같은 이메일 찾기
    let matchCount = 0
    let mismatchCount = 0

    for (const sqliteUser of sqliteUsers) {
      const pgUser = pgUsers.find(u => u.email === sqliteUser.email)

      if (pgUser) {
        const oldApiMatch =
          sqliteUser.naver_ad_api_key === pgUser.naverAdApiKey &&
          sqliteUser.naver_ad_secret === pgUser.naverAdSecret &&
          sqliteUser.naver_ad_customer_id === pgUser.naverAdCustomerId

        const newApiMatch =
          sqliteUser.naver_ads_access_key === pgUser.naverAdsAccessKey &&
          sqliteUser.naver_ads_secret_key === pgUser.naverAdsSecretKey &&
          sqliteUser.naver_ads_customer_id === pgUser.naverAdsCustomerId

        if (oldApiMatch && newApiMatch) {
          console.log(`✅ ${sqliteUser.email}: API 키 완벽 일치`)
          matchCount++
        } else {
          console.log(`⚠️ ${sqliteUser.email}: API 키 불일치`)
          mismatchCount++
        }
      } else {
        console.log(`❌ ${sqliteUser.email}: PostgreSQL에 없음`)
      }
    }

    // 4. 광고 캠페인과 API 키 연결 확인
    console.log('\n📌 광고 캠페인과 API 키 연결 상태:')
    console.log('-'.repeat(60))

    const campaignsWithUser = await prisma.naverAdsCampaign.findMany({
      include: {
        user: {
          select: {
            email: true,
            naverAdsAccessKey: true,
            naverAdsCustomerId: true
          }
        }
      }
    })

    const usersWithCampaigns = new Map<string, number>()
    campaignsWithUser.forEach(campaign => {
      const email = campaign.user.email
      usersWithCampaigns.set(email, (usersWithCampaigns.get(email) || 0) + 1)
    })

    usersWithCampaigns.forEach((count, email) => {
      const user = campaignsWithUser.find(c => c.user.email === email)?.user
      console.log(`\n${email}:`)
      console.log(`  - 캠페인 수: ${count}개`)
      console.log(`  - API 키 보유: ${user?.naverAdsAccessKey ? '✅' : '❌'}`)
      console.log(`  - Customer ID: ${user?.naverAdsCustomerId || '없음'}`)
    })

    // 5. 최종 요약
    console.log('\n✨ 최종 요약:')
    console.log('='.repeat(60))
    console.log(`SQLite API 키 보유 사용자: ${sqliteUsers.length}명`)
    console.log(`PostgreSQL API 키 보유 사용자: ${pgUsers.length}명`)
    console.log(`완벽 일치: ${matchCount}명`)
    console.log(`불일치: ${mismatchCount}명`)

    if (matchCount === sqliteUsers.length) {
      console.log('\n🎉 모든 API 키가 정확하게 마이그레이션되었습니다!')
    } else {
      console.log('\n⚠️ 일부 API 키가 마이그레이션되지 않았거나 불일치합니다.')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
    await prisma.$disconnect()
  }
}

checkApiKeys()