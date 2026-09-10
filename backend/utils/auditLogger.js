const { v4: uuidv4 } = require('uuid');

const logAudit = async (firstArg, secondArg, entityType, entityId, oldValue = null, newValue = null) => {
    try {
        let db;
        let userId = null;
        let garageId = null;
        let action = 'OTHER';
        let entType = 'Unknown';
        let entId = 'Unknown';
        let oldVal = null;
        let newVal = null;
        let metadata = null;

        if (firstArg && typeof firstArg.query === 'function') {
            db = firstArg;
            const opts = secondArg || {};
            userId = opts.userId || null;
            garageId = opts.garageId || null;
            action = opts.action || 'OTHER';
            entType = opts.entityType || 'Unknown';
            entId = opts.entityId || 'Unknown';
            metadata = opts.metadata || null;
            oldVal = opts.oldValue || null;
            newVal = opts.newValue || null;
        } else if (firstArg && firstArg.db && typeof firstArg.db.query === 'function') {
            db = firstArg.db;
            userId = firstArg.user ? firstArg.user.id : null;
            garageId = firstArg.garageId || (firstArg.body ? firstArg.body.garage_id : null);
            action = secondArg || 'OTHER';
            entType = entityType || 'Unknown';
            entId = entityId || 'Unknown';
            oldVal = oldValue || null;
            newVal = newValue || null;
        } else {
            return;
        }

        const id = uuidv4();
        await db.query(
            'INSERT INTO Audit_Log (id, table_name, record_id, action, garage_id, metadata, old_value, new_value, user_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [
                id, 
                entType, 
                entId,   
                action, 
                garageId || null,
                metadata ? JSON.stringify(metadata) : null,
                oldVal ? JSON.stringify(oldVal) : null, 
                newVal ? JSON.stringify(newVal) : null, 
                userId || null
            ]
        );
    } catch (err) {
        console.error('Audit Log Error:', err.message);
    }
};

module.exports = { logAudit };
