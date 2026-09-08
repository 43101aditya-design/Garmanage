const { v4: uuidv4 } = require('uuid');

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'IG-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET /api/garages/:id/join-requests
exports.listJoinRequests = async (req, res) => {
  try {
    const garageId = req.params.id;
    // Verify requester is owner of this garage
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await req.db.query(
      `SELECT gjr.id, gjr.requested_role, gjr.status, gjr.message, gjr.created_at,
              ua.name AS requester_name, ua.email AS requester_email, ua.id AS requester_user_id
       FROM Garage_Join_Request gjr
       JOIN User_Account ua ON gjr.requester_id = ua.id
       WHERE gjr.garage_id = ? AND gjr.status = 'PENDING'
       ORDER BY gjr.created_at ASC`,
      [garageId]
    );
    res.json({ requests: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list join requests' });
  }
};

// POST /api/garages/:id/join-requests/:reqId/approve
exports.approveJoinRequest = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { id: garageId, reqId } = req.params;
  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();

    // Get request
    const [reqs] = await conn.query(
      "SELECT * FROM Garage_Join_Request WHERE id = ? AND garage_id = ? AND status = 'PENDING'",
      [reqId, garageId]
    );
    if (reqs.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found or already resolved' });
    }
    const joinReq = reqs[0];

    // Do NOT allow promoting to owner through this flow
    if (joinReq.requested_role === 'owner') {
      await conn.rollback();
      return res.status(403).json({ error: 'Cannot approve owner role via join request' });
    }

    // Get role id
    const [roleRows] = await conn.query('SELECT id FROM Role WHERE name = ? LIMIT 1', [joinReq.requested_role]);
    if (roleRows.length === 0) throw new Error('Role not found');
    const roleId = roleRows[0].id;

    // Create Garage_Membership (insert or update if previously inactive)
    const [existingMembership] = await conn.query(
      'SELECT id FROM Garage_Membership WHERE user_id = ? AND garage_id = ?',
      [joinReq.requester_id, garageId]
    );
    if (existingMembership.length > 0) {
      await conn.query(
        "UPDATE Garage_Membership SET role_id = ?, status = 'ACTIVE' WHERE user_id = ? AND garage_id = ?",
        [roleId, joinReq.requester_id, garageId]
      );
    } else {
      const membershipId = uuidv4();
      await conn.query(
        "INSERT INTO Garage_Membership (id, user_id, garage_id, role_id, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
        [membershipId, joinReq.requester_id, garageId, roleId]
      );
    }

    // Update User_Account role + onboarding_state
    await conn.query(
      "UPDATE User_Account SET role = ?, onboarding_state = 'ACTIVE' WHERE id = ?",
      [joinReq.requested_role, joinReq.requester_id]
    );

    // Mark request as approved
    await conn.query(
      "UPDATE Garage_Join_Request SET status = 'APPROVED', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [req.user.id, reqId]
    );

    await conn.commit();
    res.json({ success: true, message: `User approved as ${joinReq.requested_role}` });
  } catch (e) {
    await conn.rollback();
    console.error('[approveJoinRequest]', e);
    res.status(500).json({ error: e.message || 'Failed to approve request' });
  } finally {
    conn.release();
  }
};

// POST /api/garages/:id/join-requests/:reqId/reject
exports.rejectJoinRequest = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id: garageId, reqId } = req.params;

  try {
    const [result] = await req.db.query(
      "UPDATE Garage_Join_Request SET status = 'REJECTED', reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND garage_id = ? AND status = 'PENDING'",
      [req.user.id, reqId, garageId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Request not found' });

    // Reset user onboarding_state if no more pending requests
    const [req1] = await req.db.query('SELECT requester_id FROM Garage_Join_Request WHERE id = ?', [reqId]);
    if (req1.length > 0) {
      const [pending] = await req.db.query(
        "SELECT COUNT(*) AS cnt FROM Garage_Join_Request WHERE requester_id = ? AND status = 'PENDING'",
        [req1[0].requester_id]
      );
      if (pending[0].cnt === 0) {
        await req.db.query("UPDATE User_Account SET onboarding_state = 'ONBOARDING' WHERE id = ?", [req1[0].requester_id]);
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to reject request' });
  }
};

// POST /api/garages/:id/generate-join-code
exports.generateJoinCode = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const garageId = req.params.id;

  try {
    let code, unique = false;
    while (!unique) {
      code = generateJoinCode();
      const [existing] = await req.db.query('SELECT id FROM Garage WHERE join_code = ?', [code]);
      if (existing.length === 0) unique = true;
    }
    await req.db.query('UPDATE Garage SET join_code = ? WHERE id = ?', [code, garageId]);
    res.json({ join_code: code });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to generate join code' });
  }
};

// GET /api/garages/:id/join-code
exports.getJoinCode = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const garageId = req.params.id;

  try {
    const [rows] = await req.db.query('SELECT join_code FROM Garage WHERE id = ?', [garageId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Garage not found' });
    res.json({ join_code: rows[0].join_code });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get join code' });
  }
};
