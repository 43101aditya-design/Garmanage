const { v4: uuidv4 } = require('uuid');
const { getAuthorizedGarageIds, isGarageAuthorized } = require('../utils/tenantScope');

const getAllInventorys = async (req, res, next) => {
    try {
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        // Customers have no access to raw inventory catalog
        if (role === 'CUSTOMER') {
            return res.status(403).json({ error: 'Forbidden: Customers cannot access workshop inventory' });
        }

        const [rows] = await req.db.query('SELECT * FROM Inventory WHERE deleted_at IS NULL ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getInventoryById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        if (role === 'CUSTOMER') {
            return res.status(403).json({ error: 'Forbidden: Customers cannot access workshop inventory' });
        }

        const [rows] = await req.db.query('SELECT * FROM Inventory WHERE id = ? AND deleted_at IS NULL', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Inventory not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const createInventory = async (req, res, next) => {
    try {
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MANAGER') {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges to create inventory' });
        }

        const id = uuidv4();
        const { part_number, name, description, supplier_info } = req.body;
        const unit_price = Math.max(0, Math.round(Number(req.body.unit_price || 0) * 100) / 100);
        const quantity_in_stock = Math.max(0, parseInt(req.body.quantity_in_stock || 0, 10));
        const reorder_level = Math.max(0, parseInt(req.body.reorder_level || 5, 10));
        
        await req.db.query(
            `INSERT INTO Inventory (id, part_number, name, description, unit_price, quantity_in_stock, reorder_level, supplier_info) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, part_number, name, description || null, unit_price, quantity_in_stock, reorder_level, supplier_info || null]
        );
        
        const [rows] = await req.db.query('SELECT * FROM Inventory WHERE id = ? AND deleted_at IS NULL', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

/**
 * Atomic Inventory Update with Negative Stock Prevention.
 */
const updateInventory = async (req, res, next) => {
    let connection;
    try {
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MANAGER') {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges to update inventory' });
        }

        const { id } = req.params;
        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [existing] = await connection.query('SELECT * FROM Inventory WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [id]);
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Inventory not found' });
        }

        const item = existing[0];
        const newQty = req.body.quantity_in_stock !== undefined ? parseInt(req.body.quantity_in_stock, 10) : item.quantity_in_stock;

        if (newQty < 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Inventory quantity cannot be negative' });
        }

        const unit_price = req.body.unit_price !== undefined ? Math.max(0, Math.round(Number(req.body.unit_price) * 100) / 100) : item.unit_price;
        const reorder_level = req.body.reorder_level !== undefined ? Math.max(0, parseInt(req.body.reorder_level, 10)) : item.reorder_level;

        await connection.query(
            `UPDATE Inventory 
             SET part_number = ?, name = ?, description = ?, unit_price = ?, quantity_in_stock = ?, reorder_level = ?, supplier_info = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND quantity_in_stock >= 0`,
            [
                req.body.part_number || item.part_number, 
                req.body.name || item.name, 
                req.body.description !== undefined ? req.body.description : item.description, 
                unit_price, 
                newQty, 
                reorder_level, 
                req.body.supplier_info !== undefined ? req.body.supplier_info : item.supplier_info, 
                id
            ]
        );

        await connection.commit();

        const [rows] = await req.db.query('SELECT * FROM Inventory WHERE id = ? AND deleted_at IS NULL', [id]);
        res.json(rows[0]);
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};

const deleteInventory = async (req, res, next) => {
    try {
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MANAGER') {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges to delete inventory' });
        }

        const { id } = req.params;
        const [result] = await req.db.query('UPDATE Inventory SET deleted_at = NOW() WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Inventory not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllInventorys,
    getInventoryById,
    createInventory,
    updateInventory,
    deleteInventory
};
