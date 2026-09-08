const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

// Helper to make GET requests to Python FastAPI service
async function pyGet(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(`${PYTHON_API_URL}${path}`, { signal: controller.signal });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.detail || `Python service returned status ${response.status}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

// Helper to make POST requests to Python FastAPI service
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
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.detail || `Python service returned status ${response.status}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

// Resolve and authorize garage_id based on user role and memberships
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
            // Default to first active membership garage
            return activeMemberships[0].garage_id;
        }
    }

    res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    return undefined;
}

// Log a prediction run into Prediction_Log table
async function logPrediction(db, type, garageId, targetId, modelVersion, input, output) {
    try {
        const id = uuidv4();
        await db.query(
            `INSERT INTO Prediction_Log (id, prediction_type, garage_id, target_id, model_version, prediction_input, prediction_output)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                type,
                garageId,
                targetId ? String(targetId) : null,
                modelVersion || 'v1',
                JSON.stringify(input),
                JSON.stringify(output)
            ]
        );
        return id;
    } catch (error) {
        console.error('Failed to write prediction log:', error);
        return null;
    }
}

// Reconcile and update actual outcomes in Prediction_Log
async function reconcileOutcomes(db) {
    try {
        // 1. Reconcile Service Duration Predictions (matching target_id to Job_Card actual_duration_minutes)
        await db.query(`
            UPDATE Prediction_Log pl
            JOIN Job_Card jc ON pl.target_id = jc.id
            SET pl.actual_outcome = jc.actual_duration_minutes
            WHERE pl.prediction_type = 'service_duration'
              AND pl.actual_outcome IS NULL
              AND jc.status = 'COMPLETED'
              AND jc.actual_duration_minutes IS NOT NULL
        `);

        // 2. Reconcile Revenue Predictions (daily revenue)
        // Find revenue logs where actual_outcome is null and the target day has passed
        const [revLogs] = await db.query(`
            SELECT id, garage_id, created_at, prediction_output
            FROM Prediction_Log
            WHERE prediction_type = 'revenue'
              AND actual_outcome IS NULL
              AND created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)
            LIMIT 50
        `);

        for (const log of revLogs) {
            // Parse forecasted dates from prediction_output and find actual revenues
            let forecast;
            try {
                forecast = typeof log.prediction_output === 'string' ? JSON.parse(log.prediction_output) : log.prediction_output;
            } catch (e) {
                continue;
            }

            if (forecast && Array.isArray(forecast.forecast) && forecast.forecast.length > 0) {
                const tomorrowDate = forecast.forecast[0].date;
                // Query actual revenue for that day and garage
                let query = `
                    SELECT SUM(i.total_amount) AS actual_rev
                    FROM Invoice i
                    JOIN Appointment a ON i.appointment_id = a.id
                    WHERE DATE(i.issue_date) = ?
                      AND i.status IN ('paid', 'partial')
                `;
                let params = [tomorrowDate];
                if (log.garage_id) {
                    query += ` AND a.garage_id = ?`;
                    params.push(log.garage_id);
                }

                const [res] = await db.query(query, params);
                if (res[0] && res[0].actual_rev !== null) {
                    const actualVal = parseFloat(res[0].actual_rev);
                    const predictedVal = forecast.forecast[0].predicted_revenue || 0;
                    await db.query(
                        `UPDATE Prediction_Log SET actual_outcome = ? WHERE id = ?`,
                        [actualVal, log.id]
                    );
                }
            }
        }

        // 3. Reconcile Workload Predictions (daily jobs count)
        const [workloadLogs] = await db.query(`
            SELECT id, garage_id, created_at, prediction_output
            FROM Prediction_Log
            WHERE prediction_type = 'workload'
              AND actual_outcome IS NULL
              AND created_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)
            LIMIT 50
        `);

        for (const log of workloadLogs) {
            let output;
            try {
                output = typeof log.prediction_output === 'string' ? JSON.parse(log.prediction_output) : log.prediction_output;
            } catch (e) {
                continue;
            }

            if (output && output.tomorrow) {
                const targetDate = output.tomorrow.date;
                let query = `
                    SELECT COUNT(id) AS actual_jobs
                    FROM Appointment
                    WHERE DATE(scheduled_date) = ?
                `;
                let params = [targetDate];
                if (log.garage_id) {
                    query += ` AND garage_id = ?`;
                    params.push(log.garage_id);
                }

                const [res] = await db.query(query, params);
                if (res[0] && res[0].actual_jobs !== null) {
                    await db.query(
                        `UPDATE Prediction_Log SET actual_outcome = ? WHERE id = ?`,
                        [res[0].actual_jobs, log.id]
                    );
                }
            }
        }
    } catch (err) {
        console.error('Outcome reconciliation failed:', err);
    }
}

// ── GET /api/predictions/revenue ─────────────────────────────────────────────
exports.getRevenueForecast = async (req, res, next) => {
    const garageId = resolveAndAuthorizeGarage(req, res);
    if (garageId === undefined) return; // Response sent

    const horizon = parseInt(req.query.horizon || '7');

    try {
        let path = `/api/predictions/revenue?horizon=${horizon}`;
        if (garageId) path += `&garage_id=${garageId}`;

        const data = await pyGet(path);
        
        // Log to DB
        await logPrediction(
            req.db,
            'revenue',
            garageId,
            null,
            data.model_version || 'v1',
            { horizon, garage_id: garageId },
            data
        );

        res.json(data);
    } catch (error) {
        console.error('Revenue forecast error:', error);
        // Fallback response if Python is down
        res.json({
            mode: 'UNAVAILABLE',
            message: 'Prediction service temporarily unavailable.',
            garage_id: garageId,
            horizon_days: horizon,
            forecast: [],
            summary: null
        });
    }
};

// ── GET /api/predictions/workload ────────────────────────────────────────────
exports.getWorkloadForecast = async (req, res, next) => {
    const garageId = resolveAndAuthorizeGarage(req, res);
    if (garageId === undefined) return;

    try {
        let path = '/api/predictions/workload';
        if (garageId) path += `?garage_id=${garageId}`;

        const data = await pyGet(path);

        await logPrediction(
            req.db,
            'workload',
            garageId,
            null,
            data.model_version || 'v1',
            { garage_id: garageId },
            data
        );

        res.json(data);
    } catch (error) {
        console.error('Workload forecast error:', error);
        res.json({
            mode: 'UNAVAILABLE',
            message: 'Prediction service temporarily unavailable.',
            garage_id: garageId,
            tomorrow: null,
            week_forecast: []
        });
    }
};

// ── GET /api/predictions/inventory-demand ────────────────────────────────────
exports.getInventoryDemandForecast = async (req, res, next) => {
    const garageId = resolveAndAuthorizeGarage(req, res);
    if (garageId === undefined) return;

    const partId = req.query.part_id || null;

    try {
        let path = '/api/predictions/inventory-demand';
        const params = [];
        if (garageId) params.push(`garage_id=${garageId}`);
        if (partId) params.push(`part_id=${partId}`);
        if (params.length > 0) path += `?${params.join('&')}`;

        const data = await pyGet(path);

        await logPrediction(
            req.db,
            'inventory_demand',
            garageId,
            partId,
            data.model_status?.version || 'v1',
            { garage_id: garageId, part_id: partId },
            data
        );

        res.json(data);
    } catch (error) {
        console.error('Inventory demand forecast error:', error);
        res.json({
            mode: 'UNAVAILABLE',
            message: 'Prediction service temporarily unavailable.',
            garage_id: garageId,
            predictions: []
        });
    }
};

// ── POST /api/predictions/service-duration ────────────────────────────────────
exports.getServiceDurationPrediction = async (req, res, next) => {
    const garageId = resolveAndAuthorizeGarage(req, res);
    if (garageId === undefined) return;

    const { service_type, vehicle_type, mechanic_id, parts_count } = req.body;
    if (!service_type || !vehicle_type) {
        return res.status(400).json({ error: 'service_type and vehicle_type are required' });
    }

    try {
        const body = {
            service_type,
            vehicle_type,
            mechanic_id,
            parts_count: parseInt(parts_count || '0'),
            garage_id: garageId
        };

        const data = await pyPost('/api/predictions/service-duration', body);

        // Try to capture target jobId from context if passed by the client
        const jobId = req.body.job_id || null;

        await logPrediction(
            req.db,
            'service_duration',
            garageId,
            jobId,
            data.model_version || 'v1',
            body,
            data
        );

        res.json(data);
    } catch (error) {
        console.error('Service duration prediction error:', error);
        // Clean rule-based estimation fallback inside Node.js itself if Python is down
        const RULE_ESTIMATES = {
            oil_change: 45,
            tire_rotation: 30,
            brake_service: 120,
            engine_repair: 480,
            transmission: 360,
            electrical: 180,
            ac_service: 90,
            general_inspection: 60,
            bodywork: 300,
            default: 120
        };
        const key = service_type.toLowerCase().trim().replace(/[\s-]/g, '_');
        let ruleMinutes = RULE_ESTIMATES.default;
        for (const [pattern, val] of Object.entries(RULE_ESTIMATES)) {
            if (key.includes(pattern)) {
                ruleMinutes = val;
                break;
            }
        }
        res.json({
            mode: 'RULE_BASED',
            garage_id: garageId,
            estimated_minutes: ruleMinutes,
            estimated_hours: parseFloat((ruleMinutes / 60).toFixed(1)),
            estimated_completion: new Date(Date.now() + ruleMinutes * 60000).toISOString().slice(0, 16).replace('T', ' '),
            message: 'Prediction service temporarily unavailable — fell back to offline rule estimates.'
        });
    }
};

// ── GET /api/predictions/models/status ───────────────────────────────────────
exports.getModelsStatus = async (req, res, next) => {
    try {
        const data = await pyGet('/api/predictions/models/status');
        res.json(data);
    } catch (error) {
        console.error('Fetch models status error:', error);
        res.status(503).json({ error: 'Prediction service unavailable' });
    }
};

// ── POST /api/predictions/train/:modelType ────────────────────────────────────
exports.trainModel = async (req, res, next) => {
    const { modelType } = req.params;
    const garageId = req.body.garage_id || null;

    const allowedTypes = ['revenue', 'workload', 'inventory-demand', 'duration'];
    if (!allowedTypes.includes(modelType)) {
        return res.status(400).json({ error: 'Invalid model type for training' });
    }

    try {
        const data = await pyPost(`/api/predictions/train/${modelType}`, { garage_id: garageId });
        res.json(data);
    } catch (error) {
        console.error(`Train model ${modelType} error:`, error);
        res.status(503).json({ error: 'Prediction service training failed' });
    }
};

// ── GET /api/predictions/pipeline/metadata ────────────────────────────────────
exports.getPipelineMetadata = async (req, res, next) => {
    try {
        const data = await pyGet('/api/predictions/pipeline/metadata');
        res.json(data);
    } catch (error) {
        console.error('Fetch pipeline metadata error:', error);
        res.status(503).json({ error: 'Prediction service pipeline metadata unavailable' });
    }
};

// ── GET /api/predictions/monitoring ──────────────────────────────────────────
exports.getMonitoring = async (req, res, next) => {
    try {
        // Run outcome reconciliation first to match any completed jobs
        await reconcileOutcomes(req.db);

        // Fetch logs and compile monitoring statistics
        const [recentLogs] = await req.db.query(`
            SELECT pl.*, g.name AS garage_name
            FROM Prediction_Log pl
            LEFT JOIN Garage g ON pl.garage_id = g.id
            ORDER BY pl.created_at DESC
            LIMIT 200
        `);

        // Compute error metrics (MAE/RMSE) from logged outcomes
        const metrics = {
            service_duration: { mae: null, rmse: null, count: 0 },
            revenue: { mae: null, rmse: null, count: 0 },
            workload: { mae: null, rmse: null, count: 0 }
        };

        const types = ['service_duration', 'revenue', 'workload'];
        for (const type of types) {
            const matched = recentLogs.filter(l => l.prediction_type === type && l.actual_outcome !== null);
            if (matched.length > 0) {
                let absoluteDiffSum = 0;
                let squaredDiffSum = 0;

                for (const log of matched) {
                    let predicted = 0;
                    if (type === 'service_duration') {
                        predicted = parseFloat(log.prediction_output.estimated_minutes || 0);
                    } else if (type === 'revenue' && log.prediction_output.forecast?.length > 0) {
                        predicted = parseFloat(log.prediction_output.forecast[0].predicted_revenue || 0);
                    } else if (type === 'workload' && log.prediction_output.tomorrow) {
                        predicted = parseFloat(log.prediction_output.tomorrow.predicted_jobs || 0);
                    }

                    const diff = Math.abs(parseFloat(log.actual_outcome) - predicted);
                    absoluteDiffSum += diff;
                    squaredDiffSum += diff * diff;
                }

                metrics[type] = {
                    mae: parseFloat((absoluteDiffSum / matched.length).toFixed(2)),
                    rmse: parseFloat(Math.sqrt(squaredDiffSum / matched.length).toFixed(2)),
                    count: matched.length
                };
            }
        }

        res.json({
            logs: recentLogs.slice(0, 100), // Top 100 for visual table
            metrics
        });
    } catch (error) {
        console.error('Monitoring query error:', error);
        next(error);
    }
};
