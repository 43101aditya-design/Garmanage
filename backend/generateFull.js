const fs = require('fs');
const path = require('path');

const schema = {
  vehicle: {
    columns: ['customer_id', 'make', 'model', 'year', 'license_plate', 'vin'],
    validations: `
    body('customer_id').notEmpty().withMessage('Customer ID is required').isUUID(),
    body('make').notEmpty().withMessage('Make is required').isLength({ max: 50 }),
    body('model').notEmpty().withMessage('Model is required').isLength({ max: 50 }),
    body('year').isInt({ min: 1886, max: 2100 }).withMessage('Valid year is required'),
    body('license_plate').notEmpty().withMessage('License plate is required').isLength({ max: 20 }),
    body('vin').notEmpty().withMessage('VIN is required').isLength({ max: 17 })
    `
  },
  mechanic: {
    columns: ['first_name', 'last_name', 'phone', 'email', 'specialization', 'hire_date', 'status'],
    validations: `
    body('first_name').notEmpty().withMessage('First name is required').isLength({ max: 50 }),
    body('last_name').notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
    body('phone').notEmpty().withMessage('Phone is required').isLength({ max: 20 }),
    body('email').isEmail().withMessage('Valid email is required').isLength({ max: 100 }),
    body('specialization').optional().isLength({ max: 100 }),
    body('hire_date').isISO8601().withMessage('Valid hire date is required'),
    body('status').isIn(['active', 'inactive', 'on_leave']).withMessage('Invalid status')
    `
  },
  appointment: {
    columns: ['customer_id', 'vehicle_id', 'mechanic_id', 'appointment_date', 'appointment_time', 'status', 'notes'],
    validations: `
    body('customer_id').notEmpty().withMessage('Customer ID is required').isUUID(),
    body('vehicle_id').notEmpty().withMessage('Vehicle ID is required').isUUID(),
    body('mechanic_id').optional({ nullable: true, checkFalsy: true }).isUUID(),
    body('appointment_date').isISO8601().withMessage('Valid date is required'),
    body('appointment_time').notEmpty().withMessage('Valid time is required'),
    body('status').isIn(['scheduled', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
    body('notes').optional()
    `
  },
  inventory: {
    columns: ['part_number', 'name', 'description', 'unit_price', 'quantity_in_stock', 'reorder_level', 'supplier_info'],
    validations: `
    body('part_number').notEmpty().withMessage('Part number is required').isLength({ max: 50 }),
    body('name').notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('description').optional(),
    body('unit_price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('quantity_in_stock').isInt({ min: 0 }).withMessage('Valid quantity is required'),
    body('reorder_level').isInt({ min: 0 }).withMessage('Valid reorder level is required'),
    body('supplier_info').optional()
    `
  },
  invoice: {
    columns: ['appointment_id', 'customer_id', 'issue_date', 'due_date', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'status'],
    validations: `
    body('appointment_id').notEmpty().withMessage('Appointment ID is required').isUUID(),
    body('customer_id').notEmpty().withMessage('Customer ID is required').isUUID(),
    body('issue_date').isISO8601().withMessage('Valid issue date is required'),
    body('due_date').isISO8601().withMessage('Valid due date is required'),
    body('subtotal').isFloat({ min: 0 }).withMessage('Valid subtotal is required'),
    body('tax_amount').isFloat({ min: 0 }).withMessage('Valid tax is required'),
    body('discount_amount').isFloat({ min: 0 }).withMessage('Valid discount is required'),
    body('total_amount').isFloat({ min: 0 }).withMessage('Valid total is required'),
    body('status').isIn(['unpaid', 'partial', 'paid', 'cancelled']).withMessage('Invalid status')
    `
  },
  payment: {
    columns: ['invoice_id', 'amount', 'payment_date', 'payment_method', 'transaction_reference'],
    validations: `
    body('invoice_id').notEmpty().withMessage('Invoice ID is required').isUUID(),
    body('amount').isFloat({ gt: 0 }).withMessage('Valid amount is required'),
    body('payment_date').isISO8601().withMessage('Valid payment date is required'),
    body('payment_method').isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet']).withMessage('Invalid payment method'),
    body('transaction_reference').optional().isLength({ max: 100 })
    `
  }
};

const generateController = (entity, columns) => {
    const Capitalized = entity.charAt(0).toUpperCase() + entity.slice(1);
    const tableName = entity === 'inventory' ? 'Inventory' : (entity === 'payment' ? 'Payment' : Capitalized);

    const colsStr = columns.join(', ');
    const paramsStr = columns.map(c => `req.body.${c}`).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const updateSets = columns.map(c => `${c} = ?`).join(', ');

    return `
const { v4: uuidv4 } = require('uuid');

const getAll${Capitalized}s = async (req, res, next) => {
    try {
        const [rows] = await req.db.query('SELECT * FROM ${tableName} ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const get${Capitalized}ById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await req.db.query('SELECT * FROM ${tableName} WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: '${Capitalized} not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const create${Capitalized} = async (req, res, next) => {
    try {
        const id = uuidv4();
        const { ${columns.join(', ')} } = req.body;
        
        await req.db.query(
            'INSERT INTO ${tableName} (id, ${colsStr}) VALUES (?, ${placeholders})',
            [id, ${paramsStr}]
        );
        
        const [rows] = await req.db.query('SELECT * FROM ${tableName} WHERE id = ?', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const update${Capitalized} = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { ${columns.join(', ')} } = req.body;
        
        const [result] = await req.db.query(
            'UPDATE ${tableName} SET ${updateSets} WHERE id = ?',
            [${paramsStr}, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '${Capitalized} not found' });
        }
        
        const [rows] = await req.db.query('SELECT * FROM ${tableName} WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
};

const delete${Capitalized} = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await req.db.query('DELETE FROM ${tableName} WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '${Capitalized} not found' });
        }
        
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAll${Capitalized}s,
    get${Capitalized}ById,
    create${Capitalized},
    update${Capitalized},
    delete${Capitalized}
};
`;
};

const generateRoute = (entity, validations) => {
    const Capitalized = entity.charAt(0).toUpperCase() + entity.slice(1);
    
    return `
const express = require('express');
const { body, validationResult } = require('express-validator');
const ${entity}Controller = require('../controllers/${entity}Controller');

const router = express.Router();

const validate${Capitalized} = [
${validations},
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array(), _sqlLogs: req.sqlLogs || [] });
        }
        next();
    }
];

router.get('/', ${entity}Controller.getAll${Capitalized}s);
router.get('/:id', ${entity}Controller.get${Capitalized}ById);
router.post('/', validate${Capitalized}, ${entity}Controller.create${Capitalized});
router.put('/:id', validate${Capitalized}, ${entity}Controller.update${Capitalized});
router.delete('/:id', ${entity}Controller.delete${Capitalized});

module.exports = router;
`;
};

Object.keys(schema).forEach(entity => {
    fs.writeFileSync(path.join(__dirname, 'controllers', entity + 'Controller.js'), generateController(entity, schema[entity].columns));
    fs.writeFileSync(path.join(__dirname, 'routes', entity + 'Routes.js'), generateRoute(entity, schema[entity].validations));
    console.log('Generated fully implemented ' + entity);
});
