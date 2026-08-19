
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const vehicleController = require('../controllers/vehicleController');

const router = express.Router();

const validateVehicle = [

    body('customer_id').notEmpty().withMessage('Customer ID is required').isUUID(),
    body('make').notEmpty().withMessage('Make is required').isLength({ max: 50 }),
    body('model').notEmpty().withMessage('Model is required').isLength({ max: 50 }),
    body('year').isInt({ min: 1886, max: 2100 }).withMessage('Valid year is required'),
    body('license_plate').notEmpty().withMessage('License plate is required').isLength({ max: 20 }),
    body('vin').notEmpty().withMessage('VIN is required').isLength({ max: 17 })
    ,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), _sqlLogs: req.sqlLogs || [] });
        }
        next();
    }
];

router.get('/', verifyToken, vehicleController.getAllVehicles);
router.get('/:id', verifyToken, vehicleController.getVehicleById);
router.post('/', verifyToken, validateVehicle, vehicleController.createVehicle);
router.put('/:id', verifyToken, validateVehicle, vehicleController.updateVehicle);
router.delete('/:id', verifyToken, requireRole(['admin', 'manager']), vehicleController.deleteVehicle);

module.exports = router;
