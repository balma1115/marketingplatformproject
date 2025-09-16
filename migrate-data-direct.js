const sqlite3 = require('sqlite3').verbose();
const { PrismaClient } = require('@prisma/client');

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
    // 1. User 테이블 마이그레이션
    console.log('👤 Migrating User table...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM User', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log(`Found ${users.length} users`);

    for (const user of users) {
      await postgresClient.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role || 'USER',
          businessName: user.businessName,
          businessType: user.businessType,
          phone: user.phone,
          isActive: user.isActive === 1,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
    }
    console.log('✅ User table migrated\n');

    // 2. BlogTrackingProject 테이블 마이그레이션
    console.log('📝 Migrating BlogTrackingProject table...');
    const blogProjects = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM BlogTrackingProject', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log(`Found ${blogProjects.length} blog projects`);

    for (const project of blogProjects) {
      await postgresClient.blogTrackingProject.upsert({
        where: { id: project.id },
        update: {},
        create: {
          id: project.id,
          userId: project.userId,
          blogUrl: project.blogUrl,
          blogName: project.blogName,
          blogId: project.blogId,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt)
        }
      });
    }
    console.log('✅ BlogTrackingProject table migrated\n');

    // 3. BlogTrackingKeyword 테이블 마이그레이션
    console.log('🔑 Migrating BlogTrackingKeyword table...');
    const blogKeywords = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM BlogTrackingKeyword', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log(`Found ${blogKeywords.length} blog keywords`);

    for (const keyword of blogKeywords) {
      await postgresClient.blogTrackingKeyword.upsert({
        where: { id: keyword.id },
        update: {},
        create: {
          id: keyword.id,
          projectId: keyword.projectId,
          keyword: keyword.keyword,
          isActive: keyword.isActive === 1,
          addedDate: new Date(keyword.addedDate),
          lastChecked: keyword.lastChecked ? new Date(keyword.lastChecked) : null,
          createdAt: new Date(keyword.createdAt),
          updatedAt: new Date(keyword.updatedAt)
        }
      });
    }
    console.log('✅ BlogTrackingKeyword table migrated\n');

    // 4. BlogTrackingResult 테이블 마이그레이션
    console.log('📊 Migrating BlogTrackingResult table...');
    const blogResults = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM BlogTrackingResult', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log(`Found ${blogResults.length} blog results`);

    for (const result of blogResults) {
      await postgresClient.blogTrackingResult.upsert({
        where: { id: result.id },
        update: {},
        create: {
          id: result.id,
          keywordId: result.keywordId,
          trackingDate: new Date(result.trackingDate),
          mainTabExposed: result.mainTabExposed === 1,
          mainTabRank: result.mainTabRank,
          blogTabRank: result.blogTabRank,
          viewTabRank: result.viewTabRank,
          adRank: result.adRank,
          found: result.found === 1,
          url: result.url,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt)
        }
      });
    }
    console.log('✅ BlogTrackingResult table migrated\n');

    // 5. SmartPlace 테이블 마이그레이션
    console.log('🏪 Migrating SmartPlace table...');
    const smartPlaces = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM SmartPlace', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log(`Found ${smartPlaces.length} smart places`);

    for (const place of smartPlaces) {
      await postgresClient.smartPlace.upsert({
        where: { id: place.id },
        update: {},
        create: {
          id: place.id,
          userId: place.userId,
          placeId: place.placeId,
          placeName: place.placeName,
          address: place.address,
          phone: place.phone,
          rating: place.rating,
          reviewCount: place.reviewCount,
          category: place.category,
          createdAt: new Date(place.createdAt),
          updatedAt: new Date(place.updatedAt)
        }
      });
    }
    console.log('✅ SmartPlace table migrated\n');

    // 6. SmartPlaceKeyword 테이블 마이그레이션
    console.log('🔑 Migrating SmartPlaceKeyword table...');
    const smartKeywords = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM SmartPlaceKeyword', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log(`Found ${smartKeywords.length} smart place keywords`);

    for (const keyword of smartKeywords) {
      await postgresClient.smartPlaceKeyword.upsert({
        where: { id: keyword.id },
        update: {},
        create: {
          id: keyword.id,
          userId: keyword.userId,
          smartPlaceId: keyword.smartPlaceId,
          keyword: keyword.keyword,
          isActive: keyword.isActive === 1,
          lastChecked: keyword.lastChecked ? new Date(keyword.lastChecked) : null,
          createdAt: new Date(keyword.createdAt),
          updatedAt: new Date(keyword.updatedAt)
        }
      });
    }
    console.log('✅ SmartPlaceKeyword table migrated\n');

    // 7. SmartPlaceRanking 테이블 마이그레이션
    console.log('📈 Migrating SmartPlaceRanking table...');
    const smartRankings = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM SmartPlaceRanking', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log(`Found ${smartRankings.length} smart place rankings`);

    for (const ranking of smartRankings) {
      await postgresClient.smartPlaceRanking.upsert({
        where: { id: ranking.id },
        update: {},
        create: {
          id: ranking.id,
          keywordId: ranking.keywordId,
          checkDate: new Date(ranking.checkDate),
          organicRank: ranking.organicRank,
          adRank: ranking.adRank,
          topTenPlaces: ranking.topTenPlaces,
          createdAt: new Date(ranking.createdAt),
          updatedAt: new Date(ranking.updatedAt)
        }
      });
    }
    console.log('✅ SmartPlaceRanking table migrated\n');

    // 8. NaverAdsCampaign 테이블 마이그레이션
    console.log('💰 Migrating NaverAdsCampaign table...');
    const campaigns = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM NaverAdsCampaign', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log(`Found ${campaigns.length} campaigns`);

    for (const campaign of campaigns) {
      await postgresClient.naverAdsCampaign.upsert({
        where: { id: campaign.id },
        update: {},
        create: {
          id: campaign.id,
          userId: campaign.userId,
          nccCampaignId: campaign.nccCampaignId,
          name: campaign.name,
          campaignType: campaign.campaignType,
          dailyBudget: campaign.dailyBudget,
          status: campaign.status,
          createdAt: new Date(campaign.createdAt),
          updatedAt: new Date(campaign.updatedAt)
        }
      });
    }
    console.log('✅ NaverAdsCampaign table migrated\n');

    // 9. KeywordAnalysis 테이블 마이그레이션
    console.log('🔍 Migrating KeywordAnalysis table...');
    const keywordAnalyses = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM KeywordAnalysis', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log(`Found ${keywordAnalyses.length} keyword analyses`);

    for (const analysis of keywordAnalyses) {
      await postgresClient.keywordAnalysis.upsert({
        where: { id: analysis.id },
        update: {},
        create: {
          id: analysis.id,
          userId: analysis.userId,
          keyword: analysis.keyword,
          monthlyPcQcCnt: analysis.monthlyPcQcCnt,
          monthlyMobileQcCnt: analysis.monthlyMobileQcCnt,
          totalQcCnt: analysis.totalQcCnt,
          compIdx: analysis.compIdx,
          avgDepth: analysis.avgDepth,
          bidCost: analysis.bidCost,
          analysisDate: new Date(analysis.analysisDate),
          createdAt: new Date(analysis.createdAt),
          updatedAt: new Date(analysis.updatedAt)
        }
      });
    }
    console.log('✅ KeywordAnalysis table migrated\n');

    console.log('🎉 Data migration completed successfully!');

    // 데이터 검증
    console.log('\n📋 Verification Summary:');
    const postgresUsers = await postgresClient.user.count();
    const postgresBlogProjects = await postgresClient.blogTrackingProject.count();
    const postgresBlogKeywords = await postgresClient.blogTrackingKeyword.count();
    const postgresSmartPlaces = await postgresClient.smartPlace.count();
    const postgresSmartKeywords = await postgresClient.smartPlaceKeyword.count();

    console.log(`Users: ${postgresUsers}`);
    console.log(`Blog Projects: ${postgresBlogProjects}`);
    console.log(`Blog Keywords: ${postgresBlogKeywords}`);
    console.log(`Smart Places: ${postgresSmartPlaces}`);
    console.log(`Smart Keywords: ${postgresSmartKeywords}`);

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