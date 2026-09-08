const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/db');

// Mock db.execute dynamically for tests
let mockDbAnswers = {};

const originalExecute = db.execute;
db.execute = async (sql, params) => {
    // Return mock answers if defined, otherwise pass through
    const sqlNormalized = sql.replace(/\s+/g, ' ').trim();
    for (const [key, val] of Object.entries(mockDbAnswers)) {
        if (sqlNormalized.includes(key)) {
            return val;
        }
    }
    return originalExecute(sql, params);
};

test('anomalyController - getAnomalies returns insulated anomalies for manager', async () => {
    let responseData = null;
    let responseStatus = null;

    // Define mock answers for isolation queries
    mockDbAnswers = {
        'SELECT ae.*, g.name AS garage_name': [[
            { id: 'ANOM-1', garage_id: 'GAR-123', entity_type: 'invoice', severity: 'MEDIUM', status: 'OPEN', reason: 'Abnormal discount' }
        ]]
    };

    const req = {
        user: { id: 'USER-123', role: 'manager', memberships: [{ garage_id: 'GAR-123' }] },
        query: { status: 'OPEN' }
    };

    const res = {
        json: (data) => { responseData = data; return res; },
        status: (code) => { responseStatus = code; return res; }
    };

    const { getAnomalies } = require('../controllers/anomalyController');
    await getAnomalies(req, res);

    assert.equal(responseStatus, null); // should not fail with error status
    assert.equal(responseData.length, 1);
    assert.equal(responseData[0].id, 'ANOM-1');
    assert.equal(responseData[0].garage_id, 'GAR-123');
});

test('anomalyController - updateAnomalyStatus blocks unauthorized manager access', async () => {
    let responseData = null;
    let responseStatus = null;

    // Define mock answers where manager has access to GAR-123, but anomaly belongs to GAR-999
    mockDbAnswers = {
        'SELECT garage_id FROM Anomaly_Event': [[{ garage_id: 'GAR-999' }]]
    };

    const req = {
        params: { id: 'ANOM-OUTSIDER' },
        body: { status: 'REVIEWED' },
        user: { id: 'USER-123', role: 'manager', memberships: [{ garage_id: 'GAR-123' }] }
    };

    const res = {
        json: (data) => { responseData = data; return res; },
        status: (code) => { responseStatus = code; return res; }
    };

    const { updateAnomalyStatus } = require('../controllers/anomalyController');
    await updateAnomalyStatus(req, res);

    assert.equal(responseStatus, 403);
    assert.equal(responseData.error, 'Access denied to this garage anomalies');
});

test('anomalyController - getHealthScore structure is mathematically sound', async () => {
    let responseData = null;
    let responseStatus = null;

    mockDbAnswers = {
        'SELECT COALESCE(SUM(total_amount), 0) AS total': [[{ total: '50000' }]],
        'SELECT COUNT(id) AS count FROM Appointment': [[{ count: 18 }]], // Pending count > 15 -> WorkloadScore = 100 - (18-15)*5 = 85
        'SELECT COUNT(id) AS count FROM Inventory': [[{ count: 3 }]], // 3 items -> InventoryScore = 100 - 3*10 = 70
        'SELECT COUNT(id) AS total, SUM(CASE WHEN status = \'active\'': [[{ total: 10, active: 5 }]] // 5/10 active = 50% -> StaffScore = 83
    };

    const req = {
        user: { id: 'owner-123', role: 'owner', memberships: [] }
    };

    const res = {
        json: (data) => { responseData = data; return res; },
        status: (code) => { responseStatus = code; return res; }
    };

    const { getHealthScore } = require('../controllers/anomalyController');
    await getHealthScore(req, res);

    assert.equal(responseStatus, null);
    assert.equal(typeof responseData.overall_score, 'number');
    assert.equal(responseData.breakdown.workload.score, 85);
    assert.equal(responseData.breakdown.inventory.score, 70);
    assert.equal(responseData.breakdown.inventory.label, 'Warning');
});

// Restore database execution function
test.after(() => {
    db.execute = originalExecute;
});
