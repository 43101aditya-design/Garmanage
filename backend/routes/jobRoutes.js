const express = require('express');
const router = express.Router({ mergeParams: true });
const jobController = require('../controllers/jobController');
const { requireAuth, requireRole, requireGarageAccess } = require('../middleware/firebaseAuth');

// Base endpoints (mounted at /api/jobs)

// Customer tracking endpoints (MUST be defined before /:id parameter)
router.get('/customer/active-tracking', requireAuth, jobController.getCustomerActiveTracking);
router.get('/customer/tracking/:id', requireAuth, jobController.getCustomerJobTracking);

// Creation & Mechanic list
router.post('/', requireAuth, requireRole(['manager', 'owner', 'admin']), jobController.createJob);
router.get('/mechanic', requireAuth, requireRole(['mechanic', 'admin']), jobController.getMechanicJobs);

// Job state & ETA updates
router.patch('/:id/status', requireAuth, jobController.updateJobStatus);
router.patch('/:id/eta', requireAuth, requireRole(['manager', 'owner', 'mechanic', 'admin']), jobController.updateJobETA);
router.post('/:id/notes', requireAuth, jobController.addJobNote);

// Specific job details (manager, mechanic, or owner view)
router.get('/:id', requireAuth, jobController.getJobDetails);

module.exports = router;
