
const { v4: uuidv4 } = require('uuid');

const getAllAppointments = async (req, res, next) => {
    try {
        let query = 'SELECT * FROM Appointment WHERE deleted_at IS NULL';
        let params = [];
        
        if (req.user.role === 'manager' || req.user.role === 'mechanic') {
            if (req.user.branch_id) {
                query += ' AND branch_id = ?';
                params.push(req.user.branch_id);
            }
        }
        
        query += ' ORDER BY created_at DESC';
        const [rows] = await req.db.query(query, params);
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getAppointmentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await req.db.query('SELECT * FROM Appointment WHERE id = ? AND deleted_at IS NULL', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const createAppointment = async (req, res, next) => {
    try {
        const id = uuidv4();
        const { customer_id, vehicle_id, mechanic_id, branch_id, appointment_date, appointment_time, status, notes } = req.body;
        
        await req.db.query(
            'INSERT INTO Appointment (id, customer_id, vehicle_id, mechanic_id, branch_id, appointment_date, appointment_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, customer_id, vehicle_id, mechanic_id, branch_id, appointment_date, appointment_time, status, notes]
        );
        
        const [rows] = await req.db.query('SELECT * FROM Appointment WHERE id = ? AND deleted_at IS NULL', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const updateAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { customer_id, vehicle_id, mechanic_id, branch_id, appointment_date, appointment_time, status, notes } = req.body;
        
        const [result] = await req.db.query(
            'UPDATE Appointment SET customer_id = ?, vehicle_id = ?, mechanic_id = ?, branch_id = ?, appointment_date = ?, appointment_time = ?, status = ?, notes = ? WHERE id = ?',
            [customer_id, vehicle_id, mechanic_id, branch_id, appointment_date, appointment_time, status, notes, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        const [rows] = await req.db.query('SELECT * FROM Appointment WHERE id = ? AND deleted_at IS NULL', [id]);
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const smartAssignMechanic = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Fetch branch_id of the appointment
        const [appts] = await req.db.query('SELECT branch_id FROM Appointment WHERE id = ?', [id]);
        if (appts.length === 0 || !appts[0].branch_id) {
            return res.status(400).json({ error: 'Appointment must have a branch_id to auto-assign' });
        }
        
        // Execute the stored procedure
        await req.db.query('CALL sp_smart_assign_mechanic(?, ?)', [id, appts[0].branch_id]);
        
        const [rows] = await req.db.query('SELECT * FROM Appointment WHERE id = ? AND deleted_at IS NULL', [id]);
        res.json({ message: 'Mechanic assigned successfully', appointment: rows[0] });
    } catch (error) {
        next(error);
    }
};

const deleteAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await req.db.query('UPDATE Appointment SET deleted_at = NOW() WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    smartAssignMechanic
};
