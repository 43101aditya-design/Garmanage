const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/firebaseAuth');

// GET /api/services - Returns list of active services from the catalog
router.get('/', async (req, res, next) => {
    try {
        const [services] = await req.db.query(
            `SELECT id, name, description, base_price, estimated_duration_minutes, created_at 
             FROM Service 
             WHERE (deleted_at IS NULL)
             ORDER BY name ASC`
        );
        res.json(services);
    } catch (error) {
        next(error);
    }
});

// GET /api/services/:id - Returns details of a specific service
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [services] = await req.db.query(
            `SELECT id, name, description, base_price, estimated_duration_minutes, created_at 
             FROM Service 
             WHERE id = ? AND (deleted_at IS NULL)`,
            [id]
        );
        if (services.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        res.json(services[0]);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
