const express = require('express');
const searchController = require('../controllers/searchController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);
router.get('/', searchController.searchAll);

module.exports = router;
