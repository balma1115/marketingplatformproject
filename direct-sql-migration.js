const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// PostgreSQL 연결 설정
const pgPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'marketingplat_dev',
  user: 'postgres',
  password: 'postgres'
});

// SQLite 데이터베이스 연결
const sqliteDb = new sqlite3.Database('./prisma/dev.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('SQLite connection error:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

async function migrateData() {
  console.log('📦 Starting direct SQL migration from SQLite to PostgreSQL...\n');

  try {
    // PostgreSQL 연결 테스트
    const testResult = await pgPool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL\n');

    // 1. users 테이블 마이그레이션
    console.log('👤 Migrating users table...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${users.length} users`);

    for (const user of users) {
      // 비밀번호 해싱 확인
      let hashedPassword = user.password;
      if (!hashedPassword.startsWith('$2')) {
        hashedPassword = await bcrypt.hash(user.password, 10);
      }

      await pgPool.query(`
        INSERT INTO users (email, password, name, role, business_name, business_type, phone, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (email) DO NOTHING
      `, [
        user.email,
        hashedPassword,
        user.name || user.email.split('@')[0],
        user.role || 'USER',
        user.businessName,
        user.businessType,
        user.phone,
        user.isActive === 1 || user.isActive === true,
        user.createdAt ? new Date(user.createdAt) : new Date(),
        user.updatedAt ? new Date(user.updatedAt) : new Date()
      ]);
    }
    console.log('✅ Users table migrated\n');

    // 사용자 ID 매핑 가져오기
    const userMapping = {};
    const pgUsers = await pgPool.query('SELECT id, email FROM users');
    for (const pUser of pgUsers.rows) {
      const oldUser = users.find(u => u.email === pUser.email);
      if (oldUser) {
        userMapping[oldUser.id] = pUser.id;
      }
    }

    // 2. blog_tracking_projects 테이블 마이그레이션
    console.log('📝 Migrating blog_tracking_projects table...');
    const blogProjects = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM blog_tracking_projects', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${blogProjects.length} blog projects`);

    const blogProjectMapping = {};
    for (const project of blogProjects) {
      const newUserId = userMapping[project.userId] || project.userId;

      const result = await pgPool.query(`
        INSERT INTO blog_tracking_projects (user_id, blog_url, blog_name, blog_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, blog_url) DO UPDATE
        SET blog_name = EXCLUDED.blog_name
        RETURNING id
      `, [
        newUserId,
        project.blogUrl,
        project.blogName || 'Unknown Blog',
        project.blogId,
        project.createdAt ? new Date(project.createdAt) : new Date(),
        project.updatedAt ? new Date(project.updatedAt) : new Date()
      ]);

      if (result.rows[0]) {
        blogProjectMapping[project.id] = result.rows[0].id;
      }
    }
    console.log('✅ BlogTrackingProject table migrated\n');

    // 3. blog_tracking_keywords 테이블 마이그레이션
    console.log('🔑 Migrating blog_tracking_keywords table...');
    const blogKeywords = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM blog_tracking_keywords', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${blogKeywords.length} blog keywords`);

    const blogKeywordMapping = {};
    for (const keyword of blogKeywords) {
      const newProjectId = blogProjectMapping[keyword.projectId];
      if (!newProjectId) continue;

      const result = await pgPool.query(`
        INSERT INTO blog_tracking_keywords (project_id, keyword, is_active, added_date, last_checked, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (project_id, keyword) DO UPDATE
        SET is_active = EXCLUDED.is_active
        RETURNING id
      `, [
        newProjectId,
        keyword.keyword,
        keyword.isActive === 1 || keyword.isActive === true,
        keyword.addedDate ? new Date(keyword.addedDate) : new Date(),
        keyword.lastChecked ? new Date(keyword.lastChecked) : null,
        keyword.createdAt ? new Date(keyword.createdAt) : new Date(),
        keyword.updatedAt ? new Date(keyword.updatedAt) : new Date()
      ]);

      if (result.rows[0]) {
        blogKeywordMapping[keyword.id] = result.rows[0].id;
      }
    }
    console.log('✅ BlogTrackingKeyword table migrated\n');

    // 4. blog_tracking_results 테이블 마이그레이션
    console.log('📊 Migrating blog_tracking_results table...');
    const blogResults = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM blog_tracking_results', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${blogResults.length} blog results`);

    let blogResultCount = 0;
    for (const result of blogResults) {
      const newKeywordId = blogKeywordMapping[result.keywordId];
      if (!newKeywordId) continue;

      await pgPool.query(`
        INSERT INTO blog_tracking_results (keyword_id, tracking_date, main_tab_exposed, main_tab_rank, blog_tab_rank, view_tab_rank, ad_rank, found, url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [
        newKeywordId,
        result.trackingDate ? new Date(result.trackingDate) : new Date(),
        result.mainTabExposed === 1 || result.mainTabExposed === true,
        result.mainTabRank,
        result.blogTabRank,
        result.viewTabRank,
        result.adRank,
        result.found === 1 || result.found === true,
        result.url,
        result.createdAt ? new Date(result.createdAt) : new Date(),
        result.updatedAt ? new Date(result.updatedAt) : new Date()
      ]);
      blogResultCount++;
    }
    console.log(`✅ BlogTrackingResult table migrated (${blogResultCount} records)\n`);

    // 5. smartplaces 테이블 마이그레이션
    console.log('🏪 Migrating smartplaces table...');
    const smartPlaces = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM smartplaces', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${smartPlaces.length} smart places`);

    const smartPlaceMapping = {};
    for (const place of smartPlaces) {
      const newUserId = userMapping[place.userId] || place.userId;

      const result = await pgPool.query(`
        INSERT INTO smartplaces (user_id, place_id, place_name, address, phone, rating, review_count, category, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (place_id) DO UPDATE
        SET place_name = EXCLUDED.place_name
        RETURNING id
      `, [
        newUserId,
        place.placeId || `place_${place.id}`,
        place.placeName || 'Unknown Place',
        place.address,
        place.phone,
        place.rating ? parseFloat(place.rating) : null,
        place.reviewCount,
        place.category,
        place.createdAt ? new Date(place.createdAt) : new Date(),
        place.updatedAt ? new Date(place.updatedAt) : new Date()
      ]);

      if (result.rows[0]) {
        smartPlaceMapping[place.id] = result.rows[0].id;
      }
    }
    console.log('✅ SmartPlace table migrated\n');

    // 6. smartplace_keywords 테이블 마이그레이션
    console.log('🔑 Migrating smartplace_keywords table...');
    const smartKeywords = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM smartplace_keywords', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${smartKeywords.length} smart place keywords`);

    const smartKeywordMapping = {};
    for (const keyword of smartKeywords) {
      const newSmartPlaceId = smartPlaceMapping[keyword.smartPlaceId];
      const newUserId = userMapping[keyword.userId] || keyword.userId;
      if (!newSmartPlaceId) continue;

      const result = await pgPool.query(`
        INSERT INTO smartplace_keywords (user_id, smartplace_id, keyword, is_active, last_checked, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (smartplace_id, keyword) DO UPDATE
        SET is_active = EXCLUDED.is_active
        RETURNING id
      `, [
        newUserId,
        newSmartPlaceId,
        keyword.keyword,
        keyword.isActive === 1 || keyword.isActive === true,
        keyword.lastChecked ? new Date(keyword.lastChecked) : null,
        keyword.createdAt ? new Date(keyword.createdAt) : new Date(),
        keyword.updatedAt ? new Date(keyword.updatedAt) : new Date()
      ]);

      if (result.rows[0]) {
        smartKeywordMapping[keyword.id] = result.rows[0].id;
      }
    }
    console.log('✅ SmartPlaceKeyword table migrated\n');

    // 7. smartplace_rankings 테이블 마이그레이션
    console.log('📈 Migrating smartplace_rankings table...');
    const smartRankings = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM smartplace_rankings', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${smartRankings.length} smart place rankings`);

    let smartRankingCount = 0;
    for (const ranking of smartRankings) {
      const newKeywordId = smartKeywordMapping[ranking.keywordId];
      if (!newKeywordId) continue;

      await pgPool.query(`
        INSERT INTO smartplace_rankings (keyword_id, check_date, organic_rank, ad_rank, top_ten_places, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [
        newKeywordId,
        ranking.checkDate ? new Date(ranking.checkDate) : new Date(),
        ranking.organicRank,
        ranking.adRank,
        ranking.topTenPlaces,
        ranking.createdAt ? new Date(ranking.createdAt) : new Date(),
        ranking.updatedAt ? new Date(ranking.updatedAt) : new Date()
      ]);
      smartRankingCount++;
    }
    console.log(`✅ SmartPlaceRanking table migrated (${smartRankingCount} records)\n`);

    console.log('🎉 Data migration completed successfully!');

    // 데이터 검증
    console.log('\n📋 Verification Summary:');
    const postgresUsersCount = await pgPool.query('SELECT COUNT(*) FROM users');
    const postgresBlogProjects = await pgPool.query('SELECT COUNT(*) FROM blog_tracking_projects');
    const postgresBlogKeywords = await pgPool.query('SELECT COUNT(*) FROM blog_tracking_keywords');
    const postgresBlogResults = await pgPool.query('SELECT COUNT(*) FROM blog_tracking_results');
    const postgresSmartPlaces = await pgPool.query('SELECT COUNT(*) FROM smartplaces');
    const postgresSmartKeywords = await pgPool.query('SELECT COUNT(*) FROM smartplace_keywords');
    const postgresSmartRankings = await pgPool.query('SELECT COUNT(*) FROM smartplace_rankings');

    console.log(`Users: ${postgresUsersCount.rows[0].count}`);
    console.log(`Blog Projects: ${postgresBlogProjects.rows[0].count}`);
    console.log(`Blog Keywords: ${postgresBlogKeywords.rows[0].count}`);
    console.log(`Blog Results: ${postgresBlogResults.rows[0].count}`);
    console.log(`Smart Places: ${postgresSmartPlaces.rows[0].count}`);
    console.log(`Smart Keywords: ${postgresSmartKeywords.rows[0].count}`);
    console.log(`Smart Rankings: ${postgresSmartRankings.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

// 실행
migrateData().catch(console.error);