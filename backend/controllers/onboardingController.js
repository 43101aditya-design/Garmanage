const { v4: uuidv4 } = require('uuid');

// Generate a random join code like "IG-7F42K9"
function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'IG-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET /api/onboarding/garages — public list
exports.listGarages = async (req, res) => {
  try {
    const [garages] = await req.db.query(
      `SELECT id, name, description, address, city, state, garage_type, phone, email, status
       FROM Garage WHERE status = 'ACTIVE' AND deleted_at IS NULL ORDER BY name`
    );
    res.json({ garages });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list garages' });
  }
};

// POST /api/onboarding/garage/create
// Creates: Garage + User_Account + Garage_Membership (owner role) — transactional
exports.createGarageAndOwner = async (req, res) => {
  if (!req.firebaseUser) return res.status(401).json({ error: 'Authentication required' });

  const { garageName, garageAddress, garageCity, garageState, garagePhone, garageType, garageDescription } = req.body;
  if (!garageName || !garageAddress) return res.status(400).json({ error: 'Garage name and address are required' });

  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Check if user already has a User_Account
    let userId;
    const [existing] = await conn.query('SELECT id FROM User_Account WHERE firebase_uid = ?', [req.firebaseUser.firebase_uid]);

    if (existing.length > 0) {
      userId = existing[0].id;
    } else {
      // Create User_Account
      userId = uuidv4();
      const baseUsername = req.firebaseUser.email ? req.firebaseUser.email.split('@')[0] : 'user';
      const username = `${baseUsername}_${Math.random().toString(36).substring(2, 7)}`;
      await conn.query(
        `INSERT INTO User_Account (id, firebase_uid, name, email, role, onboarding_state, username, password_hash)
         VALUES (?, ?, ?, ?, 'owner', 'ACTIVE', ?, 'firebase_auth')`,
        [userId, req.firebaseUser.firebase_uid, req.firebaseUser.name || 'User', req.firebaseUser.email, username]
      );
    }

    // 2. Create Garage
    const garageId = uuidv4();
    const joinCode = generateJoinCode();
    await conn.query(
      `INSERT INTO Garage (id, name, description, address, city, state, phone, garage_type, join_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [garageId, garageName, garageDescription || null, garageAddress, garageCity || null, garageState || null, garagePhone || null, garageType || 'general', joinCode]
    );

    // 3. Get owner Role id
    const [ownerRole] = await conn.query("SELECT id FROM Role WHERE name = 'owner' LIMIT 1");
    if (ownerRole.length === 0) throw new Error('Owner role not found in DB');

    // 4. Create Garage_Membership
    const membershipId = uuidv4();
    await conn.query(
      `INSERT INTO Garage_Membership (id, user_id, garage_id, role_id, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')`,
      [membershipId, userId, garageId, ownerRole[0].id]
    );

    // 5. Update User_Account role to owner and set active
    await conn.query(
      `UPDATE User_Account SET role = 'owner', onboarding_state = 'ACTIVE' WHERE id = ?`,
      [userId]
    );

    await conn.commit();

    const [userRecord] = await conn.query(
      `SELECT ua.id, ua.firebase_uid, ua.name, ua.email, ua.role, ua.onboarding_state,
              gm.id AS membership_id, gm.garage_id, r.name AS role_name
       FROM User_Account ua
       JOIN Garage_Membership gm ON ua.id = gm.user_id
       JOIN Role r ON gm.role_id = r.id
       WHERE ua.id = ?`,
      [userId]
    );

    const user = userRecord[0];
    res.json({
      user: {
        id: user.id,
        firebase_uid: user.firebase_uid,
        name: user.name,
        email: user.email,
        role: user.role,
        onboarding_state: user.onboarding_state,
        memberships: userRecord.map(r => ({ garage_id: r.garage_id, role_name: r.role_name, membership_id: r.membership_id }))
      },
      garage: { id: garageId, name: garageName, join_code: joinCode }
    });
  } catch (e) {
    await conn.rollback();
    console.error('[createGarageAndOwner]', e);
    res.status(500).json({ error: e.message || 'Failed to create garage' });
  } finally {
    conn.release();
  }
};

// POST /api/onboarding/customer/create
exports.createCustomerProfile = async (req, res) => {
  if (!req.firebaseUser) return res.status(401).json({ error: 'Authentication required' });

  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id FROM User_Account WHERE firebase_uid = ?', [req.firebaseUser.firebase_uid]);
    if (existing.length > 0) {
      // User already exists — return their profile
      const userId = existing[0].id;
      const [userRecord] = await conn.query('SELECT * FROM User_Account WHERE id = ?', [userId]);
      await conn.commit();
      return res.json({ user: { id: userRecord[0].id, name: userRecord[0].name, email: userRecord[0].email, role: userRecord[0].role, memberships: [] } });
    }

    const [firstName, ...lastParts] = (req.firebaseUser.name || 'User').split(' ');
    const lastName = lastParts.join(' ') || '';

    // Create Customer profile record
    const customerId = uuidv4();
    await conn.query(
      `INSERT INTO Customer (id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?)`,
      [customerId, firstName, lastName, req.firebaseUser.email, req.body.phone || null]
    );

    // Create User_Account
    const userId = uuidv4();
    const baseUsername = req.firebaseUser.email ? req.firebaseUser.email.split('@')[0] : 'user';
    const username = `${baseUsername}_${Math.random().toString(36).substring(2, 7)}`;
    await conn.query(
      `INSERT INTO User_Account (id, firebase_uid, name, email, role, reference_id, onboarding_state, username, password_hash)
       VALUES (?, ?, ?, ?, 'customer', ?, 'ACTIVE', ?, 'firebase_auth')`,
      [userId, req.firebaseUser.firebase_uid, req.firebaseUser.name || 'User', req.firebaseUser.email, customerId, username]
    );

    await conn.commit();
    res.json({
      user: { id: userId, firebase_uid: req.firebaseUser.firebase_uid, name: req.firebaseUser.name, email: req.firebaseUser.email, role: 'customer', memberships: [] }
    });
  } catch (e) {
    await conn.rollback();
    console.error('[createCustomerProfile]', e);
    res.status(500).json({ error: e.message || 'Failed to create customer profile' });
  } finally {
    conn.release();
  }
};

