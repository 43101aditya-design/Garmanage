const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');
const controller = require('../controllers/decisionController');

// All decision operations require authentication and operational management roles
router.use(requireAuth, requireRole(['manager', 'owner', 'admin']));

// Decision retrieval & human-in-the-loop actions
router.get('/pending', controller.getPendingDecisions);
router.post('/:id/approve', controller.approveDecision);
router.post('/:id/reject', controller.rejectDecision);
router.post('/:id/modify', controller.modifyDecision);

// Specialized scoring & recommendation endpoints
router.post('/job-priority', controller.scoreJobPriority);
router.post('/appointment-slots', controller.scoreAppointmentSlots);

// Decision audit history & metadata
router.get('/history', controller.getDecisionHistory);
router.get('/pipeline/metadata', controller.getPipelineMetadata);

module.exports = router;
