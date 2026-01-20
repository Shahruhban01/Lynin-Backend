const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly, logAdminActivity } = require('../middleware/auth');

// Apply JWT authentication to all admin routes
router.use(protect);
router.use(adminOnly);

// ================================
// PLATFORM STATISTICS (READ-ONLY)
// ================================
router.get(
  '/statistics',
  logAdminActivity('statistics_view', 'system'),
  adminController.getPlatformStatistics
);

// ================================
// USER MANAGEMENT
// ================================
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.delete(
  '/users/:userId',
  logAdminActivity('user_soft_delete', 'user'),
  adminController.softDeleteUser
);
router.patch(
  '/users/:userId/restore',
  logAdminActivity('user_restore', 'user'),
  adminController.restoreUser
);

// ================================
// SALON MANAGEMENT
// ================================
// ⚠️ IMPORTANT: Specific routes BEFORE dynamic :salonId routes
router.get('/salons/cities', adminController.getCities);

router.get('/salons', adminController.getSalons);
router.get('/salons/:salonId', adminController.getSalonDetails);
router.get('/salons/:salonId/queue', adminController.getSalonQueue);

router.patch(
  '/salons/:salonId/verify',
  logAdminActivity('salon_verify', 'salon'),
  adminController.verifySalon
);
router.patch(
  '/salons/:salonId/disable',
  logAdminActivity('salon_disable', 'salon'),
  adminController.disableSalon
);
router.patch(
  '/salons/:salonId/enable',
  logAdminActivity('salon_enable', 'salon'),
  adminController.enableSalon
);

// ================================
// BOOKINGS MONITORING (READ-ONLY)
// ================================
router.get(
  '/bookings',
  logAdminActivity('booking_view', 'booking'),
  adminController.getBookings
);
router.get('/bookings/:bookingId', adminController.getBookingDetails);

// ================================
// AUDIT LOGS
// ================================
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
