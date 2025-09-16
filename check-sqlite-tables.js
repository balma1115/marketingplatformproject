const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./prisma/dev.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error listing tables:', err);
    return;
  }

  console.log('\n📋 Tables in SQLite database:');
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
  });

  // Check row counts for each table
  console.log('\n📊 Row counts:');
  let completedCount = 0;

  tables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
      if (err) {
        console.log(`  ${table.name}: Error counting`);
      } else {
        console.log(`  ${table.name}: ${row.count} rows`);
      }

      completedCount++;
      if (completedCount === tables.length) {
        db.close();
      }
    });
  });
});