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
    connectionLimit: 1, // Single connection per lambda to stay safely within Clever Cloud free tier (max 5)
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: false,
    idleTimeout: 1000,
    maxIdle: 0
};

const poolInstance = mysql.createPool(dbConfig);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeWithRetry(fn, retries = 2, delayMs = 300) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const isConnectionLimit = err && (err.code === 'ER_USER_LIMIT_REACHED' || err.errno === 1226);
            if (isConnectionLimit && attempt < retries) {
                console.warn(`[DB] Connection limit reached. Retrying attempt ${attempt + 1}/${retries} after ${delayMs}ms...`);
                await sleep(delayMs * (attempt + 1));
                continue;
            }
            throw err;
        }
    }
}

const pool = {
    async query(sql, values) {
        return executeWithRetry(() => poolInstance.query(sql, values));
    },
    async execute(sql, values) {
        return executeWithRetry(() => poolInstance.execute(sql, values));
    },
    async getConnection() {
        return executeWithRetry(() => poolInstance.getConnection());
    }
};

module.exports = pool;

