import { PrismaClient as SqliteClient } from '@prisma/client'
import { PrismaClient as PostgresClient } from '@prisma/client'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'

// SQLite 데이터베이스에서 직접 데이터 읽기
async function migrateUsers() {
  const db = new Database('prisma/dev.db')
  const postgresClient = new PostgresClient()

  try {
    // SQLite에서 모든 사용자 가져오기
    const users = db.prepare('SELECT * FROM users').all()
    console.log(`SQLite에서 발견한 사용자 수: ${users.length}명\n`)

    for (const user of users as any[]) {
      console.log(`처리 중: ${user.email}`)

      // PostgreSQL에 이미 존재하는지 확인
      const existing = await postgresClient.user.findUnique({
        where: { email: user.email }
      })

      if (existing) {
        console.log(`  ⏩ 이미 존재: ${user.email}`)
        continue
      }

      // 사용자 생성
      try {
        await postgresClient.user.create({
          data: {
            email: user.email,
            password: user.password,
            name: user.name || user.email.split('@')[0],
            phone: user.phone,
            role: user.role || 'user',
            plan: user.plan || 'basic',
            isActive: user.is_active !== 0,
            academyName: user.academy_name,
            academyAddress: user.academy_address,
            agencyId: user.agency_id,
            branchId: user.branch_id,
            coin: user.coin || 0,
            usedCoin: user.used_coin || 0,
            purchasedCoin: user.purchased_coin || 0,
            joinDate: user.join_date ? new Date(user.join_date) : new Date(),
            planExpiry: user.plan_expiry ? new Date(user.plan_expiry) : null,
            naverAdApiKey: user.naver_ad_api_key,
            naverAdSecret: user.naver_ad_secret,
            naverAdCustomerId: user.naver_ad_customer_id,
            naverAdsAccessKey: user.naver_ads_access_key,
            naverAdsSecretKey: user.naver_ads_secret_key,
            naverAdsCustomerId: user.naver_ads_customer_id,
            naverPlaceId: user.naver_place_id,
            placeName: user.place_name,
            businessName: user.business_name,
            businessNumber: user.business_number,
            businessAddress: user.business_address,
            instagramAccessToken: user.instagram_access_token,
            instagramUserId: user.instagram_user_id,
            isApproved: user.is_approved !== 0,
            approvedAt: user.approved_at ? new Date(user.approved_at) : null,
            approvedBy: user.approved_by,
            ktPassVerified: user.kt_pass_verified !== 0,
            ktPassVerifiedAt: user.kt_pass_verified_at ? new Date(user.kt_pass_verified_at) : null
          }
        })
        console.log(`  ✅ 마이그레이션 완료: ${user.email}`)
      } catch (error: any) {
        console.log(`  ❌ 실패: ${user.email} - ${error.message}`)
      }
    }

    // 최종 확인
    const postgresUsers = await postgresClient.user.findMany({
      select: { email: true, name: true }
    })

    console.log('\n=== PostgreSQL 최종 사용자 목록 ===')
    postgresUsers.forEach(u => {
      console.log(`- ${u.email} (${u.name})`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
    await postgresClient.$disconnect()
  }
}

migrateUsers()