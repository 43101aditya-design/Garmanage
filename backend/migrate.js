const fs = require('fs');
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'b4eturwt8cnf3b4gqngb-mysql.services.clever-cloud.com',
    user: 'un9gagdyqj29naam',
    password: 'FTasnXdDXtYM64i89fOK',
    database: 'b4eturwt8cnf3b4gqngb',
    port: 3306
  });

  const files = [
    'sql/06_saas_upgrade.sql'
  ];

  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log(`Executing ${file} statement by statement...`);
      let sql = fs.readFileSync(file, 'utf8');
      
      // Remove DB selection
      sql = sql.replace(/USE svsms_db;/gi, '');
      
      // Split by semicolon, but handle clean splits
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.includes('DELIMITER'));
        
      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (e) {
          // Ignore duplicate column/key errors to allow recovery
          if (e.message.includes('Duplicate column') || e.message.includes('Duplicate key') || e.message.includes('already exists')) {
            console.log(`[Info] Skipping duplicate: ${e.message}`);
          } else {
            console.error(`[Error] Statement failed: "${statement.slice(0, 50)}..." - ${e.message}`);
          }
        }
      }
      console.log(`Finished ${file}`);
    }
  }
  await connection.end();
}

migrate();
