const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./prisma/dev.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

async function checkNokyangData() {
  console.log('📋 Checking nokyang user data (ID: 16)...\n');

  // Check blog projects
  db.all('SELECT * FROM blog_tracking_projects WHERE user_id = 16', (err, rows) => {
    if (err) console.error('Error:', err);
    else {
      console.log(`Blog Projects: ${rows.length}`);
      if (rows.length > 0) console.log(rows);
    }
  });

  // Check smart places
  db.all('SELECT * FROM smartplaces WHERE user_id = 16', (err, rows) => {
    if (err) console.error('Error:', err);
    else {
      console.log(`\nSmart Places: ${rows.length}`);
      if (rows.length > 0) console.log(rows);
    }
  });

  // Check tracking projects
  db.all('SELECT * FROM tracking_projects WHERE user_id = 16', (err, rows) => {
    if (err) console.error('Error:', err);
    else {
      console.log(`\nTracking Projects: ${rows.length}`);
      if (rows.length > 0) console.log(rows);
    }
  });

  // Check all users to find nokyang
  db.all('SELECT id, email, name FROM users WHERE email LIKE "%nokyang%"', (err, rows) => {
    if (err) console.error('Error:', err);
    else {
      console.log(`\nNokyang Users: ${rows.length}`);
      if (rows.length > 0) console.log(rows);
    }
  });

  setTimeout(() => {
    db.close();
  }, 2000);
}

checkNokyangData();