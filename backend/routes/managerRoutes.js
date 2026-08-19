const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Get all managers (Owner/Admin)
router.get('/', verifyToken, requireRole(['admin']), async (req, res, next) => {
    try {
        const [managers] = await req.db.query(`
            SELECT m.*, b.name as branch_name, u.email, u.username
            FROM Manager m
            JOIN Branch b ON m.branch_id = b.id
            JOIN User_Account u ON m.user_account_id = u.id
            WHERE m.deleted_at IS NULL
        `);
        res.json(managers);
    } catch (error) {
        next(error);
    }
});

// Create a Manager
router.post('/', verifyToken, requireRole(['admin']), async (req, res, next) => {
    let connection;
    try {
        const { first_name, last_name, phone, branch_id, email, username, password } = req.body;
        
        connection = await req.db.getConnection();
        await connection.beginTransaction();
        
        // 1. Create User_Account
        const userId = uuidv4();
        const hash = await bcrypt.hash(password, 10);
        
        await connection.query(
            'INSERT INTO User_Account (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            [userId, username, email, hash, 'manager']
        );
        
        // 2. Create Manager Profile
        const managerId = uuidv4();
        await connection.query(
            'INSERT INTO Manager (id, user_account_id, branch_id, first_name, last_name, phone, hire_date) VALUES (?, ?, ?, ?, ?, ?, CURDATE())',
            [managerId, userId, branch_id, first_name, last_name, phone]
        );
        
        // Update user account reference
        await connection.query('UPDATE User_Account SET reference_id = ? WHERE id = ?', [managerId, userId]);
        
        await connection.commit();
        connection.release();
        res.status(201).json({ id: managerId, message: 'Manager created successfully' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        next(error);
    }
});

module.exports = router;
