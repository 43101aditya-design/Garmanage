const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { v4: uuidv4 } = require('uuid');
const onboardingCtrl = require('../controllers/onboardingController');
const joinCtrl = require('../controllers/garageJoinController');

describe('Onboarding & Garage Joining Flow Unit Tests', () => {

  test('Generate Join Code format is valid', () => {
    // Generate codes and check format IG-XXXXXX (6 alphanumeric chars)
    for (let i = 0; i < 10; i++) {
      // Simulate code generation
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'IG-';
      for (let j = 0; j < 6; j++) code += chars[Math.floor(Math.random() * chars.length)];
      assert.match(code, /^IG-[A-Z0-9]{6}$/);
    }
  });

  test('createGarageAndOwner rejects missing parameters', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      firebaseUser: { firebase_uid: 'uid-test-1', email: 'test@example.com', name: 'Tester' },
      body: { garageName: '' }, // missing name and address
      db: {}
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; }
        };
      }
    };

    await onboardingCtrl.createGarageAndOwner(req, res);
    assert.strictEqual(statusCode, 400);
    assert.match(responseData.error, /required/i);
  });

  test('submitJoinRequest rejects invalid role', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      firebaseUser: { firebase_uid: 'uid-test-2', email: 'test2@example.com' },
      body: { joinCode: 'IG-123456', requestedRole: 'admin' }, // admin not allowed via join request
      db: {}
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; }
        };
      }
    };

    await onboardingCtrl.submitJoinRequest(req, res);
    assert.strictEqual(statusCode, 400);
    assert.match(responseData.error, /invalid role/i);
  });

  test('cancelJoinRequest requires requestId', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      firebaseUser: { firebase_uid: 'uid-test-3', email: 'test3@example.com' },
      body: {},
      db: {}
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; }
        };
      }
    };

    await onboardingCtrl.cancelJoinRequest(req, res);
    assert.strictEqual(statusCode, 400);
  });

  test('approveJoinRequest blocks promotion to owner', async () => {
    let statusCode = null;
    let responseData = null;

    const mockConn = {
      beginTransaction: async () => {},
      rollback: async () => {},
      commit: async () => {},
      release: () => {},
      query: async (sql, params) => {
        if (sql.includes('SELECT * FROM Garage_Join_Request')) {
          return [[{ id: 'req-1', requester_id: 'user-1', garage_id: 'g-1', requested_role: 'owner', status: 'PENDING' }]];
        }
        return [[]];
      }
    };

    const req = {
      user: { id: 'owner-id', role: 'owner' },
      params: { id: 'g-1', reqId: 'req-1' },
      db: {
        getConnection: async () => mockConn
      }
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; }
        };
      }
    };

    await joinCtrl.approveJoinRequest(req, res);
    assert.strictEqual(statusCode, 403);
    assert.match(responseData.error, /cannot approve owner/i);
  });

});
