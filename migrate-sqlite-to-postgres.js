const sqlite3 = require('sqlite3').verbose();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const postgresClient = new PrismaClient();

// SQLite 데이터베이스 연결
const sqliteDb = new sqlite3.Database('./prisma/dev.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('SQLite connection error:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

async function migrateData() {
  console.log('📦 Starting data migration from SQLite to PostgreSQL...\n');

  try {
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
      // 비밀번호 해싱 확인 (이미 해싱되어 있지 않은 경우)
      let hashedPassword = user.password;
      if (!hashedPassword.startsWith('$2')) {
        hashedPassword = await bcrypt.hash(user.password, 10);
      }

      await postgresClient.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          email: user.email,
          password: hashedPassword,
          name: user.name || user.email.split('@')[0],
          role: user.role || 'USER',
          businessName: user.businessName || null,
          businessType: user.businessType || null,
          phone: user.phone || null,
          isActive: user.isActive === 1 || user.isActive === true,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
        }
      });
    }
    console.log('✅ Users table migrated\n');

    // 사용자 ID 매핑 가져오기
    const userMapping = {};
    const postgresUsers = await postgresClient.user.findMany();
    for (const pUser of postgresUsers) {
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

      const created = await postgresClient.blogTrackingProject.create({
        data: {
          userId: newUserId,
          blogUrl: project.blogUrl,
          blogName: project.blogName || 'Unknown Blog',
          blogId: project.blogId || null,
          createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
          updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date()
        }
      }).catch(err => {
        console.log(`Skipping duplicate blog project: ${project.blogUrl}`);
        return null;
      });

      if (created) {
        blogProjectMapping[project.id] = created.id;
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

      const created = await postgresClient.blogTrackingKeyword.create({
        data: {
          projectId: newProjectId,
          keyword: keyword.keyword,
          isActive: keyword.isActive === 1 || keyword.isActive === true,
          addedDate: keyword.addedDate ? new Date(keyword.addedDate) : new Date(),
          lastChecked: keyword.lastChecked ? new Date(keyword.lastChecked) : null,
          createdAt: keyword.createdAt ? new Date(keyword.createdAt) : new Date(),
          updatedAt: keyword.updatedAt ? new Date(keyword.updatedAt) : new Date()
        }
      }).catch(err => {
        console.log(`Skipping duplicate blog keyword: ${keyword.keyword}`);
        return null;
      });

      if (created) {
        blogKeywordMapping[keyword.id] = created.id;
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

    for (const result of blogResults) {
      const newKeywordId = blogKeywordMapping[result.keywordId];
      if (!newKeywordId) continue;

      await postgresClient.blogTrackingResult.create({
        data: {
          keywordId: newKeywordId,
          trackingDate: result.trackingDate ? new Date(result.trackingDate) : new Date(),
          mainTabExposed: result.mainTabExposed === 1 || result.mainTabExposed === true,
          mainTabRank: result.mainTabRank || null,
          blogTabRank: result.blogTabRank || null,
          viewTabRank: result.viewTabRank || null,
          adRank: result.adRank || null,
          found: result.found === 1 || result.found === true,
          url: result.url || null,
          createdAt: result.createdAt ? new Date(result.createdAt) : new Date(),
          updatedAt: result.updatedAt ? new Date(result.updatedAt) : new Date()
        }
      }).catch(err => {
        console.log(`Skipping blog result: ${err.message}`);
      });
    }
    console.log('✅ BlogTrackingResult table migrated\n');

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

      const created = await postgresClient.smartPlace.create({
        data: {
          userId: newUserId,
          placeId: place.placeId || `place_${place.id}`,
          placeName: place.placeName || 'Unknown Place',
          address: place.address || null,
          phone: place.phone || null,
          rating: place.rating ? parseFloat(place.rating) : null,
          reviewCount: place.reviewCount || null,
          category: place.category || null,
          createdAt: place.createdAt ? new Date(place.createdAt) : new Date(),
          updatedAt: place.updatedAt ? new Date(place.updatedAt) : new Date()
        }
      }).catch(err => {
        console.log(`Skipping duplicate smart place: ${place.placeId}`);
        return null;
      });

      if (created) {
        smartPlaceMapping[place.id] = created.id;
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

      const created = await postgresClient.smartPlaceKeyword.create({
        data: {
          userId: newUserId,
          smartPlaceId: newSmartPlaceId,
          keyword: keyword.keyword,
          isActive: keyword.isActive === 1 || keyword.isActive === true,
          lastChecked: keyword.lastChecked ? new Date(keyword.lastChecked) : null,
          createdAt: keyword.createdAt ? new Date(keyword.createdAt) : new Date(),
          updatedAt: keyword.updatedAt ? new Date(keyword.updatedAt) : new Date()
        }
      }).catch(err => {
        console.log(`Skipping duplicate smart keyword: ${keyword.keyword}`);
        return null;
      });

      if (created) {
        smartKeywordMapping[keyword.id] = created.id;
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

    for (const ranking of smartRankings) {
      const newKeywordId = smartKeywordMapping[ranking.keywordId];
      if (!newKeywordId) continue;

      await postgresClient.smartPlaceRanking.create({
        data: {
          keywordId: newKeywordId,
          checkDate: ranking.checkDate ? new Date(ranking.checkDate) : new Date(),
          organicRank: ranking.organicRank || null,
          adRank: ranking.adRank || null,
          topTenPlaces: ranking.topTenPlaces || null,
          createdAt: ranking.createdAt ? new Date(ranking.createdAt) : new Date(),
          updatedAt: ranking.updatedAt ? new Date(ranking.updatedAt) : new Date()
        }
      }).catch(err => {
        console.log(`Skipping smart ranking: ${err.message}`);
      });
    }
    console.log('✅ SmartPlaceRanking table migrated\n');

    console.log('🎉 Data migration completed successfully!');

    // 데이터 검증
    console.log('\n📋 Verification Summary:');
    const postgresUsersCount = await postgresClient.user.count();
    const postgresBlogProjects = await postgresClient.blogTrackingProject.count();
    const postgresBlogKeywords = await postgresClient.blogTrackingKeyword.count();
    const postgresBlogResults = await postgresClient.blogTrackingResult.count();
    const postgresSmartPlaces = await postgresClient.smartPlace.count();
    const postgresSmartKeywords = await postgresClient.smartPlaceKeyword.count();
    const postgresSmartRankings = await postgresClient.smartPlaceRanking.count();

    console.log(`Users: ${postgresUsersCount}`);
    console.log(`Blog Projects: ${postgresBlogProjects}`);
    console.log(`Blog Keywords: ${postgresBlogKeywords}`);
    console.log(`Blog Results: ${postgresBlogResults}`);
    console.log(`Smart Places: ${postgresSmartPlaces}`);
    console.log(`Smart Keywords: ${postgresSmartKeywords}`);
    console.log(`Smart Rankings: ${postgresSmartRankings}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    sqliteDb.close();
    await postgresClient.$disconnect();
  }
}

// 실행
migrateData().catch(console.error);