// POST /api/onboarding/join/request
exports.submitJoinRequest = async (req, res) => {
  if (!req.firebaseUser) return res.status(401).json({ error: 'Authentication required' });

  const { joinCode, requestedRole, message } = req.body;
  if (!joinCode || !requestedRole) return res.status(400).json({ error: 'Join code and requested role are required' });
  if (!['manager', 'mechanic'].includes(requestedRole)) return res.status(400).json({ error: 'Invalid role. Must be manager or mechanic' });

  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Find garage by join code
    const [garages] = await conn.query("SELECT id, name FROM Garage WHERE join_code = ? AND status = 'ACTIVE'", [joinCode.trim().toUpperCase()]);
    if (garages.length === 0) return res.status(404).json({ error: 'Invalid join code. No active garage found.' });
    const garage = garages[0];

    // 2. Ensure User_Account exists (create if new Firebase user)
    let userId;
    const [existing] = await conn.query('SELECT id FROM User_Account WHERE firebase_uid = ?', [req.firebaseUser.firebase_uid]);
    if (existing.length > 0) {
      userId = existing[0].id;
    } else {
      userId = uuidv4();
      const baseUsername = req.firebaseUser.email ? req.firebaseUser.email.split('@')[0] : 'user';
      const username = `${baseUsername}_${Math.random().toString(36).substring(2, 7)}`;
      await conn.query(
        `INSERT INTO User_Account (id, firebase_uid, name, email, role, onboarding_state, username, password_hash)
         VALUES (?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, 'firebase_auth')`,
        [userId, req.firebaseUser.firebase_uid, req.firebaseUser.name || 'User', req.firebaseUser.email, requestedRole, username]
      );
    }

    // 3. Check if already a member of this garage
    const [membership] = await conn.query('SELECT id FROM Garage_Membership WHERE user_id = ? AND garage_id = ? AND status = ?', [userId, garage.id, 'ACTIVE']);
    if (membership.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'You are already a member of this garage.' });
    }

    // 4. Check for existing PENDING request
    const [pendingReqs] = await conn.query(
      "SELECT id FROM Garage_Join_Request WHERE requester_id = ? AND garage_id = ? AND status = 'PENDING'",
      [userId, garage.id]
    );
    if (pendingReqs.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'You already have a pending request for this garage.' });
    }

    // 5. Create request
    const requestId = uuidv4();
    await conn.query(
      `INSERT INTO Garage_Join_Request (id, requester_id, garage_id, requested_role, status, message) VALUES (?, ?, ?, ?, 'PENDING', ?)`,
      [requestId, userId, garage.id, requestedRole, message || null]
    );

    // 6. Set user onboarding_state to PENDING_APPROVAL
    await conn.query("UPDATE User_Account SET onboarding_state = 'PENDING_APPROVAL' WHERE id = ?", [userId]);

    await conn.commit();
    res.json({ success: true, request_id: requestId, garage_name: garage.name, status: 'PENDING' });
  } catch (e) {
    await conn.rollback();
    console.error('[submitJoinRequest]', e);
    res.status(500).json({ error: e.message || 'Failed to submit join request' });
  } finally {
    conn.release();
  }
};

// GET /api/onboarding/join/status
exports.getJoinStatus = async (req, res) => {
  if (!req.firebaseUser) return res.status(401).json({ error: 'Authentication required' });

  try {
    const [userRows] = await req.db.query('SELECT id FROM User_Account WHERE firebase_uid = ?', [req.firebaseUser.firebase_uid]);
    if (userRows.length === 0) return res.json({ requests: [] });

    const userId = userRows[0].id;
    const [requests] = await req.db.query(
      `SELECT gjr.id, gjr.requested_role, gjr.status, gjr.message, gjr.created_at, gjr.reviewed_at,
              g.name AS garage_name, g.id AS garage_id, g.city
       FROM Garage_Join_Request gjr
       JOIN Garage g ON gjr.garage_id = g.id
       WHERE gjr.requester_id = ?
       ORDER BY gjr.created_at DESC`,
      [userId]
    );
    res.json({ requests });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get join status' });
  }
};

// POST /api/onboarding/join/cancel
exports.cancelJoinRequest = async (req, res) => {
  if (!req.firebaseUser) return res.status(401).json({ error: 'Authentication required' });

  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ error: 'requestId required' });

  try {
    const [userRows] = await req.db.query('SELECT id FROM User_Account WHERE firebase_uid = ?', [req.firebaseUser.firebase_uid]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userRows[0].id;

    const [result] = await req.db.query(
      "UPDATE Garage_Join_Request SET status = 'CANCELLED' WHERE id = ? AND requester_id = ? AND status = 'PENDING'",
      [requestId, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Request not found or already resolved' });

    // Check if user has other pending requests; if not, reset onboarding_state
    const [pending] = await req.db.query(
      "SELECT COUNT(*) AS cnt FROM Garage_Join_Request WHERE requester_id = ? AND status = 'PENDING'",
      [userId]
    );
    if (pending[0].cnt === 0) {
      await req.db.query("UPDATE User_Account SET onboarding_state = 'ONBOARDING' WHERE id = ?", [userId]);
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
};
