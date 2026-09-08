const express = require('express');
const router = express.Router();
const benchmarkController = require('../controllers/benchmarkController');
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');

// Health probe (public for uptime ping checkers)
router.get('/health-check', benchmarkController.checkHealth);

// Experiment history and test executors (RBAC restricted)
router.get('/history', requireAuth, requireRole(['owner', 'admin']), benchmarkController.getBenchmarkHistory);
router.post('/run', requireAuth, requireRole(['owner', 'admin']), benchmarkController.runBenchmarks);

module.exports = router;
