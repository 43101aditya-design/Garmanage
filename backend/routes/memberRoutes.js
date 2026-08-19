const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireGarageAccess } = require('../middleware/firebaseAuth');
const memberController = require('../controllers/memberController');

router.get('/:id/members', requireAuth, requireGarageAccess, memberController.getMembers);
router.post('/:id/managers', requireAuth, requireRole(['owner']), requireGarageAccess, memberController.addManager);
router.patch('/:id/members/:memberId', requireAuth, requireRole(['owner']), requireGarageAccess, memberController.updateMember);
router.delete('/:id/members/:memberId', requireAuth, requireRole(['owner']), requireGarageAccess, memberController.removeMember);

module.exports = router;
