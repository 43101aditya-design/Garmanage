const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const dbExplorerController = require('../controllers/dbExplorerController');

const router = express.Router();

router.get('/schema', verifyToken, requireRole(['owner', 'admin']), dbExplorerController.getDatabaseSchema);

module.exports = router;
