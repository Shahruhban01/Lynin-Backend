const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController'); // ✅ ADD THIS LINE
const { protect } = require('../middleware/auth');

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE dynamic routes!

// Schedule booking
router.post('/schedule', protect, bookingController.scheduleBooking);

// Get available time slots
router.get('/available-slots/:salonId', protect, bookingController.getAvailableTimeSlots);

// Specific customer routes (FIRST)
router.post('/join-queue', protect, bookingController.joinQueue);
router.get('/my-bookings', protect, bookingController.getMyBookings);

// ✅ Staff bookings route (BEFORE dynamic routes)
router.get('/staff/:staffId', protect, bookingController.getStaffBookings);

// Owner specific routes (BEFORE dynamic routes)
router.get('/salon/:salonId', protect, bookingController.getSalonBookings);

// Dynamic routes with actions (BEFORE plain /:id)
router.put('/:id/cancel', protect, bookingController.cancelBooking);
router.put('/:id/complete-payment', protect, bookingController.completePayment);
router.put('/:id/complete', protect, bookingController.completeBooking);
router.put('/:id/start', protect, bookingController.startBooking);

// ✅ Staff assignment routes
router.put('/:id/assign-staff', protect, bookingController.assignStaff);

// Generic dynamic route (LAST)
router.get('/:id', protect, bookingController.getBookingById);

module.exports = router;
