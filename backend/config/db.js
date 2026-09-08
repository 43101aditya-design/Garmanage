const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'b4eturwt8cnf3b4gqngb-mysql.services.clever-cloud.com',
    user: process.env.DB_USER || 'un9gagdyqj29naam',
    password: process.env.DB_PASSWORD || 'FTasnXdDXtYM64i89fOK',
    database: process.env.DB_NAME || 'b4eturwt8cnf3b4gqngb',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
    connectionLimit: 3, // Hard limit to stay below max_user_connections (5)
    waitForConnections: true,
    queueLimit: 0
};

const poolInstance = mysql.createPool(dbConfig);

const pool = {
    async query(sql, values) {
        return poolInstance.query(sql, values);
    },
    async execute(sql, values) {
        return poolInstance.execute(sql, values);
    },
    async getConnection() {
        return poolInstance.getConnection();
    }
};

module.exports = pool;

