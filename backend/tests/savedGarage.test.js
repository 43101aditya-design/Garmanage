const { test, describe } = require('node:test');
const assert = require('node:assert');
const savedGarageCtrl = require('../controllers/savedGarageController');

describe('Customer Saved Garages Controller Unit Tests', () => {

  test('saveGarage rejects request without garage_id', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      user: { id: 'u1', role: 'customer', customer_id: 'c1' },
      body: {},
      params: {},
      db: {}
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      }
    };

    await savedGarageCtrl.saveGarage(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(statusCode, 400);
    assert.match(responseData.error, /Garage ID is required/i);
  });

  test('saveGarage returns 404 if garage does not exist or is inactive', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      user: { id: 'u1', role: 'customer', customer_id: 'c1' },
      body: { garage_id: 'non-existent-garage' },
      params: {},
      db: {
        query: async (sql, params) => {
          if (sql.includes('SELECT id, name FROM Garage')) {
            return [[]]; // not found
          }
          return [[]];
        }
      }
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      }
    };

    await savedGarageCtrl.saveGarage(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(statusCode, 404);
    assert.match(responseData.error, /Garage not found or inactive/i);
  });

  test('saveGarage returns existing save if already saved (idempotent)', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      user: { id: 'u1', role: 'customer', customer_id: 'c1' },
      body: { garage_id: 'g1' },
      params: {},
      db: {
        query: async (sql, params) => {
          if (sql.includes('SELECT id, name FROM Garage')) {
            return [[{ id: 'g1', name: 'Elite Auto' }]];
          }
          if (sql.includes('SELECT id FROM Saved_Garage')) {
            return [[{ id: 'sg-existing-1' }]];
          }
          return [[]];
        }
      }
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      }
    };

    await savedGarageCtrl.saveGarage(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.isSaved, true);
    assert.strictEqual(responseData.id, 'sg-existing-1');
  });

  test('saveGarage successfully saves new garage and returns 201', async () => {
    let statusCode = null;
    let responseData = null;
    let inserted = false;
    const req = {
      user: { id: 'u1', role: 'customer', customer_id: 'c1' },
      body: { garage_id: 'g1' },
      params: {},
      db: {
        query: async (sql, params) => {
          if (sql.includes('SELECT id, name FROM Garage')) {
            return [[{ id: 'g1', name: 'Elite Auto' }]];
          }
          if (sql.includes('SELECT id FROM Saved_Garage')) {
            return [[]]; // not saved yet
          }
          if (sql.includes('INSERT INTO Saved_Garage')) {
            inserted = true;
            return [{ affectedRows: 1 }];
          }
          if (sql.includes('INSERT INTO Audit_Log')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        }
      }
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      }
    };

    await savedGarageCtrl.saveGarage(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(statusCode, 201);
    assert.strictEqual(responseData.isSaved, true);
    assert.strictEqual(inserted, true);
    assert.strictEqual(responseData.garage_name, 'Elite Auto');
  });

  test('unsaveGarage successfully removes saved garage', async () => {
    let responseData = null;
    let deleted = false;
    const req = {
      user: { id: 'u1', role: 'customer', customer_id: 'c1' },
      params: { garageId: 'g1' },
      body: {},
      db: {
        query: async (sql, params) => {
          if (sql.includes('DELETE FROM Saved_Garage')) {
            deleted = true;
            return [{ affectedRows: 1 }];
          }
          if (sql.includes('INSERT INTO Audit_Log')) {
            return [{ affectedRows: 1 }];
          }
          return [[]];
        }
      }
    };
    const res = {
      json: (data) => { responseData = data; }
    };

    await savedGarageCtrl.unsaveGarage(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(deleted, true);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.isSaved, false);
  });

  test('checkSaved returns true when garage is saved', async () => {
    let responseData = null;
    const req = {
      user: { id: 'u1', role: 'customer', customer_id: 'c1' },
      params: { garageId: 'g1' },
      db: {
        query: async (sql, params) => {
          if (sql.includes('SELECT id FROM Saved_Garage')) {
            return [[{ id: 'sg-1' }]];
          }
          return [[]];
        }
      }
    };
    const res = {
      json: (data) => { responseData = data; }
    };

    await savedGarageCtrl.checkSaved(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(responseData.isSaved, true);
  });

  test('checkSaved returns false when garage is not saved', async () => {
    let responseData = null;
    const req = {
      user: { id: 'u1', role: 'customer', customer_id: 'c1' },
      params: { garageId: 'g99' },
      db: {
        query: async (sql, params) => {
          if (sql.includes('SELECT id FROM Saved_Garage')) {
            return [[]];
          }
          return [[]];
        }
      }
    };
    const res = {
      json: (data) => { responseData = data; }
    };

    await savedGarageCtrl.checkSaved(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(responseData.isSaved, false);
  });

});
