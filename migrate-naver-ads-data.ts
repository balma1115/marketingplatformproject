import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

const db = new Database('prisma/dev.db')
const prisma = new PrismaClient()

async function migrateNaverAdsData() {
  try {
    console.log('=== 네이버 광고 JSON 통계 데이터 마이그레이션 시작 ===\n')

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

    // 2. 네이버 광고 데이터 마이그레이션
    console.log('📌 네이버 광고 통계 데이터 마이그레이션...')

    const sqliteAdsData = db.prepare(`
      SELECT * FROM naver_ads_data
    `).all() as any[]

    console.log(`  SQLite 광고 통계 데이터 수: ${sqliteAdsData.length}개`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (const adsData of sqliteAdsData) {
      const newUserId = userIdMap.get(adsData.userId)
      if (!newUserId) {
        console.log(`  ⚠️ 사용자 ID ${adsData.userId} 매핑 실패 - 건너뜀`)
        skipCount++
        continue
      }

      try {
        // 이미 존재하는지 확인
        const existing = await prisma.naverAdsData.findFirst({
          where: {
            userId: newUserId,
            dataType: adsData.dataType,
            createdAt: adsData.createdAt ? new Date(adsData.createdAt) : undefined
          }
        })

        if (!existing) {
          // JSON 데이터 파싱
          let jsonData: any
          try {
            // data가 이미 JSON 문자열인 경우
            if (typeof adsData.data === 'string') {
              // 이중 인코딩된 경우 처리
              jsonData = JSON.parse(JSON.parse(adsData.data))
            } else {
              jsonData = adsData.data
            }
          } catch (parseError) {
            // 파싱 실패 시 원본 그대로 사용
            console.log(`  ⚠️ JSON 파싱 실패, 원본 데이터 사용`)
            jsonData = adsData.data
          }

          await prisma.naverAdsData.create({
            data: {
              userId: newUserId,
              dataType: adsData.dataType,
              data: jsonData,
              lastUpdated: adsData.lastUpdated ? new Date(adsData.lastUpdated) : new Date(),
              createdAt: adsData.createdAt ? new Date(adsData.createdAt) : new Date()
            }
          })

          console.log(`  ✅ 광고 통계 데이터 마이그레이션: 사용자 ID ${newUserId}, 타입: ${adsData.dataType}`)
          successCount++
        } else {
          console.log(`  ⏭️ 이미 존재하는 광고 통계 데이터: 사용자 ID ${newUserId}, 타입: ${adsData.dataType}`)
          skipCount++
        }
      } catch (error: any) {
        console.log(`  ❌ 광고 통계 데이터 마이그레이션 실패: 사용자 ID ${adsData.userId}`)
        console.log(`     오류: ${error.message}`)
        errorCount++
      }
    }

    // 3. 광고 데이터 계정 종속성 확인
    console.log('\n📌 광고 데이터 계정 종속성 확인...')

    // 캠페인 확인
    const campaigns = await prisma.naverAdsCampaign.findMany({
      include: {
        user: {
          select: { email: true }
        }
      }
    })

    console.log('\n캠페인별 소유자:')
    campaigns.forEach(campaign => {
      console.log(`  - ${campaign.name}: ${campaign.user.email} (userId: ${campaign.userId})`)
    })

    // 광고 통계 데이터 확인
    const adsDataByUser = await prisma.naverAdsData.groupBy({
      by: ['userId', 'dataType'],
      _count: true
    })

    console.log('\n사용자별 광고 통계 데이터:')
    for (const data of adsDataByUser) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { email: true }
      })
      console.log(`  - ${user?.email} (userId: ${data.userId}): ${data.dataType} - ${data._count}개`)
    }

    // 4. 결과 요약
    console.log('\n📊 마이그레이션 결과:')
    console.log('='.repeat(60))

    console.log(`전체 데이터: ${sqliteAdsData.length}개`)
    console.log(`  ✅ 성공: ${successCount}개`)
    console.log(`  ⏭️ 스킵: ${skipCount}개`)
    console.log(`  ❌ 실패: ${errorCount}개`)

    const totalPgAdsData = await prisma.naverAdsData.count()
    console.log(`\nPostgreSQL 총 광고 통계 데이터: ${totalPgAdsData}개`)

    if (successCount > 0) {
      console.log('\n✅ 네이버 광고 통계 데이터 마이그레이션 완료!')
    } else if (skipCount === sqliteAdsData.length) {
      console.log('\n⚠️ 모든 데이터가 이미 존재합니다.')
    } else {
      console.log('\n⚠️ 일부 데이터가 마이그레이션되지 않았습니다.')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    db.close()
    await prisma.$disconnect()
  }
}

migrateNaverAdsData()