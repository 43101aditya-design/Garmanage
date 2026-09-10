const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');
const { requireSimulationContext } = require('../middleware/environmentGuard');
const controller = require('../controllers/digitalTwinController');

// All digital twin operations require authenticated management/owner roles & valid simulation context
router.use(requireAuth, requireRole(['manager', 'owner', 'admin']), requireSimulationContext);

// Core Digital Twin APIs (Read-Only Analysis & Scenario Modeling)
router.post('/snapshot', controller.getSnapshot);
router.post('/simulate', controller.runSimulation);
router.post('/optimize', controller.runOptimization);
router.post('/compare', controller.runComparison);
router.post('/sensitivity', controller.runSensitivity);

// History & Metadata
router.get('/history', controller.getSimulationHistory);
router.get('/pipeline/metadata', controller.getPipelineMetadata);

module.exports = router;
