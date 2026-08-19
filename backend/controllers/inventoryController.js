
const { v4: uuidv4 } = require('uuid');

const getAllInventorys = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM Inventory WHERE deleted_at IS NULL ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getInventoryById = async (req, res, next) => {
    try {
        const { id } = req.params;
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
        const id = uuidv4();
        const { part_number, name, description, unit_price, quantity_in_stock, reorder_level, supplier_info } = req.body;
        
        await req.db.query(
            'INSERT INTO Inventory (id, part_number, name, description, unit_price, quantity_in_stock, reorder_level, supplier_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, req.body.part_number, req.body.name, req.body.description, req.body.unit_price, req.body.quantity_in_stock, req.body.reorder_level, req.body.supplier_info]
        );
        
        const [rows] = await req.db.query('SELECT * FROM Inventory WHERE id = ? AND deleted_at IS NULL', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const updateInventory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { part_number, name, description, unit_price, quantity_in_stock, reorder_level, supplier_info } = req.body;
        
        const [result] = await req.db.query(
            'UPDATE Inventory SET part_number = ?, name = ?, description = ?, unit_price = ?, quantity_in_stock = ?, reorder_level = ?, supplier_info = ? WHERE id = ?',
            [req.body.part_number, req.body.name, req.body.description, req.body.unit_price, req.body.quantity_in_stock, req.body.reorder_level, req.body.supplier_info, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Inventory not found' });
        }
        
        const [rows] = await req.db.query('SELECT * FROM Inventory WHERE id = ? AND deleted_at IS NULL', [id]);
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const deleteInventory = async (req, res, next) => {
    try {
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
