const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res, next) => {
    try {
        const query = `
            SELECT sr.*, c.first_name, c.last_name, v.make, v.model, v.license_plate 
            FROM Service_Request sr 
            JOIN Customer c ON sr.customer_id = c.id 
            JOIN Vehicle v ON sr.vehicle_id = v.id 
            WHERE sr.garage_id = ? 
            ORDER BY sr.created_at DESC
        `;
        const requests = await req.db.query(query, [req.garageId]);
        res.json(requests);
    } catch (error) {
        next(error);
    }
};

exports.approve = async (req, res, next) => {
    let connection;
    try {
        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [request] = await connection.query('SELECT * FROM Service_Request WHERE id = ? AND garage_id = ? FOR UPDATE', [req.params.id, req.garageId]);
        if (!request.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Service request not found' });
        }

        await connection.query('UPDATE Service_Request SET status = "APPROVED" WHERE id = ?', [req.params.id]);

        await connection.query(
            'INSERT INTO Audit_Log (id, user_id, garage_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), req.user.id, req.garageId, 'UPDATE', 'Service_Request', req.params.id, JSON.stringify({ status: 'APPROVED' })]
        );

        await connection.commit();
        res.json({ message: 'Service request approved successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};

exports.reject = async (req, res, next) => {
    let connection;
    try {
        const { rejection_reason } = req.body;
        if (!rejection_reason) return res.status(400).json({ error: 'Rejection reason is required' });

        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [request] = await connection.query('SELECT * FROM Service_Request WHERE id = ? AND garage_id = ? FOR UPDATE', [req.params.id, req.garageId]);
        if (!request.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Service request not found' });
        }

        await connection.query('UPDATE Service_Request SET status = "REJECTED", rejection_reason = ? WHERE id = ?', [rejection_reason, req.params.id]);

        await connection.query(
            'INSERT INTO Audit_Log (id, user_id, garage_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), req.user.id, req.garageId, 'UPDATE', 'Service_Request', req.params.id, JSON.stringify({ status: 'REJECTED', rejection_reason })]
        );

        await connection.commit();
        res.json({ message: 'Service request rejected successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};
