const pool = require('../config/db');

// Middleware to inject a custom query executor that logs SQL operations
const sqlLoggerMiddleware = (req, res, next) => {
    req.sqlLogs = [];

    // Create a wrapper around pool.query for this specific request
    req.db = {
        query: async (sql, values) => {
            const startTime = process.hrtime();
            
            try {
                // Execute the actual query
                const [rows, fields] = await pool.query(sql, values);
                
                const endTime = process.hrtime(startTime);
                const executionTimeMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
                
                // Determine operation type
                const upperSql = sql.trim().toUpperCase();
                let opType = 'OTHER';
                let tableName = 'Unknown';
                
                if (upperSql.startsWith('SELECT')) opType = 'SELECT';
                else if (upperSql.startsWith('INSERT')) opType = 'INSERT';
                else if (upperSql.startsWith('UPDATE')) opType = 'UPDATE';
                else if (upperSql.startsWith('DELETE')) opType = 'DELETE';
                else if (upperSql.startsWith('CALL')) opType = 'PROCEDURE';
                
                // Attempt to extract table name (basic extraction)
                if (opType === 'INSERT' || opType === 'UPDATE' || opType === 'DELETE') {
                    const match = upperSql.match(/(?:INTO|UPDATE|FROM)\s+`?([a-zA-Z0-9_]+)`?/i);
                    if (match && match[1]) {
                        tableName = match[1];
                    }
                }

                // If it's a DML operation (Insert, Update, Delete), we log it
                // We typically skip SELECTs for the SQL Monitor unless specifically requested to avoid flooding
                if (['INSERT', 'UPDATE', 'DELETE', 'PROCEDURE'].includes(opType) || executionTimeMs > 100) {
                    req.sqlLogs.push({
                        query: sql,
                        operation_type: opType,
                        table_name: tableName,
                        rows_affected: rows.affectedRows || 0,
                        execution_time_ms: parseFloat(executionTimeMs),
                        is_slow_query: executionTimeMs > 100, // Performance monitoring
                        timestamp: new Date().toISOString()
                    });
                }
                
                return [rows, fields];
            } catch (error) {
                const endTime = process.hrtime(startTime);
                const executionTimeMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
                
                req.sqlLogs.push({
                    query: sql,
                    operation_type: 'ERROR',
                    table_name: 'Unknown',
                    rows_affected: 0,
                    execution_time_ms: parseFloat(executionTimeMs),
                    error_message: error.message,
                    is_deadlock: error.code === 'ER_LOCK_DEADLOCK', // Deadlock monitoring
                    timestamp: new Date().toISOString()
                });
                
                throw error;
            }
        },
        // Support for transactions
        getConnection: async () => {
            const conn = await pool.getConnection();
            const originalQuery = conn.query.bind(conn);
            
            conn.query = async (sql, values) => {
                const startTime = process.hrtime();
                try {
                    const [rows, fields] = await originalQuery(sql, values);
                    const endTime = process.hrtime(startTime);
                    const executionTimeMs = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
                    
                    const upperSql = sql.trim().toUpperCase();
                    let opType = 'OTHER';
                    if (upperSql.startsWith('INSERT')) opType = 'INSERT';
                    else if (upperSql.startsWith('UPDATE')) opType = 'UPDATE';
                    else if (upperSql.startsWith('DELETE')) opType = 'DELETE';
                    else if (upperSql.startsWith('CALL')) opType = 'PROCEDURE';

                    if (['INSERT', 'UPDATE', 'DELETE', 'PROCEDURE'].includes(opType)) {
                        req.sqlLogs.push({
                            query: sql,
                            operation_type: opType,
                            table_name: 'Transaction',
                            rows_affected: rows.affectedRows || 0,
                            execution_time_ms: parseFloat(executionTimeMs),
                            timestamp: new Date().toISOString()
                        });
                    }
                    return [rows, fields];
                } catch (err) {
                    throw err;
                }
            };
            return conn;
        }
    };
    
    next();
};

// Response interceptor to attach SQL logs to outgoing JSON
const responseInterceptor = (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(body) {
        if (body && typeof body === 'object') {
            // Attach the sql execution logs gathered during this request
            body._sqlLogs = req.sqlLogs || [];
        }
        return originalJson.call(this, body);
    };
    
    next();
};

module.exports = { sqlLoggerMiddleware, responseInterceptor };
