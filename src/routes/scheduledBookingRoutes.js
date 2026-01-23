const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole, requireSalonAccess } = require('../middleware/roleCheck');
const {
  getTodayScheduledBookings,
  markNoShow,
  markScheduledArrived,
  debugScheduledBookings,
  getTommorowScheduledBookings,
} = require('../controllers/scheduledBookingController');

// In your scheduledBookingRoutes.js or wherever your routes are
router.get('/scheduled-bookings/:salonId/debug', 
  protect, 
  debugScheduledBookings
);


// Get today's scheduled bookings for salon
router.get(
  '/:salonId/today',
  protect,
  requireRole(['owner', 'manager', 'staff']),
  requireSalonAccess('salonId'),
  getTodayScheduledBookings
);

// Get tommorow's scheduled bookings for salon
router.get(
  '/:salonId/tommorow',
  protect,
  requireRole(['owner', 'manager', 'staff']),
  requireSalonAccess('salonId'),
  getTommorowScheduledBookings
);

// Mark as no-show
router.patch(
  '/:bookingId/no-show',
  protect,
  requireRole(['owner', 'manager']),
  markNoShow
);

// Mark scheduled booking as arrived
router.patch(
  '/:bookingId/mark-arrived',
  protect,
  requireRole(['owner', 'manager', 'staff']),
  markScheduledArrived
);

module.exports = router;
