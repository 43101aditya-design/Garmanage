
const { v4: uuidv4 } = require('uuid');

const getAllMechanics = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM Mechanic WHERE deleted_at IS NULL ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const getMechanicById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await req.db.query('SELECT * FROM Mechanic WHERE id = ? AND deleted_at IS NULL', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Mechanic not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const createMechanic = async (req, res, next) => {
    try {
        const id = uuidv4();
        const { first_name, last_name, phone, email, specialization, hire_date, status } = req.body;
        
        await req.db.query(
            'INSERT INTO Mechanic (id, first_name, last_name, phone, email, specialization, hire_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, req.body.first_name, req.body.last_name, req.body.phone, req.body.email, req.body.specialization, req.body.hire_date, req.body.status]
        );
        
        const [rows] = await req.db.query('SELECT * FROM Mechanic WHERE id = ? AND deleted_at IS NULL', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const updateMechanic = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, phone, email, specialization, hire_date, status } = req.body;
        
        const [result] = await req.db.query(
            'UPDATE Mechanic SET first_name = ?, last_name = ?, phone = ?, email = ?, specialization = ?, hire_date = ?, status = ? WHERE id = ?',
            [req.body.first_name, req.body.last_name, req.body.phone, req.body.email, req.body.specialization, req.body.hire_date, req.body.status, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Mechanic not found' });
        }
        
        const [rows] = await req.db.query('SELECT * FROM Mechanic WHERE id = ? AND deleted_at IS NULL', [id]);
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const deleteMechanic = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await req.db.query('UPDATE Mechanic SET deleted_at = NOW() WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Mechanic not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllMechanics,
    getMechanicById,
    createMechanic,
    updateMechanic,
    deleteMechanic
};
