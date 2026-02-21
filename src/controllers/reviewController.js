const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Submit rating and review for a booking
// @route   POST /api/reviews/booking/:bookingId
// @access  Private
exports.submitReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user._id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this booking',
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed bookings',
      });
    }

    // Check if already reviewed
    if (booking.rating !== null) {
      return res.status(400).json({
        success: false,
        message: 'Booking already reviewed',
      });
    }

    // Update booking with rating
    booking.rating = rating;
    booking.review = review || null;
    booking.reviewedAt = Date.now();
    await booking.save();

    // Update salon's average rating
    await updateSalonRating(booking.salonId);

    logger.info(`✅ Review submitted for booking: ${bookingId}`);

    res.status(200).json({
      success: true,
      message: 'Review submitted successfully',
      booking,
    });
  } catch (error) {
    logger.error('❌ Submit review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: error.message,
    });
  }
};

// @desc    Get reviews for a salon
// @route   GET /api/reviews/salon/:salonId
// @access  Public
exports.getSalonReviews = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Booking.find({
      salonId,
      status: 'completed',
      rating: { $ne: null },
    })
      .populate('userId', 'name phone')
      .select('rating review reviewedAt services totalPrice')
      .sort('-reviewedAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments({
      salonId,
      status: 'completed',
      rating: { $ne: null },
    });

    // Get rating breakdown
    const ratingBreakdown = await Booking.aggregate([
      {
        $match: {
          salonId: require('mongoose').Types.ObjectId(salonId),
          status: 'completed',
          rating: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      reviews,
      ratingBreakdown,
    });
  } catch (error) {
    logger.error('❌ Get salon reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
exports.getMyReviews = async (req, res) => {
  try {
    const userId = req.user._id;

    const reviews = await Booking.find({
      userId,
      status: 'completed',
      rating: { $ne: null },
    })
      .populate('salonId', 'name location images')
      .select('rating review reviewedAt services totalPrice salonId')
      .sort('-reviewedAt');

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    logger.error('❌ Get my reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
};

// @desc    Update review
// @route   PUT /api/reviews/booking/:bookingId
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user._id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    // Find booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Update review
    booking.rating = rating;
    booking.review = review || null;
    booking.reviewedAt = Date.now();
    await booking.save();

    // Update salon's average rating
    await updateSalonRating(booking.salonId);

    logger.info(`✅ Review updated for booking: ${bookingId}`);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      booking,
    });
  } catch (error) {
    logger.error('❌ Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: error.message,
    });
  }
};

// Helper function to update salon's average rating
async function updateSalonRating(salonId) {
  try {
    const mongoose = require('mongoose');
    const result = await Booking.aggregate([
      {
        $match: {
          salonId: mongoose.Types.ObjectId(salonId),
          status: 'completed',
          rating: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      await Salon.findByIdAndUpdate(salonId, {
        averageRating: Math.round(result[0].averageRating * 10) / 10,
        totalReviews: result[0].totalReviews,
      });

      logger.info(`✅ Updated salon rating: ${result[0].averageRating.toFixed(1)}`);
    }
  } catch (error) {
    logger.error('Error updating salon rating:', error);
  }
}

// Exports
module.exports = {
  submitReview: exports.submitReview,
  getSalonReviews: exports.getSalonReviews,
  getMyReviews: exports.getMyReviews,
  updateReview: exports.updateReview,
};
