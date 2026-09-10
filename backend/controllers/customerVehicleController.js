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
            SELECT id, make as brand, make, model, year as manufacturing_year, year, 
                   license_plate as registration_number, license_plate,
                   vehicle_type, variant, fuel_type, odometer, vin, status, created_at, updated_at 
            FROM Vehicle 
            WHERE customer_id = ? AND (deleted_at IS NULL)
            ORDER BY created_at DESC
        `;
        const [vehicles] = await req.db.query(query, [customerId]);
        res.json(vehicles);
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
            SELECT id, make as brand, make, model, year as manufacturing_year, year, 
                   license_plate as registration_number, license_plate,
                   vehicle_type, variant, fuel_type, odometer, vin, status, created_at, updated_at 
            FROM Vehicle 
            WHERE id = ? AND customer_id = ? AND (deleted_at IS NULL)
        `;
        const [vehicles] = await req.db.query(query, [id, customerId]);
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
        const { brand, make, model, manufacturing_year, year, registration_number, license_plate, vehicle_type, variant, fuel_type, odometer, vin } = req.body;
        const customerId = await getCustomerId(req);
        if (!customerId) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }

        const id = uuidv4();
        const makeVal = brand || make || 'Unknown';
        const yearVal = parseInt(manufacturing_year || year || new Date().getFullYear(), 10);
        const plateVal = registration_number || license_plate || `TMP-${Date.now().toString().slice(-6)}`;
        const vinVal = vin || `VIN${uuidv4().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
        
        await req.db.query(
            'INSERT INTO Vehicle (id, customer_id, make, model, year, license_plate, vehicle_type, variant, fuel_type, odometer, vin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, customerId, makeVal, model, yearVal, plateVal, vehicle_type || 'CAR', variant || null, fuel_type || 'PETROL', odometer || 0, vinVal]
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
        const { brand, make, model, manufacturing_year, year, registration_number, license_plate, vehicle_type, variant, fuel_type, odometer, vin } = req.body;
        const customerId = await getCustomerId(req);
        if (!customerId) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }
        
        const [existing] = await req.db.query('SELECT * FROM Vehicle WHERE id = ? AND customer_id = ? AND (deleted_at IS NULL)', [id, customerId]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        
        const makeVal = brand || make || existing[0].make;
        const modelVal = model || existing[0].model;
        const yearVal = parseInt(manufacturing_year || year || existing[0].year, 10);
        const plateVal = registration_number || license_plate || existing[0].license_plate;
        const vinVal = vin || existing[0].vin;
        const typeVal = vehicle_type || existing[0].vehicle_type;
        const variantVal = variant !== undefined ? variant : existing[0].variant;
        const fuelVal = fuel_type || existing[0].fuel_type;
        const odoVal = odometer !== undefined ? odometer : existing[0].odometer;

        await req.db.query(
            'UPDATE Vehicle SET make = ?, model = ?, year = ?, license_plate = ?, vehicle_type = ?, variant = ?, fuel_type = ?, odometer = ?, vin = ? WHERE id = ?',
            [makeVal, modelVal, yearVal, plateVal, typeVal, variantVal, fuelVal, odoVal, vinVal, id]
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
        const customerId = await getCustomerId(req);
        
        if (!['ACTIVE', 'INACTIVE'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const [existing] = await req.db.query('SELECT * FROM Vehicle WHERE id = ? AND customer_id = ? AND (deleted_at IS NULL)', [id, customerId]);
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
