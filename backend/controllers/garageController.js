const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');
const { getRecommendedGarages } = require('../services/recommendationService');

// Helper to resolve Customer ID from user token if role is customer
const getCustomerIdFromReq = async (req) => {
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

// GET /api/garages/recommendations (or /api/garages/nearby)
// DBMS-driven spatial and personalized ranking
exports.getRecommendations = async (req, res, next) => {
    try {
        const customerId = await getCustomerIdFromReq(req);
        const {
            lat,
            latitude,
            lng,
            lon,
            longitude,
            radius,
            radiusKm,
            area,
            city,
            service_id,
            serviceId,
            search,
            limit,
            offset,
            require_service
        } = req.query;

        const effectiveLat = latitude || lat;
        const effectiveLng = longitude || lng || lon;
        const effectiveRadius = radiusKm || radius;
        const effectiveService = serviceId || service_id;
        const requireService = require_service === 'true' || require_service === '1';

        const garages = await getRecommendedGarages(req.db, {
            latitude: effectiveLat,
            longitude: effectiveLng,
            radiusKm: effectiveRadius,
            area,
            city,
            serviceId: effectiveService,
            search,
            customerId,
            limit: parseInt(limit, 10) || 20,
            offset: parseInt(offset, 10) || 0,
            requireService
        });

        res.json({
            count: garages.length,
            garages,
            query_context: {
                area: area || null,
                city: city || null,
                service_id: effectiveService || null,
                has_coordinates: Boolean(effectiveLat && effectiveLng),
                radius_km: effectiveRadius || 50
            }
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
};

exports.getAllGarages = async (req, res, next) => {
    try {
        const { role, memberships } = req.user;
        let garages;
        
        if (role === 'customer') {
            const [rows] = await req.db.query("SELECT * FROM Garage WHERE status = 'ACTIVE' AND deleted_at IS NULL ORDER BY name");
            garages = rows;
        } else {
            const garageIds = memberships ? memberships.map(m => m.garage_id) : [];
            if (garageIds.length === 0) {
                garages = [];
            } else {
                const placeholders = garageIds.map(() => '?').join(',');
                const [rows] = await req.db.query(`SELECT * FROM Garage WHERE id IN (${placeholders}) AND deleted_at IS NULL ORDER BY name`, garageIds);
                garages = rows;
            }
        }
        
        res.json({ garages });
    } catch (error) {
        next(error);
    }
};

exports.getGarageById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [garages] = await req.db.query('SELECT * FROM Garage WHERE id = ? AND deleted_at IS NULL', [id]);
        
        if (garages.length === 0) {
            return res.status(404).json({ error: 'Garage not found' });
        }
        
        const garage = garages[0];
        
        const [memberCountResult] = await req.db.query(
            "SELECT COUNT(*) as count FROM Garage_Membership WHERE garage_id = ? AND status = 'ACTIVE'",
            [id]
        );
        garage.member_count = memberCountResult[0].count;

        // Fetch offered services
        const [services] = await req.db.query(`
            SELECT s.id, s.name, s.description, COALESCE(gs.price, s.base_price) as price, s.estimated_duration_minutes, gs.is_available
            FROM Garage_Service gs
            JOIN Service s ON gs.service_id = s.id
            WHERE gs.garage_id = ? AND s.deleted_at IS NULL
            ORDER BY s.name
        `, [id]);
        garage.services = services;
        
        res.json({ garage });
    } catch (error) {
        next(error);
    }
};

exports.createGarage = async (req, res, next) => {
    try {
        const newGarageId = uuidv4();
        const { 
            name, 
            description, 
            address, 
            area, 
            city, 
            state, 
            postal_code, 
            pincode, 
            latitude, 
            longitude, 
            phone, 
            email, 
            garage_type 
        } = req.body;
        
        if (!name || !address) {
            return res.status(400).json({ error: 'Garage name and address are required' });
        }

        const effectivePincode = pincode || postal_code || null;
        const effectiveLat = latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : 19.0760;
        const effectiveLng = longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : 72.8777;

        await req.db.query(`
            INSERT INTO Garage (
                id, name, description, address, area, city, state, postal_code, pincode, 
                latitude, longitude, location, phone, email, garage_type, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ST_SRID(POINT(?, ?), 4326), ?, ?, ?, 'ACTIVE')
        `, [
            newGarageId, name, description || null, address, area || null, city || null, state || null, 
            effectivePincode, effectivePincode, effectiveLat, effectiveLng, effectiveLng, effectiveLat, 
            phone || null, email || null, garage_type || 'multi-brand'
        ]);
        
        // Auto-assign default services to new garage
        const [defaultServices] = await req.db.query("SELECT id, base_price FROM Service WHERE deleted_at IS NULL");
        for (const s of defaultServices) {
            await req.db.query(`
                INSERT IGNORE INTO Garage_Service (id, garage_id, service_id, price, is_available)
                VALUES (UUID(), ?, ?, ?, TRUE)
            `, [newGarageId, s.id, s.base_price]);
        }

        const [roles] = await req.db.query("SELECT id FROM Role WHERE name = 'owner'");
        let roleId = roles.length > 0 ? roles[0].id : null;
        
        if (!roleId) {
            roleId = uuidv4();
            await req.db.query("INSERT INTO Role (id, name, description) VALUES (?, 'owner', 'Owner role')", [roleId]);
        }
        
        const membershipId = uuidv4();
        await req.db.query(
            "INSERT INTO Garage_Membership (id, user_id, garage_id, role_id, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
            [membershipId, req.user.id, newGarageId, roleId]
        );
        
        await logAudit(req.db, {
            userId: req.user.id,
            garageId: newGarageId,
            action: 'INSERT',
            entityType: 'Garage',
            entityId: newGarageId,
            metadata: { name, address, area, city, latitude: effectiveLat, longitude: effectiveLng }
        });
        
        res.status(201).json({ message: 'Garage created successfully', id: newGarageId });
    } catch (error) {
        next(error);
    }
};

exports.updateGarage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            description, 
            address, 
            area, 
            city, 
            state, 
            postal_code, 
            pincode, 
            latitude, 
            longitude, 
            phone, 
            email, 
            garage_type 
        } = req.body;
        
        const effectivePincode = pincode || postal_code || null;
        const hasCoords = latitude !== undefined && latitude !== null && latitude !== '' && longitude !== undefined && longitude !== null && longitude !== '';
        const effectiveLat = hasCoords ? parseFloat(latitude) : null;
        const effectiveLng = hasCoords ? parseFloat(longitude) : null;

        if (hasCoords) {
            await req.db.query(`
                UPDATE Garage 
                SET name = ?, description = ?, address = ?, area = ?, city = ?, state = ?, 
                    postal_code = ?, pincode = ?, latitude = ?, longitude = ?, 
                    location = ST_SRID(POINT(?, ?), 4326), phone = ?, email = ?, garage_type = ?
                WHERE id = ?
            `, [
                name, description || null, address, area || null, city || null, state || null, 
                effectivePincode, effectivePincode, effectiveLat, effectiveLng, 
                effectiveLng, effectiveLat, phone || null, email || null, garage_type || 'multi-brand', id
            ]);
        } else {
            await req.db.query(`
                UPDATE Garage 
                SET name = ?, description = ?, address = ?, area = ?, city = ?, state = ?, 
                    postal_code = ?, pincode = ?, phone = ?, email = ?, garage_type = ?
                WHERE id = ?
            `, [
                name, description || null, address, area || null, city || null, state || null, 
                effectivePincode, effectivePincode, phone || null, email || null, garage_type || 'multi-brand', id
            ]);
        }
        
        await logAudit(req.db, {
            userId: req.user.id,
            garageId: id,
            action: 'UPDATE',
            entityType: 'Garage',
            entityId: id,
            metadata: { name, address, area, city, latitude: effectiveLat, longitude: effectiveLng }
        });
        
        res.json({ message: 'Garage updated successfully' });
    } catch (error) {
        next(error);
    }
};

