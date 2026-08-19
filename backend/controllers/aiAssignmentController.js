const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { assertGarageManager, buildAssignmentInput, trainingRows } = require('../services/aiAssignmentDataService');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

async function intelligencePost(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${PYTHON_API_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || `Intelligence service returned ${response.status}`);
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function intelligenceGet(path) {
  const response = await fetch(`${PYTHON_API_URL}${path}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || `Intelligence service returned ${response.status}`);
  return payload;
}

const databaseRows = async (db, sql, values) => (await db.query(sql, values))[0];
const parseJson = (value) => typeof value === 'string' ? JSON.parse(value) : value;

async function assertAccess(res, userId, garageId, db = pool) {
  if (!await assertGarageManager(db, userId, garageId)) {
    res.status(403).json({ error: 'Forbidden: no active manager or owner membership for this garage' });
    return false;
  }
  return true;
}

async function insertAuditEvent(db, { recommendationId = null, jobId, garageId, actorUserId = null, eventType, metadata = null }) {
  await db.query(
    `INSERT INTO AI_Assignment_Audit_Event (id, recommendation_id, job_card_id, garage_id, actor_user_id, event_type, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), recommendationId, jobId, garageId, actorUserId, eventType, metadata ? JSON.stringify(metadata) : null]
  );
}

async function persistRecommendation(db, result, structuredInput, userId) {
  const recommendation = result.recommendations[0];
  if (!recommendation || recommendation.status === 'NO_ELIGIBLE_CANDIDATE') return recommendation;
  const job = structuredInput.job;
  await db.query(`UPDATE AI_Job_Recommendation SET status = 'EXPIRED' WHERE job_card_id = ? AND status = 'PENDING'`, [job.job_id]);
  const id = uuidv4();
  await db.query(
    `INSERT INTO AI_Job_Recommendation
     (id, job_card_id, garage_id, model_version, mode, recommended_mechanic_id, suitability_score, rank_position, reasoning_data, optimization_metadata, input_fingerprint, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 60 MINUTE))`,
    [id, job.job_id, job.garage_id, recommendation.model_version, recommendation.mode, recommendation.recommended_mechanic_id,
      recommendation.suitability_score, JSON.stringify(recommendation), JSON.stringify({ optimizer: recommendation.optimizer }), structuredInput.input_fingerprint]
  );
  await insertAuditEvent(db, { recommendationId: id, jobId: job.job_id, garageId: job.garage_id, actorUserId: userId, eventType: 'RECOMMENDATION_CREATED', metadata: { mode: recommendation.mode, model_version: recommendation.model_version } });
  return { ...recommendation, id, input_fingerprint: undefined };
}

exports.createRecommendation = async (req, res, next) => {
  try {
    const structuredInput = await buildAssignmentInput(pool, req.params.jobId);
    if (!structuredInput) return res.status(404).json({ error: 'Job not found' });
    if (!await assertAccess(res, req.user.id, structuredInput.job.garage_id)) return;
    if (structuredInput.job.status !== 'READY_FOR_ASSIGNMENT') return res.status(409).json({ error: 'Job must be READY_FOR_ASSIGNMENT before a recommendation can be generated' });
    const result = await intelligencePost('/api/intelligence/recommendations', structuredInput.input);
    const recommendation = await persistRecommendation(pool, result, structuredInput, req.user.id);
    if (!recommendation || recommendation.status === 'NO_ELIGIBLE_CANDIDATE') return res.status(422).json({ error: 'No eligible mechanics satisfy all hard constraints', recommendation });
    res.status(201).json(recommendation);
  } catch (error) { next(error); }
};

