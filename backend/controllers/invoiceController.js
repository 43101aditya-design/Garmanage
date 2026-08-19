
const { v4: uuidv4 } = require('uuid');

const getAllInvoices = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM Invoice WHERE deleted_at IS NULL ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getInvoiceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await req.db.query('SELECT * FROM Invoice WHERE id = ? AND deleted_at IS NULL', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const createInvoice = async (req, res, next) => {
    try {
        const id = uuidv4();
        const { appointment_id, customer_id, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, status } = req.body;
        
        await req.db.query(
            'INSERT INTO Invoice (id, appointment_id, customer_id, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, req.body.appointment_id, req.body.customer_id, req.body.issue_date, req.body.due_date, req.body.subtotal, req.body.tax_amount, req.body.discount_amount, req.body.total_amount, req.body.status]
        );
        
        const [rows] = await req.db.query('SELECT * FROM Invoice WHERE id = ? AND deleted_at IS NULL', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const updateInvoice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { appointment_id, customer_id, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, status } = req.body;
        
        const [result] = await req.db.query(
            'UPDATE Invoice SET appointment_id = ?, customer_id = ?, issue_date = ?, due_date = ?, subtotal = ?, tax_amount = ?, discount_amount = ?, total_amount = ?, status = ? WHERE id = ?',
            [req.body.appointment_id, req.body.customer_id, req.body.issue_date, req.body.due_date, req.body.subtotal, req.body.tax_amount, req.body.discount_amount, req.body.total_amount, req.body.status, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        const [rows] = await req.db.query('SELECT * FROM Invoice WHERE id = ? AND deleted_at IS NULL', [id]);
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const deleteInvoice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await req.db.query('UPDATE Invoice SET deleted_at = NOW() WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllInvoices,
    getInvoiceById,
    createInvoice,
    updateInvoice,
    deleteInvoice
};
