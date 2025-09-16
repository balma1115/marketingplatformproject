const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const bcrypt = require('bcryptjs');

// SQLite 데이터베이스 연결
const sqliteDb = new sqlite3.Database('./prisma/dev.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('SQLite connection error:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

async function generateMigrationSQL() {
  console.log('📦 Generating migration SQL from SQLite...\n');

  let sql = '-- PostgreSQL Data Migration\n';
  sql += '-- Generated from SQLite database\n\n';

  try {
    // 1. users 테이블 마이그레이션
    console.log('👤 Generating users data...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${users.length} users`);

    if (users.length > 0) {
      sql += '-- Users data\n';
      for (const user of users) {
        // 비밀번호 해싱 확인
        let hashedPassword = user.password;
        if (!hashedPassword.startsWith('$2')) {
          hashedPassword = await bcrypt.hash(user.password, 10);
        }

        const email = user.email.replace(/'/g, "''");
        const name = (user.name || user.email.split('@')[0]).replace(/'/g, "''");
        const role = user.role || 'USER';
        const businessName = user.businessName ? `'${user.businessName.replace(/'/g, "''")}'` : 'NULL';
        const businessType = user.businessType ? `'${user.businessType.replace(/'/g, "''")}'` : 'NULL';
        const phone = user.phone ? `'${user.phone.replace(/'/g, "''")}'` : 'NULL';
        const isActive = user.isActive === 1 || user.isActive === true;

        sql += `INSERT INTO users (id, email, password, name, role, business_name, business_type, phone, is_active, created_at, updated_at) VALUES (`;
        sql += `${user.id}, '${email}', '${hashedPassword}', '${name}', '${role}', ${businessName}, ${businessType}, ${phone}, ${isActive}, `;
        sql += `'${user.createdAt || new Date().toISOString()}', '${user.updatedAt || new Date().toISOString()}');\n`;
      }
      sql += '\n';
    }

    // 2. blog_tracking_projects 테이블 마이그레이션
    console.log('📝 Generating blog_tracking_projects data...');
    const blogProjects = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM blog_tracking_projects', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${blogProjects.length} blog projects`);

    if (blogProjects.length > 0) {
      sql += '-- Blog tracking projects data\n';
      for (const project of blogProjects) {
        if (!project.blogUrl) continue; // Skip if no blog URL
        const blogUrl = project.blogUrl.replace(/'/g, "''");
        const blogName = (project.blogName || 'Unknown Blog').replace(/'/g, "''");
        const blogId = project.blogId ? `'${project.blogId.replace(/'/g, "''")}'` : 'NULL';

        sql += `INSERT INTO blog_tracking_projects (id, user_id, blog_url, blog_name, blog_id, created_at, updated_at) VALUES (`;
        sql += `${project.id}, ${project.userId}, '${blogUrl}', '${blogName}', ${blogId}, `;
        sql += `'${project.createdAt || new Date().toISOString()}', '${project.updatedAt || new Date().toISOString()}');\n`;
      }
      sql += '\n';
    }

    // 3. blog_tracking_keywords 테이블 마이그레이션
    console.log('🔑 Generating blog_tracking_keywords data...');
    const blogKeywords = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM blog_tracking_keywords', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${blogKeywords.length} blog keywords`);

    if (blogKeywords.length > 0) {
      sql += '-- Blog tracking keywords data\n';
      for (const keyword of blogKeywords) {
        const kw = keyword.keyword.replace(/'/g, "''");
        const isActive = keyword.isActive === 1 || keyword.isActive === true;
        const lastChecked = keyword.lastChecked ? `'${keyword.lastChecked}'` : 'NULL';

        sql += `INSERT INTO blog_tracking_keywords (id, project_id, keyword, is_active, added_date, last_checked, created_at, updated_at) VALUES (`;
        sql += `${keyword.id}, ${keyword.projectId}, '${kw}', ${isActive}, '${keyword.addedDate || new Date().toISOString()}', ${lastChecked}, `;
        sql += `'${keyword.createdAt || new Date().toISOString()}', '${keyword.updatedAt || new Date().toISOString()}');\n`;
      }
      sql += '\n';
    }

    // 4. blog_tracking_results 테이블 마이그레이션
    console.log('📊 Generating blog_tracking_results data...');
    const blogResults = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM blog_tracking_results', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${blogResults.length} blog results`);

    if (blogResults.length > 0) {
      sql += '-- Blog tracking results data\n';
      for (const result of blogResults) {
        const mainTabExposed = result.mainTabExposed === 1 || result.mainTabExposed === true;
        const found = result.found === 1 || result.found === true;
        const url = result.url ? `'${result.url.replace(/'/g, "''")}'` : 'NULL';
        const mainTabRank = result.mainTabRank || 'NULL';
        const blogTabRank = result.blogTabRank || 'NULL';
        const viewTabRank = result.viewTabRank || 'NULL';
        const adRank = result.adRank || 'NULL';

        sql += `INSERT INTO blog_tracking_results (id, keyword_id, tracking_date, main_tab_exposed, main_tab_rank, blog_tab_rank, view_tab_rank, ad_rank, found, url, created_at, updated_at) VALUES (`;
        sql += `${result.id}, ${result.keywordId}, '${result.trackingDate || new Date().toISOString()}', ${mainTabExposed}, ${mainTabRank}, ${blogTabRank}, ${viewTabRank}, ${adRank}, ${found}, ${url}, `;
        sql += `'${result.createdAt || new Date().toISOString()}', '${result.updatedAt || new Date().toISOString()}');\n`;
      }
      sql += '\n';
    }

    // 5. smartplaces 테이블 마이그레이션
    console.log('🏪 Generating smartplaces data...');
    const smartPlaces = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM smartplaces', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${smartPlaces.length} smart places`);

    if (smartPlaces.length > 0) {
      sql += '-- Smart places data\n';
      for (const place of smartPlaces) {
        const placeId = (place.placeId || `place_${place.id}`).replace(/'/g, "''");
        const placeName = (place.placeName || 'Unknown Place').replace(/'/g, "''");
        const address = place.address ? `'${place.address.replace(/'/g, "''")}'` : 'NULL';
        const phone = place.phone ? `'${place.phone.replace(/'/g, "''")}'` : 'NULL';
        const rating = place.rating || 'NULL';
        const reviewCount = place.reviewCount || 'NULL';
        const category = place.category ? `'${place.category.replace(/'/g, "''")}'` : 'NULL';

        // SmartPlace uses cuid() for id, so we need to generate one
        const cuid = `clk${Math.random().toString(36).substr(2, 9)}${Date.now().toString(36)}`;

        sql += `INSERT INTO smartplaces (id, user_id, place_id, place_name, address, phone, rating, review_count, category, created_at) VALUES (`;
        sql += `'${cuid}', ${place.userId}, '${placeId}', '${placeName}', ${address}, ${phone}, ${rating}, ${reviewCount}, ${category}, `;
        sql += `'${place.createdAt || new Date().toISOString()}');\n`;
      }
      sql += '\n';
    }

    // 6. smartplace_keywords 테이블 마이그레이션
    console.log('🔑 Generating smartplace_keywords data...');
    const smartKeywords = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM smartplace_keywords', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    console.log(`Found ${smartKeywords.length} smart place keywords`);

    if (smartKeywords.length > 0) {
      sql += '-- Smart place keywords data\n';

      // First, get the smart place ID mapping
      const smartPlaceMapping = {};
      const generatedPlaces = await new Promise((resolve, reject) => {
        sqliteDb.all('SELECT id, user_id FROM smartplaces', (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      generatedPlaces.forEach(place => {
        const cuid = `clk${Math.random().toString(36).substr(2, 9)}${Date.now().toString(36)}`;
        smartPlaceMapping[place.id] = cuid;
      });

      for (const keyword of smartKeywords) {
        const kw = keyword.keyword.replace(/'/g, "''");
        const isActive = keyword.isActive === 1 || keyword.isActive === true;
        const lastChecked = keyword.lastChecked ? `'${keyword.lastChecked}'` : 'NULL';
        const smartPlaceId = smartPlaceMapping[keyword.smartPlaceId];

        if (smartPlaceId) {
          const cuid = `clk${Math.random().toString(36).substr(2, 9)}${Date.now().toString(36)}`;

          sql += `INSERT INTO smartplace_keywords (id, user_id, smartplace_id, keyword, is_active, last_checked, created_at) VALUES (`;
          sql += `'${cuid}', ${keyword.userId}, '${smartPlaceId}', '${kw}', ${isActive}, ${lastChecked}, `;
          sql += `'${keyword.createdAt || new Date().toISOString()}');\n`;
        }
      }
      sql += '\n';
    }

    // Update sequences
    sql += '-- Update sequences\n';
    sql += `SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));\n`;
    sql += `SELECT setval(pg_get_serial_sequence('blog_tracking_projects', 'id'), (SELECT MAX(id) FROM blog_tracking_projects));\n`;
    sql += `SELECT setval(pg_get_serial_sequence('blog_tracking_keywords', 'id'), (SELECT MAX(id) FROM blog_tracking_keywords));\n`;
    sql += `SELECT setval(pg_get_serial_sequence('blog_tracking_results', 'id'), (SELECT MAX(id) FROM blog_tracking_results));\n`;

    // Save to file
    fs.writeFileSync('data-migration.sql', sql);
    console.log('\n✅ Migration SQL generated: data-migration.sql');

  } catch (error) {
    console.error('❌ Failed to generate migration:', error);
    throw error;
  } finally {
    sqliteDb.close();
  }
}

// 실행
generateMigrationSQL().catch(console.error);