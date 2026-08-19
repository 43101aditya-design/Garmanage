const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireGarageAccess } = require('../middleware/firebaseAuth');
const garageController = require('../controllers/garageController');

router.get('/', requireAuth, garageController.getAllGarages);
router.get('/:id', requireAuth, garageController.getGarageById);
router.post('/', requireAuth, requireRole(['owner']), garageController.createGarage);
router.put('/:id', requireAuth, requireRole(['owner']), requireGarageAccess, garageController.updateGarage);
router.patch('/:id/status', requireAuth, requireRole(['owner']), requireGarageAccess, garageController.updateGarageStatus);

module.exports = router;
