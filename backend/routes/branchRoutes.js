const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

// Get all branches (Owner/Admin)
router.get('/', verifyToken, requireRole(['admin']), async (req, res, next) => {
    try {
        const [branches] = await req.db.query('SELECT * FROM Branch WHERE deleted_at IS NULL');
        res.json(branches);
    } catch (error) {
        next(error);
    }
});

// Create Branch (Owner/Admin)
router.post('/', verifyToken, requireRole(['admin']), async (req, res, next) => {
    try {
        const { name, address, phone } = req.body;
        const id = uuidv4();
        
        await req.db.query(
            'INSERT INTO Branch (id, name, address, phone) VALUES (?, ?, ?, ?)',
            [id, name, address, phone]
        );
        
        res.status(201).json({ id, name, address, phone, is_active: true });
    } catch (error) {
        next(error);
    }
});

// Get branch performance (Owner/Admin)
router.get('/performance', verifyToken, requireRole(['admin']), async (req, res, next) => {
    try {
        const [performance] = await req.db.query('SELECT * FROM View_Branch_Performance');
        res.json(performance);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
