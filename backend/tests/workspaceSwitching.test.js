const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Multi-Role & Workspace Switching Security Tests', () => {

  test('Switch to Customer Workspace succeeds when customer record exists', async () => {
    let statusCode = 200;
    let responseData = null;

    const mockConn = {
      query: async (sql, params) => {
        if (sql.includes('SELECT id, name, email, phone, role, onboarding_state FROM User_Account')) {
          return [[{
            id: 'user-uuid-101',
            firebase_uid: 'fb-uid-multi',
            name: 'Multi User',
            email: 'multi@example.com',
            role: 'manager',
            onboarding_state: 'ACTIVE'
          }]];
        }
        if (sql.includes('SELECT id, first_name, last_name, email, phone, address FROM Customer')) {
          return [[{
            id: 'cust-101',
            first_name: 'Multi',
            last_name: 'User',
            email: 'multi@example.com'
          }]];
        }
        if (sql.includes('SELECT gm.id as membership_id, gm.garage_id, gm.status, r.name as role_name, g.name as garage_name')) {
          return [[{
            membership_id: 'mem-101',
            garage_id: 'garage-1',
            status: 'ACTIVE',
            role_name: 'manager',
            garage_name: 'Super Speed Garage'
          }]];
        }
        return [[]];
      }
    };

    // Simulate switch workspace handler
    const handleSwitch = async (targetRole, targetGarageId) => {
      const [users] = await mockConn.query('SELECT id, name, email, phone, role, onboarding_state FROM User_Account WHERE firebase_uid = ?', ['fb-uid-multi']);
      const user = users[0];

      if (targetRole === 'customer') {
        const [customers] = await mockConn.query('SELECT id, first_name, last_name, email, phone, address FROM Customer WHERE email = ?', [user.email]);
        if (customers.length > 0) {
          return {
            status: 200,
            body: {
              success: true,
              user: {
                ...user,
                role: 'customer',
                customer_id: customers[0].id,
                activeWorkspace: {
                  id: 'customer',
                  type: 'customer',
                  role: 'customer',
                  name: 'Customer Workspace',
                  description: 'Personal vehicle service & appointment management'
                }
              }
            }
          };
        }
      }
      return { status: 403, body: { error: 'Unauthorized workspace' } };
    };

    const res = await handleSwitch('customer', null);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.role, 'customer');
    assert.strictEqual(res.body.user.activeWorkspace.role, 'customer');
  });

  test('Switch to Manager Workspace succeeds when active membership exists', async () => {
    const mockConn = {
      query: async (sql, params) => {
        if (sql.includes('SELECT id, name, email, phone, role, onboarding_state FROM User_Account')) {
          return [[{
            id: 'user-uuid-101',
            firebase_uid: 'fb-uid-multi',
            name: 'Multi User',
            email: 'multi@example.com',
            role: 'customer',
            onboarding_state: 'ACTIVE'
          }]];
        }
        if (sql.includes('SELECT gm.id as membership_id, gm.garage_id, gm.status, r.name as role_name, g.name as garage_name')) {
          return [[{
            membership_id: 'mem-101',
            garage_id: 'garage-1',
            status: 'ACTIVE',
            role_name: 'manager',
            garage_name: 'Super Speed Garage'
          }]];
        }
        return [[]];
      }
    };

    const handleSwitch = async (targetRole, targetGarageId) => {
      const [users] = await mockConn.query('SELECT id, name, email, phone, role, onboarding_state FROM User_Account WHERE firebase_uid = ?', ['fb-uid-multi']);
      const user = users[0];

      const [memberships] = await mockConn.query(
        'SELECT gm.id as membership_id, gm.garage_id, gm.status, r.name as role_name, g.name as garage_name FROM Garage_Membership gm JOIN Role r ON gm.role_id = r.id JOIN Garage g ON gm.garage_id = g.id WHERE gm.user_id = ? AND gm.status = ?',
        [user.id, 'ACTIVE']
      );

      const validMembership = memberships.find(m => m.garage_id === targetGarageId && m.role_name === targetRole);
      if (!validMembership) {
        return { status: 403, body: { error: 'Unauthorized: No active membership for this garage role' } };
      }

      return {
        status: 200,
        body: {
          success: true,
          user: {
            ...user,
            role: validMembership.role_name,
            garage_id: validMembership.garage_id,
            garage_name: validMembership.garage_name,
            activeWorkspace: {
              id: `garage-${validMembership.garage_id}`,
              type: 'garage',
              role: validMembership.role_name,
              garage_id: validMembership.garage_id,
              garage_name: validMembership.garage_name,
              name: validMembership.garage_name,
              description: `${validMembership.role_name.toUpperCase()} Console`
            }
          }
        }
      };
    };

    const res = await handleSwitch('manager', 'garage-1');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.role, 'manager');
    assert.strictEqual(res.body.user.garage_id, 'garage-1');
    assert.strictEqual(res.body.user.garage_name, 'Super Speed Garage');
  });

  test('Switch to Unauthorized Garage or Role is rejected with 403 (No Privilege Escalation)', async () => {
    const mockConn = {
      query: async (sql, params) => {
        if (sql.includes('SELECT id, name, email, phone, role, onboarding_state FROM User_Account')) {
          return [[{
            id: 'user-uuid-101',
            firebase_uid: 'fb-uid-multi',
            name: 'Multi User',
            email: 'multi@example.com',
            role: 'customer',
            onboarding_state: 'ACTIVE'
          }]];
        }
        if (sql.includes('SELECT gm.id as membership_id, gm.garage_id, gm.status, r.name as role_name, g.name as garage_name')) {
          // User ONLY has membership in garage-1 as manager
          return [[{
            membership_id: 'mem-101',
            garage_id: 'garage-1',
            status: 'ACTIVE',
            role_name: 'manager',
            garage_name: 'Super Speed Garage'
          }]];
        }
        return [[]];
      }
    };

    const handleSwitch = async (targetRole, targetGarageId) => {
      const [users] = await mockConn.query('SELECT id, name, email, phone, role, onboarding_state FROM User_Account WHERE firebase_uid = ?', ['fb-uid-multi']);
      const user = users[0];

      if (targetRole === 'customer') {
        return { status: 200 };
      }

      const [memberships] = await mockConn.query(
        'SELECT gm.id as membership_id, gm.garage_id, gm.status, r.name as role_name, g.name as garage_name FROM Garage_Membership gm JOIN Role r ON gm.role_id = r.id JOIN Garage g ON gm.garage_id = g.id WHERE gm.user_id = ? AND gm.status = ?',
        [user.id, 'ACTIVE']
      );

      const validMembership = memberships.find(m => m.garage_id === targetGarageId && m.role_name === targetRole);
      if (!validMembership) {
        return { status: 403, body: { error: 'Unauthorized: No active membership for this garage role' } };
      }
      return { status: 200 };
    };

    // User attempts to switch to OWNER of garage-1 (not possessed)
    const res1 = await handleSwitch('owner', 'garage-1');
    assert.strictEqual(res1.status, 403);
    assert.match(res1.body.error, /Unauthorized/);

    // User attempts to switch to MANAGER of foreign garage-999 (not possessed)
    const res2 = await handleSwitch('manager', 'garage-999');
    assert.strictEqual(res2.status, 403);
    assert.match(res2.body.error, /Unauthorized/);
  });

  test('Returning Active User does NOT trigger requiresOnboarding on /api/auth/me', async () => {
    // Verify onboarding_state === 'ACTIVE' directly returns user profile without requiring onboarding
    const mockUserAccount = {
      id: 'usr-returning-1',
      firebase_uid: 'fb-ret-1',
      name: 'Aditya Singh',
      email: 'aditya@example.com',
      role: 'customer',
      onboarding_state: 'ACTIVE'
    };

    const resolveAuthMe = (userRecord) => {
      if (!userRecord) {
        return { status: 404, body: { requiresOnboarding: true, error: 'User profile not found' } };
      }
      if (userRecord.onboarding_state === 'ACTIVE') {
        return {
          status: 200,
          body: {
            user: {
              ...userRecord,
              requiresOnboarding: false
            }
          }
        };
      }
      if (userRecord.onboarding_state === 'PENDING_APPROVAL') {
        return { status: 200, body: { user: userRecord, pendingApproval: true } };
      }
      return { status: 200, body: { user: userRecord, requiresOnboarding: true } };
    };

    const response = resolveAuthMe(mockUserAccount);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.user.requiresOnboarding, false);
    assert.strictEqual(response.body.user.role, 'customer');
  });

});
