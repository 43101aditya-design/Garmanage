const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');

exports.getAllGarages = async (req, res, next) => {
    try {
        const { role, memberships } = req.user;
        let garages;
        
        if (role === 'customer') {
            garages = await req.db.query("SELECT * FROM Garage WHERE status = 'ACTIVE'");
        } else {
            const garageIds = memberships.map(m => m.garage_id);
            if (garageIds.length === 0) {
                garages = [];
            } else {
                const placeholders = garageIds.map(() => '?').join(',');
                garages = await req.db.query(`SELECT * FROM Garage WHERE id IN (${placeholders})`, garageIds);
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
        const garages = await req.db.query('SELECT * FROM Garage WHERE id = ?', [id]);
        
        if (garages.length === 0) {
            return res.status(404).json({ error: 'Garage not found' });
        }
        
        const garage = garages[0];
        
        const memberCountResult = await req.db.query(
            "SELECT COUNT(*) as count FROM Garage_Membership WHERE garage_id = ? AND status = 'ACTIVE'",
            [id]
        );
        garage.member_count = memberCountResult[0].count;
        
        res.json({ garage });
    } catch (error) {
        next(error);
    }
};

exports.createGarage = async (req, res, next) => {
    try {
        const newGarageId = uuidv4();
        const { name, address, contact_email, contact_phone } = req.body;
        
        await req.db.query(
            'INSERT INTO Garage (id, name, address, contact_email, contact_phone, status) VALUES (?, ?, ?, ?, ?, ?)',
            [newGarageId, name, address, contact_email, contact_phone, 'ACTIVE']
        );
        
        const roles = await req.db.query("SELECT id FROM Role WHERE name = 'owner'");
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
            metadata: { name, address }
        });
        
        res.status(201).json({ message: 'Garage created successfully', id: newGarageId });
    } catch (error) {
        next(error);
    }
};

exports.updateGarage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, address, contact_email, contact_phone } = req.body;
        
        await req.db.query(
            'UPDATE Garage SET name = ?, address = ?, contact_email = ?, contact_phone = ? WHERE id = ?',
            [name, address, contact_email, contact_phone, id]
        );
        
        await logAudit(req.db, {
            userId: req.user.id,
            garageId: id,
            action: 'UPDATE',
            entityType: 'Garage',
            entityId: id,
            metadata: { updated_fields: ['name', 'address', 'contact_email', 'contact_phone'] }
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
