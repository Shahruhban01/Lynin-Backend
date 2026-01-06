const Booking = require('../models/Booking');
const Salon = require('../models/Salon');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/:salonId
// @access  Private (Owner/Manager/Staff)
exports.getDashboardStats = async (req, res) => {
  try {
    const { salonId } = req.params;

    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Live queue stats
    const inQueue = await Booking.countDocuments({
      salonId,
      status: 'pending',
    });

    const inService = await Booking.countDocuments({
      salonId,
      status: 'in-progress',
    });

    // Today's stats
    const todayCompleted = await Booking.countDocuments({
      salonId,
      status: 'completed',
      completedAt: { $gte: today, $lt: tomorrow },
    });

    const todayBookings = await Booking.find({
      salonId,
      status: 'completed',
      completedAt: { $gte: today, $lt: tomorrow },
    });

    // Calculate total services completed today
    let totalServicesToday = 0;
    todayBookings.forEach(booking => {
      totalServicesToday += booking.services.length;
    });

    // Walk-ins today
    const walkInsToday = await Booking.countDocuments({
      salonId,
      joinedAt: { $gte: today, $lt: tomorrow },
      $or: [
        { userId: null },
        { 'services.0': { $exists: true } }
      ]
    });

    // Scheduled bookings stats
    const scheduledToday = await Booking.countDocuments({
      salonId,
      bookingType: 'scheduled',
      scheduledDate: { $gte: today, $lt: tomorrow },
    });

    const scheduledPending = await Booking.countDocuments({
      salonId,
      bookingType: 'scheduled',
      scheduledDate: { $gte: today, $lt: tomorrow },
      arrived: false,
      status: 'pending',
    });

    const scheduledArrived = await Booking.countDocuments({
      salonId,
      bookingType: 'scheduled',
      scheduledDate: { $gte: today, $lt: tomorrow },
      arrived: true,
    });

    const scheduledNoShow = await Booking.countDocuments({
      salonId,
      bookingType: 'scheduled',
      scheduledDate: { $gte: today, $lt: tomorrow },
      status: 'no-show',
    });

    // Calculate average wait time (in minutes)
    const completedBookings = await Booking.find({
      salonId,
      status: 'completed',
      completedAt: { $gte: today, $lt: tomorrow },
      startedAt: { $exists: true },
      joinedAt: { $exists: true },
    });

    let totalWaitTime = 0;
    completedBookings.forEach(booking => {
      const waitTime = (new Date(booking.startedAt) - new Date(booking.joinedAt)) / 1000 / 60;
      totalWaitTime += waitTime;
    });

    const avgWait = completedBookings.length > 0 
      ? Math.round(totalWaitTime / completedBookings.length) 
      : 0;

    // Find peak hour
    const hourlyBookings = {};
    todayBookings.forEach(booking => {
      if (booking.startedAt) {
        const hour = new Date(booking.startedAt).getHours();
        hourlyBookings[hour] = (hourlyBookings[hour] || 0) + 1;
      }
    });

    let peakHour = null;
    let maxBookings = 0;
    Object.keys(hourlyBookings).forEach(hour => {
      if (hourlyBookings[hour] > maxBookings) {
        maxBookings = hourlyBookings[hour];
        peakHour = hour;
      }
    });

    const peakHourFormatted = peakHour 
      ? `${peakHour > 12 ? peakHour - 12 : peakHour}:00 ${peakHour >= 12 ? 'PM' : 'AM'}`
      : 'N/A';

    // ✅ Extract location details properly
    const locationAddress = salon.location?.address || 'N/A';
    const locationCity = salon.location?.city || '';
    const locationState = salon.location?.state || '';
    
    // Format: "address, city" or just "address" if city not available
    let fullAddress = locationAddress;
    if (locationCity) {
      fullAddress = `${locationAddress}, ${locationCity}`;
      if (locationState) {
        fullAddress = `${locationAddress}, ${locationCity}, ${locationState.toUpperCase()}`;
      }
    }

    res.status(200).json({
      success: true,
      inQueue,
      inService,
      activeBarbers: salon.activeBarbers || salon.totalBarbers || 0,
      avgWait,
      customersServed: todayCompleted,
      completedServices: totalServicesToday,
      walkInsToday,
      peakHour: peakHourFormatted,
      isOpen: salon.isOpen || false,
      salonName: salon.name,
      address: fullAddress, // ✅ "9C69+RXJ, 193201, sopore, JK"
      city: locationCity, // ✅ "sopore"
      state: locationState, // ✅ "jk"
      scheduledToday,
      scheduledPending,
      scheduledArrived,
      scheduledNoShow,
      avgServiceTime: salon.avgServiceTime || 30,
      queueTrend: inQueue > 5 ? '+2' : null,
      todayRevenue: null, // Will be implemented with payment system
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
