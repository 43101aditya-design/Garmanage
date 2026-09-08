const { test } = require('node:test');
const assert = require('node:assert');
const { validateGarageAccess, DigitalTwinError } = require('../controllers/digitalTwinController');

test('Digital Twin RBAC: validateGarageAccess permits owner and admin for any garage', () => {
    const owner = { id: 'u-owner-1', role: 'owner', memberships: [] };
    const admin = { id: 'u-admin-1', role: 'admin', memberships: [] };

    assert.strictEqual(validateGarageAccess(owner, 'GAR-001'), true);
    assert.strictEqual(validateGarageAccess(owner, 'GAR-999'), true);
    assert.strictEqual(validateGarageAccess(admin, 'GAR-ANY'), true);
});

test('Digital Twin Isolation: validateGarageAccess allows manager only for assigned garage', () => {
    const manager = {
        id: 'u-mgr-1',
        role: 'manager',
        garage_id: 'GAR-ALPHA',
        memberships: [{ garage_id: 'GAR-ALPHA', role: 'manager', status: 'ACTIVE' }]
    };

    // Permitted assigned garage
    assert.strictEqual(validateGarageAccess(manager, 'GAR-ALPHA'), true);

    // Blocked foreign garage
    assert.throws(
        () => validateGarageAccess(manager, 'GAR-BETA'),
        (err) => err.name === 'DigitalTwinError' && err.code === 'FORBIDDEN_GARAGE' && err.statusCode === 403
    );
});

test('Digital Twin Security: validateGarageAccess strictly blocks mechanics and customers', () => {
    const mechanic = { id: 'u-mech-1', role: 'mechanic', memberships: [{ garage_id: 'GAR-ALPHA' }] };
    const customer = { id: 'u-cust-1', role: 'customer', memberships: [] };

    assert.throws(
        () => validateGarageAccess(mechanic, 'GAR-ALPHA'),
        (err) => err.name === 'DigitalTwinError' && err.code === 'FORBIDDEN_ROLE' && err.statusCode === 403
    );

    assert.throws(
        () => validateGarageAccess(customer, 'GAR-ALPHA'),
        (err) => err.name === 'DigitalTwinError' && err.code === 'FORBIDDEN_ROLE' && err.statusCode === 403
    );
});

test('Digital Twin Security: unauthenticated access throws 401 error', () => {
    assert.throws(
        () => validateGarageAccess(null, 'GAR-ALPHA'),
        (err) => err.name === 'DigitalTwinError' && err.code === 'UNAUTHENTICATED' && err.statusCode === 401
    );
});
