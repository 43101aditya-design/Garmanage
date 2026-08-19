const express = require('express');
const router = express.Router({ mergeParams: true });
const appointmentController = require('../controllers/appointmentController');
const { requireAuth, requireRole, requireGarageAccess } = require('../middleware/firebaseAuth');

router.use(requireAuth);
router.use(requireRole(['manager', 'owner']));
router.use(requireGarageAccess);

router.get('/', appointmentController.getManagerAppointments);

module.exports = router;
