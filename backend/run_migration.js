require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    multipleStatements: true
  });
  
  const sql = fs.readFileSync('sql/11_phase5_ai_assignment.sql', 'utf8');
  await connection.query(sql);
  console.log('Migration executed successfully');
  await connection.end();
}
run().catch(console.error);
