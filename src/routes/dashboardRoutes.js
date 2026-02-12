const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole, requireSalonAccess } = require('../middleware/roleCheck');
const { getDashboardStats } = require('../controllers/dashboardController');

// Get dashboard stats
router.get(
  '/:salonId',
  protect,
  requireRole(['owner', 'manager', 'staff']),
  requireSalonAccess('salonId'),
  getDashboardStats
);

// @route   GET /api/dashboard/:salonId
// @desc    Get dashboard statistics for a salon
// @access  Private (Owner/Manager)
// router.get('/:salonId', protect, dashboardController.getDashboardStats);

module.exports = router;
