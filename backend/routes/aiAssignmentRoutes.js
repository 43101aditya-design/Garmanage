const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');
const controller = require('../controllers/aiAssignmentController');

router.use(requireAuth, requireRole(['manager', 'owner', 'admin']));
router.post('/jobs/batch-recommendation', controller.createBatchRecommendations);
router.post('/jobs/:jobId/recommendation', controller.createRecommendation);
router.get('/jobs/:jobId/recommendation', controller.getJobRecommendation);
router.get('/recommendations', controller.listPendingRecommendations);
router.post('/recommendations/:id/approve', controller.approveRecommendation);
router.post('/recommendations/:id/reject', controller.rejectRecommendation);
router.get('/model/status', controller.getModelStatus);
router.get('/model/evaluation', controller.getModelEvaluation);
router.get('/monitoring', controller.getMonitoring);
router.post('/model/train', requireRole(['owner', 'admin']), controller.trainModel);

module.exports = router;
