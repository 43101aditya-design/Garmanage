const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/auditLogger');

exports.getMembers = async (req, res, next) => {
    try {
        const { id } = req.params; 
        const members = await req.db.query(`
            SELECT u.id, u.name, u.email, u.phone, r.name as role_name, gm.status, gm.id as membership_id
            FROM Garage_Membership gm
            JOIN User_Account u ON gm.user_id = u.id
            JOIN Role r ON gm.role_id = r.id
            WHERE gm.garage_id = ?
        `, [id]);
        
        res.json({ members });
    } catch (error) {
        next(error);
    }
};

exports.addManager = async (req, res, next) => {
    try {
        const { id } = req.params; 
        const { email } = req.body;
        
        const users = await req.db.query('SELECT id, name FROM User_Account WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found with this email' });
        }
        const user = users[0];
        
        const roles = await req.db.query("SELECT id FROM Role WHERE name = 'manager'");
        let roleId = roles.length > 0 ? roles[0].id : null;
        
        if (!roleId) {
            roleId = uuidv4();
            await req.db.query("INSERT INTO Role (id, name, description) VALUES (?, 'manager', 'Manager role')", [roleId]);
        }
        
        const existing = await req.db.query('SELECT id FROM Garage_Membership WHERE user_id = ? AND garage_id = ?', [user.id, id]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User is already a member of this garage' });
        }
        
        const membershipId = uuidv4();
        await req.db.query(
            "INSERT INTO Garage_Membership (id, user_id, garage_id, role_id, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
            [membershipId, user.id, id, roleId]
        );
        
        await logAudit(req.db, {
            userId: req.user.id,
            garageId: id,
            action: 'INSERT',
            entityType: 'Garage_Membership',
            entityId: membershipId,
            metadata: { added_user: user.id, role: 'manager' }
        });
        
        res.status(201).json({ message: 'Manager added successfully' });
    } catch (error) {
        next(error);
    }
};

exports.updateMember = async (req, res, next) => {
    try {
        const { id, memberId } = req.params; 
        const { status } = req.body;
        
        if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        await req.db.query('UPDATE Garage_Membership SET status = ? WHERE id = ? AND garage_id = ?', [status, memberId, id]);
        
        await logAudit(req.db, {
            userId: req.user.id,
            garageId: id,
            action: 'UPDATE',
            entityType: 'Garage_Membership',
            entityId: memberId,
            metadata: { status }
        });
        
        res.json({ message: `Membership status updated to ${status}` });
    } catch (error) {
        next(error);
    }
};

exports.removeMember = async (req, res, next) => {
    try {
        const { id, memberId } = req.params; 
        
        await req.db.query("UPDATE Garage_Membership SET status = 'INACTIVE' WHERE id = ? AND garage_id = ?", [memberId, id]);
        
        await logAudit(req.db, {
            userId: req.user.id,
            garageId: id,
            action: 'SOFT_DELETE',
            entityType: 'Garage_Membership',
            entityId: memberId,
            metadata: { removed_membership: memberId }
        });
        
        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        next(error);
    }
};
