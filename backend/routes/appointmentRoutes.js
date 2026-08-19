
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();

const validateAppointment = [

    body('customer_id').notEmpty().withMessage('Customer ID is required').isUUID(),
    body('vehicle_id').notEmpty().withMessage('Vehicle ID is required').isUUID(),
    body('mechanic_id').optional({ nullable: true, checkFalsy: true }).isUUID(),
    body('appointment_date').isISO8601().withMessage('Valid date is required'),
    body('appointment_time').notEmpty().withMessage('Valid time is required'),
    body('status').isIn([
        'REQUESTED', 'DIAGNOSIS', 'ESTIMATE', 'PENDING_APPROVAL', 'APPROVED', 
        'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED', 
        'INVOICED', 'PAID', 'DELIVERED', 'CANCELLED'
    ]).withMessage('Invalid status'),
    body('notes').optional()
    ,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), _sqlLogs: req.sqlLogs || [] });
        }
        next();
    }
];

router.get('/', verifyToken, appointmentController.getAllAppointments);
router.get('/:id', verifyToken, appointmentController.getAppointmentById);
router.post('/', verifyToken, validateAppointment, appointmentController.createAppointment);
router.put('/:id', verifyToken, validateAppointment, appointmentController.updateAppointment);
router.delete('/:id', verifyToken, requireRole(['admin', 'manager']), appointmentController.deleteAppointment);
router.post('/:id/smart-assign', verifyToken, requireRole(['admin', 'manager']), appointmentController.smartAssignMechanic);

module.exports = router;
