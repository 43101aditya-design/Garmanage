const { v4: uuidv4 } = require('uuid');
const { getAuthorizedGarageIds, isGarageAuthorized } = require('../utils/tenantScope');

const getAllInvoices = async (req, res, next) => {
    try {
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        if (role === 'CUSTOMER') {
            const customerId = user.customer_id || user.id;
            const [rows] = await req.db.query(
                'SELECT * FROM Invoice WHERE customer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
                [customerId]
            );
            return res.json(rows);
        }

        const authorizedGarages = getAuthorizedGarageIds(user);
        if (role === 'OWNER' || role === 'ADMIN') {
            if (authorizedGarages.length > 0) {
                const [rows] = await req.db.query(`
                    SELECT i.* 
                    FROM Invoice i
                    JOIN Appointment a ON i.appointment_id = a.id
                    WHERE a.garage_id IN (?) AND i.deleted_at IS NULL
                    ORDER BY i.created_at DESC
                `, [authorizedGarages]);
                return res.json(rows);
            } else {
                const [rows] = await req.db.query('SELECT * FROM Invoice WHERE deleted_at IS NULL ORDER BY created_at DESC');
                return res.json(rows);
            }
        }

        // Manager / Mechanic
        if (authorizedGarages.length === 0) {
            return res.json([]);
        }

        const [rows] = await req.db.query(`
            SELECT i.* 
            FROM Invoice i
            JOIN Appointment a ON i.appointment_id = a.id
            WHERE a.garage_id IN (?) AND i.deleted_at IS NULL
            ORDER BY i.created_at DESC
        `, [authorizedGarages]);
        
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getInvoiceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        const [rows] = await req.db.query(`
            SELECT i.*, a.garage_id 
            FROM Invoice i
            JOIN Appointment a ON i.appointment_id = a.id
            WHERE i.id = ? AND i.deleted_at IS NULL
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        const invoice = rows[0];

        // Verify authorization
        if (role === 'CUSTOMER') {
            const customerId = user.customer_id || user.id;
            if (invoice.customer_id !== customerId) {
                return res.status(404).json({ error: 'Invoice not found' });
            }
        } else if (role !== 'ADMIN') {
            if (!isGarageAuthorized(user, invoice.garage_id)) {
                return res.status(404).json({ error: 'Invoice not found' });
            }
        }
        
        res.json(invoice);
    } catch (error) {
        next(error);
    }
};

const createInvoice = async (req, res, next) => {
    try {
        const user = req.user;
        const id = uuidv4();
        const { appointment_id, customer_id, issue_date, due_date, status } = req.body;
        
        // Fetch appointment to verify garage authorization
        const [appts] = await req.db.query('SELECT * FROM Appointment WHERE id = ?', [appointment_id]);
        if (appts.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const appt = appts[0];
        const role = (user && user.role ? user.role : '').toUpperCase();
        if (role !== 'ADMIN' && !isGarageAuthorized(user, appt.garage_id)) {
            return res.status(403).json({ error: 'Forbidden: Unauthorized for this garage' });
        }

        // Fixed-precision currency calculation (INR)
        const subtotal = Math.round(Number(req.body.subtotal || 0) * 100) / 100;
        const tax_amount = Math.round(Number(req.body.tax_amount || 0) * 100) / 100;
        const discount_amount = Math.round(Number(req.body.discount_amount || 0) * 100) / 100;
        const total_amount = Math.max(0, Math.round((subtotal + tax_amount - discount_amount) * 100) / 100);
        
        await req.db.query(
            `INSERT INTO Invoice (id, appointment_id, customer_id, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, appointment_id, customer_id || appt.customer_id, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, status || 'unpaid']
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
        const user = req.user;

        const [existing] = await req.db.query(`
            SELECT i.*, a.garage_id 
            FROM Invoice i
            JOIN Appointment a ON i.appointment_id = a.id
            WHERE i.id = ? AND i.deleted_at IS NULL
        `, [id]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const role = (user && user.role ? user.role : '').toUpperCase();
        if (role !== 'ADMIN' && !isGarageAuthorized(user, existing[0].garage_id)) {
            return res.status(403).json({ error: 'Forbidden: Unauthorized for this garage' });
        }

        const { appointment_id, customer_id, issue_date, due_date, status } = req.body;
        
        // Fixed-precision currency calculation
        const subtotal = Math.round(Number(req.body.subtotal !== undefined ? req.body.subtotal : existing[0].subtotal) * 100) / 100;
        const tax_amount = Math.round(Number(req.body.tax_amount !== undefined ? req.body.tax_amount : existing[0].tax_amount) * 100) / 100;
        const discount_amount = Math.round(Number(req.body.discount_amount !== undefined ? req.body.discount_amount : existing[0].discount_amount) * 100) / 100;
        const total_amount = Math.max(0, Math.round((subtotal + tax_amount - discount_amount) * 100) / 100);

        const [result] = await req.db.query(
            `UPDATE Invoice 
             SET appointment_id = ?, customer_id = ?, issue_date = ?, due_date = ?, subtotal = ?, tax_amount = ?, discount_amount = ?, total_amount = ?, status = ? 
             WHERE id = ?`,
            [
                appointment_id || existing[0].appointment_id, 
                customer_id || existing[0].customer_id, 
                issue_date || existing[0].issue_date, 
                due_date || existing[0].due_date, 
                subtotal, 
                tax_amount, 
                discount_amount, 
                total_amount, 
                status || existing[0].status, 
                id
            ]
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
        const user = req.user;

        const [existing] = await req.db.query(`
            SELECT i.*, a.garage_id 
            FROM Invoice i
            JOIN Appointment a ON i.appointment_id = a.id
            WHERE i.id = ? AND i.deleted_at IS NULL
        `, [id]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const role = (user && user.role ? user.role : '').toUpperCase();
        if (role !== 'ADMIN' && !isGarageAuthorized(user, existing[0].garage_id)) {
            return res.status(403).json({ error: 'Forbidden: Unauthorized for this garage' });
        }

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
