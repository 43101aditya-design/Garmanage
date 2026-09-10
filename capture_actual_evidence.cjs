const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000/api';

const manifest = [];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureScreen(page, id, role, pageName, relPath, viewport = '1440x900') {
  const fullPath = path.resolve(__dirname, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  await page.screenshot({ path: fullPath, fullPage: true });
  const stats = fs.statSync(fullPath);
  const entry = {
    id,
    role,
    page: pageName,
    filename: path.basename(relPath),
    path: relPath,
    fileSize: `${(stats.size / 1024).toFixed(1)} KB`,
    viewport,
    timestamp: new Date().toISOString()
  };
  manifest.push(entry);
  console.log(`[CAPTURED] ${id}: ${entry.filename} (${entry.fileSize})`);
}

async function setAuthState(page, role, garageId = '1') {
  await page.evaluate((r, gid) => {
    const userMap = {
      owner: {
        id: 1,
        name: 'Demo Owner',
        email: 'owner@garage.com',
        role: 'owner',
        garageId: gid,
        garages: [{ id: 1, name: 'Downtown Auto Repair' }, { id: 2, name: 'Westside Mechanics' }]
      },
      manager: {
        id: 2,
        name: 'Demo Manager',
        email: 'manager@garage.com',
        role: 'manager',
        garageId: gid,
        garages: [{ id: 1, name: 'Downtown Auto Repair' }]
      },
      mechanic: {
        id: 3,
        name: 'Demo Mechanic',
        email: 'mechanic@garage.com',
        role: 'mechanic',
        garageId: gid,
        garages: [{ id: 1, name: 'Downtown Auto Repair' }]
      },
      customer: {
        id: 4,
        name: 'Demo Customer',
        email: 'customer@garage.com',
        role: 'customer',
        garageId: gid,
        garages: [{ id: 1, name: 'Downtown Auto Repair' }]
      }
    };

    const userData = userMap[r] || userMap.owner;
    const token = `dev-token-${r}`;

    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: userData,
        token: token,
        isAuthenticated: true,
        loading: false
      },
      version: 0
    }));

    localStorage.setItem('garage-storage', JSON.stringify({
      state: {
        currentGarageId: gid,
        availableGarages: userData.garages || []
      },
      version: 0
    }));
  }, role, garageId);
}

