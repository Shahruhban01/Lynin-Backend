const Booking = require('../models/Booking');
const Staff = require('../models/Staff');
const Salon = require('../models/Salon');

// @desc    Get daily summary report
// @route   GET /api/reports/daily-summary
// @access  Private (Owner)
exports.getDailySummary = async (req, res) => {
  try {
    const { salonId, date } = req.query;

    if (!salonId) {
      return res.status(400).json({
        success: false,
        message: 'Salon ID is required',
      });
    }

    // Verify ownership
    const salon = await Salon.findById(salonId);
    if (!salon || salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Parse date (default to today)
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    console.log(`📊 Daily summary for ${salonId} on ${reportDate.toDateString()}`);

    // Get all bookings for the day
    const bookings = await Booking.find({
      salonId,
      createdAt: {
        $gte: reportDate,
        $lt: nextDay,
      },
    }).populate('assignedStaffId', 'name');

    // Calculate metrics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const inProgressBookings = bookings.filter(b => b.status === 'in-progress').length;

    // Revenue (only from completed bookings)
    const completedBookingsData = bookings.filter(b => b.status === 'completed');
    const totalRevenue = completedBookingsData.reduce((sum, b) => sum + b.totalPrice, 0);
    const paidAmount = completedBookingsData.filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.paidAmount, 0);
    const pendingPayments = completedBookingsData.filter(b => b.paymentStatus === 'pending')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    // Customer types
    const walkIns = bookings.filter(b => b.walkInToken || !b.userId).length;
    const registeredCustomers = bookings.filter(b => b.userId && !b.walkInToken).length;

    // Booking types
    const immediateBookings = bookings.filter(b => b.bookingType === 'immediate').length;
    const scheduledBookings = bookings.filter(b => b.bookingType === 'scheduled').length;

    // Average metrics
    const avgServiceTime = completedBookingsData.length > 0
      ? completedBookingsData.reduce((sum, b) => {
          if (b.startedAt && b.completedAt) {
            return sum + (new Date(b.completedAt) - new Date(b.startedAt)) / 60000;
          }
          return sum;
        }, 0) / completedBookingsData.length
      : 0;

    const avgBookingValue = completedBookingsData.length > 0
      ? totalRevenue / completedBookingsData.length
      : 0;

    // Top services
    const serviceCount = {};
    bookings.forEach(booking => {
      booking.services.forEach(service => {
        if (!serviceCount[service.name]) {
          serviceCount[service.name] = { count: 0, revenue: 0 };
        }
        serviceCount[service.name].count++;
        if (booking.status === 'completed') {
          serviceCount[service.name].revenue += service.price;
        }
      });
    });

    const topServices = Object.entries(serviceCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Hourly breakdown (for completed bookings)
    const hourlyData = Array(24).fill(0).map((_, hour) => ({
      hour: `${hour}:00`,
      bookings: 0,
      revenue: 0,
    }));

    completedBookingsData.forEach(booking => {
      const hour = new Date(booking.completedAt).getHours();
      hourlyData[hour].bookings++;
      hourlyData[hour].revenue += booking.totalPrice;
    });

    // Filter out empty hours
    const activeHours = hourlyData.filter(h => h.bookings > 0);

    res.status(200).json({
      success: true,
      date: reportDate,
      summary: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        pendingBookings,
        inProgressBookings,
        totalRevenue,
        paidAmount,
        pendingPayments,
        walkIns,
        registeredCustomers,
        immediateBookings,
        scheduledBookings,
        avgServiceTime: Math.round(avgServiceTime),
        avgBookingValue: Math.round(avgBookingValue),
      },
      topServices,
      hourlyData: activeHours,
    });
  } catch (error) {
    console.error('❌ Daily summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily summary',
      error: error.message,
    });
  }
};

// @desc    Get staff performance report
// @route   GET /api/reports/staff-performance
// @access  Private (Owner)
exports.getStaffPerformance = async (req, res) => {
  try {
    const { salonId, startDate, endDate } = req.query;

    if (!salonId) {
      return res.status(400).json({
        success: false,
        message: 'Salon ID is required',
      });
    }

    // Verify ownership
    const salon = await Salon.findById(salonId);
    if (!salon || salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    console.log(`📊 Staff performance for ${salonId} from ${start.toDateString()} to ${end.toDateString()}`);

    // Get all staff for this salon
    const staff = await Staff.find({ salonId, isActive: true });

    // Get bookings in date range
    const bookings = await Booking.find({
      salonId,
      assignedStaffId: { $ne: null },
      createdAt: {
        $gte: start,
        $lte: end,
      },
    });

    // Calculate performance for each staff
    const performance = [];

    for (const member of staff) {
      const staffBookings = bookings.filter(
        b => b.assignedStaffId && b.assignedStaffId.toString() === member._id.toString()
      );

      const completedBookings = staffBookings.filter(b => b.status === 'completed');
      
      const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

      // Calculate commission
      let totalCommission = 0;
      if (member.commissionType === 'percentage') {
        totalCommission = (totalRevenue * member.commissionRate) / 100;
      } else if (member.commissionType === 'fixed') {
        totalCommission = completedBookings.length * member.commissionRate;
      }

      // Average rating
      const ratedBookings = completedBookings.filter(b => b.rating);
      const avgRating = ratedBookings.length > 0
        ? ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length
        : 0;

      // Avg service time
      const avgServiceTime = completedBookings.length > 0
        ? completedBookings.reduce((sum, b) => {
            if (b.startedAt && b.completedAt) {
              return sum + (new Date(b.completedAt) - new Date(b.startedAt)) / 60000;
            }
            return sum;
          }, 0) / completedBookings.length
        : 0;

      performance.push({
        staffId: member._id,
        name: member.name,
        role: member.role,
        profileImage: member.profileImage,
        totalBookings: staffBookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: staffBookings.filter(b => b.status === 'cancelled').length,
        totalRevenue,
        totalCommission,
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews: ratedBookings.length,
        avgServiceTime: Math.round(avgServiceTime),
        commissionType: member.commissionType,
        commissionRate: member.commissionRate,
      });
    }

    // Sort by revenue
    performance.sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.status(200).json({
      success: true,
      startDate: start,
      endDate: end,
      totalStaff: performance.length,
      performance,
    });
  } catch (error) {
    console.error('❌ Staff performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate staff performance report',
      error: error.message,
    });
  }
};

