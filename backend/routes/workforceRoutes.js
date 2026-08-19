const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireGarageAccess } = require('../middleware/firebaseAuth');
const { getGarageMechanics, getMechanicDetails, addMechanicSkill, updateAvailability, listAllSkills } = require('../controllers/workforceController');

router.get('/garages/:id/mechanics', requireAuth, requireRole(['manager', 'admin']), requireGarageAccess, getGarageMechanics);
router.get('/mechanics/:id', requireAuth, getMechanicDetails);
router.post('/mechanics/:id/skills', requireAuth, addMechanicSkill);
router.put('/mechanics/:id/availability', requireAuth, updateAvailability);
router.get('/skills', requireAuth, listAllSkills);

module.exports = router;
