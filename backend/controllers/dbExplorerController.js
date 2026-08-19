const getDatabaseSchema = async (req, res, next) => {
    try {
        const dbName = process.env.DB_NAME || 'svsms_db';
        
        // 1. Get all tables and row counts
        const [tables] = await req.db.query(`
            SELECT 
                TABLE_NAME AS tableName, 
                TABLE_ROWS AS rowCount 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
        `, [dbName]);

        const schema = {};

        for (const table of tables) {
            // 2. Get columns and data types
            const [columns] = await req.db.query(`
                SELECT 
                    COLUMN_NAME AS name, 
                    COLUMN_TYPE AS type, 
                    COLUMN_KEY AS columnKey, 
                    IS_NULLABLE AS isNullable, 
                    COLUMN_DEFAULT AS defaultValue
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            `, [dbName, table.tableName]);

            // 3. Get foreign keys
            const [foreignKeys] = await req.db.query(`
                SELECT 
                    COLUMN_NAME AS columnName,
                    REFERENCED_TABLE_NAME AS referencedTable,
                    REFERENCED_COLUMN_NAME AS referencedColumn
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
            `, [dbName, table.tableName]);

            // 4. Get indexes
            const [indexes] = await req.db.query(`
                SELECT 
                    INDEX_NAME AS indexName, 
                    COLUMN_NAME AS columnName, 
                    NON_UNIQUE AS nonUnique
                FROM INFORMATION_SCHEMA.STATISTICS
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            `, [dbName, table.tableName]);

            schema[table.tableName] = {
                rowCount: table.rowCount,
                columns: columns.map(col => ({
                    name: col.name,
                    type: col.type,
                    isPrimaryKey: col.columnKey === 'PRI',
                    isNullable: col.isNullable === 'YES',
                    defaultValue: col.defaultValue,
                    isForeignKey: foreignKeys.some(fk => fk.columnName === col.name),
                    foreignKeyReference: foreignKeys.find(fk => fk.columnName === col.name) 
                        ? `${foreignKeys.find(fk => fk.columnName === col.name).referencedTable}.${foreignKeys.find(fk => fk.columnName === col.name).referencedColumn}`
                        : null
                })),
                indexes: indexes.map(idx => ({
                    name: idx.indexName,
                    column: idx.columnName,
                    isUnique: idx.nonUnique === 0
                }))
            };
        }

        // 5. Get Views
        const [views] = await req.db.query(`
            SELECT TABLE_NAME AS viewName 
            FROM INFORMATION_SCHEMA.VIEWS 
            WHERE TABLE_SCHEMA = ?
        `, [dbName]);

        // 6. Get Stored Procedures
        const [procedures] = await req.db.query(`
            SELECT ROUTINE_NAME AS procedureName 
            FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'
        `, [dbName]);

        // 7. Get Triggers
        const [triggers] = await req.db.query(`
            SELECT TRIGGER_NAME AS triggerName, EVENT_MANIPULATION AS event, EVENT_OBJECT_TABLE AS tableName, ACTION_TIMING AS timing
            FROM INFORMATION_SCHEMA.TRIGGERS 
            WHERE TRIGGER_SCHEMA = ?
        `, [dbName]);

        res.json({
            tables: schema,
            views: views.map(v => v.viewName),
            procedures: procedures.map(p => p.procedureName),
            triggers: triggers.map(t => ({
                name: t.triggerName,
                table: t.tableName,
                timing: t.timing,
                event: t.event
            }))
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDatabaseSchema
};
