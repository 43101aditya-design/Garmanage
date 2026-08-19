const express = require('express');
const router = express.Router({ mergeParams: true });
const managerRequestController = require('../controllers/managerRequestController');
const { requireAuth, requireRole, requireGarageAccess } = require('../middleware/firebaseAuth');

router.use(requireAuth);
router.use(requireRole(['manager', 'owner']));
router.use(requireGarageAccess);

router.get('/', managerRequestController.getAll);
router.patch('/:id/approve', managerRequestController.approve);
router.patch('/:id/reject', managerRequestController.reject);

module.exports = router;
