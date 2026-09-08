const test = require('node:test');
const assert = require('node:assert/strict');

test('revenue forecast controller resolves manager garage membership and falls back when python is down', async () => {
    let responseData = null;
    let responseStatus = null;

    const req = {
        user: {
            role: 'manager',
            memberships: [
                { garage_id: 'GAR-123', role_name: 'manager' }
            ]
        },
        query: {
            garage_id: 'GAR-123'
        },
        db: {
            query: async () => [[]]
        }
    };

    const res = {
        json: (data) => { responseData = data; return res; },
        status: (code) => { responseStatus = code; return res; }
    };

    const originalFetch = global.fetch;
    global.fetch = () => Promise.reject(new Error('Python offline'));

    const { getRevenueForecast } = require('../controllers/predictionController');
    await getRevenueForecast(req, res);

    assert.equal(responseData.mode, 'UNAVAILABLE');
    assert.equal(responseData.garage_id, 'GAR-123');

    global.fetch = originalFetch;
});

test('revenue forecast controller blocks manager accessing another garage', async () => {
    let responseData = null;
    let responseStatus = null;

    const req = {
        user: {
            role: 'manager',
            memberships: [
                { garage_id: 'GAR-123', role_name: 'manager' }
            ]
        },
        query: {
            garage_id: 'GAR-999'
        }
    };

    const res = {
        json: (data) => { responseData = data; return res; },
        status: (code) => { responseStatus = code; return res; }
    };

    const { getRevenueForecast } = require('../controllers/predictionController');
    await getRevenueForecast(req, res);

    assert.equal(responseStatus, 403);
    assert.equal(responseData.error.includes('Forbidden'), true);
});

test('duration prediction controller falls back to clean rule-based estimate on python failure', async () => {
    let responseData = null;
    let responseStatus = null;

    const req = {
        user: {
            role: 'manager',
            memberships: [
                { garage_id: 'GAR-123', role_name: 'manager' }
            ]
        },
        body: {
            service_type: 'engine_repair',
            vehicle_type: 'sedan',
            garage_id: 'GAR-123'
        },
        db: {
            query: async () => [[]]
        }
    };

    const res = {
        json: (data) => { responseData = data; return res; },
        status: (code) => { responseStatus = code; return res; }
    };

    const originalFetch = global.fetch;
    global.fetch = () => Promise.reject(new Error('Python offline'));

    const { getServiceDurationPrediction } = require('../controllers/predictionController');
    await getServiceDurationPrediction(req, res);

    assert.equal(responseData.mode, 'RULE_BASED');
    assert.equal(responseData.estimated_minutes, 480); // Engine repair duration

    global.fetch = originalFetch;
});