exports.createBatchRecommendations = async (req, res, next) => {
  try {
    const { garage_id, job_ids } = req.body || {};
    if (!garage_id) return res.status(400).json({ error: 'garage_id is required' });
    if (!await assertAccess(res, req.user.id, garage_id)) return;
    const requested = Array.isArray(job_ids) && job_ids.length ? job_ids : (await databaseRows(pool, `SELECT id FROM Job_Card WHERE garage_id = ? AND status = 'READY_FOR_ASSIGNMENT'`, [garage_id])).map(row => row.id);
    const inputs = [];
    for (const jobId of requested) {
      const structuredInput = await buildAssignmentInput(pool, jobId);
      if (!structuredInput || structuredInput.job.garage_id !== garage_id || structuredInput.job.status !== 'READY_FOR_ASSIGNMENT') continue;
      inputs.push(structuredInput);
    }
    if (!inputs.length) return res.status(422).json({ error: 'No READY_FOR_ASSIGNMENT jobs in the authorized garage' });
    const combined = { jobs: inputs.map(item => item.job), candidates_by_job: Object.assign({}, ...inputs.map(item => item.input.candidates_by_job)) };
    const result = await intelligencePost('/api/intelligence/recommendations', combined);
    const recommendations = [];
    for (const structuredInput of inputs) {
      const oneResult = { recommendations: result.recommendations.filter(item => item.job_id === structuredInput.job.job_id) };
      recommendations.push(await persistRecommendation(pool, oneResult, structuredInput, req.user.id));
    }
    res.status(201).json({ optimizer: result.optimizer, recommendations });
  } catch (error) { next(error); }
};

exports.getJobRecommendation = async (req, res, next) => {
  try {
    const structuredInput = await buildAssignmentInput(pool, req.params.jobId);
    if (!structuredInput) return res.status(404).json({ error: 'Job not found' });
    if (!await assertAccess(res, req.user.id, structuredInput.job.garage_id)) return;
    const records = await databaseRows(pool, `SELECT * FROM AI_Job_Recommendation WHERE job_card_id = ? ORDER BY created_at DESC LIMIT 1`, [req.params.jobId]);
    if (!records.length) return res.status(404).json({ error: 'No recommendation found for this job' });
    const record = records[0];
    res.json({ ...record, reasoning_data: parseJson(record.reasoning_data), optimization_metadata: parseJson(record.optimization_metadata) });
  } catch (error) { next(error); }
};

exports.listPendingRecommendations = async (req, res, next) => {
  try {
    const { garage_id } = req.query;
    if (!garage_id) return res.status(400).json({ error: 'garage_id is required' });
    if (!await assertAccess(res, req.user.id, garage_id)) return;
    const records = await databaseRows(pool, `SELECT r.*, jc.job_number, jc.service_type, jc.priority, jc.complexity, jc.estimated_duration_minutes
      FROM AI_Job_Recommendation r JOIN Job_Card jc ON jc.id = r.job_card_id
      WHERE r.garage_id = ? AND r.status = 'PENDING' AND jc.status = 'READY_FOR_ASSIGNMENT'
      ORDER BY r.created_at DESC`, [garage_id]);
    res.json(records.map(record => ({ ...record, reasoning_data: parseJson(record.reasoning_data), optimization_metadata: parseJson(record.optimization_metadata) })));
  } catch (error) { next(error); }
};

