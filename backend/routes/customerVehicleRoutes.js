const express = require('express');
const router = express.Router();
const customerVehicleController = require('../controllers/customerVehicleController');
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');

router.use(requireAuth);
router.use(requireRole(['customer']));

router.get('/', customerVehicleController.getAll);
router.get('/:id', customerVehicleController.getById);
router.post('/', customerVehicleController.create);
router.put('/:id', customerVehicleController.update);
router.patch('/:id/status', customerVehicleController.updateStatus);

module.exports = router;
