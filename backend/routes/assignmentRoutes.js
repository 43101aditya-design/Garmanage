const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/firebaseAuth');
const { getEligibleMechanics, assignJob, acceptAssignment, rejectAssignment, getMechanicAssignments } = require('../controllers/assignmentController');

router.get('/jobs/:id/eligible-mechanics', requireAuth, requireRole(['manager', 'admin']), getEligibleMechanics);
router.post('/jobs/:id/assign', requireAuth, requireRole(['manager', 'admin']), assignJob);
router.patch('/assignments/:id/accept', requireAuth, acceptAssignment);
router.patch('/assignments/:id/reject', requireAuth, rejectAssignment);
router.get('/mechanics/:id/assignments', requireAuth, getMechanicAssignments);

module.exports = router;
