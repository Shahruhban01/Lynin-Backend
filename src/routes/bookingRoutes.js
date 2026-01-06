const express = require('express');
const router = express.Router();
const {
  joinQueue,
  getMyBookings,
  getBookingById,
  cancelBooking,
  completePayment,
  completeBooking,
  getSalonBookings,
  startBooking,
  scheduleBooking, // ✅ NEW
  getAvailableTimeSlots,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE dynamic routes!

// Schedule booking
router.post('/schedule', protect, scheduleBooking);

// Get available time slots
router.get('/available-slots/:salonId', protect, getAvailableTimeSlots);

// Specific customer routes (FIRST)
router.post('/join-queue', protect, joinQueue);
router.get('/my-bookings', protect, getMyBookings);

// Owner specific routes (BEFORE dynamic routes)
router.get('/salon/:salonId', protect, getSalonBookings);

// Dynamic routes with actions (BEFORE plain /:id)
router.put('/:id/cancel', protect, cancelBooking);
router.put('/:id/complete-payment', protect, completePayment);
router.put('/:id/complete', protect, completeBooking);
router.put('/:id/start', protect, startBooking);

// Generic dynamic route (LAST)
router.get('/:id', protect, getBookingById);

module.exports = router;
