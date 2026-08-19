
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const invoiceController = require('../controllers/invoiceController');

const router = express.Router();

const validateInvoice = [

    body('appointment_id').notEmpty().withMessage('Appointment ID is required').isUUID(),
    body('customer_id').notEmpty().withMessage('Customer ID is required').isUUID(),
    body('issue_date').isISO8601().withMessage('Valid issue date is required'),
    body('due_date').isISO8601().withMessage('Valid due date is required'),
    body('subtotal').isFloat({ min: 0 }).withMessage('Valid subtotal is required'),
    body('tax_amount').isFloat({ min: 0 }).withMessage('Valid tax is required'),
    body('discount_amount').isFloat({ min: 0 }).withMessage('Valid discount is required'),
    body('total_amount').isFloat({ min: 0 }).withMessage('Valid total is required'),
    body('status').isIn(['unpaid', 'partial', 'paid', 'cancelled']).withMessage('Invalid status')
    ,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), _sqlLogs: req.sqlLogs || [] });
        }
        next();
    }
];

router.get('/', verifyToken, invoiceController.getAllInvoices);
router.get('/:id', verifyToken, invoiceController.getInvoiceById);
router.post('/', verifyToken, validateInvoice, invoiceController.createInvoice);
router.put('/:id', verifyToken, validateInvoice, invoiceController.updateInvoice);
router.delete('/:id', verifyToken, requireRole(['admin', 'manager']), invoiceController.deleteInvoice);

module.exports = router;
