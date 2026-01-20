const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole, requireSalonAccess } = require('../middleware/roleCheck');
const {
  getQueueBySalon,
  addWalkInToQueue,
  updateQueueStatus,
  markCustomerArrived,
  startService,
  completeService,
  skipCustomer,
  undoSkip, // ✅ Make sure this is imported
  cancelBooking,
  getPriorityInsertionLimit,
  insertPriorityCustomer,
} = require('../controllers/queueController');

// All routes require authentication
router.use(protect);

// Get queue for specific salon (salon staff only)
router.get(
  '/:salonId',
  requireRole(['owner', 'manager', 'staff']),
  requireSalonAccess('salonId'),
  getQueueBySalon
);

// Add walk-in customer
router.post(
  '/:salonId/walk-in',
  requireRole(['owner', 'manager', 'staff']),
  requireSalonAccess('salonId'),
  addWalkInToQueue
);

// Mark customer as arrived (QR scan or manual)
router.post(
  '/:salonId/arrived',
  requireRole(['owner', 'manager', 'staff']),
  requireSalonAccess('salonId'),
  markCustomerArrived
);

// Start service for a booking
router.post(
  '/:salonId/start/:bookingId',
  requireRole(['owner', 'manager', 'staff']),
  requireSalonAccess('salonId'),
  startService
);

// Complete service
router.post(
  '/:salonId/complete/:bookingId',
  requireRole(['owner', 'manager', 'staff']),
  requireSalonAccess('salonId'),
  completeService
);

// Skip customer
router.post(
  '/:salonId/skip/:bookingId',
  requireRole(['owner', 'manager']),
  requireSalonAccess('salonId'),
  skipCustomer
);

// ✅ UNDO SKIP - ADD THIS (same pattern as skip route)
router.post(
  '/:salonId/undo-skip/:bookingId',
  requireRole(['owner', 'manager']),
  requireSalonAccess('salonId'),
  undoSkip
);

// Cancel booking
router.post(
  '/:salonId/cancel/:bookingId',
  requireRole(['owner', 'manager']),
  requireSalonAccess('salonId'),
  cancelBooking
);

// Priority insertion
router.get(
  '/:salonId/priority-limit',
  requireRole(['owner', 'manager']),
  requireSalonAccess('salonId'),
  getPriorityInsertionLimit
);

router.post(
  '/:salonId/priority-insert',
  requireRole(['owner', 'manager']),
  requireSalonAccess('salonId'),
  insertPriorityCustomer
);

module.exports = router;
