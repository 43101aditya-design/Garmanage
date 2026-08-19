const express = require('express');
const backupRestoreController = require('../controllers/backupRestoreController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Only Admins can create or list backups
router.post('/create', verifyToken, requireRole(['admin']), backupRestoreController.createBackup);
router.get('/', verifyToken, requireRole(['admin']), backupRestoreController.getBackups);

module.exports = router;
