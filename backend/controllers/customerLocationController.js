const { validateCoordinates } = require('../services/recommendationService');

// Helper to resolve customer ID from req.user
const getCustomerId = async (req) => {
  if (req.user && req.user.customer_id) return req.user.customer_id;
  if (req.user && req.user.email) {
    const [rows] = await req.db.query('SELECT id FROM Customer WHERE email = ? AND deleted_at IS NULL LIMIT 1', [req.user.email]);
    if (rows.length > 0) return rows[0].id;
  }
  if (req.user && req.user.id) {
    const [rows] = await req.db.query('SELECT reference_id FROM User_Account WHERE id = ? LIMIT 1', [req.user.id]);
    if (rows.length > 0 && rows[0].reference_id) return rows[0].reference_id;
  }
  return null;
};

// GET /api/customers/me/location
exports.getCustomerLocation = async (req, res, next) => {
  try {
    const customerId = await getCustomerId(req);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const [rows] = await req.db.query(`
      SELECT id, address, area, city, state, pincode, latitude, longitude
      FROM Customer
      WHERE id = ? AND deleted_at IS NULL
    `, [customerId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const c = rows[0];
    res.json({
      location: {
        address: c.address,
        area: c.area,
        city: c.city,
        state: c.state,
        pincode: c.pincode,
        latitude: c.latitude ? parseFloat(c.latitude) : null,
        longitude: c.longitude ? parseFloat(c.longitude) : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/customers/me/location
exports.updateCustomerLocation = async (req, res, next) => {
  try {
    const customerId = await getCustomerId(req);
    if (!customerId) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const { address, area, city, state, pincode, latitude, longitude } = req.body;
    const hasCoords = latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null;

    if (hasCoords) {
      const coordCheck = validateCoordinates(latitude, longitude);
      if (coordCheck.error) {
        return res.status(400).json({ error: coordCheck.error });
      }

      await req.db.query(`
        UPDATE Customer
        SET 
          address = COALESCE(?, address),
          area = COALESCE(?, area),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          pincode = COALESCE(?, pincode),
          latitude = ?,
          longitude = ?,
          location = ST_SRID(POINT(?, ?), 4326)
        WHERE id = ?
      `, [
        address || null, area || null, city || null, state || null, pincode || null,
        coordCheck.lat, coordCheck.lng, coordCheck.lng, coordCheck.lat, customerId
      ]);
    } else {
      await req.db.query(`
        UPDATE Customer
        SET 
          address = COALESCE(?, address),
          area = COALESCE(?, area),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          pincode = COALESCE(?, pincode)
        WHERE id = ?
      `, [
        address || null, area || null, city || null, state || null, pincode || null, customerId
      ]);
    }

    res.json({ message: 'Customer location updated successfully' });
  } catch (error) {
    next(error);
  }
};
