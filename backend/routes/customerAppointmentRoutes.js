const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');

router.use(requireAuth);
router.use(requireRole(['customer']));

router.get('/', appointmentController.getCustomerAppointments);

module.exports = router;
