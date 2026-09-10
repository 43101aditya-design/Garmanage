const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');

// Helper to reliably resolve Customer.id for the authenticated user
const getCustomerId = async (req) => {
    if (req.user && req.user.customer_id) {
        return req.user.customer_id;
    }
    if (req.user && req.user.email) {
        const [rows] = await req.db.query('SELECT id FROM Customer WHERE email = ? AND deleted_at IS NULL', [req.user.email]);
        if (rows.length > 0) return rows[0].id;
    }
    if (req.user && req.user.id) {
        const [rows] = await req.db.query('SELECT reference_id FROM User_Account WHERE id = ?', [req.user.id]);
        if (rows.length > 0 && rows[0].reference_id) return rows[0].reference_id;
    }
    return null;
};

// GET /api/customer/saved-garages
// Retrieves all saved garages for the authenticated customer
exports.getSavedGarages = async (req, res, next) => {
    try {
        const customerId = await getCustomerId(req);
        if (!customerId) {
            return res.json([]);
        }

        const query = `
            SELECT 
                sg.id AS saved_id,
                sg.created_at AS saved_at,
                g.id,
                g.name,
                g.description,
                g.address,
                g.city,
                g.state,
                g.postal_code,
                g.phone,
                g.email,
                g.garage_type,
                g.logo_url,
                g.status
            FROM Saved_Garage sg
            JOIN Garage g ON sg.garage_id = g.id
            WHERE sg.customer_id = ? 
              AND (g.deleted_at IS NULL)
              AND g.status = 'ACTIVE'
            ORDER BY sg.created_at DESC
        `;

        const [garages] = await req.db.query(query, [customerId]);
        res.json(garages);
    } catch (error) {
        next(error);
    }
};

// POST /api/customer/saved-garages
// Body: { garage_id: string }
exports.saveGarage = async (req, res, next) => {
    try {
        const garageId = req.body.garage_id || req.params.garageId;
        if (!garageId) {
            return res.status(400).json({ error: 'Garage ID is required' });
        }

        const customerId = await getCustomerId(req);
        if (!customerId) {
            return res.status(404).json({ error: 'Customer profile not found for this account' });
        }

        // Validate garage exists and is active
        const [garages] = await req.db.query(
            'SELECT id, name FROM Garage WHERE id = ? AND status = "ACTIVE" AND deleted_at IS NULL',
            [garageId]
        );
        if (garages.length === 0) {
            return res.status(404).json({ error: 'Garage not found or inactive' });
        }

        // Check if already saved (idempotent)
        const [existing] = await req.db.query(
            'SELECT id FROM Saved_Garage WHERE customer_id = ? AND garage_id = ?',
            [customerId, garageId]
        );

        if (existing.length > 0) {
            return res.status(200).json({
                message: 'Garage is already in your saved list',
                id: existing[0].id,
                isSaved: true
            });
        }

        const id = uuidv4();
        await req.db.query(
            'INSERT INTO Saved_Garage (id, customer_id, garage_id) VALUES (?, ?, ?)',
            [id, customerId, garageId]
        );

        await logAudit(req, 'INSERT', 'Saved_Garage', id, null, { customer_id: customerId, garage_id: garageId });

        res.status(201).json({
            message: 'Garage saved successfully',
            id,
            isSaved: true,
            garage_name: garages[0].name
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(200).json({ message: 'Garage already saved', isSaved: true });
        }
        next(error);
    }
};

// DELETE /api/customer/saved-garages/:garageId
exports.unsaveGarage = async (req, res, next) => {
    try {
        const garageId = req.params.garageId || req.body.garage_id;
        if (!garageId) {
            return res.status(400).json({ error: 'Garage ID is required' });
        }

        const customerId = await getCustomerId(req);
        if (!customerId) {
            return res.status(404).json({ error: 'Customer profile not found' });
        }

        const [result] = await req.db.query(
            'DELETE FROM Saved_Garage WHERE customer_id = ? AND garage_id = ?',
            [customerId, garageId]
        );

        await logAudit(req, 'DELETE', 'Saved_Garage', garageId, null, { customer_id: customerId, garage_id: garageId });

        res.json({
            message: 'Garage removed from saved list',
            success: true,
            isSaved: false,
            affectedRows: result.affectedRows || 0
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/customer/saved-garages/check/:garageId
exports.checkSaved = async (req, res, next) => {
    try {
        const { garageId } = req.params;
        if (!garageId) {
            return res.status(400).json({ error: 'Garage ID is required' });
        }

        const customerId = await getCustomerId(req);
        if (!customerId) {
            return res.json({ isSaved: false });
        }

        const [rows] = await req.db.query(
            'SELECT id FROM Saved_Garage WHERE customer_id = ? AND garage_id = ?',
            [customerId, garageId]
        );

        res.json({ isSaved: rows.length > 0 });
    } catch (error) {
        next(error);
    }
};
