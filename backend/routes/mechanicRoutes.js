
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const mechanicController = require('../controllers/mechanicController');

const router = express.Router();

const validateMechanic = [

    body('first_name').notEmpty().withMessage('First name is required').isLength({ max: 50 }),
    body('last_name').notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
    body('phone').notEmpty().withMessage('Phone is required').isLength({ max: 20 }),
    body('email').isEmail().withMessage('Valid email is required').isLength({ max: 100 }),
    body('specialization').optional().isLength({ max: 100 }),
    body('hire_date').isISO8601().withMessage('Valid hire date is required'),
    body('status').isIn(['active', 'inactive', 'on_leave']).withMessage('Invalid status')
    ,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), _sqlLogs: req.sqlLogs || [] });
        }
        next();
    }
];

router.get('/', verifyToken, mechanicController.getAllMechanics);
router.get('/:id', verifyToken, mechanicController.getMechanicById);
router.post('/', verifyToken, validateMechanic, mechanicController.createMechanic);
router.put('/:id', verifyToken, validateMechanic, mechanicController.updateMechanic);
router.delete('/:id', verifyToken, requireRole(['admin', 'manager']), mechanicController.deleteMechanic);

module.exports = router;
