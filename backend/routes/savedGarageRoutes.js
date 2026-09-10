const express = require('express');
const router = express.Router();
const savedGarageController = require('../controllers/savedGarageController');
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');

// Customer-only authentication and role enforcement
router.use(requireAuth);
router.use(requireRole(['customer']));

// Endpoints
router.get('/', savedGarageController.getSavedGarages);
router.post('/', savedGarageController.saveGarage);
router.post('/:garageId', savedGarageController.saveGarage);
router.delete('/:garageId', savedGarageController.unsaveGarage);
router.get('/check/:garageId', savedGarageController.checkSaved);

module.exports = router;
