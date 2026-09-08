const express = require('express');
const router = express.Router();
const anomalyController = require('../controllers/anomalyController');
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');

// All anomaly operations require authorization
router.get('/', requireAuth, requireRole(['owner', 'manager', 'admin']), anomalyController.getAnomalies);
router.patch('/:id/status', requireAuth, requireRole(['owner', 'manager', 'admin']), anomalyController.updateAnomalyStatus);
router.post('/trigger-scan', requireAuth, requireRole(['owner', 'admin']), anomalyController.triggerScan);
router.get('/health-score', requireAuth, requireRole(['owner', 'manager', 'admin']), anomalyController.getHealthScore);

module.exports = router;
