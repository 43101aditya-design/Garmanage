const { test } = require('node:test');
const assert = require('node:assert');
const { validateGarageAccess, validateDecisionState, validateMechanicEligibility, DecisionValidationError } = require('../services/decisionEngine/decisionValidator');
const controller = require('../controllers/decisionController');

test('Decision Safety: validateGarageAccess permits owner and admin for all garages', () => {
    const ownerUser = { id: 'usr-1', role: 'owner', memberships: [] };
    const adminUser = { id: 'usr-2', role: 'admin', memberships: [] };
    
    assert.strictEqual(validateGarageAccess(ownerUser, 'GAR-001'), true);
    assert.strictEqual(validateGarageAccess(adminUser, 'GAR-999'), true);
});

test('Decision Safety: validateGarageAccess restricts manager to assigned garage', () => {
    const manager = {
        id: 'usr-3',
        role: 'manager',
        memberships: [{ garage_id: 'GAR-001', role: 'manager' }]
    };

    // Allowed garage
    assert.strictEqual(validateGarageAccess(manager, 'GAR-001'), true);

    // Blocked foreign garage
    assert.throws(
        () => validateGarageAccess(manager, 'GAR-002'),
        (err) => err.name === 'DecisionValidationError' && err.code === 'FORBIDDEN_GARAGE'
    );
});

test('Decision Safety: validateGarageAccess blocks mechanic and customer roles', () => {
    const mechanic = { id: 'usr-4', role: 'mechanic', memberships: [{ garage_id: 'GAR-001' }] };
    const customer = { id: 'usr-5', role: 'customer', memberships: [] };

    assert.throws(
        () => validateGarageAccess(mechanic, 'GAR-001'),
        (err) => err.name === 'DecisionValidationError' && err.code === 'FORBIDDEN_ROLE'
    );

    assert.throws(
        () => validateGarageAccess(customer, 'GAR-001'),
        (err) => err.name === 'DecisionValidationError' && err.code === 'FORBIDDEN_ROLE'
    );
});

test('Decision Safety: validateDecisionState rejects already processed decisions', () => {
    const pendingDec = { id: 'DEC-1', status: 'PENDING', created_at: new Date().toISOString() };
    const approvedDec = { id: 'DEC-2', status: 'APPROVED', created_at: new Date().toISOString() };

    assert.strictEqual(validateDecisionState(pendingDec, 'APPROVE'), true);

    assert.throws(
        () => validateDecisionState(approvedDec, 'APPROVE'),
        (err) => err.name === 'DecisionValidationError' && err.code === 'ALREADY_PROCESSED'
    );
});

test('Decision Safety: validateDecisionState rejects stale decisions older than 48 hours', () => {
    const oldDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const staleDec = { id: 'DEC-3', status: 'PENDING', created_at: oldDate };

    assert.throws(
        () => validateDecisionState(staleDec, 'APPROVE'),
        (err) => err.name === 'DecisionValidationError' && err.code === 'STALE_PREDICTION'
    );
});

test('Decision Safety: validateMechanicEligibility enforces garage isolation and availability', async () => {
    const mockDb = {
        query: async (sql, params) => {
            const mechId = params[0];
            if (mechId === 'MEC-ACTIVE') {
                return [[{ id: 'MEC-ACTIVE', garage_id: 'GAR-001', status: 'AVAILABLE' }]];
            }
            if (mechId === 'MEC-LEAVE') {
                return [[{ id: 'MEC-LEAVE', garage_id: 'GAR-001', status: 'ON_LEAVE' }]];
            }
            if (mechId === 'MEC-FOREIGN') {
                return [[{ id: 'MEC-FOREIGN', garage_id: 'GAR-002', status: 'AVAILABLE' }]];
            }
            return [[]];
        }
    };

    // Valid active mechanic in same garage
    const valid = await validateMechanicEligibility(mockDb, 'MEC-ACTIVE', 'GAR-001');
    assert.strictEqual(valid, true);

    // Mechanic on leave
    await assert.rejects(
        () => validateMechanicEligibility(mockDb, 'MEC-LEAVE', 'GAR-001'),
        (err) => err.code === 'MECHANIC_UNAVAILABLE'
    );

    // Cross-garage mechanic
    await assert.rejects(
        () => validateMechanicEligibility(mockDb, 'MEC-FOREIGN', 'GAR-001'),
        (err) => err.code === 'CROSS_GARAGE_ASSIGNMENT_FORBIDDEN'
    );

    // Non-existent mechanic
    await assert.rejects(
        () => validateMechanicEligibility(mockDb, 'MEC-NONEXISTENT', 'GAR-001'),
        (err) => err.code === 'MECHANIC_NOT_FOUND'
    );
});

test('Decision Controller: getPipelineMetadata returns standard 7-stage architecture', async () => {
    let result = null;
    const req = {};
    const res = { json: (d) => { result = d; } };
    await controller.getPipelineMetadata(req, res, () => {});

    assert.ok(result);
    assert.ok(Array.isArray(result.pipeline_stages));
    assert.strictEqual(result.pipeline_stages.length, 7);
    assert.strictEqual(result.governance_mode, 'CONTROLLED_AUTONOMOUS_WITH_HUMAN_IN_THE_LOOP');
});
