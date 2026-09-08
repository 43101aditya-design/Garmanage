const { v4: uuidv4 } = require('uuid');
const { getAuthorizedGarageIds, isGarageAuthorized } = require('../utils/tenantScope');

const getAllPayments = async (req, res, next) => {
    try {
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        if (role === 'CUSTOMER') {
            const customerId = user.customer_id || user.id;
            const [rows] = await req.db.query(`
                SELECT p.*, i.customer_id, i.total_amount AS invoice_total
                FROM Payment p
                JOIN Invoice i ON p.invoice_id = i.id
                WHERE i.customer_id = ? AND p.deleted_at IS NULL
                ORDER BY p.created_at DESC
            `, [customerId]);
            return res.json(rows);
        }

        const authorizedGarages = getAuthorizedGarageIds(user);
        if (role === 'OWNER' || role === 'ADMIN') {
            if (authorizedGarages.length > 0) {
                const [rows] = await req.db.query(`
                    SELECT p.*, a.garage_id, i.customer_id, i.total_amount AS invoice_total
                    FROM Payment p
                    JOIN Invoice i ON p.invoice_id = i.id
                    JOIN Appointment a ON i.appointment_id = a.id
                    WHERE a.garage_id IN (?) AND p.deleted_at IS NULL
                    ORDER BY p.created_at DESC
                `, [authorizedGarages]);
                return res.json(rows);
            } else {
                const [rows] = await req.db.query('SELECT * FROM Payment WHERE deleted_at IS NULL ORDER BY created_at DESC');
                return res.json(rows);
            }
        }

        // Manager / Mechanic
        if (authorizedGarages.length === 0) {
            return res.json([]);
        }

        const [rows] = await req.db.query(`
            SELECT p.*, a.garage_id, i.customer_id, i.total_amount AS invoice_total
            FROM Payment p
            JOIN Invoice i ON p.invoice_id = i.id
            JOIN Appointment a ON i.appointment_id = a.id
            WHERE a.garage_id IN (?) AND p.deleted_at IS NULL
            ORDER BY p.created_at DESC
        `, [authorizedGarages]);
        
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getPaymentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        const [rows] = await req.db.query(`
            SELECT p.*, a.garage_id, i.customer_id, i.total_amount AS invoice_total
            FROM Payment p
            JOIN Invoice i ON p.invoice_id = i.id
            JOIN Appointment a ON i.appointment_id = a.id
            WHERE p.id = ? AND p.deleted_at IS NULL
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        const payment = rows[0];

        // Authorization check
        if (role === 'CUSTOMER') {
            const customerId = user.customer_id || user.id;
            if (payment.customer_id !== customerId) {
                return res.status(404).json({ error: 'Payment not found' });
            }
        } else if (role !== 'ADMIN') {
            if (!isGarageAuthorized(user, payment.garage_id)) {
                return res.status(404).json({ error: 'Payment not found' });
            }
        }
        
        res.json(payment);
    } catch (error) {
        next(error);
    }
};

/**
 * Atomic Payment Creation with Row-Level Locking and Overpayment Protection.
 */
const createPayment = async (req, res, next) => {
    let connection;
    try {
        const user = req.user;
        const { invoice_id, payment_date, payment_method, transaction_reference } = req.body;
        const paymentAmount = Math.round(Number(req.body.amount || 0) * 100) / 100;

        if (paymentAmount <= 0) {
            return res.status(400).json({ error: 'Payment amount must be greater than zero' });
        }

        connection = await req.db.getConnection();
        await connection.beginTransaction();

        // 1. Lock invoice row FOR UPDATE
        const [invoices] = await connection.query(`
            SELECT i.*, a.garage_id 
            FROM Invoice i
            JOIN Appointment a ON i.appointment_id = a.id
            WHERE i.id = ? AND i.deleted_at IS NULL
            FOR UPDATE
        `, [invoice_id]);

        if (invoices.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const invoice = invoices[0];
        const role = (user && user.role ? user.role : '').toUpperCase();

        // Authorize user
        if (role === 'CUSTOMER') {
            const customerId = user.customer_id || user.id;
            if (invoice.customer_id !== customerId) {
                await connection.rollback();
                return res.status(403).json({ error: 'Forbidden: Unauthorized payment attempt' });
            }
        } else if (role !== 'ADMIN') {
            if (!isGarageAuthorized(user, invoice.garage_id)) {
                await connection.rollback();
                return res.status(403).json({ error: 'Forbidden: Unauthorized for this garage' });
            }
        }

        if (invoice.status === 'cancelled') {
            await connection.rollback();
            return res.status(400).json({ error: 'Cannot pay against a cancelled invoice' });
        }

        // 2. Lock and calculate existing payments
        const [paymentSum] = await connection.query(`
            SELECT COALESCE(SUM(amount), 0) AS total_paid
            FROM Payment
            WHERE invoice_id = ? AND deleted_at IS NULL
            FOR UPDATE
        `, [invoice_id]);

        const totalPaidSoFar = Math.round(Number(paymentSum[0].total_paid) * 100) / 100;
        const invoiceTotal = Math.round(Number(invoice.total_amount) * 100) / 100;
        const outstandingBalance = Math.max(0, Math.round((invoiceTotal - totalPaidSoFar) * 100) / 100);

        if (outstandingBalance <= 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Invoice is already fully paid' });
        }

        if (paymentAmount > outstandingBalance + 0.001) {
            await connection.rollback();
            return res.status(400).json({ 
                error: `Payment amount (₹${paymentAmount.toFixed(2)}) exceeds outstanding balance (₹${outstandingBalance.toFixed(2)})` 
            });
        }

        // 3. Insert payment
        const paymentId = uuidv4();
        await connection.query(
            `INSERT INTO Payment (id, invoice_id, amount, payment_date, payment_method, transaction_reference) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [paymentId, invoice_id, paymentAmount, payment_date || new Date().toISOString().slice(0, 10), payment_method || 'cash', transaction_reference || null]
        );

        // 4. Update invoice status
        const newTotalPaid = Math.round((totalPaidSoFar + paymentAmount) * 100) / 100;
        const newStatus = newTotalPaid >= invoiceTotal - 0.001 ? 'paid' : 'partial';

        await connection.query(
            'UPDATE Invoice SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, invoice_id]
        );

        await connection.commit();

        const [rows] = await req.db.query('SELECT * FROM Payment WHERE id = ? AND deleted_at IS NULL', [paymentId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};

const updatePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const [existing] = await req.db.query(`
            SELECT p.*, a.garage_id 
            FROM Payment p
            JOIN Invoice i ON p.invoice_id = i.id
            JOIN Appointment a ON i.appointment_id = a.id
            WHERE p.id = ? AND p.deleted_at IS NULL
        `, [id]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const role = (user && user.role ? user.role : '').toUpperCase();
        if (role !== 'ADMIN' && !isGarageAuthorized(user, existing[0].garage_id)) {
            return res.status(403).json({ error: 'Forbidden: Unauthorized for this garage' });
        }

        const { invoice_id, amount, payment_date, payment_method, transaction_reference } = req.body;
        const paymentAmount = amount !== undefined ? Math.round(Number(amount) * 100) / 100 : existing[0].amount;

        const [result] = await req.db.query(
            `UPDATE Payment 
             SET invoice_id = ?, amount = ?, payment_date = ?, payment_method = ?, transaction_reference = ? 
             WHERE id = ?`,
            [
                invoice_id || existing[0].invoice_id, 
                paymentAmount, 
                payment_date || existing[0].payment_date, 
                payment_method || existing[0].payment_method, 
                transaction_reference !== undefined ? transaction_reference : existing[0].transaction_reference, 
                id
            ]
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
        const user = req.user;

        const [existing] = await req.db.query(`
            SELECT p.*, a.garage_id 
            FROM Payment p
            JOIN Invoice i ON p.invoice_id = i.id
            JOIN Appointment a ON i.appointment_id = a.id
            WHERE p.id = ? AND p.deleted_at IS NULL
        `, [id]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const role = (user && user.role ? user.role : '').toUpperCase();
        if (role !== 'ADMIN' && !isGarageAuthorized(user, existing[0].garage_id)) {
            return res.status(403).json({ error: 'Forbidden: Unauthorized for this garage' });
        }

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
