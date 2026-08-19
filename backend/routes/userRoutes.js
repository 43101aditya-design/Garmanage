const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/firebaseAuth');

router.get('/me', requireAuth, async (req, res) => {
    res.json({ user: req.user });
});

router.put('/me', requireAuth, async (req, res, next) => {
    try {
        const { name, phone } = req.body;
        await req.db.query('UPDATE User_Account SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id]);
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
