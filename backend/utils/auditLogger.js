const { v4: uuidv4 } = require('uuid');

const logAudit = async (db, { userId, garageId, action, entityType, entityId, metadata, oldValue = null, newValue = null }) => {
    try {
        const id = uuidv4();
        await db.query(
            'INSERT INTO Audit_Log (id, table_name, record_id, action, garage_id, entity_type, entity_id, metadata, old_value, new_value, user_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [
                id, 
                entityType, 
                entityId,   
                action, 
                garageId || null,
                entityType || null,
                entityId || null,
                metadata ? JSON.stringify(metadata) : null,
                oldValue ? JSON.stringify(oldValue) : null, 
                newValue ? JSON.stringify(newValue) : null, 
                userId || null
            ]
        );
    } catch (err) {
        console.error('Audit Log Error:', err.message);
    }
};

module.exports = { logAudit };
