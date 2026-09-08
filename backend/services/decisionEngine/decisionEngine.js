/**
 * Decision Engine Orchestration Service.
 * Coordinates between MySQL operational data, Python scoring engines, and Decision_Audit persistence.
 */
const { v4: uuidv4 } = require('uuid');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

async function pyPost(path, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(`${PYTHON_API_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Python service status ${response.status}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function pyGet(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(`${PYTHON_API_URL}${path}`, { signal: controller.signal });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Python service status ${response.status}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Scan operational database and generate actionable pending decisions for a garage.
 */
async function generatePendingDecisionsForGarage(db, garageId) {
    const generated = [];

    // 1. Unassigned Job Cards -> MECHANIC_ASSIGNMENT Decisions
    const [unassignedJobs] = await db.query(
        `SELECT jc.id, jc.status, jc.estimated_duration_minutes, sr.service_type, v.model AS vehicle_model
         FROM Job_Card jc
         LEFT JOIN Service_Request sr ON jc.service_request_id = sr.id
         LEFT JOIN Vehicle v ON sr.vehicle_id = v.id
         JOIN Appointment a ON jc.appointment_id = a.id
         WHERE a.garage_id = ? AND jc.status IN ('CREATED', 'READY_FOR_ASSIGNMENT') AND jc.mechanic_id IS NULL
         LIMIT 5`,
        [garageId]
    );

    if (unassignedJobs.length > 0) {
        // Fetch eligible mechanics in garage
        const [mechanics] = await db.query(
            `SELECT mp.id, ua.name, mp.status, mp.current_workload_minutes, mp.specialization
             FROM Mechanic_Profile mp
             JOIN User_Account ua ON mp.user_id = ua.id
             WHERE mp.garage_id = ? AND mp.status = 'AVAILABLE'`,
            [garageId]
        );

        for (const job of unassignedJobs) {
            // Check if a pending decision already exists for this job
            const [existing] = await db.query(
                `SELECT id FROM Decision_Audit 
                 WHERE garage_id = ? AND target_entity_id = ? AND decision_type = 'MECHANIC_ASSIGNMENT' AND status = 'PENDING'`,
                [garageId, String(job.id)]
            );

            if (existing.length === 0 && mechanics.length > 0) {
                try {
                    const scoreRes = await pyPost('/api/decisions/score/assignment', {
                        job_details: {
                            id: job.id,
                            service_type: job.service_type || 'general_inspection',
                            vehicle_type: job.vehicle_model || 'sedan',
                            required_skills: job.specialization ? [job.specialization] : []
                        },
                        candidate_mechanics: mechanics.map(m => ({
                            id: m.id,
                            name: m.name,
                            skills: m.specialization ? [m.specialization] : ['general'],
                            current_workload_mins: m.current_workload_minutes || 0,
                            max_daily_capacity_mins: 480,
                            avg_completion_rate: 0.92,
                            status: m.status
                        })),
                        predicted_duration_mins: parseFloat(job.estimated_duration_minutes || 60),
                        garage_id: garageId
                    });

                    if (scoreRes && scoreRes.decision_package) {
                        const pkg = scoreRes.decision_package;
                        await db.query(
                            `INSERT INTO Decision_Audit (
                                id, garage_id, decision_type, target_entity_type, target_entity_id,
                                input_summary, recommendation_payload, confidence_level, confidence_score,
                                model_versions, constraints_checked, status
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
                            [
                                pkg.id,
                                garageId,
                                pkg.decision_type,
                                pkg.target_entity_type,
                                pkg.target_entity_id,
                                JSON.stringify({ job_id: job.id, service_type: job.service_type }),
                                JSON.stringify(pkg),
                                pkg.confidence_level,
                                pkg.confidence_score,
                                JSON.stringify(pkg.model_versions),
                                JSON.stringify(pkg.constraints_checked)
                            ]
                        );
                        generated.push(pkg);
                    }
                } catch (pyErr) {
                    console.warn(`Python assignment scoring skipped for job ${job.id}:`, pyErr.message);
                }
            }
        }
    }

    // 2. Low Stock Parts -> INVENTORY_REORDER Decisions
    const [criticalParts] = await db.query(
        `SELECT sp.id, sp.name, sp.part_number, sp.cost, i.quantity_in_stock, i.reserved_quantity, i.reorder_level
         FROM inventory i
         JOIN spare_parts sp ON i.part_id = sp.id
         WHERE i.garage_id = ? AND (i.quantity_in_stock - COALESCE(i.reserved_quantity, 0)) <= i.reorder_level
         LIMIT 3`,
        [garageId]
    );

    for (const part of criticalParts) {
        const [existing] = await db.query(
            `SELECT id FROM Decision_Audit 
             WHERE garage_id = ? AND target_entity_id = ? AND decision_type = 'INVENTORY_REORDER' AND status = 'PENDING'`,
            [garageId, String(part.id)]
        );

        if (existing.length === 0) {
            try {
                const invRes = await pyPost('/api/decisions/score/inventory-reorder', {
                    part_details: { id: part.id, name: part.name, part_number: part.part_number },
                    predicted_14d_demand: Math.max(10, part.reorder_level * 2),
                    current_stock: parseFloat(part.quantity_in_stock || 0),
                    reserved_quantity: parseFloat(part.reserved_quantity || 0),
                    reorder_level: parseFloat(part.reorder_level || 5),
                    unit_cost: parseFloat(part.cost || 500),
                    supplier: 'Primary Auto Supply Co.',
                    garage_id: garageId
                });

                if (invRes && invRes.decision_package) {
                    const pkg = invRes.decision_package;
                    await db.query(
                        `INSERT INTO Decision_Audit (
                            id, garage_id, decision_type, target_entity_type, target_entity_id,
                            input_summary, recommendation_payload, confidence_level, confidence_score,
                            model_versions, constraints_checked, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
                        [
                            pkg.id,
                            garageId,
                            pkg.decision_type,
                            pkg.target_entity_type,
                            pkg.target_entity_id,
                            JSON.stringify({ part_id: part.id, current_stock: part.quantity_in_stock }),
                            JSON.stringify(pkg),
                            pkg.confidence_level,
                            pkg.confidence_score,
                            JSON.stringify(pkg.model_versions),
                            JSON.stringify(pkg.constraints_checked)
                        ]
                    );
                    generated.push(pkg);
                }
            } catch (pyErr) {
                console.warn(`Python inventory scoring skipped for part ${part.id}:`, pyErr.message);
            }
        }
    }

    return generated;
}

/**
 * Fetch pending decisions for a garage.
 */
async function getPendingDecisions(db, garageId) {
    let query = `
        SELECT da.*, g.name AS garage_name, ua.name AS reviewed_by_name
        FROM Decision_Audit da
        JOIN Garage g ON da.garage_id = g.id
        LEFT JOIN User_Account ua ON da.reviewed_by = ua.id
        WHERE da.status = 'PENDING'
    `;
    const params = [];

    if (garageId && garageId !== 'all') {
        query += ` AND da.garage_id = ?`;
        params.push(garageId);
    }

    query += ` ORDER BY da.created_at DESC LIMIT 50`;
    const [rows] = await db.query(query, params);

    return rows.map(r => ({
        ...r,
        input_summary: typeof r.input_summary === 'string' ? JSON.parse(r.input_summary) : r.input_summary,
        recommendation_payload: typeof r.recommendation_payload === 'string' ? JSON.parse(r.recommendation_payload) : r.recommendation_payload,
        model_versions: typeof r.model_versions === 'string' ? JSON.parse(r.model_versions) : r.model_versions,
        constraints_checked: typeof r.constraints_checked === 'string' ? JSON.parse(r.constraints_checked) : r.constraints_checked,
        manager_override_payload: r.manager_override_payload ? (typeof r.manager_override_payload === 'string' ? JSON.parse(r.manager_override_payload) : r.manager_override_payload) : null
    }));
}

/**
 * Fetch decision history for audit reporting.
 */
async function getDecisionHistory(db, garageId, limit = 100) {
    let query = `
        SELECT da.*, g.name AS garage_name, ua.name AS reviewed_by_name, df.rejection_reason_code, df.notes AS feedback_notes
        FROM Decision_Audit da
        JOIN Garage g ON da.garage_id = g.id
        LEFT JOIN User_Account ua ON da.reviewed_by = ua.id
        LEFT JOIN Decision_Feedback df ON da.id = df.decision_id
        WHERE da.status != 'PENDING'
    `;
    const params = [];

    if (garageId && garageId !== 'all') {
        query += ` AND da.garage_id = ?`;
        params.push(garageId);
    }

    query += ` ORDER BY da.updated_at DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await db.query(query, params);

    return rows.map(r => ({
        ...r,
        input_summary: typeof r.input_summary === 'string' ? JSON.parse(r.input_summary) : r.input_summary,
        recommendation_payload: typeof r.recommendation_payload === 'string' ? JSON.parse(r.recommendation_payload) : r.recommendation_payload,
        model_versions: typeof r.model_versions === 'string' ? JSON.parse(r.model_versions) : r.model_versions,
        constraints_checked: typeof r.constraints_checked === 'string' ? JSON.parse(r.constraints_checked) : r.constraints_checked,
        manager_override_payload: r.manager_override_payload ? (typeof r.manager_override_payload === 'string' ? JSON.parse(r.manager_override_payload) : r.manager_override_payload) : null
    }));
}

module.exports = {
    generatePendingDecisionsForGarage,
    getPendingDecisions,
    getDecisionHistory,
    pyPost,
    pyGet
};
