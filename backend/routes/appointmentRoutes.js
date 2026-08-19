const express = require('express');
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();

router.post('/', requireAuth, requireRole(['manager', 'owner']), appointmentController.createAppointment);

module.exports = router;
