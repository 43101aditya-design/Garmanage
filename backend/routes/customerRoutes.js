const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const customerController = require('../controllers/customerController');

const router = express.Router();

// Validation middleware
const validateCustomer = [
    body('first_name').notEmpty().withMessage('First name is required').isLength({ max: 50 }),
    body('last_name').notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
    body('email').isEmail().withMessage('Valid email is required').isLength({ max: 100 }),
    body('phone').notEmpty().withMessage('Phone is required').isLength({ max: 20 }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), _sqlLogs: req.sqlLogs || [] });
        }
        next();
    }
];

router.get('/', verifyToken, customerController.getAllCustomers);
router.get('/:id', verifyToken, customerController.getCustomerById);
router.post('/', verifyToken, validateCustomer, customerController.createCustomer);
router.put('/:id', verifyToken, validateCustomer, customerController.updateCustomer);
router.delete('/:id', verifyToken, requireRole(['admin', 'manager']), customerController.deleteCustomer);

module.exports = router;
