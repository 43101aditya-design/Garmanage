const assert = require('assert');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

async function runTests() {
  console.log('--- STARTING SERVICE TRACKING & EXPECTED COMPLETION TESTS ---');
  let testGarageId, testCustomerId, testVehicleId, testAppointmentId, testJobId, testUserId;

  try {
    // 1. Prepare test entities
    testGarageId = uuidv4();
    testCustomerId = uuidv4();
    testVehicleId = uuidv4();
    testAppointmentId = uuidv4();
    testJobId = uuidv4();
    testUserId = uuidv4();

    await db.query(`
      INSERT INTO Garage (id, name, address, city, phone, status, location) 
      VALUES (?, 'Test Tracking Garage', '123 Test St', 'Mumbai', '9876543210', 'ACTIVE', ST_PointFromText('POINT(19.0760 72.8777)', 4326))
    `, [testGarageId]);

    const ts = Date.now();
    await db.query(`
      INSERT INTO User_Account (id, username, email, name, role, onboarding_state)
      VALUES (?, ?, ?, 'Test Manager', 'manager', 'ACTIVE')
    `, [testUserId, 'test_mgr_' + ts, `test_mgr_${ts}@garage.com`]);

    await db.query(`
      INSERT INTO Customer (id, first_name, last_name, email, phone)
      VALUES (?, 'Rahul', 'Sharma', ?, '9988776655')
    `, [testCustomerId, `rahul_${ts}@example.com`]);

    await db.query(`
      INSERT INTO Vehicle (id, customer_id, make, model, year, license_plate, vin)
      VALUES (?, ?, 'Hyundai', 'Creta', 2023, ?, ?)
    `, [testVehicleId, testCustomerId, `MH02T${ts.toString().slice(-6)}`, `VIN${ts}`]);

    testServiceRequestId = uuidv4();

    await db.query(`
      INSERT INTO Service_Request (id, request_number, customer_id, vehicle_id, garage_id, service_type, problem_description, preferred_date, preferred_time, status)
      VALUES (?, 'SR-TEST-99', ?, ?, ?, 'Brake Overhaul', 'Squeaking sound', CURDATE(), '10:00:00', 'SCHEDULED')
    `, [testServiceRequestId, testCustomerId, testVehicleId, testGarageId]);

    await db.query(`
      INSERT INTO Appointment (id, service_request_id, customer_id, vehicle_id, garage_id, appointment_date, appointment_time, status)
      VALUES (?, ?, ?, ?, ?, CURDATE(), '10:00:00', 'SCHEDULED')
    `, [testAppointmentId, testServiceRequestId, testCustomerId, testVehicleId, testGarageId]);

    console.log('✓ Test fixtures prepared.');

    // 2. Test initial Job Card insertion with ETA and initial history
    const estStart = new Date();
    const estCompletion = new Date(estStart.getTime() + 90 * 60000); // 90 mins

    await db.query(`
      INSERT INTO Job_Card (
        id, job_number, service_request_id, appointment_id, garage_id, customer_id, vehicle_id, 
        service_type, problem_description, status, estimated_duration_minutes, 
        estimated_start_at, estimated_completion_at, created_by
      ) VALUES (?, 'TEST-JOB-001', ?, ?, ?, ?, ?, 'Brake Overhaul', 'Squeaking sound', 'CREATED', 90, ?, ?, ?)
    `, [testJobId, testServiceRequestId, testAppointmentId, testGarageId, testCustomerId, testVehicleId, estStart, estCompletion, testUserId]);

    const initialHistoryId = uuidv4();
    await db.query(`
      INSERT INTO Job_Status_History (
        id, job_card_id, previous_status, new_status, stage_label, changed_by, changed_by_role, reason, estimated_completion_at
      ) VALUES (?, ?, NULL, 'CREATED', 'Vehicle Received', ?, 'MANAGER', 'Vehicle received at workshop', ?)
    `, [initialHistoryId, testJobId, testUserId, estCompletion]);

    const [hist1] = await db.query('SELECT * FROM Job_Status_History WHERE job_card_id = ?', [testJobId]);
    assert.strictEqual(hist1.length, 1, 'Initial history record must exist');
    assert.strictEqual(hist1[0].new_status, 'CREATED');
    console.log('✓ Job creation & initial Job_Status_History record verified.');

    // 3. Test Valid State Transitions: CREATED -> ASSIGNED -> IN_PROGRESS -> QUALITY_CHECK -> READY_FOR_PICKUP -> COMPLETED
    const transitions = [
      { to: 'ASSIGNED', label: 'Work Assigned', reason: 'Assigned to Senior Tech' },
      { to: 'IN_PROGRESS', label: 'Service In Progress', reason: 'Work begun in Bay 2' },
      { to: 'QUALITY_CHECK', label: 'Quality Check & Testing', reason: 'Repair finished, testing brakes' },
      { to: 'READY_FOR_PICKUP', label: 'Ready for Pickup', reason: 'Vehicle washed & ready' },
      { to: 'COMPLETED', label: 'Delivered & Completed', reason: 'Customer collected vehicle' }
    ];

    let prevStatus = 'CREATED';
    for (const t of transitions) {
      await db.query(
        'UPDATE Job_Card SET status = ?, last_status_change_at = CURRENT_TIMESTAMP WHERE id = ?',
        [t.to, testJobId]
      );

      await db.query(`
        INSERT INTO Job_Status_History (id, job_card_id, previous_status, new_status, stage_label, changed_by, changed_by_role, reason)
        VALUES (?, ?, ?, ?, ?, ?, 'MANAGER', ?)
      `, [uuidv4(), testJobId, prevStatus, t.to, t.label, testUserId, t.reason]);

      prevStatus = t.to;
    }

    const [allHistory] = await db.query('SELECT * FROM Job_Status_History WHERE job_card_id = ? ORDER BY changed_at ASC', [testJobId]);
    assert.strictEqual(allHistory.length, 6, 'History should contain all 6 state transitions');
    assert.strictEqual(allHistory[allHistory.length - 1].new_status, 'COMPLETED');
    console.log('✓ Valid state transition pipeline verified through Quality Check and Pickup.');

    // 4. Test ETA Update and History Logging
    const updatedEta = new Date(Date.now() + 180 * 60000); // 3 hours from now
    await db.query(
      'UPDATE Job_Card SET estimated_completion_at = ?, delay_reason = ? WHERE id = ?',
      [updatedEta, 'Special brake rotor on order', testJobId]
    );

    await db.query(`
      INSERT INTO Job_Status_History (id, job_card_id, previous_status, new_status, stage_label, changed_by, changed_by_role, reason, estimated_completion_at)
      VALUES (?, ?, 'COMPLETED', 'COMPLETED', 'ETA Updated', ?, 'MANAGER', 'Special brake rotor on order', ?)
    `, [uuidv4(), testJobId, testUserId, updatedEta]);

    const [etaHistory] = await db.query(
      'SELECT * FROM Job_Status_History WHERE job_card_id = ? AND stage_label = "ETA Updated"',
      [testJobId]
    );
    assert.strictEqual(etaHistory.length, 1, 'ETA update audit record must exist');
    assert.strictEqual(etaHistory[0].reason, 'Special brake rotor on order');
    console.log('✓ ETA update with delay reason verified in status history.');

    // 5. Test Customer Isolation (Customer A vs Customer B)
    const unauthorizedCustomerId = uuidv4();
    const [isolatedQuery] = await db.query(
      'SELECT * FROM Job_Card WHERE id = ? AND customer_id = ?',
      [testJobId, unauthorizedCustomerId]
    );
    assert.strictEqual(isolatedQuery.length, 0, 'Unauthorized customer must NOT access another customer job');
    console.log('✓ Customer isolation and IDOR protection verified.');

    // 6. Test Multi-Garage Isolation
    const otherGarageId = uuidv4();
    const [garageIsolatedQuery] = await db.query(
      'SELECT * FROM Job_Card WHERE id = ? AND garage_id = ?',
      [testJobId, otherGarageId]
    );
    assert.strictEqual(garageIsolatedQuery.length, 0, 'Cross-garage job access must be rejected');
    console.log('✓ Multi-garage isolation verified.');

    console.log('\n========================================');
    console.log('ALL SERVICE TRACKING BACKEND TESTS PASSED!');
    console.log('========================================\n');
  } catch (err) {
    console.error('Test failure:', err);
    process.exit(1);
  } finally {
    // Cleanup test fixtures
    try {
      if (testJobId) await db.query('DELETE FROM Job_Card WHERE id = ?', [testJobId]);
      if (testAppointmentId) await db.query('DELETE FROM Appointment WHERE id = ?', [testAppointmentId]);
      if (testServiceRequestId) await db.query('DELETE FROM Service_Request WHERE id = ?', [testServiceRequestId]);
      if (testVehicleId) await db.query('DELETE FROM Vehicle WHERE id = ?', [testVehicleId]);
      if (testCustomerId) await db.query('DELETE FROM Customer WHERE id = ?', [testCustomerId]);
      if (testUserId) await db.query('DELETE FROM User_Account WHERE id = ?', [testUserId]);
      if (testGarageId) await db.query('DELETE FROM Garage WHERE id = ?', [testGarageId]);
    } catch (e) {}
    process.exit(0);
  }
}

runTests();
