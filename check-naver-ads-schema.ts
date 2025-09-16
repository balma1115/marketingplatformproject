import Database from 'better-sqlite3'

const db = new Database('prisma/dev.db')

try {
  console.log('=== SQLite 네이버 광고 테이블 스키마 확인 ===\n')

  // 캠페인 테이블 스키마
  console.log('📌 naver_ads_campaigns 테이블 구조:')
  const campaignSchema = db.prepare("PRAGMA table_info(naver_ads_campaigns)").all()
  console.log('컬럼 목록:')
  campaignSchema.forEach((col: any) => {
    console.log(`  - ${col.name} (${col.type})`)
  })

  // 샘플 데이터 확인
  console.log('\n📌 캠페인 샘플 데이터:')
  const campaigns = db.prepare('SELECT * FROM naver_ads_campaigns LIMIT 2').all()
  console.log(JSON.stringify(campaigns, null, 2))

  // 광고 데이터 테이블 스키마
  console.log('\n📌 naver_ads_data 테이블 구조:')
  const adDataSchema = db.prepare("PRAGMA table_info(naver_ads_data)").all()
  console.log('컬럼 목록:')
  adDataSchema.forEach((col: any) => {
    console.log(`  - ${col.name} (${col.type})`)
  })

  // 샘플 데이터 확인
  console.log('\n📌 광고 데이터 샘플:')
  const adData = db.prepare('SELECT * FROM naver_ads_data LIMIT 1').all()
  console.log(JSON.stringify(adData, null, 2))

} catch (error) {
  console.error('Error:', error)
} finally {
  db.close()
}