// @desc    Get revenue report
// @route   GET /api/reports/revenue
// @access  Private (Owner)
exports.getRevenueReport = async (req, res) => {
  try {
    const { salonId, period, startDate, endDate } = req.query;

    if (!salonId) {
      return res.status(400).json({
        success: false,
        message: 'Salon ID is required',
      });
    }

    // Verify ownership
    const salon = await Salon.findById(salonId);
    if (!salon || salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Determine date range based on period
    let start, end;
    const now = new Date();

    switch (period) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7));
        end = new Date();
        break;
      case 'month':
        start = new Date(now.setMonth(now.getMonth() - 1));
        end = new Date();
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = new Date(now.setDate(now.getDate() - 30));
        end = new Date();
    }

    console.log(`💰 Revenue report for ${salonId} from ${start.toDateString()} to ${end.toDateString()}`);

    // Get completed bookings in range
    const bookings = await Booking.find({
      salonId,
      status: 'completed',
      completedAt: {
        $gte: start,
        $lte: end,
      },
    });

    // Total metrics
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalBookings = bookings.length;
    const avgRevenuePerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Payment status breakdown
    const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');
    const pendingPayments = bookings.filter(b => b.paymentStatus === 'pending');
    
    const paidAmount = paidBookings.reduce((sum, b) => sum + b.paidAmount, 0);
    const pendingAmount = pendingPayments.reduce((sum, b) => sum + b.totalPrice, 0);

    // Payment method breakdown (all are cash for now)
    const paymentMethods = {
      cash: bookings.filter(b => b.paymentMethod === 'cash').length,
      card: bookings.filter(b => b.paymentMethod === 'card').length,
      upi: bookings.filter(b => b.paymentMethod === 'upi').length,
      wallet: bookings.filter(b => b.paymentMethod === 'wallet').length,
    };

    // Service-wise revenue
    const serviceRevenue = {};
    bookings.forEach(booking => {
      booking.services.forEach(service => {
        if (!serviceRevenue[service.name]) {
          serviceRevenue[service.name] = {
            count: 0,
            revenue: 0,
          };
        }
        serviceRevenue[service.name].count++;
        serviceRevenue[service.name].revenue += service.price;
      });
    });

    const topServices = Object.entries(serviceRevenue)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Daily breakdown (for charts)
    const dailyRevenue = [];
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= daysDiff; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      day.setHours(0, 0, 0, 0);

      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayBookings = bookings.filter(
        b => new Date(b.completedAt) >= day && new Date(b.completedAt) < nextDay
      );

      const revenue = dayBookings.reduce((sum, b) => sum + b.totalPrice, 0);

      dailyRevenue.push({
        date: day.toISOString().split('T')[0],
        revenue,
        bookings: dayBookings.length,
      });
    }

    res.status(200).json({
      success: true,
      period,
      startDate: start,
      endDate: end,
      summary: {
        totalRevenue,
        totalBookings,
        avgRevenuePerBooking: Math.round(avgRevenuePerBooking),
        paidAmount,
        pendingAmount,
      },
      paymentMethods,
      topServices,
      dailyRevenue,
    });
  } catch (error) {
    console.error('❌ Revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue report',
      error: error.message,
    });
  }
};

// @desc    Get dashboard overview stats
// @route   GET /api/reports/dashboard
// @access  Private (Owner)
exports.getDashboardStats = async (req, res) => {
  try {
    const { salonId } = req.query;

    if (!salonId) {
      return res.status(400).json({
        success: false,
        message: 'Salon ID is required',
      });
    }

    // Verify ownership
    const salon = await Salon.findById(salonId);
    if (!salon || salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's stats
    const todayBookings = await Booking.find({
      salonId,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const todayCompleted = todayBookings.filter(b => b.status === 'completed');
    const todayRevenue = todayCompleted.reduce((sum, b) => sum + b.totalPrice, 0);

    // This month stats
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthBookings = await Booking.find({
      salonId,
      createdAt: { $gte: monthStart },
      status: 'completed',
    });

    const monthRevenue = monthBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    // Active queue
    const activeQueue = await Booking.countDocuments({
      salonId,
      status: { $in: ['pending', 'in-progress'] },
    });

    // Total customers (unique)
    const totalCustomers = await Booking.distinct('userId', {
      salonId,
      userId: { $ne: null },
    });

    res.status(200).json({
      success: true,
      stats: {
        today: {
          bookings: todayBookings.length,
          completed: todayCompleted.length,
          revenue: todayRevenue,
        },
        month: {
          bookings: monthBookings.length,
          revenue: monthRevenue,
        },
        activeQueue,
        totalCustomers: totalCustomers.length,
      },
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message,
    });
  }
};

module.exports = {
  getDailySummary: exports.getDailySummary,
  getStaffPerformance: exports.getStaffPerformance,
  getRevenueReport: exports.getRevenueReport,
  getDashboardStats: exports.getDashboardStats,
};
