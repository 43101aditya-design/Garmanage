
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

const validatePayment = [

    body('invoice_id').notEmpty().withMessage('Invoice ID is required').isUUID(),
    body('amount').isFloat({ gt: 0 }).withMessage('Valid amount is required'),
    body('payment_date').isISO8601().withMessage('Valid payment date is required'),
    body('payment_method').isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet']).withMessage('Invalid payment method'),
    body('transaction_reference').optional().isLength({ max: 100 })
    ,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), _sqlLogs: req.sqlLogs || [] });
        }
        next();
    }
];

router.get('/', verifyToken, paymentController.getAllPayments);
router.get('/:id', verifyToken, paymentController.getPaymentById);
router.post('/', verifyToken, validatePayment, paymentController.createPayment);
router.put('/:id', verifyToken, validatePayment, paymentController.updatePayment);
router.delete('/:id', verifyToken, requireRole(['admin', 'manager']), paymentController.deletePayment);

module.exports = router;
