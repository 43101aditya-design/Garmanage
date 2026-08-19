const { v4: uuidv4 } = require('uuid');

const getAllCustomers = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM Customer WHERE deleted_at IS NULL ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getCustomerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await req.db.query('SELECT * FROM Customer WHERE id = ? AND deleted_at IS NULL', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const createCustomer = async (req, res, next) => {
    try {
        const { first_name, last_name, email, phone, address } = req.body;
        const id = uuidv4();
        
        await req.db.query(
            'INSERT INTO Customer (id, first_name, last_name, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
            [id, first_name, last_name, email, phone, address]
        );
        
        const [rows] = await req.db.query('SELECT * FROM Customer WHERE id = ? AND deleted_at IS NULL', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        next(error);
    }
};

const updateCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, email, phone, address } = req.body;
        
        const [result] = await req.db.query(
            'UPDATE Customer SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ? WHERE id = ?',
            [first_name, last_name, email, phone, address, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        const [rows] = await req.db.query('SELECT * FROM Customer WHERE id = ? AND deleted_at IS NULL', [id]);
        res.json(rows[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        next(error);
    }
};

const deleteCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await req.db.query('UPDATE Customer SET deleted_at = NOW() WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};
