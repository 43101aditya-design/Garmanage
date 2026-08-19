const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');

exports.getAll = async (req, res, next) => {
    try {
        const requests = await req.db.query('SELECT * FROM Service_Request WHERE customer_id = ? ORDER BY created_at DESC', [req.user.customer_id]);
        res.json(requests);
    } catch (error) {
        next(error);
    }
};

exports.getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const requests = await req.db.query('SELECT * FROM Service_Request WHERE id = ? AND customer_id = ?', [id, req.user.customer_id]);
        if (requests.length === 0) {
            return res.status(404).json({ error: 'Service Request not found' });
        }
        res.json(requests[0]);
    } catch (error) {
        next(error);
    }
};

exports.create = async (req, res, next) => {
    try {
        const { vehicle_id, garage_id, service_type, problem_description, priority, preferred_date, preferred_time } = req.body;
        
        await req.db.query('START TRANSACTION');
        
        // Validate vehicle belongs to customer
        const vehicle = await req.db.query('SELECT id FROM Vehicle WHERE id = ? AND customer_id = ?', [vehicle_id, req.user.customer_id]);
        if (vehicle.length === 0) {
            await req.db.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid vehicle' });
        }
        
        // Validate garage exists and is ACTIVE
        const garage = await req.db.query('SELECT id FROM Garage WHERE id = ? AND status = "ACTIVE"', [garage_id]);
        if (garage.length === 0) {
            await req.db.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid or inactive garage' });
        }
        
        const id = uuidv4();
        const request_number = `SVSR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        
        await req.db.query(
            'INSERT INTO Service_Request (id, request_number, customer_id, vehicle_id, garage_id, service_type, problem_description, priority, preferred_date, preferred_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, request_number, req.user.customer_id, vehicle_id, garage_id, service_type, problem_description, priority || 'NORMAL', preferred_date, preferred_time]
        );
        
        await logAudit(req, 'INSERT', 'Service_Request', id, null, req.body);
        
        await req.db.query('COMMIT');
        res.status(201).json({ id, request_number, message: 'Service Request created successfully' });
    } catch (error) {
        await req.db.query('ROLLBACK');
        next(error);
    }
};

exports.cancel = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const existing = await req.db.query('SELECT * FROM Service_Request WHERE id = ? AND customer_id = ? AND status = "SUBMITTED"', [id, req.user.customer_id]);
        if (existing.length === 0) {
            return res.status(400).json({ error: 'Service Request cannot be cancelled or does not exist' });
        }
        
        await req.db.query('UPDATE Service_Request SET status = "CANCELLED" WHERE id = ?', [id]);
        
        await logAudit(req, 'UPDATE', 'Service_Request', id, existing[0], { status: 'CANCELLED' });
        
        res.json({ message: 'Service Request cancelled successfully' });
    } catch (error) {
        next(error);
    }
};
