const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');

// Helper to reliably resolve Customer.id for the authenticated user
const getCustomerId = async (req) => {
    if (req.user && req.user.customer_id) {
        return req.user.customer_id;
    }
    if (req.user && req.user.email) {
        const [rows] = await req.db.query('SELECT id FROM Customer WHERE email = ? AND deleted_at IS NULL', [req.user.email]);
        if (rows.length > 0) return rows[0].id;
    }
    if (req.user && req.user.id) {
        const [rows] = await req.db.query('SELECT reference_id FROM User_Account WHERE id = ?', [req.user.id]);
        if (rows.length > 0 && rows[0].reference_id) return rows[0].reference_id;
    }
    return null;
};

exports.getAll = async (req, res, next) => {
    try {
        const customerId = await getCustomerId(req);
        if (!customerId) {
            return res.json([]);
        }

        const query = `
            SELECT 
                sr.*,
                g.name AS garage_name,
                g.address AS garage_address,
                g.city AS garage_city,
                g.phone AS garage_phone,
                v.make AS vehicle_make,
                v.model AS vehicle_model,
                v.license_plate AS vehicle_plate
            FROM Service_Request sr
            LEFT JOIN Garage g ON sr.garage_id = g.id
            LEFT JOIN Vehicle v ON sr.vehicle_id = v.id
            WHERE sr.customer_id = ?
            ORDER BY sr.created_at DESC
        `;
        const [requests] = await req.db.query(query, [customerId]);
        res.json(requests);
    } catch (error) {
        next(error);
    }
};

exports.getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customerId = await getCustomerId(req);
        if (!customerId) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const query = `
            SELECT 
                sr.*,
                g.name AS garage_name,
                g.address AS garage_address,
                g.city AS garage_city,
                g.phone AS garage_phone,
                v.make AS vehicle_make,
                v.model AS vehicle_model,
                v.license_plate AS vehicle_plate
            FROM Service_Request sr
            LEFT JOIN Garage g ON sr.garage_id = g.id
            LEFT JOIN Vehicle v ON sr.vehicle_id = v.id
            WHERE sr.id = ? AND sr.customer_id = ?
        `;
        const [requests] = await req.db.query(query, [id, customerId]);
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
        const customerId = await getCustomerId(req);
        if (!customerId) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }

        if (!vehicle_id || !garage_id || !service_type) {
            return res.status(400).json({ error: 'Missing required booking fields (vehicle, garage, service type)' });
        }

        // Validate vehicle belongs to customer
        const [vehicle] = await req.db.query('SELECT id FROM Vehicle WHERE id = ? AND customer_id = ? AND (deleted_at IS NULL)', [vehicle_id, customerId]);
        if (vehicle.length === 0) {
            return res.status(400).json({ error: 'Invalid vehicle or vehicle does not belong to your account' });
        }
        
        // Validate garage exists and is ACTIVE
        const [garage] = await req.db.query('SELECT id, name FROM Garage WHERE id = ? AND status = "ACTIVE" AND (deleted_at IS NULL)', [garage_id]);
        if (garage.length === 0) {
            return res.status(400).json({ error: 'Invalid or inactive garage' });
        }
        
        const id = uuidv4();
        const request_number = `SVSR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const dateVal = preferred_date || new Date().toISOString().split('T')[0];
        const timeVal = preferred_time || '10:00:00';
        
        await req.db.query(
            'INSERT INTO Service_Request (id, request_number, customer_id, vehicle_id, garage_id, service_type, problem_description, priority, preferred_date, preferred_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "SUBMITTED")',
            [id, request_number, customerId, vehicle_id, garage_id, service_type, problem_description || 'Standard Service', priority || 'NORMAL', dateVal, timeVal]
        );
        
        await logAudit(req, 'INSERT', 'Service_Request', id, null, req.body);
        
        res.status(201).json({ 
            id, 
            request_number, 
            garage_name: garage[0].name,
            message: 'Service Request created successfully' 
        });
    } catch (error) {
        next(error);
    }
};

exports.cancel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customerId = await getCustomerId(req);
        if (!customerId) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        const [existing] = await req.db.query('SELECT * FROM Service_Request WHERE id = ? AND customer_id = ? AND status = "SUBMITTED"', [id, customerId]);
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
