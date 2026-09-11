const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireGarageAccess, optionalAuth } = require('../middleware/firebaseAuth');
const garageController = require('../controllers/garageController');
const joinCtrl = require('../controllers/garageJoinController');

// Recommendation & Nearby Discovery (Spatial DBMS engine)
// Uses optionalAuth so unauthenticated guests can discover garages, while authenticated users get personalized history & saved garage boosts
router.get('/recommendations', optionalAuth, garageController.getRecommendations);
router.get('/nearby', optionalAuth, garageController.getRecommendations);

router.get('/', optionalAuth, garageController.getAllGarages);
router.get('/:id', optionalAuth, garageController.getGarageById);
router.get('/:id/services', optionalAuth, garageController.getGarageServices);
router.post('/:id/services', requireAuth, requireRole(['owner', 'manager']), requireGarageAccess, garageController.setGarageServices);

router.post('/', requireAuth, requireRole(['owner']), garageController.createGarage);
router.put('/:id', requireAuth, requireRole(['owner']), requireGarageAccess, garageController.updateGarage);
router.patch('/:id/status', requireAuth, requireRole(['owner']), requireGarageAccess, garageController.updateGarageStatus);

// Join code management (owner only)
router.get('/:id/join-code', requireAuth, requireRole(['owner']), joinCtrl.getJoinCode);
router.post('/:id/generate-join-code', requireAuth, requireRole(['owner']), joinCtrl.generateJoinCode);

// Join request management (owner only)
router.get('/:id/join-requests', requireAuth, requireRole(['owner']), joinCtrl.listJoinRequests);
router.post('/:id/join-requests/:reqId/approve', requireAuth, requireRole(['owner']), joinCtrl.approveJoinRequest);
router.post('/:id/join-requests/:reqId/reject', requireAuth, requireRole(['owner']), joinCtrl.rejectJoinRequest);

module.exports = router;
