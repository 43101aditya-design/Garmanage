/**
 * Decision Intelligence Controller.
 * Exposes authenticated endpoints for human-in-the-loop decision approvals, feedback, and scoring.
 */
const { 
    generatePendingDecisionsForGarage, 
    getPendingDecisions, 
    getDecisionHistory, 
    pyPost, 
    pyGet 
} = require('../services/decisionEngine/decisionEngine');
const { approveDecision, rejectDecision } = require('../services/decisionEngine/decisionAudit');
const { validateGarageAccess, DecisionValidationError } = require('../services/decisionEngine/decisionValidator');

// Helper to resolve and authorize target garage for current request
function resolveAndAuthorizeGarage(req, res) {
    const requestedGarageId = (req.query && req.query.garage_id) || (req.body && req.body.garage_id);
    const role = req.user.role;
    const memberships = req.user.memberships || [];

    if (role === 'admin' || role === 'owner') {
        return requestedGarageId || null;
    }

    if (role === 'manager') {
        const activeMemberships = memberships.filter(m => m.garage_id);
        if (activeMemberships.length === 0) {
            res.status(403).json({ error: 'Forbidden: No active garage memberships' });
            return undefined;
        }

        if (requestedGarageId) {
            const hasAccess = activeMemberships.some(m => m.garage_id === requestedGarageId);
            if (!hasAccess) {
                res.status(403).json({ error: 'Forbidden: You do not have access to this garage' });
                return undefined;
            }
            return requestedGarageId;
        } else {
            return activeMemberships[0].garage_id;
        }
    }

    res.status(403).json({ error: 'Forbidden: Insufficient privileges for decision operations' });
    return undefined;
}

// ── GET /api/decisions/pending ───────────────────────────────────────────────
exports.getPendingDecisions = async (req, res, next) => {
    try {
        const garageId = resolveAndAuthorizeGarage(req, res);
        if (garageId === undefined) return;

        // Proactively scan database and generate decisions if garage is specified
        if (garageId && garageId !== 'all') {
            await generatePendingDecisionsForGarage(req.db, garageId).catch(err => {
                console.warn('Pending decision generation warning:', err.message);
            });
        }

        const decisions = await getPendingDecisions(req.db, garageId);
        res.json({
            garage_id: garageId,
            count: decisions.length,
            decisions
        });
    } catch (error) {
        console.error('getPendingDecisions error:', error);
        next(error);
    }
};

// ── POST /api/decisions/:id/approve ──────────────────────────────────────────
exports.approveDecision = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await approveDecision(req.db, id, req.user);
        res.json(result);
    } catch (error) {
        console.error(`approveDecision ${id} error:`, error);
        if (error.name === 'DecisionValidationError' || error.message.includes('not found') || error.message.includes('Idempotency')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: `Approval failed: ${error.message}` });
    }
};

// ── POST /api/decisions/:id/reject ───────────────────────────────────────────
exports.rejectDecision = async (req, res, next) => {
    const { id } = req.params;
    const { rejection_reason_code, notes } = req.body;
    try {
        const result = await rejectDecision(req.db, id, req.user, rejection_reason_code, notes);
        res.json(result);
    } catch (error) {
        console.error(`rejectDecision ${id} error:`, error);
        if (error.name === 'DecisionValidationError' || error.message.includes('not found') || error.message.includes('Idempotency')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: `Rejection failed: ${error.message}` });
    }
};

// ── POST /api/decisions/:id/modify ───────────────────────────────────────────
exports.modifyDecision = async (req, res, next) => {
    const { id } = req.params;
    const { mechanic_id, modified_quantity, override_reason, notes } = req.body;
    try {
        const result = await approveDecision(req.db, id, req.user, {
            mechanic_id,
            modified_quantity,
            override_reason,
            notes
        });
        res.json(result);
    } catch (error) {
        console.error(`modifyDecision ${id} error:`, error);
        if (error.name === 'DecisionValidationError' || error.message.includes('not found') || error.message.includes('Idempotency')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: `Modification failed: ${error.message}` });
    }
};

