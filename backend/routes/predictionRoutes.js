const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');
const controller = require('../controllers/predictionController');

// All prediction operations require user authentication and basic operational roles
router.use(requireAuth, requireRole(['manager', 'owner', 'admin']));

// Core predictive intelligence APIs
router.get('/revenue', controller.getRevenueForecast);
router.get('/workload', controller.getWorkloadForecast);
router.get('/inventory-demand', controller.getInventoryDemandForecast);
router.post('/service-duration', controller.getServiceDurationPrediction);

// Model training and status (Owner/Admin restricted)
router.get('/models/status', requireRole(['owner', 'admin']), controller.getModelsStatus);
router.post('/train/:modelType', requireRole(['owner', 'admin']), controller.trainModel);
router.get('/monitoring', requireRole(['owner', 'admin']), controller.getMonitoring);

// Engineering Intelligence Lab metadata
router.get('/pipeline/metadata', controller.getPipelineMetadata);

module.exports = router;
