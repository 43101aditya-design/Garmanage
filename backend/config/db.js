const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'b4eturwt8cnf3b4gqngb-mysql.services.clever-cloud.com',
    user: process.env.DB_USER || 'un9gagdyqj29naam',
    password: process.env.DB_PASSWORD || 'FTasnXdDXtYM64i89fOK',
    database: process.env.DB_NAME || 'b4eturwt8cnf3b4gqngb',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 2, // Clever Cloud free tier max is 5. Reduced to 2 for Serverless.
    queueLimit: 0,
    multipleStatements: true
});

module.exports = pool;
