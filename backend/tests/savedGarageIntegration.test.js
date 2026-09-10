const { test, describe } = require('node:test');
const assert = require('node:assert');
const db = require('../config/db');
const savedGarageCtrl = require('../controllers/savedGarageController');
const serviceRequestCtrl = require('../controllers/serviceRequestController');
const appointmentCtrl = require('../controllers/appointmentController');

describe('Customer Saved Garages & Quick Booking End-to-End Database Flow', () => {

  const testCustomerEmail = 'customer@garmanage.dev';
  let testCustomerId = 'customer-uuid-1';
  let activeGarageId = null;
  let testVehicleId = null;

  test('Setup test customer, active garage, and test vehicle in database', async () => {
    // 1. Get an active garage
    const [garages] = await db.query('SELECT id, name FROM Garage WHERE status = "ACTIVE" AND deleted_at IS NULL LIMIT 1');
    assert.ok(garages.length > 0, 'Must have at least 1 active garage');
    activeGarageId = garages[0].id;

    // 2. Ensure customer profile
    const [customers] = await db.query('SELECT id FROM Customer WHERE email = ?', [testCustomerEmail]);
    if (customers.length > 0) {
      testCustomerId = customers[0].id;
    } else {
      await db.query('INSERT INTO Customer (id, first_name, last_name, email, phone) VALUES (?, "Dev", "Customer", ?, "+15551234567")', [testCustomerId, testCustomerEmail]);
    }

    // 3. Ensure a vehicle exists for this customer
    const [vehicles] = await db.query('SELECT id FROM Vehicle WHERE customer_id = ? AND deleted_at IS NULL', [testCustomerId]);
    if (vehicles.length > 0) {
      testVehicleId = vehicles[0].id;
    } else {
      const { v4: uuidv4 } = require('uuid');
      testVehicleId = uuidv4();
      await db.query('INSERT INTO Vehicle (id, customer_id, make, model, year, license_plate, vin) VALUES (?, ?, "Toyota", "Corolla", 2021, "TEST-9988", "VIN99887766554433221")', [testVehicleId, testCustomerId]);
    }

    assert.ok(testCustomerId, 'Customer ID resolved');
    assert.ok(activeGarageId, 'Active Garage ID resolved');
    assert.ok(testVehicleId, 'Test Vehicle ID resolved');
  });

  test('Save garage into MySQL database for authenticated customer', async () => {
    // Clean any prior test record
    await db.query('DELETE FROM Saved_Garage WHERE customer_id = ? AND garage_id = ?', [testCustomerId, activeGarageId]);

    let statusCode = null;
    let responseData = null;
    const req = {
      user: { id: testCustomerId, email: testCustomerEmail, customer_id: testCustomerId, role: 'customer' },
      body: { garage_id: activeGarageId },
      params: {},
      db: db
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

    // Verify in database
    const [dbRows] = await db.query('SELECT * FROM Saved_Garage WHERE customer_id = ? AND garage_id = ?', [testCustomerId, activeGarageId]);
    assert.strictEqual(dbRows.length, 1);
    assert.strictEqual(dbRows[0].garage_id, activeGarageId);
  });

  test('CheckSaved returns true for saved garage in database', async () => {
    let responseData = null;
    const req = {
      user: { id: testCustomerId, email: testCustomerEmail, customer_id: testCustomerId, role: 'customer' },
      params: { garageId: activeGarageId },
      db: db
    };
    const res = {
      json: (data) => { responseData = data; }
    };

    await savedGarageCtrl.checkSaved(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(responseData.isSaved, true);
  });

  test('GetSavedGarages returns the saved garage with full joined metadata', async () => {
    let responseData = null;
    const req = {
      user: { id: testCustomerId, email: testCustomerEmail, customer_id: testCustomerId, role: 'customer' },
      db: db
    };
    const res = {
      json: (data) => { responseData = data; }
    };

    await savedGarageCtrl.getSavedGarages(req, res, (err) => { if (err) throw err; });
    assert.ok(Array.isArray(responseData));
    const found = responseData.find(g => g.id === activeGarageId);
    assert.ok(found, 'Saved garage should be returned in list');
    assert.ok(found.name, 'Should include garage name');
    assert.ok(found.address, 'Should include garage address');
    assert.ok(found.saved_at, 'Should include timestamp');
  });

  test('Duplicate save operation is idempotent and does not produce duplicate rows', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      user: { id: testCustomerId, email: testCustomerEmail, customer_id: testCustomerId, role: 'customer' },
      body: { garage_id: activeGarageId },
      params: {},
      db: db
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

    const [countRows] = await db.query('SELECT COUNT(*) as cnt FROM Saved_Garage WHERE customer_id = ? AND garage_id = ?', [testCustomerId, activeGarageId]);
    assert.strictEqual(countRows[0].cnt, 1);
  });

  test('Quick Booking creates real Service_Request in MySQL', async () => {
    let statusCode = null;
    let responseData = null;
    const req = {
      user: { id: testCustomerId, email: testCustomerEmail, customer_id: testCustomerId, role: 'customer' },
      body: {
        vehicle_id: testVehicleId,
        garage_id: activeGarageId,
        service_type: 'Oil & Filter Change',
        problem_description: 'Synthetic 5W-30 oil replacement',
        priority: 'NORMAL',
        preferred_date: '2026-10-15',
        preferred_time: '10:30:00'
      },
      db: db
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      }
    };

    await serviceRequestCtrl.create(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(statusCode, 201);
    assert.ok(responseData.id);
    assert.ok(responseData.request_number);

    // Verify in database
    const [srRows] = await db.query('SELECT * FROM Service_Request WHERE id = ?', [responseData.id]);
    assert.strictEqual(srRows.length, 1);
    assert.strictEqual(srRows[0].customer_id, testCustomerId);
    assert.strictEqual(srRows[0].garage_id, activeGarageId);
    assert.strictEqual(srRows[0].vehicle_id, testVehicleId);
  });

  test('UnsaveGarage successfully deletes record from MySQL database', async () => {
    let responseData = null;
    const req = {
      user: { id: testCustomerId, email: testCustomerEmail, customer_id: testCustomerId, role: 'customer' },
      params: { garageId: activeGarageId },
      db: db
    };
    const res = {
      json: (data) => { responseData = data; }
    };

    await savedGarageCtrl.unsaveGarage(req, res, (err) => { if (err) throw err; });
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.isSaved, false);

    // Verify deletion in database
    const [dbRows] = await db.query('SELECT * FROM Saved_Garage WHERE customer_id = ? AND garage_id = ?', [testCustomerId, activeGarageId]);
    assert.strictEqual(dbRows.length, 0);
  });

});
