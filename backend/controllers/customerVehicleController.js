const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');

exports.getAll = async (req, res, next) => {
    try {
        const query = `
            SELECT id, make as brand, model, year as manufacturing_year, license_plate as registration_number, 
                   vehicle_type, variant, fuel_type, odometer, vin, status, created_at, updated_at 
            FROM Vehicle 
            WHERE customer_id = ? AND deleted_at IS NULL
        `;
        const vehicles = await req.db.query(query, [req.user.customer_id]);
        res.json(vehicles);
    } catch (error) {
        next(error);
    }
};

exports.getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT id, make as brand, model, year as manufacturing_year, license_plate as registration_number, 
                   vehicle_type, variant, fuel_type, odometer, vin, status, created_at, updated_at 
            FROM Vehicle 
            WHERE id = ? AND customer_id = ? AND deleted_at IS NULL
        `;
        const vehicles = await req.db.query(query, [id, req.user.customer_id]);
        if (vehicles.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json(vehicles[0]);
    } catch (error) {
        next(error);
    }
};

exports.create = async (req, res, next) => {
    try {
        const { brand, model, manufacturing_year, registration_number, vehicle_type, variant, fuel_type, odometer, vin } = req.body;
        const id = uuidv4();
        
        await req.db.query(
            'INSERT INTO Vehicle (id, customer_id, make, model, year, license_plate, vehicle_type, variant, fuel_type, odometer, vin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, req.user.customer_id, brand, model, manufacturing_year, registration_number, vehicle_type, variant, fuel_type, odometer, vin]
        );
        
        await logAudit(req, 'INSERT', 'Vehicle', id, null, req.body);
        
        res.status(201).json({ id, message: 'Vehicle created successfully' });
    } catch (error) {
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { brand, model, manufacturing_year, registration_number, vehicle_type, variant, fuel_type, odometer, vin } = req.body;
        
        const existing = await req.db.query('SELECT * FROM Vehicle WHERE id = ? AND customer_id = ? AND deleted_at IS NULL', [id, req.user.customer_id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        
        await req.db.query(
            'UPDATE Vehicle SET make = ?, model = ?, year = ?, license_plate = ?, vehicle_type = ?, variant = ?, fuel_type = ?, odometer = ?, vin = ? WHERE id = ?',
            [brand, model, manufacturing_year, registration_number, vehicle_type, variant, fuel_type, odometer, vin, id]
        );
        
        await logAudit(req, 'UPDATE', 'Vehicle', id, existing[0], req.body);
        
        res.json({ message: 'Vehicle updated successfully' });
    } catch (error) {
        next(error);
    }
};

exports.updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['ACTIVE', 'INACTIVE'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const existing = await req.db.query('SELECT * FROM Vehicle WHERE id = ? AND customer_id = ? AND deleted_at IS NULL', [id, req.user.customer_id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        
        await req.db.query('UPDATE Vehicle SET status = ? WHERE id = ?', [status, id]);
        
        await logAudit(req, 'UPDATE', 'Vehicle', id, existing[0], { status });
        
        res.json({ message: 'Vehicle status updated successfully' });
    } catch (error) {
        next(error);
    }
};