exports.approveRecommendation = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const records = await databaseRows(connection, `SELECT * FROM AI_Job_Recommendation WHERE id = ? FOR UPDATE`, [req.params.id]);
    if (!records.length) { await connection.rollback(); return res.status(404).json({ error: 'Recommendation not found' }); }
    const record = records[0];
    if (!await assertGarageManager(connection, req.user.id, record.garage_id)) { await connection.rollback(); return res.status(403).json({ error: 'Forbidden: no active manager or owner membership for this garage' }); }
    if (record.status !== 'PENDING' || (record.expires_at && new Date(record.expires_at) < new Date())) {
      if (record.status === 'PENDING') {
        await connection.query(`UPDATE AI_Job_Recommendation SET status = 'EXPIRED' WHERE id = ?`, [record.id]);
        await insertAuditEvent(connection, { recommendationId: record.id, jobId: record.job_card_id, garageId: record.garage_id, actorUserId: req.user.id, eventType: 'RECOMMENDATION_EXPIRED', metadata: { reason: 'TIME_EXPIRED' } });
        await connection.commit();
      } else {
        await connection.rollback();
      }
      return res.status(409).json({ error: 'Recommendation is no longer pending; generate a new recommendation' });
    }
    const structuredInput = await buildAssignmentInput(connection, record.job_card_id, { lockJob: true });
    if (!structuredInput || structuredInput.job.status !== 'READY_FOR_ASSIGNMENT') {
      await connection.query(`UPDATE AI_Job_Recommendation SET status = 'EXPIRED' WHERE id = ?`, [record.id]);
      await insertAuditEvent(connection, { recommendationId: record.id, jobId: record.job_card_id, garageId: record.garage_id, actorUserId: req.user.id, eventType: 'RECOMMENDATION_EXPIRED', metadata: { reason: 'JOB_NOT_READY' } });
      await connection.commit();
      return res.status(409).json({ error: 'Job is no longer ready for assignment; recommendation expired' });
    }
    if (structuredInput.input_fingerprint !== record.input_fingerprint) {
      await connection.query(`UPDATE AI_Job_Recommendation SET status = 'EXPIRED' WHERE id = ?`, [record.id]);
      await insertAuditEvent(connection, { recommendationId: record.id, jobId: record.job_card_id, garageId: record.garage_id, actorUserId: req.user.id, eventType: 'RECOMMENDATION_EXPIRED', metadata: { reason: 'INPUT_CHANGED' } });
      await connection.commit();
      return res.status(409).json({ error: 'Mechanic availability, workload, or job data changed; recommendation expired' });
    }
    const chosenMechanicId = req.body?.mechanic_id || record.recommended_mechanic_id;
    const override = chosenMechanicId !== record.recommended_mechanic_id;
    if (override && !String(req.body?.override_reason || '').trim()) { await connection.rollback(); return res.status(400).json({ error: 'override_reason is required when choosing another mechanic' }); }
    const candidate = structuredInput.input.candidates_by_job[record.job_card_id].find(item => item.mechanic_id === chosenMechanicId && item.eligible);
    if (!candidate) { await connection.rollback(); return res.status(409).json({ error: 'Selected mechanic is not currently eligible for this job' }); }
    const assignmentId = uuidv4();
    await connection.query(`INSERT INTO Job_Assignment (id, job_card_id, mechanic_id, assigned_by, assignment_type, status) VALUES (?, ?, ?, ?, ?, 'PENDING')`, [assignmentId, record.job_card_id, chosenMechanicId, req.user.id, override ? 'MANUAL' : 'AI_RECOMMENDED']);
    await connection.query(`UPDATE Job_Card SET status = 'ASSIGNED' WHERE id = ? AND status = 'READY_FOR_ASSIGNMENT'`, [record.job_card_id]);
    await connection.query(`UPDATE AI_Job_Recommendation SET status = 'APPROVED', reviewed_by = ?, manager_choice_mechanic_id = ?, review_reason = ? WHERE id = ?`, [req.user.id, chosenMechanicId, override ? req.body.override_reason.trim() : null, record.id]);
    await insertAuditEvent(connection, { recommendationId: record.id, jobId: record.job_card_id, garageId: record.garage_id, actorUserId: req.user.id, eventType: override ? 'MANAGER_OVERRIDE' : 'RECOMMENDATION_APPROVED', metadata: { assignment_id: assignmentId, recommended_mechanic_id: record.recommended_mechanic_id, manager_choice_mechanic_id: chosenMechanicId, override_reason: override ? req.body.override_reason.trim() : null } });
    await connection.commit();
    res.status(201).json({ assignment_id: assignmentId, recommendation_id: record.id, assignment_type: override ? 'MANUAL_OVERRIDE' : 'AI_RECOMMENDED' });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally { if (connection) connection.release(); }
};

