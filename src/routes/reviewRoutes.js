const express = require('express');
const router = express.Router();
const {
  submitReview,
  getSalonReviews,
  getMyReviews,
  updateReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/salon/:salonId', getSalonReviews);

// Protected routes
router.post('/booking/:bookingId', protect, submitReview);
router.put('/booking/:bookingId', protect, updateReview);
router.get('/my-reviews', protect, getMyReviews);

module.exports = router;
