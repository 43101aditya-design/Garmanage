const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/firebaseAuth');
const ctrl = require('../controllers/onboardingController');

// Public — list active garages (for join code entry screen)
router.get('/garages', ctrl.listGarages);

// All other routes require Firebase auth (but NOT a full User_Account — user may be new)
router.post('/garage/create', requireAuth, ctrl.createGarageAndOwner);
router.post('/customer/create', requireAuth, ctrl.createCustomerProfile);
router.post('/join/request', requireAuth, ctrl.submitJoinRequest);
router.post('/join/cancel', requireAuth, ctrl.cancelJoinRequest);
router.get('/join/status', requireAuth, ctrl.getJoinStatus);

module.exports = router;
