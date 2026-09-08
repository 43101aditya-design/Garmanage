/**
 * Decision Audit & Transactional Execution Service.
 * Ensures atomicity between human approval, operational record updates, and audit trail logs.
 */
const { v4: uuidv4 } = require('uuid');
const { validateDecisionState, validateMechanicEligibility } = require('./decisionValidator');

/**
 * Execute approval of a decision with atomic MySQL transaction.
 */
async function approveDecision(db, decisionId, user, overrideOptions = {}) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Fetch decision record with lock
        const [decisions] = await conn.query(
            `SELECT * FROM Decision_Audit WHERE id = ? FOR UPDATE`,
            [decisionId]
        );

        if (decisions.length === 0) {
            throw new Error(`Decision ${decisionId} not found`);
        }

        const decision = decisions[0];
        validateDecisionState(decision, 'APPROVE');

        let payload = decision.recommendation_payload;
        if (typeof payload === 'string') {
            payload = JSON.parse(payload);
        }

        const isModified = Boolean(overrideOptions.mechanic_id || overrideOptions.modified_quantity || overrideOptions.override_reason);
        const finalStatus = isModified ? 'MODIFIED' : 'APPROVED';

        // 2. Perform business action according to decision type
        let executionSuccess = false;
        let executionDetails = {};

        if (decision.decision_type === 'MECHANIC_ASSIGNMENT') {
            const targetJobId = decision.target_entity_id;
            const targetMechId = overrideOptions.mechanic_id || (payload.recommended_mechanic && payload.recommended_mechanic.id);

            if (!targetMechId) {
                throw new Error('Target mechanic ID missing in recommendation payload');
            }

            // Reload and lock target Job Card
            const [jobs] = await conn.query('SELECT * FROM Job_Card WHERE id = ? FOR UPDATE', [targetJobId]);
            if (jobs.length === 0) {
                throw new Error(`Target Job Card ${targetJobId} no longer exists`);
            }

            const currentJob = jobs[0];
            const currentStatus = (currentJob.status || '').toUpperCase();

            // Strict validation: Reject if job is completed, cancelled, or closed
            if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(currentStatus)) {
                throw new Error(`Cannot execute assignment on ${currentStatus} job ${targetJobId}`);
            }

            if (currentJob.garage_id !== decision.garage_id) {
                throw new Error(`Job Card ${targetJobId} belongs to a different garage than decision`);
            }

            // Verify mechanic validity inside transaction
            await validateMechanicEligibility(conn, targetMechId, decision.garage_id);

            // Update Job Card and Job Assignment record
            await conn.query(
                `UPDATE Job_Card 
                 SET status = 'IN_PROGRESS', mechanic_id = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [targetMechId, targetJobId]
            );

            // Record assignment log
            const assignId = uuidv4();
            await conn.query(
                `INSERT INTO AI_Assignment_Audit_Event (id, job_card_id, garage_id, actor_user_id, event_type, metadata)
                 VALUES (?, ?, ?, ?, 'RECOMMENDATION_APPROVED', ?)`,
                [assignId, targetJobId, decision.garage_id, user.id, JSON.stringify({ decision_id: decision.id, assigned_mechanic: targetMechId })]
            );

            executionSuccess = true;
            executionDetails = { assigned_mechanic_id: targetMechId, job_card_id: targetJobId };

        } else if (decision.decision_type === 'INVENTORY_REORDER') {
            const targetPartId = decision.target_entity_id;
            const quantity = overrideOptions.modified_quantity || payload.recommended_quantity || 10;
            const reqNum = `PO-${Date.now().toString().slice(-6)}`;

            // Create Purchase Request
            const poId = uuidv4();
            await conn.query(
                `INSERT INTO purchase_requests (
                    id, request_number, garage_id, part_id, requested_quantity, 
                    unit_cost, supplier, status, requested_by, created_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, CURRENT_TIMESTAMP)`,
                [
                    poId,
                    reqNum,
                    decision.garage_id,
                    targetPartId,
                    quantity,
                    payload.unit_cost || 500.0,
                    payload.supplier || 'Primary Auto Supply Co.',
                    user.id
                ]
            );

            executionSuccess = true;
            executionDetails = { purchase_request_id: poId, request_number: reqNum, quantity };

        } else {
            // General decisions (Workload, Priority, Revenue optimization) mark as executed
            executionSuccess = true;
            executionDetails = { acknowledged_by: user.id, timestamp: new Date().toISOString() };
        }

        // 3. Update Decision_Audit state
        await conn.query(
            `UPDATE Decision_Audit
             SET status = ?,
                 reviewed_by = ?,
                 decision_reason = ?,
                 manager_override_payload = ?,
                 executed_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                finalStatus,
                user.id,
                overrideOptions.override_reason || 'Approved by authorized manager',
                isModified ? JSON.stringify(overrideOptions) : null,
                decision.id
            ]
        );

        // 4. Record Decision_Feedback
        const feedbackId = uuidv4();
        await conn.query(
            `INSERT INTO Decision_Feedback (id, decision_id, action_taken, notes, user_id)
             VALUES (?, ?, ?, ?, ?)`,
            [
                feedbackId,
                decision.id,
                finalStatus,
                overrideOptions.notes || 'Recommendation accepted into production workflow.',
                user.id
            ]
        );

        await conn.commit();
        return {
            success: true,
            decision_id: decision.id,
            status: finalStatus,
            execution: executionDetails
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Reject a decision and record rejection reasoning for ML feedback dataset.
 */
async function rejectDecision(db, decisionId, user, rejectionReasonCode = 'BUSINESS_PREFERENCE', notes = '') {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [decisions] = await conn.query(
            `SELECT * FROM Decision_Audit WHERE id = ? FOR UPDATE`,
            [decisionId]
        );

        if (decisions.length === 0) {
            throw new Error(`Decision ${decisionId} not found`);
        }

        const decision = decisions[0];
        validateDecisionState(decision, 'REJECT');

        // Update Decision_Audit status to REJECTED
        await conn.query(
            `UPDATE Decision_Audit
             SET status = 'REJECTED',
                 reviewed_by = ?,
                 decision_reason = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [user.id, notes || `Rejected by manager (${rejectionReasonCode})`, decision.id]
        );

        // Record structured feedback
        const feedbackId = uuidv4();
        await conn.query(
            `INSERT INTO Decision_Feedback (id, decision_id, action_taken, rejection_reason_code, notes, user_id)
             VALUES (?, ?, 'REJECTED', ?, ?, ?)`,
            [feedbackId, decision.id, rejectionReasonCode, notes, user.id]
        );

        await conn.commit();
        return {
            success: true,
            decision_id: decision.id,
            status: 'REJECTED',
            rejection_reason_code: rejectionReasonCode
        };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = {
    approveDecision,
    rejectDecision
};
