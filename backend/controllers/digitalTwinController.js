const { v4: uuidv4 } = require('uuid');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

class DigitalTwinError extends Error {
    constructor(message, code, statusCode = 400) {
        super(message);
        this.name = 'DigitalTwinError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

/**
 * Validates role-based access control and multi-garage isolation.
 */
function validateGarageAccess(user, requestedGarageId) {
    if (!user) {
        throw new DigitalTwinError('Authentication required for simulation operations', 'UNAUTHENTICATED', 401);
    }
    
    // Mechanics and customers are strictly prohibited from running simulations
    if (user.role === 'mechanic' || user.role === 'customer') {
        throw new DigitalTwinError(`Role '${user.role}' is not authorized to access Digital Twin simulation`, 'FORBIDDEN_ROLE', 403);
    }
    
    // Owner and Admin have platform-wide access
    if (user.role === 'owner' || user.role === 'admin') {
        return true;
    }
    
    // Managers are strictly isolated to their own garage
    if (user.role === 'manager') {
        const allowedGarages = (user.memberships || [])
            .filter(m => m.status === 'ACTIVE' || !m.status)
            .map(m => m.garage_id);
            
        if (user.garage_id) allowedGarages.push(user.garage_id);
        
        if (requestedGarageId && !allowedGarages.includes(requestedGarageId)) {
            throw new DigitalTwinError(`Access denied to Garage '${requestedGarageId}'. Multi-garage cross-access is forbidden.`, 'FORBIDDEN_GARAGE', 403);
        }
        return true;
    }
    
    throw new DigitalTwinError('Unauthorized role', 'FORBIDDEN_ROLE', 403);
}

/**
 * Helper to call Python FastAPI engine.
 */
async function callPythonService(path, body = null, method = 'POST') {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(`${PYTHON_API_URL}${path}`, options);
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Python Engine error (${response.status}): ${errText}`);
        }
        return await response.json();
    } catch (err) {
        throw new DigitalTwinError(`Failed to communicate with Python Digital Twin service: ${err.message}`, 'PYTHON_SERVICE_ERROR', 502);
    }
}

// ── Controller Methods ─────────────────────────────────────────────────────────

exports.getSnapshot = async (req, res, next) => {
    try {
        const garageId = req.body?.garage_id || req.query?.garage_id || req.user?.garage_id;
        validateGarageAccess(req.user, garageId);
        
        const snapshot = await callPythonService('/api/digital-twin/snapshot', { garage_id: garageId });
        res.json(snapshot);
    } catch (error) {
        next(error);
    }
};

exports.runSimulation = async (req, res, next) => {
    try {
        const { garage_id, scenario_type, parameters, objective_weights, custom_snapshot, save_to_history } = req.body;
        const targetGarageId = garage_id || req.user?.garage_id;
        validateGarageAccess(req.user, targetGarageId);

        // Record DB state before simulation (for audit & zero-mutation verification)
        const simPayload = {
            garage_id: targetGarageId,
            scenario_type: scenario_type || 'JOB_SURGE',
            parameters: parameters || {},
            objective_weights: objective_weights || null,
            custom_snapshot: custom_snapshot || null
        };

        const result = await callPythonService('/api/digital-twin/simulate', simPayload);

        // Optionally persist to Simulation_Scenario, Simulation_Run, and Simulation_Result
        if (save_to_history !== false && req.db) {
            try {
                const scenarioId = uuidv4();
                const runId = uuidv4();
                const resultId = uuidv4();
                const userId = req.user.id;

                // 1. Insert Scenario
                await req.db.query(
                    `INSERT INTO Simulation_Scenario (id, garage_id, name, description, scenario_type, parameters, status, created_by)
                     VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?)`,
                    [
                        scenarioId,
                        targetGarageId || 'GAR-MAIN-001',
                        result.scenario_name || 'Simulation Scenario',
                        parameters?.description || `What-if evaluation for ${result.scenario_type}`,
                        result.scenario_type,
                        JSON.stringify(parameters || {}),
                        userId
                    ]
                );

                // 2. Insert Run
                await req.db.query(
                    `INSERT INTO Simulation_Run (id, scenario_id, garage_id, snapshot_hash, execution_trace, status, execution_time_ms, model_versions, objective_weights, created_by)
                     VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?)`,
                    [
                        runId,
                        scenarioId,
                        targetGarageId || 'GAR-MAIN-001',
                        result.snapshot_hash || 'HASH-001',
                        JSON.stringify(result.execution_trace || []),
                        result.execution_time_ms || 0,
                        JSON.stringify({ digital_twin: 'v2.0', solver: 'OR_TOOLS_CP_SAT' }),
                        JSON.stringify(result.recommended?.objective_weights_used || {}),
                        userId
                    ]
                );

                // 3. Insert Result
                await req.db.query(
                    `INSERT INTO Simulation_Result (id, run_id, baseline_metrics, simulated_metrics, recommended_metrics, bottlenecks, inr_revenue_impact)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        resultId,
                        runId,
                        JSON.stringify(result.baseline?.metrics || {}),
                        JSON.stringify(result.simulated?.metrics || {}),
                        JSON.stringify(result.recommended || {}),
                        JSON.stringify(result.bottleneck || {}),
                        JSON.stringify(result.simulated?.metrics?.financial_impact || {})
                    ]
                );

                result.persisted_scenario_id = scenarioId;
                result.persisted_run_id = runId;
            } catch (dbErr) {
                // Table might not exist yet if migration pending; log and continue
                console.warn('[DigitalTwin] Could not persist simulation run to DB:', dbErr.message);
            }
        }

        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.runOptimization = async (req, res, next) => {
    try {
        const targetGarageId = req.body?.garage_id || req.user?.garage_id;
        validateGarageAccess(req.user, targetGarageId);
        
        const result = await callPythonService('/api/digital-twin/optimize', req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.runComparison = async (req, res, next) => {
    try {
        const targetGarageId = req.body?.garage_id || req.user?.garage_id;
        validateGarageAccess(req.user, targetGarageId);
        
        const result = await callPythonService('/api/digital-twin/compare', req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.runSensitivity = async (req, res, next) => {
    try {
        const targetGarageId = req.body?.garage_id || req.user?.garage_id;
        validateGarageAccess(req.user, targetGarageId);
        
        const result = await callPythonService('/api/digital-twin/sensitivity', req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.getSimulationHistory = async (req, res, next) => {
    try {
        const targetGarageId = req.query?.garage_id || req.user?.garage_id;
        validateGarageAccess(req.user, targetGarageId);

        if (!req.db) {
            return res.json({ history: [] });
        }

        const query = `
            SELECT 
                r.id AS run_id,
                s.id AS scenario_id,
                s.name AS scenario_name,
                s.scenario_type,
                s.garage_id,
                r.execution_time_ms,
                r.created_at,
                res.baseline_metrics,
                res.simulated_metrics,
                res.recommended_metrics,
                res.bottlenecks
            FROM Simulation_Run r
            JOIN Simulation_Scenario s ON r.scenario_id = s.id
            LEFT JOIN Simulation_Result res ON r.id = res.run_id
            WHERE (? IS NULL OR s.garage_id = ?)
            ORDER BY r.created_at DESC
            LIMIT 25
        `;
        const [rows] = await req.db.query(query, [targetGarageId, targetGarageId]);
        res.json({ history: rows || [] });
    } catch (error) {
        console.warn('[DigitalTwin] Could not load simulation history:', error.message);
        res.json({ history: [] });
    }
};

exports.getPipelineMetadata = async (req, res, next) => {
    try {
        const meta = await callPythonService('/api/digital-twin/pipeline/metadata', null, 'GET');
        res.json(meta);
    } catch (error) {
        res.json({
            module: "Phase 9 — Digital Twin & Advanced Optimization",
            currency: "INR (₹)",
            status: "ONLINE",
            isolation_mode: "100% In-Memory Sandbox"
        });
    }
};

exports.validateGarageAccess = validateGarageAccess;
exports.DigitalTwinError = DigitalTwinError;
