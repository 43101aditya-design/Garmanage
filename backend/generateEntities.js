const fs = require('fs');
const path = require('path');

const entities = ['vehicle', 'mechanic', 'appointment', 'inventory', 'invoice', 'payment'];

const generateController = (entity) => {
    const Capitalized = entity.charAt(0).toUpperCase() + entity.slice(1);
    const table = Capitalized; // Most tables match Capitalized except some exceptions, let's just use exact table names.
    const tableName = entity === 'inventory' ? 'Inventory' : (entity === 'payment' ? 'Payment' : Capitalized);

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
    delete${Capitalized}
};
`;
};

const generateRoute = (entity) => {
    const Capitalized = entity.charAt(0).toUpperCase() + entity.slice(1);
    
    return `
const express = require('express');
const ${entity}Controller = require('../controllers/${entity}Controller');

const router = express.Router();

router.get('/', ${entity}Controller.getAll${Capitalized}s);
router.get('/:id', ${entity}Controller.get${Capitalized}ById);
// Create and Update would have specific validations per entity
router.delete('/:id', ${entity}Controller.delete${Capitalized});

module.exports = router;
`;
};

entities.forEach(entity => {
    fs.writeFileSync(path.join(__dirname, 'controllers', entity + 'Controller.js'), generateController(entity));
    fs.writeFileSync(path.join(__dirname, 'routes', entity + 'Routes.js'), generateRoute(entity));
    console.log('Generated ' + entity);
});
