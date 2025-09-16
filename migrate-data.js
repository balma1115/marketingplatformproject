const { PrismaClient: SqliteClient } = require('.prisma/client-sqlite');
const { PrismaClient: PostgresClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// SQLite 클라이언트 설정
const sqliteClient = new SqliteClient();

// PostgreSQL 클라이언트 설정
const postgresClient = new PostgresClient();

async function migrateData() {
  console.log('📦 Starting data migration from SQLite to PostgreSQL...\n');

  try {
    // 1. User 테이블 마이그레이션
    console.log('👤 Migrating User table...');
    const users = await sqliteClient.user.findMany();
    console.log(`Found ${users.length} users`);

    for (const user of users) {
      await postgresClient.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
    }
    console.log('✅ User table migrated\n');

    // 2. BlogTrackingProject 테이블 마이그레이션
    console.log('📝 Migrating BlogTrackingProject table...');
    const blogProjects = await sqliteClient.blogTrackingProject.findMany();
    console.log(`Found ${blogProjects.length} blog projects`);

    for (const project of blogProjects) {
      await postgresClient.blogTrackingProject.upsert({
        where: { id: project.id },
        update: {},
        create: {
          ...project,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt)
        }
      });
    }
    console.log('✅ BlogTrackingProject table migrated\n');

    // 3. BlogTrackingKeyword 테이블 마이그레이션
    console.log('🔑 Migrating BlogTrackingKeyword table...');
    const blogKeywords = await sqliteClient.blogTrackingKeyword.findMany();
    console.log(`Found ${blogKeywords.length} blog keywords`);

    for (const keyword of blogKeywords) {
      await postgresClient.blogTrackingKeyword.upsert({
        where: { id: keyword.id },
        update: {},
        create: {
          ...keyword,
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
    const blogResults = await sqliteClient.blogTrackingResult.findMany();
    console.log(`Found ${blogResults.length} blog results`);

    for (const result of blogResults) {
      await postgresClient.blogTrackingResult.upsert({
        where: { id: result.id },
        update: {},
        create: {
          ...result,
          trackingDate: new Date(result.trackingDate),
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt)
        }
      });
    }
    console.log('✅ BlogTrackingResult table migrated\n');

    // 5. SmartPlace 테이블 마이그레이션
    console.log('🏪 Migrating SmartPlace table...');
    const smartPlaces = await sqliteClient.smartPlace.findMany();
    console.log(`Found ${smartPlaces.length} smart places`);

    for (const place of smartPlaces) {
      await postgresClient.smartPlace.upsert({
        where: { id: place.id },
        update: {},
        create: {
          ...place,
          createdAt: new Date(place.createdAt),
          updatedAt: new Date(place.updatedAt)
        }
      });
    }
    console.log('✅ SmartPlace table migrated\n');

    // 6. SmartPlaceKeyword 테이블 마이그레이션
    console.log('🔑 Migrating SmartPlaceKeyword table...');
    const smartKeywords = await sqliteClient.smartPlaceKeyword.findMany();
    console.log(`Found ${smartKeywords.length} smart place keywords`);

    for (const keyword of smartKeywords) {
      await postgresClient.smartPlaceKeyword.upsert({
        where: { id: keyword.id },
        update: {},
        create: {
          ...keyword,
          lastChecked: keyword.lastChecked ? new Date(keyword.lastChecked) : null,
          createdAt: new Date(keyword.createdAt),
          updatedAt: new Date(keyword.updatedAt)
        }
      });
    }
    console.log('✅ SmartPlaceKeyword table migrated\n');

    // 7. SmartPlaceRanking 테이블 마이그레이션
    console.log('📈 Migrating SmartPlaceRanking table...');
    const smartRankings = await sqliteClient.smartPlaceRanking.findMany();
    console.log(`Found ${smartRankings.length} smart place rankings`);

    for (const ranking of smartRankings) {
      await postgresClient.smartPlaceRanking.upsert({
        where: { id: ranking.id },
        update: {},
        create: {
          ...ranking,
          checkDate: new Date(ranking.checkDate),
          createdAt: new Date(ranking.createdAt),
          updatedAt: new Date(ranking.updatedAt)
        }
      });
    }
    console.log('✅ SmartPlaceRanking table migrated\n');

    // 8. NaverAdsCampaign 테이블 마이그레이션
    console.log('💰 Migrating NaverAdsCampaign table...');
    const campaigns = await sqliteClient.naverAdsCampaign.findMany();
    console.log(`Found ${campaigns.length} campaigns`);

    for (const campaign of campaigns) {
      await postgresClient.naverAdsCampaign.upsert({
        where: { id: campaign.id },
        update: {},
        create: {
          ...campaign,
          createdAt: new Date(campaign.createdAt),
          updatedAt: new Date(campaign.updatedAt)
        }
      });
    }
    console.log('✅ NaverAdsCampaign table migrated\n');

    // 9. NaverAdsAdGroup 테이블 마이그레이션
    console.log('📢 Migrating NaverAdsAdGroup table...');
    const adGroups = await sqliteClient.naverAdsAdGroup.findMany();
    console.log(`Found ${adGroups.length} ad groups`);

    for (const adGroup of adGroups) {
      await postgresClient.naverAdsAdGroup.upsert({
        where: { id: adGroup.id },
        update: {},
        create: {
          ...adGroup,
          createdAt: new Date(adGroup.createdAt),
          updatedAt: new Date(adGroup.updatedAt)
        }
      });
    }
    console.log('✅ NaverAdsAdGroup table migrated\n');

    // 10. NaverAdsKeyword 테이블 마이그레이션
    console.log('🔍 Migrating NaverAdsKeyword table...');
    const adsKeywords = await sqliteClient.naverAdsKeyword.findMany();
    console.log(`Found ${adsKeywords.length} ads keywords`);

    for (const keyword of adsKeywords) {
      await postgresClient.naverAdsKeyword.upsert({
        where: { id: keyword.id },
        update: {},
        create: {
          ...keyword,
          createdAt: new Date(keyword.createdAt),
          updatedAt: new Date(keyword.updatedAt)
        }
      });
    }
    console.log('✅ NaverAdsKeyword table migrated\n');

    // 11. NaverAdsStat 테이블 마이그레이션
    console.log('📊 Migrating NaverAdsStat table...');
    const adsStats = await sqliteClient.naverAdsStat.findMany();
    console.log(`Found ${adsStats.length} ads stats`);

    for (const stat of adsStats) {
      await postgresClient.naverAdsStat.upsert({
        where: { id: stat.id },
        update: {},
        create: {
          ...stat,
          statDate: new Date(stat.statDate),
          createdAt: new Date(stat.createdAt),
          updatedAt: new Date(stat.updatedAt)
        }
      });
    }
    console.log('✅ NaverAdsStat table migrated\n');

    // 12. KeywordAnalysis 테이블 마이그레이션
    console.log('🔍 Migrating KeywordAnalysis table...');
    const keywordAnalyses = await sqliteClient.keywordAnalysis.findMany();
    console.log(`Found ${keywordAnalyses.length} keyword analyses`);

    for (const analysis of keywordAnalyses) {
      await postgresClient.keywordAnalysis.upsert({
        where: { id: analysis.id },
        update: {},
        create: {
          ...analysis,
          createdAt: new Date(analysis.createdAt),
          updatedAt: new Date(analysis.updatedAt)
        }
      });
    }
    console.log('✅ KeywordAnalysis table migrated\n');

    // 13. KeywordSearchResult 테이블 마이그레이션
    console.log('🔍 Migrating KeywordSearchResult table...');
    const searchResults = await sqliteClient.keywordSearchResult.findMany();
    console.log(`Found ${searchResults.length} search results`);

    for (const result of searchResults) {
      await postgresClient.keywordSearchResult.upsert({
        where: { id: result.id },
        update: {},
        create: {
          ...result,
          searchDate: new Date(result.searchDate),
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt)
        }
      });
    }
    console.log('✅ KeywordSearchResult table migrated\n');

    // 14. TrackingQueue 테이블 마이그레이션
    console.log('⏳ Migrating TrackingQueue table...');
    const trackingQueues = await sqliteClient.trackingQueue.findMany();
    console.log(`Found ${trackingQueues.length} tracking queues`);

    for (const queue of trackingQueues) {
      await postgresClient.trackingQueue.upsert({
        where: { id: queue.id },
        update: {},
        create: {
          ...queue,
          startedAt: queue.startedAt ? new Date(queue.startedAt) : null,
          completedAt: queue.completedAt ? new Date(queue.completedAt) : null,
          createdAt: new Date(queue.createdAt),
          updatedAt: new Date(queue.updatedAt)
        }
      });
    }
    console.log('✅ TrackingQueue table migrated\n');

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
    await sqliteClient.$disconnect();
    await postgresClient.$disconnect();
  }
}

// 실행
migrateData().catch(console.error);