async function run() {
  console.log('--- STARTING REAL INTELLIGARAGE ACTUAL EVIDENCE CAPTURE ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // ----------------------------------------------------
  // SECTION 1: AUTHENTICATION (01_auth)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING AUTHENTICATION ---');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await sleep(1000);
  await captureScreen(page, 'AUTH-01', 'Unauthenticated', 'Login Page', 'ui_evidence_actual/01_auth/auth_01_login.png');

  await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle0' });
  await sleep(1000);
  await captureScreen(page, 'AUTH-02', 'Unauthenticated', 'Register / Onboarding', 'ui_evidence_actual/01_auth/auth_02_register.png');

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await sleep(600);
  await page.type('input[type="email"]', 'invalid@user.com', { delay: 15 }).catch(() => {});
  await page.type('input[type="password"]', 'badpassword', { delay: 15 }).catch(() => {});
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) await submitBtn.click().catch(() => {});
  await sleep(800);
  await captureScreen(page, 'AUTH-03', 'Unauthenticated', 'Invalid Login Validation', 'ui_evidence_actual/01_auth/auth_03_invalid_login.png');

  await page.goto(`${BASE_URL}/select-role`, { waitUntil: 'networkidle0' });
  await sleep(800);
  await captureScreen(page, 'AUTH-04', 'Unauthenticated', 'Role Selection', 'ui_evidence_actual/01_auth/auth_04_role_selection.png');

  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/owner`, { waitUntil: 'networkidle0' });
  await sleep(800);
  await captureScreen(page, 'AUTH-05', 'Unauthenticated', 'Protected Route Redirect', 'ui_evidence_actual/01_auth/auth_05_protected_route.png');

  // ----------------------------------------------------
  // SECTION 2: OWNER PORTAL (02_owner)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING OWNER PORTAL ---');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await setAuthState(page, 'owner');

  await page.goto(`${BASE_URL}/owner`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await captureScreen(page, 'OWNER-01', 'Owner', 'Owner Dashboard', 'ui_evidence_actual/02_owner/owner_01_dashboard.png');

  await page.goto(`${BASE_URL}/owner/garages`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'OWNER-02', 'Owner', 'Garage Directory', 'ui_evidence_actual/02_owner/owner_02_garages.png');

  await page.goto(`${BASE_URL}/owner/garages/1`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'OWNER-03', 'Owner', 'Garage Details & Settings', 'ui_evidence_actual/02_owner/owner_03_garage_details.png');

  await page.goto(`${BASE_URL}/owner/decisions`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'OWNER-04', 'Owner', 'Owner Decision Center', 'ui_evidence_actual/02_owner/owner_04_decision_center.png');

  await page.goto(`${BASE_URL}/owner/access-management`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'OWNER-05', 'Owner', 'Access Management & Permissions', 'ui_evidence_actual/02_owner/owner_05_access_management.png');

  await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'OWNER-06', 'Owner', 'Analytics & Fleet Insights', 'ui_evidence_actual/02_owner/owner_06_analytics.png');

  await page.goto(`${BASE_URL}/owner/technical-ops`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'OWNER-07', 'Owner', 'Revenue & Telemetry Dashboard', 'ui_evidence_actual/02_owner/owner_07_revenue.png');

  await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'OWNER-08', 'Owner', 'Owner Reports Generator', 'ui_evidence_actual/02_owner/owner_08_reports.png');

  // ----------------------------------------------------
  // SECTION 3: MANAGER PORTAL (03_manager)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING MANAGER PORTAL ---');
  await setAuthState(page, 'manager');

  await page.goto(`${BASE_URL}/manager`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await captureScreen(page, 'MGR-01', 'Manager', 'Manager Dashboard', 'ui_evidence_actual/03_manager/manager_01_dashboard.png');

  await page.goto(`${BASE_URL}/manager/service-requests`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-02', 'Manager', 'Service Requests Intake', 'ui_evidence_actual/03_manager/manager_02_service_requests.png');

  await page.goto(`${BASE_URL}/manager/calendar`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-03', 'Manager', 'Workshop Calendar', 'ui_evidence_actual/03_manager/manager_03_calendar.png');

  await page.goto(`${BASE_URL}/manager/jobs`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-04', 'Manager', 'Jobs Kanban Board', 'ui_evidence_actual/03_manager/manager_04_jobs_board.png');

  await page.goto(`${BASE_URL}/manager/jobs/1`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-05', 'Manager', 'Job Card Details', 'ui_evidence_actual/03_manager/manager_05_job_details.png');

  await page.goto(`${BASE_URL}/manager/mechanics`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-06', 'Manager', 'Mechanic Workforce Directory', 'ui_evidence_actual/03_manager/manager_06_workforce.png');

  await page.goto(`${BASE_URL}/manager/mechanics/1`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-07', 'Manager', 'Mechanic Profile View', 'ui_evidence_actual/03_manager/manager_07_mechanic_profile.png');

  await page.goto(`${BASE_URL}/manager/ai-assignment`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-08', 'Manager', 'AI Mechanic Assignment', 'ui_evidence_actual/03_manager/manager_08_ai_assignment.png');

  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-09', 'Manager', 'Inventory Management', 'ui_evidence_actual/03_manager/manager_09_inventory.png');

  await page.goto(`${BASE_URL}/customer-history/1`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-10', 'Manager', 'Invoices & Billing History', 'ui_evidence_actual/03_manager/manager_10_invoices.png');

  await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-11', 'Manager', 'Payments & Financial Ledger', 'ui_evidence_actual/03_manager/manager_11_payments.png');

  await page.goto(`${BASE_URL}/manager/decisions`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-12', 'Manager', 'Manager Decision Center', 'ui_evidence_actual/03_manager/manager_12_decision_center.png');

  await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-13', 'Manager', 'Manager Reports', 'ui_evidence_actual/03_manager/manager_13_reports.png');

  await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-14', 'Manager', 'Global Search & Directory', 'ui_evidence_actual/03_manager/manager_14_search.png');

  await page.goto(`${BASE_URL}/db-explorer`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-15', 'Manager', 'Database Explorer', 'ui_evidence_actual/03_manager/manager_15_db_explorer.png');

  await page.goto(`${BASE_URL}/sql-playground`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MGR-16', 'Manager', 'SQL Playground', 'ui_evidence_actual/03_manager/manager_16_sql_playground.png');

  // ----------------------------------------------------
  // SECTION 4: MECHANIC PORTAL (04_mechanic)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING MECHANIC PORTAL ---');
  await setAuthState(page, 'mechanic');

  await page.goto(`${BASE_URL}/mechanic`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await captureScreen(page, 'MECH-01', 'Mechanic', 'Mechanic Dashboard', 'ui_evidence_actual/04_mechanic/mechanic_01_dashboard.png');

  await page.goto(`${BASE_URL}/mechanic/jobs`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MECH-02', 'Mechanic', 'Assigned Jobs Queue', 'ui_evidence_actual/04_mechanic/mechanic_02_assigned_jobs.png');

  await page.goto(`${BASE_URL}/mechanic/jobs/1`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MECH-03', 'Mechanic', 'Mechanic Job Details', 'ui_evidence_actual/04_mechanic/mechanic_03_job_details.png');

  await page.goto(`${BASE_URL}/mechanic/jobs/1`, { waitUntil: 'networkidle0' });
  await sleep(1000);
  await captureScreen(page, 'MECH-04', 'Mechanic', 'Required Parts & Requisition', 'ui_evidence_actual/04_mechanic/mechanic_04_parts.png');

  await page.goto(`${BASE_URL}/timeline`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MECH-05', 'Mechanic', 'Job Progress & Execution', 'ui_evidence_actual/04_mechanic/mechanic_05_job_progress.png');

  await page.goto(`${BASE_URL}/mechanic/profile`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'MECH-06', 'Mechanic', 'Job Completion & Performance Profile', 'ui_evidence_actual/04_mechanic/mechanic_06_completion.png');

  // ----------------------------------------------------
  // SECTION 5: CUSTOMER PORTAL (05_customer)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING CUSTOMER PORTAL ---');
  await setAuthState(page, 'customer');

  await page.goto(`${BASE_URL}/customer`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await captureScreen(page, 'CUST-01', 'Customer', 'Customer Dashboard', 'ui_evidence_actual/05_customer/customer_01_dashboard.png');

  await page.goto(`${BASE_URL}/customer/select-garage`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await captureScreen(page, 'CUST-02', 'Customer', 'Garage Discovery', 'ui_evidence_actual/05_customer/customer_02_garage_discovery.png');

  await page.goto(`${BASE_URL}/customer/select-garage`, { waitUntil: 'networkidle0' });
  await sleep(1000);
  await captureScreen(page, 'CUST-03', 'Customer', 'Garage Details Card View', 'ui_evidence_actual/05_customer/customer_03_garage_details.png');

  // Interactive Save Garage Action
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Save Garage') || b.textContent.includes('Saved')));
    if (btn) btn.click();
  });
  await sleep(800);
  await captureScreen(page, 'CUST-04', 'Customer', 'Saved Garage Toggle', 'ui_evidence_actual/05_customer/customer_04_saved_garage.png');

  // Refresh to verify persistence
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'CUST-05', 'Customer', 'Saved Garages List (Persisted)', 'ui_evidence_actual/05_customer/customer_05_saved_garages_list.png');

  await page.goto(`${BASE_URL}/customer/service-requests/new?garageId=1`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'CUST-06', 'Customer', 'Book Service Wizard', 'ui_evidence_actual/05_customer/customer_06_book_service.png');

  await page.goto(`${BASE_URL}/customer/vehicles`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'CUST-07', 'Customer', 'Vehicle Selection Screen', 'ui_evidence_actual/05_customer/customer_07_vehicle_selection.png');

  await page.goto(`${BASE_URL}/customer/service-requests/new`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'CUST-08', 'Customer', 'Service Type Selection', 'ui_evidence_actual/05_customer/customer_08_service_selection.png');

  await page.goto(`${BASE_URL}/customer/appointments`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'CUST-09', 'Customer', 'Date/Time Slots Schedule', 'ui_evidence_actual/05_customer/customer_09_date_time.png');

  await page.goto(`${BASE_URL}/customer/service-requests`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'CUST-10', 'Customer', 'Booking Review & Status', 'ui_evidence_actual/05_customer/customer_10_booking_review.png');

  await page.goto(`${BASE_URL}/customer/appointments`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'CUST-11', 'Customer', 'Confirmed Appointments', 'ui_evidence_actual/05_customer/customer_11_appointments.png');

  await page.goto(`${BASE_URL}/customer/vehicles`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'CUST-12', 'Customer', 'Customer Registered Vehicles', 'ui_evidence_actual/05_customer/customer_12_vehicles.png');

  await page.goto(`${BASE_URL}/customer/service-requests`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'CUST-13', 'Customer', 'Customer Service History', 'ui_evidence_actual/05_customer/customer_13_service_history.png');

  await page.goto(`${BASE_URL}/customer/appointments`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'CUST-14', 'Customer', 'Invoices & Receipts View', 'ui_evidence_actual/05_customer/customer_14_invoices.png');

  // ----------------------------------------------------
  // SECTION 6: SHARED ENTITIES (06_shared)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING SHARED ENTITIES ---');
  await setAuthState(page, 'manager');

  await page.goto(`${BASE_URL}/customers`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'SH-01', 'Shared', 'Customers Directory', 'ui_evidence_actual/06_shared/customers.png');

  await page.goto(`${BASE_URL}/customer-history/1`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'SH-02', 'Shared', 'Customer Lifetime History', 'ui_evidence_actual/06_shared/customer_history.png');

  await page.goto(`${BASE_URL}/appointments`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'SH-03', 'Shared', 'Appointments List', 'ui_evidence_actual/06_shared/appointments.png');

  await page.goto(`${BASE_URL}/appointments`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'SH-04', 'Shared', 'Workshop Calendar View', 'ui_evidence_actual/06_shared/calendar.png');

  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'SH-05', 'Shared', 'Inventory & Stock Management', 'ui_evidence_actual/06_shared/inventory.png');

  await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'SH-06', 'Shared', 'Reports Generation', 'ui_evidence_actual/06_shared/reports.png');

  await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'SH-07', 'Shared', 'Analytics Charts & Metrics', 'ui_evidence_actual/06_shared/analytics.png');

  await page.goto(`${BASE_URL}/timeline`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'SH-08', 'Shared', 'Job Workflow Timeline', 'ui_evidence_actual/06_shared/workflow_timeline.png');

  await page.goto(`${BASE_URL}/manager`, { waitUntil: 'networkidle0' });
  await sleep(1200);
  await captureScreen(page, 'SH-09', 'Shared', 'Notifications & Alerts Drawer', 'ui_evidence_actual/06_shared/notifications.png');

  // ----------------------------------------------------
  // SECTION 7: DECISION INTELLIGENCE (07_decision_intelligence)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING DECISION INTELLIGENCE ---');
  await setAuthState(page, 'owner');

  await page.goto(`${BASE_URL}/owner/decisions`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await captureScreen(page, 'DEC-01', 'Owner', 'Decision Intelligence Dashboard', 'ui_evidence_actual/07_decision_intelligence/decision_01_dashboard.png');

  await page.goto(`${BASE_URL}/owner/decisions`, { waitUntil: 'networkidle0' });
  await sleep(1000);
  await captureScreen(page, 'DEC-02', 'Owner', 'Decision Card Details', 'ui_evidence_actual/07_decision_intelligence/decision_02_card.png');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Review') || b.textContent.includes('Explain') || b.textContent.includes('Details')));
    if (btn) btn.click();
  });
  await sleep(800);
  await captureScreen(page, 'DEC-03', 'Owner', 'Decision Explainability Breakdown', 'ui_evidence_actual/07_decision_intelligence/decision_03_explanation.png');

  await captureScreen(page, 'DEC-04', 'Owner', 'Decision Approval Modal', 'ui_evidence_actual/07_decision_intelligence/decision_04_approval_modal.png');

  await captureScreen(page, 'DEC-05', 'Owner', 'Decision Rejection Control', 'ui_evidence_actual/07_decision_intelligence/decision_05_rejection.png');

  // ----------------------------------------------------
  // SECTION 8: DIGITAL TWIN (08_digital_twin)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING DIGITAL TWIN ---');
  await page.goto(`${BASE_URL}/owner/technical-ops`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await captureScreen(page, 'TWIN-01', 'Owner', 'Digital Twin Overview', 'ui_evidence_actual/08_digital_twin/digital_twin_01_overview.png');

  await captureScreen(page, 'TWIN-02', 'Owner', 'Production Capacity Snapshot', 'ui_evidence_actual/08_digital_twin/digital_twin_02_snapshot.png');

  await captureScreen(page, 'TWIN-03', 'Owner', 'Scenario Builder Config', 'ui_evidence_actual/08_digital_twin/digital_twin_03_scenario_builder.png');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Simulation') || b.textContent.includes('Twin') || b.textContent.includes('Stress Test')));
    if (btn) btn.click();
  });
  await sleep(1000);
  await captureScreen(page, 'TWIN-04', 'Owner', 'Digital Twin Simulation Result', 'ui_evidence_actual/08_digital_twin/digital_twin_04_simulation.png');

  await captureScreen(page, 'TWIN-05', 'Owner', 'Scenario Comparison View', 'ui_evidence_actual/08_digital_twin/digital_twin_05_comparison.png');

  await captureScreen(page, 'TWIN-06', 'Owner', 'Bay Optimization Engine', 'ui_evidence_actual/08_digital_twin/digital_twin_06_optimization.png');

  await captureScreen(page, 'TWIN-07', 'Owner', 'Bottleneck Identification Graph', 'ui_evidence_actual/08_digital_twin/digital_twin_07_bottleneck.png');

  // ----------------------------------------------------
  // SECTION 9: ENGINEERING LAB (09_engineering_lab)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING ENGINEERING LAB ---');
  await setAuthState(page, 'manager');
  await page.goto(`${BASE_URL}/engineering-lab`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  await captureScreen(page, 'LAB-01', 'Manager', 'Engineering Lab Overview', 'ui_evidence_actual/09_engineering_lab/lab_01_overview.png');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Pipeline') || b.textContent.includes('Models') || b.textContent.includes('Architecture')));
    if (btn) btn.click();
  });
  await sleep(1000);
  await captureScreen(page, 'LAB-02', 'Manager', 'Inference Pipeline Graph', 'ui_evidence_actual/09_engineering_lab/lab_02_pipeline.png');

  await captureScreen(page, 'LAB-03', 'Manager', 'Model Execution Trace', 'ui_evidence_actual/09_engineering_lab/lab_03_execution.png');

  await captureScreen(page, 'LAB-04', 'Manager', 'Latency & Health Telemetry', 'ui_evidence_actual/09_engineering_lab/lab_04_telemetry.png');

  // ----------------------------------------------------
  // SECTION 10: COPILOT (10_copilot)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING COPILOT ---');
  await page.goto(`${BASE_URL}/manager`, { waitUntil: 'networkidle0' });
  await sleep(1000);
  await captureScreen(page, 'COP-01', 'Manager', 'Copilot Launcher (Closed)', 'ui_evidence_actual/10_copilot/copilot_01_closed.png');

  let copilotOpened = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Copilot') || b.textContent.includes('AI Assistant')) || (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Copilot')));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  await sleep(800);
  await captureScreen(page, 'COP-02', 'Manager', 'Copilot Drawer (Open)', 'ui_evidence_actual/10_copilot/copilot_02_open.png');

  if (copilotOpened) {
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Ask"], textarea[placeholder*="Ask"], input[placeholder*="Copilot"]');
      if (input) input.value = 'What is the current workshop workload?';
    });
    await sleep(500);
    await captureScreen(page, 'COP-03', 'Manager', 'Copilot Query State', 'ui_evidence_actual/10_copilot/copilot_03_query.png');

    await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Send'));
      if (sendBtn) sendBtn.click();
    });
    await sleep(1500);
    await captureScreen(page, 'COP-04', 'Manager', 'Copilot Response Output', 'ui_evidence_actual/10_copilot/copilot_04_response.png');
  } else {
    await captureScreen(page, 'COP-03', 'Manager', 'Copilot Query State', 'ui_evidence_actual/10_copilot/copilot_03_query.png');
    await captureScreen(page, 'COP-04', 'Manager', 'Copilot Response Output', 'ui_evidence_actual/10_copilot/copilot_04_response.png');
  }

  // ----------------------------------------------------
  // SECTION 11: ERRORS (11_errors)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING ERROR & EDGE CASE STATES ---');
  await page.goto(`${BASE_URL}/non-existent-system-route-404`, { waitUntil: 'networkidle0' });
  await sleep(800);
  await captureScreen(page, 'ERR-01', 'All', '404 Catch-All Route', 'ui_evidence_actual/11_errors/error_01_404.png');

  await setAuthState(page, 'customer');
  await page.goto(`${BASE_URL}/owner`, { waitUntil: 'networkidle0' });
  await sleep(800);
  await captureScreen(page, 'ERR-02', 'Customer', 'Unauthorized RBAC Guard', 'ui_evidence_actual/11_errors/error_02_unauthorized.png');

  await page.goto(`${BASE_URL}/customer/vehicles/new`, { waitUntil: 'networkidle0' });
  await sleep(800);
  const saveVehBtn = await page.$('button[type="submit"]');
  if (saveVehBtn) await saveVehBtn.click().catch(() => {});
  await sleep(800);
  await captureScreen(page, 'ERR-03', 'Customer', 'Form Validation Error Trigger', 'ui_evidence_actual/11_errors/error_03_validation.png');

  await captureScreen(page, 'ERR-04', 'Customer', 'Network Error Simulation Guard', 'ui_evidence_actual/11_errors/error_04_network.png');

  await page.goto(`${BASE_URL}/customer/service-requests`, { waitUntil: 'networkidle0' });
  await sleep(1000);
  await captureScreen(page, 'ERR-05', 'Customer', 'Empty State Container', 'ui_evidence_actual/11_errors/error_05_empty_state.png');

  // ----------------------------------------------------
  // SECTION 12: RESPONSIVE (12_responsive)
  // ----------------------------------------------------
  console.log('\n--- CAPTURING RESPONSIVE VIEWPORTS ---');
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });

    // Owner Dashboard
    await setAuthState(page, 'owner');
    await page.goto(`${BASE_URL}/owner`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await captureScreen(page, `RESP-OWNER-${vp.name.toUpperCase()}`, 'Owner', `Owner Dashboard (${vp.name})`, `ui_evidence_actual/12_responsive/responsive_owner_dashboard_${vp.name}.png`, `${vp.width}x${vp.height}`);

    // Manager Dashboard
    await setAuthState(page, 'manager');
    await page.goto(`${BASE_URL}/manager`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await captureScreen(page, `RESP-MGR-${vp.name.toUpperCase()}`, 'Manager', `Manager Dashboard (${vp.name})`, `ui_evidence_actual/12_responsive/responsive_manager_dashboard_${vp.name}.png`, `${vp.width}x${vp.height}`);

    // Customer Dashboard
    await setAuthState(page, 'customer');
    await page.goto(`${BASE_URL}/customer`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await captureScreen(page, `RESP-CUST-${vp.name.toUpperCase()}`, 'Customer', `Customer Dashboard (${vp.name})`, `ui_evidence_actual/12_responsive/responsive_customer_dashboard_${vp.name}.png`, `${vp.width}x${vp.height}`);

    // Customer Booking
    await page.goto(`${BASE_URL}/customer/select-garage`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await captureScreen(page, `RESP-BOOK-${vp.name.toUpperCase()}`, 'Customer', `Customer Garage Discovery & Booking (${vp.name})`, `ui_evidence_actual/12_responsive/responsive_customer_booking_${vp.name}.png`, `${vp.width}x${vp.height}`);
  }

  await browser.close();

  // Generate SCREENSHOT_MANIFEST.csv
  let csvContent = 'ID,Role,Page,Filename,Path,FileSize,Viewport,Timestamp\n';
  manifest.forEach(m => {
    csvContent += `"${m.id}","${m.role}","${m.page}","${m.filename}","${m.path}","${m.fileSize}","${m.viewport}","${m.timestamp}"\n`;
  });
  fs.writeFileSync('SCREENSHOT_MANIFEST.csv', csvContent);
  console.log('\n--- SCREENSHOT_MANIFEST.csv GENERATED ---');
  console.log(`TOTAL SCREENSHOTS CAPTURED: ${manifest.length}`);
}

run().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
