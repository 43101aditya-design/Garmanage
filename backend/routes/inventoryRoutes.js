
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

const validateInventory = [

    body('part_number').notEmpty().withMessage('Part number is required').isLength({ max: 50 }),
    body('name').notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('description').optional(),
    body('unit_price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('quantity_in_stock').isInt({ min: 0 }).withMessage('Valid quantity is required'),
    body('reorder_level').isInt({ min: 0 }).withMessage('Valid reorder level is required'),
    body('supplier_info').optional()
    ,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), _sqlLogs: req.sqlLogs || [] });
        }
        next();
    }
];

router.get('/', verifyToken, inventoryController.getAllInventorys);
router.get('/:id', verifyToken, inventoryController.getInventoryById);
router.post('/', verifyToken, validateInventory, inventoryController.createInventory);
router.put('/:id', verifyToken, validateInventory, inventoryController.updateInventory);
router.delete('/:id', verifyToken, requireRole(['admin', 'manager']), inventoryController.deleteInventory);

module.exports = router;