exports.updateGarageStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        await req.db.query('UPDATE Garage SET status = ? WHERE id = ?', [status, id]);
        
        await logAudit(req.db, {
            userId: req.user.id,
            garageId: id,
            action: 'UPDATE',
            entityType: 'Garage',
            entityId: id,
            metadata: { status }
        });
        
        res.json({ message: `Garage status updated to ${status}` });
    } catch (error) {
        next(error);
    }
};

// GET /api/garages/:id/services
exports.getGarageServices = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [services] = await req.db.query(`
            SELECT 
                s.id, 
                s.name, 
                s.description, 
                COALESCE(gs.price, s.base_price) as price, 
                s.estimated_duration_minutes, 
                gs.is_available
            FROM Garage_Service gs
            JOIN Service s ON gs.service_id = s.id
            WHERE gs.garage_id = ? AND s.deleted_at IS NULL
            ORDER BY s.name
        `, [id]);
        res.json({ services });
    } catch (error) {
        next(error);
    }
};

// POST /api/garages/:id/services
exports.setGarageServices = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { services } = req.body; // Array of { service_id, price, is_available }

        if (!Array.isArray(services)) {
            return res.status(400).json({ error: 'Services array is required' });
        }

        for (const item of services) {
            await req.db.query(`
                INSERT INTO Garage_Service (id, garage_id, service_id, price, is_available)
                VALUES (UUID(), ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE price = VALUES(price), is_available = VALUES(is_available)
            `, [id, item.service_id, item.price || null, item.is_available !== false]);
        }

        res.json({ message: 'Garage services updated successfully' });
    } catch (error) {
        next(error);
    }
};

