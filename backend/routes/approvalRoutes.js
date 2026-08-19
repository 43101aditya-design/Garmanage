const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

// Get all approval requests (Owner/Admin only sees all, Manager sees their own branch)
router.get('/', verifyToken, requireRole(['admin', 'manager']), async (req, res, next) => {
    try {
        let query = `
            SELECT ar.*, m.first_name as manager_first, m.last_name as manager_last
            FROM Approval_Request ar
            JOIN Manager m ON ar.requested_by = m.id
        `;
        let params = [];

        if (req.user.role === 'manager') {
            // Wait, we need to fetch the manager's ID
            // Actually, we can join with User_Account to get the manager's user_id
            query += ' WHERE m.user_account_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY ar.created_at DESC';

        const [requests] = await req.db.query(query, params);
        res.json(requests);
    } catch (error) {
        next(error);
    }
});

// Request approval (Manager)
router.post('/', verifyToken, requireRole(['manager']), async (req, res, next) => {
    try {
        const { entity_type, entity_id, details } = req.body;
        const id = uuidv4();

        // Get manager ID
        const [mgrs] = await req.db.query('SELECT id FROM Manager WHERE user_account_id = ?', [req.user.id]);
        if (mgrs.length === 0) {
            return res.status(403).json({ error: 'Manager profile not found' });
        }
        
        await req.db.query(
            'INSERT INTO Approval_Request (id, entity_type, entity_id, requested_by, details) VALUES (?, ?, ?, ?, ?)',
            [id, entity_type, entity_id, mgrs[0].id, JSON.stringify(details || {})]
        );
        
        // Update job status to PENDING_APPROVAL if it's a JOB
        if (entity_type === 'JOB') {
            await req.db.query('UPDATE Appointment SET status = ? WHERE id = ?', ['PENDING_APPROVAL', entity_id]);
        }
        
        res.status(201).json({ id, status: 'PENDING' });
    } catch (error) {
        next(error);
    }
});

// Resolve approval (Owner/Admin)
router.put('/:id', verifyToken, requireRole(['admin']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'APPROVED' or 'REJECTED'
        
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        // Use the stored procedure
        await req.db.query('CALL sp_process_approval(?, ?, ?)', [id, status, req.user.id]);
        
        res.json({ success: true, message: `Request ${status}` });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
