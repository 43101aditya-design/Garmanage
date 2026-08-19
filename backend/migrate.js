const fs = require('fs');
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'b4eturwt8cnf3b4gqngb-mysql.services.clever-cloud.com',
    user: 'un9gagdyqj29naam',
    password: 'FTasnXdDXtYM64i89fOK',
    database: 'b4eturwt8cnf3b4gqngb',
    port: 3306,
    multipleStatements: true
  });

  const files = [
    'sql/06_saas_upgrade.sql'
  ];

  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log(`Executing ${file}...`);
      let sql = fs.readFileSync(file, 'utf8');
      
      // Remove DB creation
      sql = sql.replace(/CREATE DATABASE IF NOT EXISTS svsms_db;/gi, '');
      sql = sql.replace(/USE svsms_db;/gi, '');
      
      if (sql.includes('DELIMITER //')) {
        // Split file into normal parts and delimited parts
        const parts = sql.split('DELIMITER //');
        
        for (let i = 0; i < parts.length; i++) {
          if (i === 0) {
            // Normal SQL before the first DELIMITER //
            const normalSql = parts[i].trim();
            if (normalSql) {
              try { await connection.query(normalSql); } catch(e) { console.error(`Error in normal part of ${file}:`, e.message); }
            }
          } else {
            // This part ends with DELIMITER ; or EOF
            const subParts = parts[i].split('DELIMITER ;');
            const delimitedBlock = subParts[0];
            
            // The delimited block is separated by //
            const queries = delimitedBlock.split('//').map(s => s.trim()).filter(s => s.length > 0);
            for (let q of queries) {
              try {
                await connection.query(q);
              } catch(e) {
                console.error(`Error in block of ${file}:`, e.message);
              }
            }
            
            // The rest after DELIMITER ; is normal SQL
            if (subParts.length > 1) {
              const restSql = subParts[1].trim();
              if (restSql) {
                try { await connection.query(restSql); } catch(e) { console.error(`Error in rest of ${file}:`, e.message); }
              }
            }
          }
        }
        console.log(`Success: ${file}`);
      } else {
        try {
          await connection.query(sql);
          console.log(`Success: ${file}`);
        } catch (err) {
          console.error(`Error in ${file}:`, err.message);
        }
      }
    }
  }
  await connection.end();
}

migrate();
