const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All analytics require authentication
router.use(verifyToken);

router.get('/dashboard-summary', analyticsController.getDashboardSummary);
router.get('/monthly-revenue', analyticsController.getMonthlyRevenue);
router.get('/service-distribution', analyticsController.getServiceDistribution);
router.get('/inventory-valuation', analyticsController.getInventoryValuation);
router.get('/mechanic-efficiency', analyticsController.getMechanicEfficiency);
router.get('/customer-growth', analyticsController.getCustomerGrowth);

router.get('/manager-contribution', requireRole(['admin']), analyticsController.getManagerContribution);
router.get('/mechanic-workload', requireRole(['admin', 'manager']), analyticsController.getMechanicWorkload);
router.get('/mom-revenue', requireRole(['admin']), analyticsController.getMoMRevenue);

module.exports = router;
