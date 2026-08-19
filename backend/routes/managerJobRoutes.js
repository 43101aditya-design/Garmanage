const express = require('express');
const router = express.Router({ mergeParams: true });
const jobController = require('../controllers/jobController');
const { requireAuth, requireRole, requireGarageAccess } = require('../middleware/firebaseAuth');

router.use(requireAuth);
router.use(requireRole(['manager', 'owner']));
router.use(requireGarageAccess);

router.get('/', jobController.getManagerJobs);

module.exports = router;
