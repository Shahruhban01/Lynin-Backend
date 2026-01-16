const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Reports endpoints
router.get('/daily-summary', reportsController.getDailySummary);
router.get('/staff-performance', reportsController.getStaffPerformance);
router.get('/revenue', reportsController.getRevenueReport);
router.get('/dashboard', reportsController.getDashboardStats);

module.exports = router;