exports.rejectRecommendation = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const records = await databaseRows(connection, `SELECT * FROM AI_Job_Recommendation WHERE id = ? FOR UPDATE`, [req.params.id]);
    if (!records.length) { await connection.rollback(); return res.status(404).json({ error: 'Recommendation not found' }); }
    const record = records[0];
    if (!await assertGarageManager(connection, req.user.id, record.garage_id)) { await connection.rollback(); return res.status(403).json({ error: 'Forbidden: no active manager or owner membership for this garage' }); }
    if (record.status !== 'PENDING') { await connection.rollback(); return res.status(409).json({ error: 'Only pending recommendations can be rejected' }); }
    await connection.query(`UPDATE AI_Job_Recommendation SET status = 'REJECTED', reviewed_by = ?, review_reason = ? WHERE id = ?`, [req.user.id, req.body?.reason || null, record.id]);
    await insertAuditEvent(connection, { recommendationId: record.id, jobId: record.job_card_id, garageId: record.garage_id, actorUserId: req.user.id, eventType: 'RECOMMENDATION_REJECTED', metadata: { reason: req.body?.reason || null } });
    await connection.commit();
    res.json({ message: 'Recommendation rejected' });
  } catch (error) { if (connection) await connection.rollback(); next(error); } finally { if (connection) connection.release(); }
};

exports.getModelStatus = async (req, res, next) => { try { res.json(await intelligenceGet('/api/intelligence/model/status')); } catch (error) { next(error); } };
exports.getModelEvaluation = async (req, res, next) => { try { res.json(await intelligenceGet('/api/intelligence/model/evaluation')); } catch (error) { next(error); } };

exports.trainModel = async (req, res, next) => {
  try {
    const result = await intelligencePost('/api/intelligence/model/train', { rows: await trainingRows(pool) });
    res.json(result);
  } catch (error) { next(error); }
};

exports.getMonitoring = async (req, res, next) => {
  try {
    const { garage_id } = req.query;
    if (!garage_id) return res.status(400).json({ error: 'garage_id is required' });
    if (!await assertAccess(res, req.user.id, garage_id)) return;
    const summary = await databaseRows(pool, `
      SELECT COUNT(*) AS recommendation_count,
        SUM(status = 'APPROVED') AS approval_count, SUM(status = 'REJECTED') AS rejection_count,
        SUM(status = 'APPROVED' AND manager_choice_mechanic_id <> recommended_mechanic_id) AS override_count,
        AVG(suitability_score) AS average_predicted_suitability
      FROM AI_Job_Recommendation WHERE garage_id = ?`, [garage_id]);
    const outcomes = await databaseRows(pool, `
      SELECT COUNT(*) AS completed_assignment_count, AVG(jc.actual_duration_minutes) AS average_actual_completion_minutes,
        AVG(CASE WHEN jc.actual_duration_minutes IS NOT NULL AND jc.estimated_duration_minutes > 0
          THEN jc.actual_duration_minutes <= jc.estimated_duration_minutes * 1.25 ELSE NULL END) AS on_time_completion_rate
      FROM AI_Job_Recommendation r JOIN Job_Card jc ON jc.id = r.job_card_id
      WHERE r.garage_id = ? AND r.status = 'APPROVED' AND jc.status = 'COMPLETED'`, [garage_id]);
    const byModel = await databaseRows(pool, `SELECT mode, model_version, COUNT(*) AS recommendation_count FROM AI_Job_Recommendation WHERE garage_id = ? GROUP BY mode, model_version`, [garage_id]);
    const values = summary[0] || {};
    res.json({
      recommendation_count: Number(values.recommendation_count || 0), approval_rate: values.recommendation_count ? Number(values.approval_count || 0) / Number(values.recommendation_count) : null,
      rejection_rate: values.recommendation_count ? Number(values.rejection_count || 0) / Number(values.recommendation_count) : null,
      manual_override_rate: values.approval_count ? Number(values.override_count || 0) / Number(values.approval_count) : null,
      average_predicted_suitability: values.average_predicted_suitability === null ? null : Number(values.average_predicted_suitability),
      assignment_success: outcomes[0] || {}, model_modes: byModel,
    });
  } catch (error) { next(error); }
};