// ── POST /api/decisions/job-priority ─────────────────────────────────────────
exports.scoreJobPriority = async (req, res, next) => {
    try {
        const { job_details, hours_until_scheduled, customer_wait_hours, parts_available, predicted_duration_mins, is_vip_customer } = req.body;
        if (!job_details) {
            return res.status(400).json({ error: 'job_details is required' });
        }

        const data = await pyPost('/api/decisions/score/priority', {
            job_details,
            hours_until_scheduled,
            customer_wait_hours: customer_wait_hours || 0,
            parts_available: parts_available !== false,
            predicted_duration_mins: predicted_duration_mins || 60,
            is_vip_customer: Boolean(is_vip_customer)
        });

        res.json(data);
    } catch (error) {
        console.error('scoreJobPriority error:', error);
        // Clean fallback
        res.json({
            job_id: req.body.job_details?.id,
            priority_level: 'MEDIUM',
            priority_score: 50.0,
            reasons: ['Standard operational queue baseline (intelligence service offline fallback)'],
            recommended_queue_action: 'Maintain standard scheduled workflow queue.'
        });
    }
};

// ── POST /api/decisions/appointment-slots ────────────────────────────────────
exports.scoreAppointmentSlots = async (req, res, next) => {
    try {
        const garageId = resolveAndAuthorizeGarage(req, res);
        if (garageId === undefined) return;

        const { service_type, vehicle_type, target_date } = req.body;

        // Fetch existing appointments for the garage to check overlap
        const [existing] = await req.db.query(
            `SELECT id, scheduled_date, estimated_duration_minutes, status 
             FROM Appointment 
             WHERE garage_id = ? AND status NOT IN ('CANCELLED', 'COMPLETED')`,
            [garageId]
        );

        const data = await pyPost('/api/decisions/score/appointment-slots', {
            service_type: service_type || 'general_inspection',
            vehicle_type: vehicle_type || 'sedan',
            predicted_duration_mins: 60.0,
            existing_appointments: existing,
            target_date: target_date || null
        });

        res.json(data);
    } catch (error) {
        console.error('scoreAppointmentSlots error:', error);
        res.status(500).json({ error: 'Failed to calculate appointment slots' });
    }
};

// ── GET /api/decisions/history ───────────────────────────────────────────────
exports.getDecisionHistory = async (req, res, next) => {
    try {
        const garageId = resolveAndAuthorizeGarage(req, res);
        if (garageId === undefined) return;

        const limit = parseInt(req.query.limit || '100');
        const history = await getDecisionHistory(req.db, garageId, limit);

        res.json({
            garage_id: garageId,
            count: history.length,
            history
        });
    } catch (error) {
        console.error('getDecisionHistory error:', error);
        next(error);
    }
};

// ── GET /api/decisions/pipeline/metadata ─────────────────────────────────────
exports.getPipelineMetadata = async (req, res, next) => {
    try {
        const data = await pyGet('/api/decisions/pipeline/metadata');
        res.json(data);
    } catch (error) {
        console.error('getPipelineMetadata error:', error);
        res.json({
            pipeline_stages: [
                { stage: 1, name: "MySQL Operational Source", description: "Job Cards, Appointments, Inventory" },
                { stage: 2, name: "Phase 7 Predictive Intelligence", description: "Duration, Demand, Workload forecasts" },
                { stage: 3, name: "Decision Engine & Scoring", description: "Multi-factor recommendation synthesis" },
                { stage: 4, name: "Safety & Constraint Validator", description: "Garage tenant & availability check" },
                { stage: 5, name: "Human-in-the-Loop Review", description: "Manager / Owner Approve, Reject, or Modify" },
                { stage: 6, name: "Atomic Transaction Execution", description: "MySQL commit + Decision_Audit log" },
                { stage: 7, name: "Outcome & Feedback Tracking", description: "Records actual vs predicted performance" }
            ],
            governance_mode: "CONTROLLED_AUTONOMOUS_WITH_HUMAN_IN_THE_LOOP"
        });
    }
};
