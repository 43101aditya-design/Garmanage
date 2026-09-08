const { v4: uuidv4 } = require('uuid');
const { isGarageAuthorized } = require('../utils/tenantScope');

// Centralized Job State Machine Transition Graph
const VALID_JOB_TRANSITIONS = {
    'CREATED': ['READY_FOR_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
    'READY_FOR_ASSIGNMENT': ['ASSIGNED', 'CANCELLED'],
    'ASSIGNED': ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
    'IN_PROGRESS': ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
    'ON_HOLD': ['IN_PROGRESS', 'CANCELLED'],
    'COMPLETED': ['CLOSED'],
    'CLOSED': [],
    'CANCELLED': []
};

exports.createJob = async (req, res, next) => {
    let connection;
    try {
        const { appointment_id, problem_description, service_type, priority, complexity, estimated_duration_minutes } = req.body;
        
        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [appointments] = await connection.query('SELECT * FROM Appointment WHERE id = ? FOR UPDATE', [appointment_id]);
        if (!appointments.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const appointment = appointments[0];
        
        // Multi-garage isolation check
        const role = (req.user && req.user.role ? req.user.role : '').toUpperCase();
        if (role !== 'ADMIN' && !isGarageAuthorized(req.user, appointment.garage_id)) {
            await connection.rollback();
            return res.status(403).json({ error: 'Forbidden: Unauthorized for this garage' });
        }
        
        const jobId = uuidv4();
        const jobNumber = 'JOB-' + Date.now().toString().slice(-6);

        await connection.query(
            `INSERT INTO Job_Card (id, job_number, service_request_id, appointment_id, garage_id, customer_id, vehicle_id, problem_description, service_type, priority, complexity, estimated_duration_minutes, created_by, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREATED')`,
            [jobId, jobNumber, appointment.service_request_id, appointment_id, appointment.garage_id, appointment.customer_id, appointment.vehicle_id, problem_description, service_type, priority, complexity, estimated_duration_minutes, req.user.id]
        );

        if (appointment.service_request_id) {
            await connection.query('UPDATE Service_Request SET status = "JOB_CREATED" WHERE id = ?', [appointment.service_request_id]);
        }

        await connection.query(
            'INSERT INTO Audit_Log (id, user_id, garage_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), req.user.id, appointment.garage_id, 'CREATE', 'Job_Card', jobId, JSON.stringify({ appointment_id })]
        );

        await connection.commit();
        res.status(201).json({ message: 'Job created successfully', id: jobId });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};

exports.getManagerJobs = async (req, res, next) => {
    try {
        const garageId = req.garageId || (req.user && req.user.memberships && req.user.memberships[0] ? req.user.memberships[0].garage_id : null);
        if (!garageId) {
            return res.json([]);
        }
        const [jobs] = await req.db.query('SELECT * FROM Job_Card WHERE garage_id = ? ORDER BY created_at DESC', [garageId]);
        res.json(jobs);
    } catch (error) {
        next(error);
    }
};

/**
 * Real Mechanic Job Retrieval (Scoped to Authenticated Mechanic & Garage).
 */
exports.getMechanicJobs = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // 1. Find active mechanic profile
        const [mechanics] = await req.db.query(
            'SELECT id, garage_id FROM Mechanic_Profile WHERE user_id = ? AND employment_status = "ACTIVE"',
            [userId]
        );
        
        if (!mechanics.length) {
            return res.json([]);
        }

        const mechanicId = mechanics[0].id;
        const garageId = mechanics[0].garage_id;

        // 2. Fetch assigned jobs for this mechanic in this garage
        const [jobs] = await req.db.query(`
            SELECT j.*, v.make, v.model, v.license_plate, c.first_name, c.last_name, c.phone AS customer_phone
            FROM Job_Card j
            LEFT JOIN Vehicle v ON j.vehicle_id = v.id
            LEFT JOIN Customer c ON j.customer_id = c.id
            LEFT JOIN Job_Assignment ja ON ja.job_card_id = j.id AND ja.mechanic_id = ?
            WHERE j.garage_id = ? 
              AND (j.mechanic_id = ? OR ja.status IN ('PENDING', 'ACCEPTED', 'ACTIVE'))
            ORDER BY j.created_at DESC
        `, [mechanicId, garageId, mechanicId]);

        res.json(jobs);
    } catch (error) {
        next(error);
    }
};

/**
 * Centralized Job State Machine Update.
 */
exports.updateJobStatus = async (req, res, next) => {
    let connection;
    try {
        const { id } = req.params;
        const { status } = req.body;
        const user = req.user;
        const targetStatus = (status || '').toUpperCase();
        
        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [jobs] = await connection.query('SELECT * FROM Job_Card WHERE id = ? FOR UPDATE', [id]);
        if (!jobs.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Job not found' });
        }
        
        const job = jobs[0];
        const currentStatus = (job.status || 'CREATED').toUpperCase();

        // Enforce garage authorization
        const role = (user && user.role ? user.role : '').toUpperCase();
        if (role !== 'ADMIN' && !isGarageAuthorized(user, job.garage_id)) {
            await connection.rollback();
            return res.status(403).json({ error: 'Forbidden: Unauthorized for this garage' });
        }

        // Validate state transition if status is actually changing
        if (currentStatus !== targetStatus) {
            const allowedNextStates = VALID_JOB_TRANSITIONS[currentStatus] || [];
            if (!allowedNextStates.includes(targetStatus)) {
                await connection.rollback();
                return res.status(400).json({ 
                    error: `Invalid job status transition from ${currentStatus} to ${targetStatus}. Allowed transitions: [${allowedNextStates.join(', ')}]` 
                });
            }
        }
        
        let actual_duration_minutes = job.actual_duration_minutes;
        let updateQuery = 'UPDATE Job_Card SET status = ?';
        let queryParams = [targetStatus];
        
        if (targetStatus === 'COMPLETED' && job.started_at) {
            const start = new Date(job.started_at);
            const now = new Date();
            actual_duration_minutes = Math.max(1, Math.round((now - start) / 60000));
            updateQuery += ', actual_duration_minutes = ?, completed_at = CURRENT_TIMESTAMP';
            queryParams.push(actual_duration_minutes);
        } else if (targetStatus === 'IN_PROGRESS' && !job.started_at) {
            updateQuery += ', started_at = CURRENT_TIMESTAMP';
        }
        
        updateQuery += ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        queryParams.push(id);
        
        await connection.query(updateQuery, queryParams);

        await connection.query(
            'INSERT INTO Audit_Log (id, user_id, garage_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), user.id, job.garage_id, 'UPDATE_STATUS', 'Job_Card', id, JSON.stringify({ from: currentStatus, to: targetStatus })]
        );

        await connection.commit();
        res.json({ message: 'Job status updated', status: targetStatus });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};

exports.addJobNote = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { note } = req.body;
        const user = req.user;
        
        // Multi-garage check
        const [jobs] = await req.db.query('SELECT * FROM Job_Card WHERE id = ?', [id]);
        if (!jobs.length) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const role = (user && user.role ? user.role : '').toUpperCase();
        if (role !== 'ADMIN' && !isGarageAuthorized(user, jobs[0].garage_id)) {
            return res.status(403).json({ error: 'Forbidden: Unauthorized for this garage' });
        }

        await req.db.query(
            'INSERT INTO Job_Note (id, job_card_id, author_id, note) VALUES (?, ?, ?, ?)',
            [uuidv4(), id, user.id, note]
        );
        
        res.status(201).json({ message: 'Note added' });
    } catch (error) {
        next(error);
    }
};

