const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'b4eturwt8cnf3b4gqngb-mysql.services.clever-cloud.com',
    user: process.env.DB_USER || 'un9gagdyqj29naam',
    password: process.env.DB_PASSWORD || 'FTasnXdDXtYM64i89fOK',
    database: process.env.DB_NAME || 'b4eturwt8cnf3b4gqngb',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
};

const pool = {
    async query(sql, values) {
        let conn;
        try {
            conn = await mysql.createConnection(dbConfig);
            const [rows, fields] = await conn.query(sql, values);
            return [rows, fields];
        } finally {
            if (conn) await conn.end();
        }
    },
    async execute(sql, values) {
        let conn;
        try {
            conn = await mysql.createConnection(dbConfig);
            const [rows, fields] = await conn.execute(sql, values);
            return [rows, fields];
        } finally {
            if (conn) await conn.end();
        }
    },
    async getConnection() {
        const conn = await mysql.createConnection(dbConfig);
        // Add a release method so old code calling conn.release() works,
        // but instead of returning to a pool, we actually end the connection.
        const originalRelease = conn.release ? conn.release.bind(conn) : undefined;
        conn.release = async () => {
            if (originalRelease) originalRelease();
            await conn.end();
        };
        return conn;
    }
};

module.exports = pool;
