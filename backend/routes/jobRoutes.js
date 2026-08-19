const express = require('express');
const router = express.Router({ mergeParams: true });
const jobController = require('../controllers/jobController');
const { requireAuth, requireRole, requireGarageAccess } = require('../middleware/firebaseAuth');

// Base endpoints (mounted at /api/jobs)
router.post('/', requireAuth, requireRole(['manager', 'owner']), jobController.createJob);
router.get('/mechanic', requireAuth, requireRole(['mechanic']), jobController.getMechanicJobs);
router.patch('/:id/status', requireAuth, jobController.updateJobStatus);
router.post('/:id/notes', requireAuth, jobController.addJobNote);
router.get('/:id', requireAuth, jobController.getJobDetails);

module.exports = router;
