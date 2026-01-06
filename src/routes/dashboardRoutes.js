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

module.exports = router;
