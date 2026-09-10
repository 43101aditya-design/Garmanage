/**
 * Environment & Simulation Boundary Guard Middleware.
 * Strictly separates Real-World Production Execution from Development / Test / What-If Simulation.
 */

class SimulationValidationError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'SimulationValidationError';
        this.statusCode = statusCode;
    }
}

/**
 * Checks if the current environment and request context permits simulation.
 */
function isSimulationAllowed(req) {
    // In production, simulation is permitted ONLY on explicit simulation/analysis endpoints
    // (e.g. Digital Twin Studio, Engineering Lab, What-If Analysis)
    const allowedPathPrefixes = [
        '/api/digital-twin',
        '/api/engineering',
        '/api/simulation',
        '/api/what-if'
    ];
    
    const url = req.originalUrl || req.url || '';
    const isExplicitSimulationRoute = allowedPathPrefixes.some(prefix => url.startsWith(prefix));
    
    return isExplicitSimulationRoute;
}

/**
 * Validates and bounds What-If / Simulation scenario parameters.
 * Prevents malicious or unbounded simulation requests from consuming unlimited resources.
 */
function validateAndBoundScenarioParameters(parameters) {
    if (!parameters || typeof parameters !== 'object') {
        return {};
    }

    const bounded = { ...parameters };

    // 1. Demand surge factor (max 500% / 5.0x)
    if (bounded.surge_multiplier !== undefined) {
        const val = parseFloat(bounded.surge_multiplier);
        if (isNaN(val) || val < 0.1 || val > 5.0) {
            throw new SimulationValidationError('Demand surge multiplier must be between 0.1 and 5.0 (max 500%)');
        }
        bounded.surge_multiplier = val;
    }

    // 2. Additional mechanic count (bounded between -10 and +20)
    if (bounded.additional_mechanics !== undefined) {
        const val = parseInt(bounded.additional_mechanics, 10);
        if (isNaN(val) || val < -10 || val > 20) {
            throw new SimulationValidationError('Additional mechanic count must be between -10 and +20');
        }
        bounded.additional_mechanics = val;
    }

    // 3. Working hours change (bounded between 1.0 and 24.0 hours)
    if (bounded.working_hours !== undefined) {
        const val = parseFloat(bounded.working_hours);
        if (isNaN(val) || val < 1.0 || val > 24.0) {
            throw new SimulationValidationError('Working hours must be between 1.0 and 24.0 hours');
        }
        bounded.working_hours = val;
    }

    // 4. Inventory reduction percentage (bounded between 0% and 100%)
    if (bounded.inventory_reduction_pct !== undefined) {
        const val = parseFloat(bounded.inventory_reduction_pct);
        if (isNaN(val) || val < 0.0 || val > 100.0) {
            throw new SimulationValidationError('Inventory reduction percentage must be between 0% and 100%');
        }
        bounded.inventory_reduction_pct = val;
    }

    return bounded;
}

/**
 * Middleware ensuring simulation is called only in authorized contexts with bounded parameters.
 */
function requireSimulationContext(req, res, next) {
    if (!isSimulationAllowed(req)) {
        console.warn(`[SIMULATION_GUARD:BLOCKED] Attempted simulation call on production route: ${req.originalUrl}`);
        return res.status(403).json({
            error: 'Simulation is forbidden on production transactional routes. Use /api/digital-twin or /api/engineering.'
        });
    }

    // Verify user authorization for simulation
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Authentication required for simulation execution' });
    }

    // Only Owner, Manager, and Admin can run simulations
    if (!['owner', 'manager', 'admin'].includes(user.role)) {
        return res.status(403).json({
            error: `Role '${user.role}' is not authorized to execute simulations. Simulation is reserved for management analysis.`
        });
    }

    // Validate parameters if present in request body
    if (req.body && req.body.parameters) {
        try {
            req.body.parameters = validateAndBoundScenarioParameters(req.body.parameters);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    // Attach simulation audit context to request
    req.isSimulation = true;
    req.simulationTimestamp = new Date().toISOString();
    next();
}

module.exports = {
    isSimulationAllowed,
    validateAndBoundScenarioParameters,
    requireSimulationContext,
    SimulationValidationError
};
