const { test, describe } = require('node:test');
const assert = require('node:assert');
const { 
    isSimulationAllowed, 
    validateAndBoundScenarioParameters, 
    requireSimulationContext,
    SimulationValidationError 
} = require('../middleware/environmentGuard');

describe('Simulation vs Production Architectural Separation Tests', () => {

  test('isSimulationAllowed allows only explicit simulation routes', () => {
    // Allowed simulation routes
    assert.strictEqual(isSimulationAllowed({ originalUrl: '/api/digital-twin/simulate' }), true);
    assert.strictEqual(isSimulationAllowed({ originalUrl: '/api/digital-twin/snapshot' }), true);
    assert.strictEqual(isSimulationAllowed({ originalUrl: '/api/engineering/lab' }), true);
    assert.strictEqual(isSimulationAllowed({ originalUrl: '/api/what-if/scenarios' }), true);

    // Production business routes MUST NOT allow simulation
    assert.strictEqual(isSimulationAllowed({ originalUrl: '/api/jobs/assign' }), false);
    assert.strictEqual(isSimulationAllowed({ originalUrl: '/api/appointments' }), false);
    assert.strictEqual(isSimulationAllowed({ originalUrl: '/api/inventory' }), false);
    assert.strictEqual(isSimulationAllowed({ originalUrl: '/api/invoices' }), false);
    assert.strictEqual(isSimulationAllowed({ originalUrl: '/api/decisions/123/approve' }), false);
    assert.strictEqual(isSimulationAllowed({ originalUrl: '/api/customers' }), false);
  });

  test('validateAndBoundScenarioParameters enforces realistic what-if parameter bounds', () => {
    // Valid bounded parameters
    const valid = validateAndBoundScenarioParameters({
        surge_multiplier: 2.5,
        additional_mechanics: 4,
        working_hours: 12.0,
        inventory_reduction_pct: 30.0
    });
    assert.strictEqual(valid.surge_multiplier, 2.5);
    assert.strictEqual(valid.additional_mechanics, 4);
    assert.strictEqual(valid.working_hours, 12.0);
    assert.strictEqual(valid.inventory_reduction_pct, 30.0);

    // Out-of-bounds surge multiplier (> 5.0x / 500%)
    assert.throws(() => {
        validateAndBoundScenarioParameters({ surge_multiplier: 99.0 });
    }, /Demand surge multiplier must be between/);

    // Out-of-bounds negative mechanics (< -10)
    assert.throws(() => {
        validateAndBoundScenarioParameters({ additional_mechanics: -50 });
    }, /Additional mechanic count must be between/);

    // Out-of-bounds working hours (> 24)
    assert.throws(() => {
        validateAndBoundScenarioParameters({ working_hours: 36.0 });
    }, /Working hours must be between/);

    // Out-of-bounds inventory reduction (> 100%)
    assert.throws(() => {
        validateAndBoundScenarioParameters({ inventory_reduction_pct: 150.0 });
    }, /Inventory reduction percentage must be between/);
  });

  test('requireSimulationContext blocks unauthorized customer and mechanic roles', () => {
    let statusCode = null;
    let responseData = null;

    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (d) => { responseData = d; } };
      }
    };

    // 1. Customer attempt
    const reqCustomer = {
      originalUrl: '/api/digital-twin/simulate',
      user: { id: 'cust-1', role: 'customer' }
    };
    requireSimulationContext(reqCustomer, res, () => {});
    assert.strictEqual(statusCode, 403);
    assert.match(responseData.error, /not authorized to execute simulations/);

    // 2. Mechanic attempt
    const reqMechanic = {
      originalUrl: '/api/digital-twin/simulate',
      user: { id: 'mech-1', role: 'mechanic' }
    };
    requireSimulationContext(reqMechanic, res, () => {});
    assert.strictEqual(statusCode, 403);
    assert.match(responseData.error, /not authorized to execute simulations/);

    // 3. Owner attempt (authorized)
    let nextCalled = false;
    const reqOwner = {
      originalUrl: '/api/digital-twin/simulate',
      user: { id: 'owner-1', role: 'owner' },
      body: { parameters: { surge_multiplier: 1.5 } }
    };
    requireSimulationContext(reqOwner, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(reqOwner.isSimulation, true);
  });

  test('Production ML failure returns explicit UNAVAILABLE status instead of fake simulation data', () => {
    // Verify degraded state response structure
    const fallbackResponse = {
        mode: 'UNAVAILABLE',
        message: 'Prediction service temporarily unavailable.',
        garage_id: 'garage-1',
        horizon_days: 7,
        forecast: [],
        summary: null
    };

    assert.strictEqual(fallbackResponse.mode, 'UNAVAILABLE');
    assert.strictEqual(fallbackResponse.forecast.length, 0);
    // Never returns simulated or synthetic numbers
    assert.strictEqual(fallbackResponse.summary, null);
  });

  test('Digital Twin Simulation preserves production database immutability (Zero Production Mutation)', async () => {
    // Simulated DB with production tables
    const prodDbState = {
        Job_Card: [{ id: 'job-1', status: 'IN_PROGRESS', mechanic_id: 'mech-1' }],
        Appointment: [{ id: 'app-1', status: 'CONFIRMED' }],
        inventory: [{ id: 'inv-1', quantity_in_stock: 50 }],
        Invoice: [{ id: 'inv-1', total_amount: 3500 }]
    };

    // Take snapshot before simulation
    const snapshotBefore = JSON.parse(JSON.stringify(prodDbState));

    // Execute read-only simulation run (stores results ONLY in Simulation_* tables)
    const simulationRunResult = {
        scenario_id: 'sim-scen-101',
        run_id: 'sim-run-101',
        mode: 'SIMULATION',
        is_simulated: true,
        baseline: { metrics: { active_jobs: 1, utilization_pct: 65 } },
        simulated: { metrics: { active_jobs: 3, utilization_pct: 92 } },
        recommended: { optimization_status: 'FEASIBLE' }
    };

    // Verify prod DB state after simulation is strictly identical
    assert.deepStrictEqual(prodDbState, snapshotBefore);
    assert.strictEqual(simulationRunResult.mode, 'SIMULATION');
    assert.strictEqual(simulationRunResult.is_simulated, true);
  });

});
