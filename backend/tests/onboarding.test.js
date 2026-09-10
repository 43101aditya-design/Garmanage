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

  test('createCustomerProfile persists name, phone, address and returns customer role', async () => {
    let statusCode = 200;
    let responseData = null;

    const queries = [];
    const mockConn = {
      beginTransaction: async () => {},
      rollback: async () => {},
      commit: async () => {},
      release: () => {},
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('SELECT id FROM Customer WHERE email = ?')) {
          return [[]]; // No existing customer
        }
        if (sql.includes('SELECT id, role, onboarding_state FROM User_Account')) {
          return [[]]; // No existing user
        }
        return [{ affectedRows: 1 }];
      }
    };

    const req = {
      firebaseUser: { firebase_uid: 'fb-uid-100', email: 'aditya@example.com', name: 'Aditya Singh' },
      body: {
        name: 'Aditya Singh',
        phone: '+91 98765 43210',
        address: '42 Marine Drive, Mumbai'
      },
      db: {
        getConnection: async () => mockConn
      }
    };

    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      },
      json: (data) => { responseData = data; }
    };

    await onboardingCtrl.createCustomerProfile(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.user.role, 'customer');
    assert.strictEqual(responseData.user.name, 'Aditya Singh');
    assert.strictEqual(responseData.user.email, 'aditya@example.com');
    assert.strictEqual(responseData.user.onboarding_state, 'ACTIVE');

    // Verify insert into Customer table occurred with correct fields
    const customerInsert = queries.find(q => q.sql.includes('INSERT INTO Customer'));
    assert.ok(customerInsert, 'Customer table insert query must be executed');
    assert.strictEqual(customerInsert.params[1], 'Aditya');
    assert.strictEqual(customerInsert.params[2], 'Singh');
    assert.strictEqual(customerInsert.params[3], 'aditya@example.com');
    assert.strictEqual(customerInsert.params[4], '+91 98765 43210');
    assert.strictEqual(customerInsert.params[5], '42 Marine Drive, Mumbai');
  });

  test('createGarageAndOwner creates Garage + Owner Membership in transaction', async () => {
    let statusCode = 200;
    let responseData = null;

    const queries = [];
    const mockConn = {
      beginTransaction: async () => {},
      rollback: async () => {},
      commit: async () => {},
      release: () => {},
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('SELECT id FROM User_Account WHERE firebase_uid = ?')) {
          return [[]]; // New user
        }
        if (sql.includes("SELECT id FROM Role WHERE name = 'owner'")) {
          return [[{ id: 'role-owner-uuid' }]];
        }
        if (sql.includes('SELECT ua.id, ua.firebase_uid, ua.name')) {
          return [[{
            id: 'user-uuid-1',
            firebase_uid: 'fb-owner-1',
            name: 'Aditya Owner',
            email: 'owner@example.com',
            role: 'owner',
            onboarding_state: 'ACTIVE',
            membership_id: 'mem-1',
            garage_id: 'g-1',
            role_name: 'owner'
          }]];
        }
        return [{ affectedRows: 1 }];
      }
    };

    const req = {
      firebaseUser: { firebase_uid: 'fb-owner-1', email: 'owner@example.com', name: 'Aditya Owner' },
      body: {
        garageName: 'Apex Speed Hub',
        garageAddress: '104 Industrial Area',
        garageCity: 'Mumbai',
        garageState: 'Maharashtra',
        garageType: 'luxury'
      },
      db: {
        getConnection: async () => mockConn
      }
    };

    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      },
      json: (data) => { responseData = data; }
    };

    await onboardingCtrl.createGarageAndOwner(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.user.role, 'owner');
    assert.strictEqual(responseData.garage.name, 'Apex Speed Hub');
    assert.match(responseData.garage.join_code, /^IG-[A-Z0-9]{6}$/);

    const garageInsert = queries.find(q => q.sql.includes('INSERT INTO Garage'));
    assert.ok(garageInsert, 'Garage table insert must be executed');
    const membershipInsert = queries.find(q => q.sql.includes('INSERT INTO Garage_Membership'));
    assert.ok(membershipInsert, 'Garage_Membership insert must be executed');
  });

});
