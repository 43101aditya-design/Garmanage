const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runUpgrade() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        const SQL_FILES = [
            '04_enterprise_upgrade.sql',
            '05_business_intelligence.sql',
            '06_performance_indexes.sql'
        ];
        console.log('Running SQL Upgrade...');
        for (const file of SQL_FILES) {
            const sql = fs.readFileSync(path.join(__dirname, 'sql', file), 'utf8');
            await connection.query(sql);
            console.log(`Executed ${file}`);
        }
        console.log('Upgrade completed successfully.');
    } catch (error) {
        console.error('Error running upgrade:', error);
    } finally {
        await connection.end();
    }
}

runUpgrade();
