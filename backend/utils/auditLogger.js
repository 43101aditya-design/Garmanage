const { v4: uuidv4 } = require('uuid');

const logAudit = async (db, tableName, recordId, action, oldValue, newValue, userId) => {
    try {
        const id = uuidv4();
        await db.query(
            'INSERT INTO Audit_Log (id, table_name, record_id, action, old_value, new_value, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, tableName, recordId, action, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, userId || null]
        );
    } catch (err) {
        console.error('Audit Log Error:', err.message);
    }
};

module.exports = { logAudit };
