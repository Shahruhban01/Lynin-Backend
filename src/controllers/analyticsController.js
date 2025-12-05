const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const mongoose = require('mongoose');

// @desc    Get salon analytics
// @route   GET /api/analytics/salon/:salonId
// @access  Private (Owner)
exports.getSalonAnalytics = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { period = '7d' } = req.query;

    // Verify ownership
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get bookings in date range
    const bookings = await Booking.find({
      salonId,
      createdAt: { $gte: startDate },
    });

    // Calculate metrics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    const totalRevenue = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    // Average rating
    const ratedBookings = bookings.filter(b => b.rating !== null);
    const averageRating = ratedBookings.length > 0
      ? ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length
      : 0;

    // Popular services
    const servicesCount = {};
    bookings.forEach(booking => {
      booking.services.forEach(service => {
        servicesCount[service.name] = (servicesCount[service.name] || 0) + 1;
      });
    });

    const popularServices = Object.entries(servicesCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Daily breakdown
    const dailyStats = await Booking.aggregate([
      {
        $match: {
          salonId: mongoose.Types.ObjectId(salonId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          bookings: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$totalPrice', 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        overview: {
          totalBookings,
          completedBookings,
          cancelledBookings,
          totalRevenue,
          averageRating: Math.round(averageRating * 10) / 10,
        },
        popularServices,
        dailyStats,
      },
    });
  } catch (error) {
    console.error('❌ Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
};

// module.exports = {
//   getSalonAnalytics,
// };
