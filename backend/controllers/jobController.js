const { v4: uuidv4 } = require('uuid');
const { isGarageAuthorized } = require('../utils/tenantScope');

// Centralized Job State Machine Transition Graph (Supports Quality Check & Ready for Pickup)
const VALID_JOB_TRANSITIONS = {
    'CREATED': ['READY_FOR_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
    'READY_FOR_ASSIGNMENT': ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
    'ASSIGNED': ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
    'IN_PROGRESS': ['QUALITY_CHECK', 'COMPLETED', 'ON_HOLD', 'CANCELLED'],
    'QUALITY_CHECK': ['READY_FOR_PICKUP', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'],
    'READY_FOR_PICKUP': ['COMPLETED', 'CLOSED', 'CANCELLED'],
    'ON_HOLD': ['IN_PROGRESS', 'READY_FOR_ASSIGNMENT', 'QUALITY_CHECK', 'CANCELLED'],
    'COMPLETED': ['CLOSED'],
    'CLOSED': [],
    'CANCELLED': []
};

const STAGE_LABELS = {
    'CREATED': 'Vehicle Received',
    'READY_FOR_ASSIGNMENT': 'Inspection & Diagnostics',
    'ASSIGNED': 'Work Assigned',
    'IN_PROGRESS': 'Service In Progress',
    'QUALITY_CHECK': 'Quality Check & Testing',
    'READY_FOR_PICKUP': 'Ready for Pickup',
    'COMPLETED': 'Delivered & Completed',
    'CLOSED': 'Archived',
    'ON_HOLD': 'Service On Hold',
    'CANCELLED': 'Cancelled'
};

const STAGE_PROGRESS_PERCENT = {
    'CREATED': 20,
    'READY_FOR_ASSIGNMENT': 35,
    'ASSIGNED': 50,
    'IN_PROGRESS': 70,
    'QUALITY_CHECK': 85,
    'READY_FOR_PICKUP': 95,
    'COMPLETED': 100,
    'CLOSED': 100,
    'ON_HOLD': 70,
    'CANCELLED': 0
};

const NEXT_STAGE_MAP = {
    'CREATED': 'Inspection & Diagnostics',
    'READY_FOR_ASSIGNMENT': 'Work Assignment to Mechanic',
    'ASSIGNED': 'Service In Progress',
    'IN_PROGRESS': 'Quality Check & Final Inspection',
    'QUALITY_CHECK': 'Ready for Customer Pickup',
    'READY_FOR_PICKUP': 'Vehicle Handover & Delivery',
    'COMPLETED': 'Vehicle Delivered',
    'CLOSED': 'Completed',
    'ON_HOLD': 'Resume Service',
    'CANCELLED': 'N/A'
};

function computeDelayStatus(job) {
    const status = (job.status || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'CLOSED') {
        return { delay_status: 'COMPLETED', is_delayed: false };
    }
    if (status === 'CANCELLED') {
        return { delay_status: 'CANCELLED', is_delayed: false };
    }
    if (!job.estimated_completion_at) {
        return { delay_status: 'ON_TIME', is_delayed: false };
    }
    const eta = new Date(job.estimated_completion_at).getTime();
    const now = Date.now();
    if (now > eta) {
        return { delay_status: 'DELAYED', is_delayed: true };
    }
    if (eta - now < 25 * 60 * 1000 && ['CREATED', 'READY_FOR_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(status)) {
        return { delay_status: 'AT_RISK', is_delayed: false };
    }
    return { delay_status: 'ON_TIME', is_delayed: false };
}

// Helper to resolve customer ID for authenticated user
const resolveCustomerId = async (req) => {
    if (req.user && req.user.customer_id) return req.user.customer_id;
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

        // Compute initial estimated start and completion timestamps
        const estDuration = Number(estimated_duration_minutes) || 60;
        const estStart = new Date();
        const estCompletion = new Date(estStart.getTime() + estDuration * 60000);

        await connection.query(
            `INSERT INTO Job_Card (
                id, job_number, service_request_id, appointment_id, garage_id, 
                customer_id, vehicle_id, problem_description, service_type, 
                priority, complexity, estimated_duration_minutes, estimated_start_at, 
                estimated_completion_at, created_by, status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREATED')`,
            [
                jobId, jobNumber, appointment.service_request_id, appointment_id, appointment.garage_id, 
                appointment.customer_id, appointment.vehicle_id, problem_description, service_type, 
                priority || 'NORMAL', complexity || 'MEDIUM', estDuration, estStart, 
                estCompletion, req.user.id
            ]
        );

        if (appointment.service_request_id) {
            await connection.query('UPDATE Service_Request SET status = "JOB_CREATED" WHERE id = ?', [appointment.service_request_id]);
        }

        // Record initial status history
        const historyId = uuidv4();
        await connection.query(
            `INSERT INTO Job_Status_History (
                id, job_card_id, previous_status, new_status, stage_label, 
                changed_by, changed_by_role, reason, notes, estimated_completion_at
             ) VALUES (?, ?, NULL, 'CREATED', 'Vehicle Received', ?, ?, 'Vehicle received & Job card created', ?, ?)`,
            [historyId, jobId, req.user.id, role || 'MANAGER', problem_description || 'Intake completed', estCompletion]
        );

        await connection.query(
            'INSERT INTO Audit_Log (id, user_id, garage_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), req.user.id, appointment.garage_id, 'CREATE', 'Job_Card', jobId, JSON.stringify({ appointment_id, jobNumber })]
        );

        await connection.commit();
        res.status(201).json({ message: 'Job created successfully', id: jobId, job_number: jobNumber });
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
        const [jobs] = await req.db.query(`
            SELECT j.*, 
                   v.make, v.model, v.license_plate, 
                   c.first_name, c.last_name, c.phone AS customer_phone,
                   u.name AS mechanic_name
            FROM Job_Card j
            LEFT JOIN Vehicle v ON j.vehicle_id = v.id
            LEFT JOIN Customer c ON j.customer_id = c.id
            LEFT JOIN Job_Assignment ja ON ja.job_card_id = j.id AND ja.status IN ('PENDING', 'ACCEPTED', 'ACTIVE')
            LEFT JOIN Mechanic_Profile mp ON ja.mechanic_id = mp.id
            LEFT JOIN User_Account u ON mp.user_id = u.id
            WHERE j.garage_id = ? 
            ORDER BY j.created_at DESC
        `, [garageId]);

        const augmented = jobs.map(j => {
            const delay = computeDelayStatus(j);
            return {
                ...j,
                stage_label: STAGE_LABELS[j.status] || j.status,
                progress_percent: STAGE_PROGRESS_PERCENT[j.status] || 0,
                delay_status: delay.delay_status,
                is_delayed: delay.is_delayed
            };
        });

        res.json(augmented);
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

        const augmented = jobs.map(j => {
            const delay = computeDelayStatus(j);
            return {
                ...j,
                stage_label: STAGE_LABELS[j.status] || j.status,
                progress_percent: STAGE_PROGRESS_PERCENT[j.status] || 0,
                delay_status: delay.delay_status,
                is_delayed: delay.is_delayed
            };
        });

        res.json(augmented);
    } catch (error) {
        next(error);
    }
};

/**
 * Centralized Job State Machine Update with Transaction Safety & Status History.
 */
exports.updateJobStatus = async (req, res, next) => {
    let connection;
    try {
        const { id } = req.params;
        const { status, reason, notes, estimated_completion_at } = req.body;
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
        let newEstimatedCompletion = estimated_completion_at ? new Date(estimated_completion_at) : job.estimated_completion_at;
        
        if (targetStatus === 'COMPLETED' && job.started_at) {
            const start = new Date(job.started_at);
            const now = new Date();
            actual_duration_minutes = Math.max(1, Math.round((now - start) / 60000));
            updateQuery += ', actual_duration_minutes = ?, completed_at = CURRENT_TIMESTAMP';
            queryParams.push(actual_duration_minutes);
        } else if (targetStatus === 'IN_PROGRESS') {
            if (!job.started_at) {
                updateQuery += ', started_at = CURRENT_TIMESTAMP';
                if (!job.estimated_start_at) {
                    updateQuery += ', estimated_start_at = CURRENT_TIMESTAMP';
                }
            }
            // If estimated_completion_at is missing, calculate based on estimated_duration_minutes
            if (!job.estimated_completion_at && job.estimated_duration_minutes) {
                newEstimatedCompletion = new Date(Date.now() + job.estimated_duration_minutes * 60000);
                updateQuery += ', estimated_completion_at = ?';
                queryParams.push(newEstimatedCompletion);
            }
        }

        if (estimated_completion_at) {
            updateQuery += ', estimated_completion_at = ?';
            queryParams.push(newEstimatedCompletion);
        }

        if (reason) {
            updateQuery += ', delay_reason = ?';
            queryParams.push(reason);
        }
        
        updateQuery += ', last_status_change_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        queryParams.push(id);
        
        await connection.query(updateQuery, queryParams);

        // Record auditable status history
        const stageLabel = STAGE_LABELS[targetStatus] || targetStatus;
        const historyId = uuidv4();
        await connection.query(
            `INSERT INTO Job_Status_History (
                id, job_card_id, previous_status, new_status, stage_label, 
                changed_by, changed_by_role, reason, notes, estimated_completion_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                historyId, id, currentStatus, targetStatus, stageLabel, 
                user.id, role, reason || `Status transitioned to ${stageLabel}`, 
                notes || null, newEstimatedCompletion
            ]
        );

        await connection.query(
            'INSERT INTO Audit_Log (id, user_id, garage_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), user.id, job.garage_id, 'UPDATE_STATUS', 'Job_Card', id, JSON.stringify({ from: currentStatus, to: targetStatus, reason })]
        );

        await connection.commit();
        res.json({ 
            message: 'Job status updated', 
            status: targetStatus, 
            stage_label: stageLabel,
            estimated_completion_at: newEstimatedCompletion 
        });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Explicit ETA Update (with Delay Reason & Audit Logging).
 */
exports.updateJobETA = async (req, res, next) => {
    let connection;
    try {
        const { id } = req.params;
        const { estimated_completion_at, delay_reason, notes } = req.body;
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        if (!estimated_completion_at) {
            return res.status(400).json({ error: 'estimated_completion_at is required' });
        }

        connection = await req.db.getConnection();
        await connection.beginTransaction();

        const [jobs] = await connection.query('SELECT * FROM Job_Card WHERE id = ? FOR UPDATE', [id]);
        if (!jobs.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobs[0];
        if (role !== 'ADMIN' && !isGarageAuthorized(user, job.garage_id)) {
            await connection.rollback();
            return res.status(403).json({ error: 'Forbidden: Unauthorized for this garage' });
        }

        const newEta = new Date(estimated_completion_at);
        const oldEta = job.estimated_completion_at ? new Date(job.estimated_completion_at).toISOString() : 'None';

        await connection.query(
            'UPDATE Job_Card SET estimated_completion_at = ?, delay_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newEta, delay_reason || 'ETA adjusted', id]
        );

        // Record in status history as an auditable ETA change event
        const historyId = uuidv4();
        await connection.query(
            `INSERT INTO Job_Status_History (
                id, job_card_id, previous_status, new_status, stage_label, 
                changed_by, changed_by_role, reason, notes, estimated_completion_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                historyId, id, job.status, job.status, 'ETA Updated',
                user.id, role, delay_reason || `Expected completion updated from ${oldEta}`,
                notes || null, newEta
            ]
        );

        await connection.commit();
        res.json({ 
            message: 'Expected completion time updated successfully',
            estimated_completion_at: newEta,
            delay_reason: delay_reason || null
        });
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
 * Scoped Job Details with IDOR Protection (Manager / Mechanic View).
 */
exports.getJobDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const role = (user && user.role ? user.role : '').toUpperCase();

        const [jobs] = await req.db.query(`
            SELECT j.*, v.make, v.model, v.year, v.license_plate, v.vin,
                   c.first_name, c.last_name, c.email AS customer_email, c.phone AS customer_phone,
                   u.name AS mechanic_name
            FROM Job_Card j
            LEFT JOIN Vehicle v ON j.vehicle_id = v.id
            LEFT JOIN Customer c ON j.customer_id = c.id
            LEFT JOIN Job_Assignment ja ON ja.job_card_id = j.id AND ja.status IN ('PENDING', 'ACCEPTED', 'ACTIVE')
            LEFT JOIN Mechanic_Profile mp ON ja.mechanic_id = mp.id
            LEFT JOIN User_Account u ON mp.user_id = u.id
            WHERE j.id = ?
        `, [id]);

        if (!jobs.length) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobs[0];

        // Strict authorization check to prevent cross-garage IDOR
        if (role === 'CUSTOMER') {
            const customerId = await resolveCustomerId(req);
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

        const [history] = await req.db.query(`
            SELECT * FROM Job_Status_History 
            WHERE job_card_id = ? 
            ORDER BY changed_at ASC
        `, [id]);

        const delay = computeDelayStatus(job);
        
        res.json({ 
            job: {
                ...job,
                stage_label: STAGE_LABELS[job.status] || job.status,
                progress_percent: STAGE_PROGRESS_PERCENT[job.status] || 0,
                delay_status: delay.delay_status,
                is_delayed: delay.is_delayed
            }, 
            notes,
            history
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Customer-Safe Service Tracking API.
 * Provides real-time visibility into vehicle stage, ETA, delay status, and auditable history.
 */
exports.getCustomerJobTracking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customerId = await resolveCustomerId(req);
        if (!customerId) {
            return res.status(401).json({ error: 'Customer authentication required' });
        }

        // Query by Job Card id, job_number, or appointment_id
        const [jobs] = await req.db.query(`
            SELECT 
                j.id AS job_id,
                j.job_number,
                j.status,
                j.service_type,
                j.problem_description,
                j.priority,
                j.complexity,
                j.estimated_duration_minutes,
                j.estimated_start_at,
                j.estimated_completion_at,
                j.started_at,
                j.completed_at,
                j.last_status_change_at,
                j.delay_reason,
                j.created_at,
                -- Garage safe info
                g.id AS garage_id,
                g.name AS garage_name,
                g.address AS garage_address,
                g.city AS garage_city,
                g.phone AS garage_phone,
                -- Vehicle safe info
                v.id AS vehicle_id,
                v.make AS vehicle_make,
                v.model AS vehicle_model,
                v.year AS vehicle_year,
                v.license_plate AS vehicle_plate,
                -- Customer safe mechanic info (no private notes/financials)
                u.name AS mechanic_name,
                -- Appointment info
                a.id AS appointment_id,
                a.appointment_date,
                a.appointment_time
            FROM Job_Card j
            JOIN Garage g ON j.garage_id = g.id
            JOIN Vehicle v ON j.vehicle_id = v.id
            LEFT JOIN Appointment a ON j.appointment_id = a.id
            LEFT JOIN Job_Assignment ja ON ja.job_card_id = j.id AND ja.status IN ('PENDING', 'ACCEPTED', 'ACTIVE')
            LEFT JOIN Mechanic_Profile mp ON ja.mechanic_id = mp.id
            LEFT JOIN User_Account u ON mp.user_id = u.id
            WHERE (j.id = ? OR j.job_number = ? OR j.appointment_id = ?) 
              AND j.customer_id = ?
        `, [id, id, id, customerId]);

        if (!jobs.length) {
            return res.status(404).json({ error: 'Service tracking record not found for this vehicle' });
        }

        const job = jobs[0];
        const delay = computeDelayStatus(job);
        const currentStatus = (job.status || 'CREATED').toUpperCase();
        const stageLabel = STAGE_LABELS[currentStatus] || currentStatus;
        const progressPercent = STAGE_PROGRESS_PERCENT[currentStatus] || 0;
        const nextStage = NEXT_STAGE_MAP[currentStatus] || 'Vehicle Ready';

        // Fetch chronological status history
        const [rawHistory] = await req.db.query(`
            SELECT id, previous_status, new_status, stage_label, changed_at, reason, estimated_completion_at
            FROM Job_Status_History
            WHERE job_card_id = ?
            ORDER BY changed_at ASC
        `, [job.job_id]);

        // Standard 7-stage customer lifecycle
        const standardStages = [
            { key: 'CONFIRMED', label: 'Appointment Confirmed', description: 'Bay slot reserved' },
            { key: 'CREATED', label: 'Vehicle Received', description: 'Vehicle checked in at service center' },
            { key: 'READY_FOR_ASSIGNMENT', label: 'Inspection & Diagnostics', description: 'Technicians assessing vehicle systems' },
            { key: 'ASSIGNED', label: 'Work Assigned', description: 'Dedicated mechanic allocated' },
            { key: 'IN_PROGRESS', label: 'Service In Progress', description: 'Active repairs and service underway' },
            { key: 'QUALITY_CHECK', label: 'Quality Check & Testing', description: 'Final safety & quality verification' },
            { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup', description: 'Ready for customer collection' },
            { key: 'COMPLETED', label: 'Delivered & Completed', description: 'Vehicle handover finished' }
        ];

        // Map status history to standard stages
        const stageOrder = ['CONFIRMED', 'CREATED', 'READY_FOR_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY_FOR_PICKUP', 'COMPLETED'];
        const currentOrderIndex = stageOrder.indexOf(currentStatus);

        const timeline = standardStages.map((stage, idx) => {
            // Find history record for this stage
            let historyMatch = null;
            if (stage.key === 'CONFIRMED') {
                historyMatch = { changed_at: job.appointment_date ? `${job.appointment_date}T${job.appointment_time || '09:00:00'}` : job.created_at };
            } else {
                historyMatch = rawHistory.find(h => h.new_status === stage.key);
            }

            let state = 'UPCOMING';
            if (currentStatus === 'COMPLETED' || currentStatus === 'CLOSED') {
                state = 'COMPLETED';
            } else if (idx < currentOrderIndex) {
                state = 'COMPLETED';
            } else if (idx === currentOrderIndex) {
                state = 'CURRENT';
            }

            return {
                ...stage,
                state,
                timestamp: historyMatch ? historyMatch.changed_at : null
            };
        });

        res.json({
            tracking: {
                job_id: job.job_id,
                job_number: job.job_number,
                current_status: currentStatus,
                current_stage_label: stageLabel,
                next_stage: nextStage,
                progress_percent: progressPercent,
                delay_status: delay.delay_status,
                is_delayed: delay.is_delayed,
                delay_reason: job.delay_reason,
                estimated_completion_at: job.estimated_completion_at,
                started_at: job.started_at,
                completed_at: job.completed_at,
                last_updated: job.last_status_change_at || job.created_at,
                vehicle: {
                    id: job.vehicle_id,
                    brand: job.vehicle_make,
                    model: job.vehicle_model,
                    year: job.vehicle_year,
                    license_plate: job.vehicle_plate
                },
                service: {
                    type: job.service_type,
                    description: job.problem_description,
                    priority: job.priority,
                    complexity: job.complexity,
                    estimated_duration_minutes: job.estimated_duration_minutes
                },
                garage: {
                    id: job.garage_id,
                    name: job.garage_name,
                    address: job.garage_address,
                    city: job.garage_city,
                    phone: job.garage_phone
                },
                mechanic: job.mechanic_name ? {
                    name: job.mechanic_name,
                    certified: true
                } : null,
                timeline,
                history: rawHistory
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Customer Active Service Tracking.
 * Finds the currently active job/service for the authenticated customer.
 */
exports.getCustomerActiveTracking = async (req, res, next) => {
    try {
        const customerId = await resolveCustomerId(req);
        if (!customerId) {
            return res.json({ active: false });
        }

        // 1. Look for active Job_Card
        const [jobs] = await req.db.query(`
            SELECT id FROM Job_Card
            WHERE customer_id = ? 
              AND status NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')
            ORDER BY created_at DESC
            LIMIT 1
        `, [customerId]);

        if (jobs.length > 0) {
            req.params.id = jobs[0].id;
            return exports.getCustomerJobTracking(req, res, next);
        }

        // 2. If no active Job_Card, look for active scheduled Appointment
        const [appointments] = await req.db.query(`
            SELECT a.id, a.appointment_date, a.appointment_time, 
                   g.id AS garage_id, g.name AS garage_name, g.address AS garage_address, g.city AS garage_city, g.phone AS garage_phone,
                   v.id AS vehicle_id, v.make AS vehicle_make, v.model AS vehicle_model, v.license_plate AS vehicle_plate
            FROM Appointment a
            JOIN Garage g ON a.garage_id = g.id
            JOIN Vehicle v ON a.vehicle_id = v.id
            WHERE a.customer_id = ? 
              AND a.status IN ('SCHEDULED', 'in_progress', 'scheduled')
              AND (a.deleted_at IS NULL)
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
            LIMIT 1
        `, [customerId]);

        if (appointments.length > 0) {
            const apt = appointments[0];
            return res.json({
                active: true,
                is_pre_job: true,
                tracking: {
                    appointment_id: apt.id,
                    current_status: 'CONFIRMED',
                    current_stage_label: 'Appointment Confirmed',
                    next_stage: 'Vehicle Check-in at Workshop',
                    progress_percent: 15,
                    delay_status: 'ON_TIME',
                    is_delayed: false,
                    delay_reason: null,
                    estimated_completion_at: null,
                    scheduled_time: `${apt.appointment_date} ${apt.appointment_time}`,
                    vehicle: {
                        id: apt.vehicle_id,
                        brand: apt.vehicle_make,
                        model: apt.vehicle_model,
                        license_plate: apt.vehicle_plate
                    },
                    garage: {
                        id: apt.garage_id,
                        name: apt.garage_name,
                        address: apt.garage_address,
                        city: apt.garage_city,
                        phone: apt.garage_phone
                    },
                    timeline: [
                        { key: 'CONFIRMED', label: 'Appointment Confirmed', description: 'Bay slot reserved', state: 'CURRENT', timestamp: `${apt.appointment_date}T${apt.appointment_time}` },
                        { key: 'CREATED', label: 'Vehicle Received', description: 'Vehicle checked in at service center', state: 'UPCOMING', timestamp: null },
                        { key: 'READY_FOR_ASSIGNMENT', label: 'Inspection & Diagnostics', description: 'Technicians assessing vehicle systems', state: 'UPCOMING', timestamp: null },
                        { key: 'ASSIGNED', label: 'Work Assigned', description: 'Dedicated mechanic allocated', state: 'UPCOMING', timestamp: null },
                        { key: 'IN_PROGRESS', label: 'Service In Progress', description: 'Active repairs and service underway', state: 'UPCOMING', timestamp: null },
                        { key: 'QUALITY_CHECK', label: 'Quality Check & Testing', description: 'Final safety & quality verification', state: 'UPCOMING', timestamp: null },
                        { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup', description: 'Ready for customer collection', state: 'UPCOMING', timestamp: null },
                        { key: 'COMPLETED', label: 'Delivered & Completed', description: 'Vehicle handover finished', state: 'UPCOMING', timestamp: null }
                    ],
                    history: []
                }
            });
        }

        // No active job or appointment
        res.json({ active: false });
    } catch (error) {
        next(error);
    }
};
