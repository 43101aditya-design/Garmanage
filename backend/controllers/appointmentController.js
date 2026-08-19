const { v4: uuidv4 } = require('uuid');

exports.createAppointment = async (req, res, next) => {
    let connection;
    try {
        const { service_request_id, appointment_date, appointment_time, end_time, garage_id } = req.body;
        if (!service_request_id || !appointment_date || !appointment_time || !garage_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [requests] = await connection.query(
            'SELECT * FROM Service_Request WHERE id = ? AND garage_id = ? FOR UPDATE',
            [service_request_id, garage_id]
        );

        if (!requests.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Service request not found or not in this garage' });
        }

        const request = requests[0];
        if (request.status !== 'APPROVED') {
            await connection.rollback();
            return res.status(400).json({ error: 'Service request must be APPROVED to schedule an appointment' });
        }

        const appointmentId = uuidv4();
        await connection.query(
            `INSERT INTO Appointment (id, service_request_id, customer_id, vehicle_id, garage_id, appointment_date, appointment_time, end_time, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')`,
            [appointmentId, service_request_id, request.customer_id, request.vehicle_id, garage_id, appointment_date, appointment_time, end_time || null]
        );

        await connection.query(
            'UPDATE Service_Request SET status = "SCHEDULED" WHERE id = ?',
            [service_request_id]
        );

        await connection.query(
            'INSERT INTO Audit_Log (id, user_id, garage_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), req.user.id, garage_id, 'CREATE', 'Appointment', appointmentId, JSON.stringify({ service_request_id, appointment_date, appointment_time })]
        );

        await connection.commit();
        res.status(201).json({ message: 'Appointment created successfully', id: appointmentId });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};

exports.getManagerAppointments = async (req, res, next) => {
    try {
        const [appointments] = await req.db.query(
            'SELECT * FROM Appointment WHERE garage_id = ? ORDER BY appointment_date DESC, appointment_time DESC',
            [req.garageId]
        );
        res.json(appointments);
    } catch (error) {
        next(error);
    }
};

exports.getCustomerAppointments = async (req, res, next) => {
    try {
        const [customers] = await req.db.query('SELECT id FROM Customer WHERE email = ?', [req.user.email]);
        if (!customers.length) return res.json([]);
        
        const customerId = customers[0].id;
        const [appointments] = await req.db.query(
            'SELECT * FROM Appointment WHERE customer_id = ? ORDER BY appointment_date DESC, appointment_time DESC',
            [customerId]
        );
        res.json(appointments);
    } catch (error) {
        next(error);
    }
};
