const express = require('express');
const router = express.Router();
const serviceRequestController = require('../controllers/serviceRequestController');
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');

router.use(requireAuth);
router.use(requireRole(['customer']));

router.get('/', serviceRequestController.getAll);
router.get('/:id', serviceRequestController.getById);
router.post('/', serviceRequestController.create);
router.patch('/:id/cancel', serviceRequestController.cancel);

module.exports = router;
