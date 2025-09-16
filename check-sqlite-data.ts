import Database from 'better-sqlite3'

const db = new Database('prisma/dev.db')

try {
  // 블로그 관련 데이터 확인
  console.log('=== 블로그 관련 데이터 ===\n')

  const blogProjects = db.prepare('SELECT COUNT(*) as count FROM blog_tracking_projects').get() as any
  console.log(`blog_tracking_projects: ${blogProjects.count}개`)

  const blogKeywords = db.prepare('SELECT COUNT(*) as count FROM blog_tracking_keywords').get() as any
  console.log(`blog_tracking_keywords: ${blogKeywords.count}개`)

  const blogResults = db.prepare('SELECT COUNT(*) as count FROM blog_tracking_results').get() as any
  console.log(`blog_tracking_results: ${blogResults.count}개`)

  // 블로그 프로젝트 샘플 데이터
  const sampleBlogProjects = db.prepare('SELECT * FROM blog_tracking_projects LIMIT 5').all()
  console.log('\n블로그 프로젝트 샘플:')
  sampleBlogProjects.forEach((p: any) => {
    console.log(`  - ${p.blog_url} (user_id: ${p.user_id})`)
  })

  // 스마트플레이스 관련 데이터 확인
  console.log('\n=== 스마트플레이스 관련 데이터 ===\n')

  const smartplaces = db.prepare('SELECT COUNT(*) as count FROM smartplaces').get() as any
  console.log(`smartplaces: ${smartplaces.count}개`)

  const smartplaceKeywords = db.prepare('SELECT COUNT(*) as count FROM smartplace_keywords').get() as any
  console.log(`smartplace_keywords: ${smartplaceKeywords.count}개`)

  const smartplaceRankings = db.prepare('SELECT COUNT(*) as count FROM smartplace_rankings').get() as any
  console.log(`smartplace_rankings: ${smartplaceRankings.count}개`)

  // 스마트플레이스 샘플 데이터
  const sampleSmartplaces = db.prepare('SELECT * FROM smartplaces LIMIT 5').all()
  console.log('\n스마트플레이스 샘플:')
  sampleSmartplaces.forEach((s: any) => {
    console.log(`  - ${s.place_name} (place_id: ${s.place_id}, user_id: ${s.user_id})`)
  })

  // 사용자별 데이터 확인
  console.log('\n=== 사용자별 데이터 ===\n')

  const userBlogData = db.prepare(`
    SELECT u.email, COUNT(bp.id) as blog_count
    FROM users u
    LEFT JOIN blog_tracking_projects bp ON u.id = bp.user_id
    GROUP BY u.id, u.email
    HAVING blog_count > 0
  `).all()

  console.log('블로그 프로젝트를 가진 사용자:')
  userBlogData.forEach((u: any) => {
    console.log(`  - ${u.email}: ${u.blog_count}개`)
  })

  const userSmartplaceData = db.prepare(`
    SELECT u.email, COUNT(s.id) as smartplace_count
    FROM users u
    LEFT JOIN smartplaces s ON u.id = s.user_id
    GROUP BY u.id, u.email
    HAVING smartplace_count > 0
  `).all()

  console.log('\n스마트플레이스를 가진 사용자:')
  userSmartplaceData.forEach((u: any) => {
    console.log(`  - ${u.email}: ${u.smartplace_count}개`)
  })

} catch (error) {
  console.error('Error:', error)
} finally {
  db.close()
}