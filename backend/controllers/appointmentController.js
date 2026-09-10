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
            'SELECT * FROM Appointment WHERE garage_id = ? AND (deleted_at IS NULL) ORDER BY appointment_date DESC, appointment_time DESC',
            [req.garageId]
        );
        res.json(appointments);
    } catch (error) {
        next(error);
    }
};

exports.getCustomerAppointments = async (req, res, next) => {
    try {
        let customerId = req.user && req.user.customer_id;
        if (!customerId && req.user && req.user.email) {
            const [customers] = await req.db.query('SELECT id FROM Customer WHERE email = ? AND (deleted_at IS NULL)', [req.user.email]);
            if (customers.length) customerId = customers[0].id;
        }
        if (!customerId && req.user && req.user.id) {
            const [ua] = await req.db.query('SELECT reference_id FROM User_Account WHERE id = ?', [req.user.id]);
            if (ua.length && ua[0].reference_id) customerId = ua[0].reference_id;
        }
        if (!customerId) return res.json([]);
        
        const [appointments] = await req.db.query(
            `SELECT a.*, 
                    a.appointment_date AS scheduled_date,
                    a.appointment_time AS start_time,
                    g.name AS garage_name,
                    g.address AS garage_address,
                    g.city AS garage_city,
                    g.phone AS garage_phone,
                    v.make AS vehicle_brand,
                    v.model AS vehicle_model,
                    v.license_plate AS vehicle_plate
             FROM Appointment a
             LEFT JOIN Garage g ON a.garage_id = g.id
             LEFT JOIN Vehicle v ON a.vehicle_id = v.id
             WHERE a.customer_id = ? AND (a.deleted_at IS NULL)
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [customerId]
        );

        const formatted = appointments.map(apt => ({
            ...apt,
            garage: {
                id: apt.garage_id,
                name: apt.garage_name || 'Service Garage',
                address: apt.garage_address || '',
                city: apt.garage_city || '',
                phone: apt.garage_phone || ''
            },
            vehicle: {
                id: apt.vehicle_id,
                brand: apt.vehicle_brand || '',
                model: apt.vehicle_model || '',
                license_plate: apt.vehicle_plate || ''
            }
        }));

        res.json(formatted);
    } catch (error) {
        next(error);
    }
};

exports.getAllAppointments = async (req, res, next) => {
    try {
        const [appointments] = await req.db.query(
            'SELECT * FROM Appointment WHERE (deleted_at IS NULL) ORDER BY appointment_date DESC, appointment_time DESC'
        );
        res.json(appointments);
    } catch (error) {
        next(error);
    }
};
