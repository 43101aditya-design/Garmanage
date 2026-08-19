
const { v4: uuidv4 } = require('uuid');

const getAllPayments = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM Payment WHERE deleted_at IS NULL ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getPaymentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await req.db.query('SELECT * FROM Payment WHERE id = ? AND deleted_at IS NULL', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const createPayment = async (req, res, next) => {
    try {
        const id = uuidv4();
        const { invoice_id, amount, payment_date, payment_method, transaction_reference } = req.body;
        
        await req.db.query(
            'INSERT INTO Payment (id, invoice_id, amount, payment_date, payment_method, transaction_reference) VALUES (?, ?, ?, ?, ?, ?)',
            [id, req.body.invoice_id, req.body.amount, req.body.payment_date, req.body.payment_method, req.body.transaction_reference]
        );
        
        const [rows] = await req.db.query('SELECT * FROM Payment WHERE id = ? AND deleted_at IS NULL', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const updatePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { invoice_id, amount, payment_date, payment_method, transaction_reference } = req.body;
        
        const [result] = await req.db.query(
            'UPDATE Payment SET invoice_id = ?, amount = ?, payment_date = ?, payment_method = ?, transaction_reference = ? WHERE id = ?',
            [req.body.invoice_id, req.body.amount, req.body.payment_date, req.body.payment_method, req.body.transaction_reference, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        const [rows] = await req.db.query('SELECT * FROM Payment WHERE id = ? AND deleted_at IS NULL', [id]);
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const deletePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await req.db.query('UPDATE Payment SET deleted_at = NOW() WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllPayments,
    getPaymentById,
    createPayment,
    updatePayment,
    deletePayment
};
