const { v4: uuidv4 } = require('uuid');

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
        const [jobs] = await req.db.query('SELECT * FROM Job_Card WHERE garage_id = ? ORDER BY created_at DESC', [req.garageId]);
        res.json(jobs);
    } catch (error) {
        next(error);
    }
};

exports.getMechanicJobs = async (req, res, next) => {
    try {
        // Placeholder returning empty or mechanic jobs
        res.json([]);
    } catch (error) {
        next(error);
    }
};

exports.updateJobStatus = async (req, res, next) => {
    let connection;
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [jobs] = await connection.query('SELECT * FROM Job_Card WHERE id = ? FOR UPDATE', [id]);
        if (!jobs.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Job not found' });
        }
        
        const job = jobs[0];
        let actual_duration_minutes = job.actual_duration_minutes;
        
        let updateQuery = 'UPDATE Job_Card SET status = ?';
        let queryParams = [status];
        
        if (status === 'COMPLETED' && job.started_at) {
            // calculate actual_duration_minutes
            const start = new Date(job.started_at);
            const now = new Date();
            actual_duration_minutes = Math.round((now - start) / 60000);
            updateQuery += ', actual_duration_minutes = ?, completed_at = CURRENT_TIMESTAMP';
            queryParams.push(actual_duration_minutes);
        } else if (status === 'IN_PROGRESS' && !job.started_at) {
            updateQuery += ', started_at = CURRENT_TIMESTAMP';
        }
        
        updateQuery += ' WHERE id = ?';
        queryParams.push(id);
        
        await connection.query(updateQuery, queryParams);

        await connection.query(
            'INSERT INTO Audit_Log (id, user_id, garage_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), req.user.id, job.garage_id, 'UPDATE', 'Job_Card', id, JSON.stringify({ status })]
        );

        await connection.commit();
        res.json({ message: 'Job status updated' });
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
        
        await req.db.query(
            'INSERT INTO Job_Note (id, job_card_id, author_id, note) VALUES (?, ?, ?, ?)',
            [uuidv4(), id, req.user.id, note]
        );
        
        res.status(201).json({ message: 'Note added' });
    } catch (error) {
        next(error);
    }
};

exports.getJobDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [jobs] = await req.db.query('SELECT * FROM Job_Card WHERE id = ?', [id]);
        if (!jobs.length) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        const [notes] = await req.db.query('SELECT * FROM Job_Note WHERE job_card_id = ? ORDER BY created_at ASC', [id]);
        
        res.json({ job: jobs[0], notes });
    } catch (error) {
        next(error);
    }
};