/**
 * Scoped Job Details with IDOR Protection.
 */
exports.getJobDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        const [jobs] = await req.db.query(`
            SELECT j.*, v.make, v.model, v.year, v.license_plate, v.vin,
                   c.first_name, c.last_name, c.email AS customer_email, c.phone AS customer_phone
            FROM Job_Card j
            LEFT JOIN Vehicle v ON j.vehicle_id = v.id
            LEFT JOIN Customer c ON j.customer_id = c.id
            WHERE j.id = ?
        `, [id]);

        if (!jobs.length) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobs[0];

        // Strict authorization check to prevent cross-garage IDOR
        if (role === 'CUSTOMER') {
            const customerId = user.customer_id || user.id;
            if (job.customer_id !== customerId) {
                return res.status(404).json({ error: 'Job not found' });
            }
        } else if (role !== 'ADMIN') {
            if (!isGarageAuthorized(user, job.garage_id)) {
                return res.status(404).json({ error: 'Job not found' });
            }
        }
        
        const [notes] = await req.db.query(`
            SELECT jn.*, u.name AS author_name, u.role AS author_role
            FROM Job_Note jn
            LEFT JOIN User_Account u ON jn.author_id = u.id
            WHERE jn.job_card_id = ? 
            ORDER BY jn.created_at ASC
        `, [id]);
        
        res.json({ job, notes });
    } catch (error) {
        next(error);
    }
};
