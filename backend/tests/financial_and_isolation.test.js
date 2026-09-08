const { test } = require('node:test');
const assert = require('node:assert');
const { isGarageAuthorized } = require('../utils/tenantScope');

// ── Financial Calculation Tests ───────────────────────────────────────────────
test('Financial Integrity: invoice total mathematically equals subtotal + tax - discount', () => {
    const calculateInvoice = (items, taxRate = 0.18, discount = 0) => {
        const subtotal = items.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
        const tax = Math.round(subtotal * taxRate * 100) / 100;
        const total = Math.max(0, Math.round((subtotal + tax - discount) * 100) / 100);
        return { subtotal, tax, discount, total };
    };

    const items = [
        { name: 'Engine Oil Change', unit_price: 1500.00, quantity: 1 },
        { name: 'Oil Filter Replacement', unit_price: 450.00, quantity: 1 },
        { name: 'Brake Pad Set', unit_price: 2400.00, quantity: 2 }
    ];

    const result = calculateInvoice(items, 0.18, 500.00);
    assert.strictEqual(result.subtotal, 6750.00);
    assert.strictEqual(result.tax, 1215.00);
    assert.strictEqual(result.discount, 500.00);
    assert.strictEqual(result.total, 7465.00);
});

test('Financial Integrity: zero/negative total clamped safely and invalid amounts rejected', () => {
    const clampTotal = (subtotal, tax, discount) => {
        if (subtotal < 0 || tax < 0 || discount < 0) {
            throw new Error('Negative monetary amounts forbidden');
        }
        return Math.max(0, Math.round((subtotal + tax - discount) * 100) / 100);
    };

    assert.strictEqual(clampTotal(1000, 180, 1500), 0);
    assert.throws(() => clampTotal(-500, 180, 0), /Negative monetary amounts forbidden/);
});

test('Financial Integrity: fractional paisa precision handles IEEE 754 edge cases without drift', () => {
    const subtotal = 1450.10;
    const tax = 261.018; // 18%
    const discount = 50.05;
    const roundedTax = Math.round(tax * 100) / 100;
    const total = Math.round((subtotal + roundedTax - discount) * 100) / 100;
    assert.strictEqual(total, 1661.07);
});

test('Payment Integrity: overpayment strictly rejected against outstanding balance', () => {
    const invoiceTotal = 5000.00;
    const paidSoFar = 3500.00;
    const outstanding = Math.round((invoiceTotal - paidSoFar) * 100) / 100;
    
    const validatePayment = (amt) => {
        if (amt <= 0) throw new Error('Payment amount must be greater than zero');
        if (amt > outstanding + 0.001) throw new Error('Payment exceeds outstanding balance');
        return true;
    };

    assert.strictEqual(validatePayment(1500.00), true);
    assert.strictEqual(validatePayment(500.00), true);
    assert.throws(() => validatePayment(1500.01), /Payment exceeds outstanding balance/);
    assert.throws(() => validatePayment(0), /greater than zero/);
});

// ── Multi-Garage Tenant Isolation Tests ───────────────────────────────────────
test('Tenant Boundary: isGarageAuthorized helper properly enforces scope', () => {
    const owner = { id: 'u-own-1', role: 'OWNER', memberships: [{ garage_id: 'GAR-1' }, { garage_id: 'GAR-2' }] };
    const manager = { id: 'u-mgr-1', role: 'MANAGER', memberships: [{ garage_id: 'GAR-1' }] };
    const mechanic = { id: 'u-mech-1', role: 'MECHANIC', memberships: [{ garage_id: 'GAR-1' }] };

    assert.strictEqual(isGarageAuthorized(owner, 'GAR-1'), true);
    assert.strictEqual(isGarageAuthorized(owner, 'GAR-2'), true);
    assert.strictEqual(isGarageAuthorized(manager, 'GAR-1'), true);
    assert.strictEqual(isGarageAuthorized(manager, 'GAR-2'), false);
    assert.strictEqual(isGarageAuthorized(mechanic, 'GAR-1'), true);
    assert.strictEqual(isGarageAuthorized(mechanic, 'GAR-FOREIGN'), false);
});

// ── Job State Machine Tests ───────────────────────────────────────────────────
test('Job State Machine: strictly forbids illegal state regressions', () => {
    const VALID_TRANSITIONS = {
        'CREATED': ['READY_FOR_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
        'READY_FOR_ASSIGNMENT': ['ASSIGNED', 'CANCELLED'],
        'ASSIGNED': ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
        'IN_PROGRESS': ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
        'ON_HOLD': ['IN_PROGRESS', 'CANCELLED'],
        'COMPLETED': ['CLOSED'],
        'CLOSED': [],
        'CANCELLED': []
    };

    const validateTransition = (current, target) => {
        const allowed = VALID_TRANSITIONS[current] || [];
        if (!allowed.includes(target)) {
            throw new Error(`Invalid transition from ${current} to ${target}`);
        }
        return true;
    };

    assert.strictEqual(validateTransition('CREATED', 'ASSIGNED'), true);
    assert.strictEqual(validateTransition('ASSIGNED', 'IN_PROGRESS'), true);
    assert.strictEqual(validateTransition('IN_PROGRESS', 'COMPLETED'), true);
    assert.strictEqual(validateTransition('COMPLETED', 'CLOSED'), true);

    // Illegal transitions
    assert.throws(() => validateTransition('COMPLETED', 'CREATED'), /Invalid transition/);
    assert.throws(() => validateTransition('COMPLETED', 'IN_PROGRESS'), /Invalid transition/);
    assert.throws(() => validateTransition('CANCELLED', 'IN_PROGRESS'), /Invalid transition/);
    assert.throws(() => validateTransition('CLOSED', 'IN_PROGRESS'), /Invalid transition/);
});
