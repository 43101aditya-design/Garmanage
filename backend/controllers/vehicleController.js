
const { v4: uuidv4 } = require('uuid');

const getAllVehicles = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM Vehicle WHERE deleted_at IS NULL ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getVehicleById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await req.db.query('SELECT * FROM Vehicle WHERE id = ? AND deleted_at IS NULL', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const createVehicle = async (req, res, next) => {
    try {
        const id = uuidv4();
        const { customer_id, make, model, year, license_plate, vin } = req.body;
        
        await req.db.query(
            'INSERT INTO Vehicle (id, customer_id, make, model, year, license_plate, vin) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, req.body.customer_id, req.body.make, req.body.model, req.body.year, req.body.license_plate, req.body.vin]
        );
        
        const [rows] = await req.db.query('SELECT * FROM Vehicle WHERE id = ? AND deleted_at IS NULL', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const updateVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { customer_id, make, model, year, license_plate, vin } = req.body;
        
        const [result] = await req.db.query(
            'UPDATE Vehicle SET customer_id = ?, make = ?, model = ?, year = ?, license_plate = ?, vin = ? WHERE id = ?',
            [req.body.customer_id, req.body.make, req.body.model, req.body.year, req.body.license_plate, req.body.vin, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        
        const [rows] = await req.db.query('SELECT * FROM Vehicle WHERE id = ? AND deleted_at IS NULL', [id]);
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const deleteVehicle = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await req.db.query('UPDATE Vehicle SET deleted_at = NOW() WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle
};
