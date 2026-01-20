// controllers/dashboardController.js
const Booking = require('../models/Booking');
const Salon = require('../models/Salon');

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

    // Date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Customers served today
    const customersServedToday = await Booking.countDocuments({
      salonId,
      status: 'completed',
      completedAt: { $gte: today, $lt: tomorrow },
    });

    // Customers served yesterday
    const customersServedYesterday = await Booking.countDocuments({
      salonId,
      status: 'completed',
      completedAt: { $gte: yesterday, $lt: today },
    });

    // Calculate percentage change
    let percentageChange = 0;
    if (customersServedYesterday > 0) {
      percentageChange = Math.round(
        ((customersServedToday - customersServedYesterday) / customersServedYesterday) * 100
      );
    } else if (customersServedToday > 0) {
      percentageChange = 100;
    }

    // Wait accuracy calculation
    const completedBookingsWithTimes = await Booking.find({
      salonId,
      status: 'completed',
      completedAt: { $gte: today, $lt: tomorrow },
      startedAt: { $exists: true },
      joinedAt: { $exists: true },
      estimatedStartTime: { $exists: true },
    });

    let waitAccuracyPercentage = 0;
    if (completedBookingsWithTimes.length > 0) {
      let accurateCount = 0;
      
      completedBookingsWithTimes.forEach(booking => {
        const actualWaitTime = (new Date(booking.startedAt) - new Date(booking.joinedAt)) / 1000 / 60;
        const estimatedWaitTime = (new Date(booking.estimatedStartTime) - new Date(booking.joinedAt)) / 1000 / 60;
        
        const margin = estimatedWaitTime * 0.1;
        if (Math.abs(actualWaitTime - estimatedWaitTime) <= margin) {
          accurateCount++;
        }
      });
      
      waitAccuracyPercentage = Math.round((accurateCount / completedBookingsWithTimes.length) * 100);
    }

    // No-show rate
    const totalScheduledToday = await Booking.countDocuments({
      salonId,
      bookingType: 'scheduled',
      scheduledDate: { $gte: today, $lt: tomorrow },
    });

    const noShowToday = await Booking.countDocuments({
      salonId,
      bookingType: 'scheduled',
      scheduledDate: { $gte: today, $lt: tomorrow },
      status: 'no-show',
    });

    const noShowRate = totalScheduledToday > 0 
      ? Math.round((noShowToday / totalScheduledToday) * 100) 
      : 0;

    // Peak hours calculation
    const todayBookings = await Booking.find({
      salonId,
      status: 'completed',
      completedAt: { $gte: today, $lt: tomorrow },
      startedAt: { $exists: true },
    });

    const hourlyBookings = {};
    todayBookings.forEach(booking => {
      if (booking.startedAt) {
        const hour = new Date(booking.startedAt).getHours();
        hourlyBookings[hour] = (hourlyBookings[hour] || 0) + 1;
      }
    });

    let peakStart = null;
    let peakEnd = null;
    let maxBookings = 0;

    for (let hour = 0; hour < 22; hour++) {
      const count = (hourlyBookings[hour] || 0) + (hourlyBookings[hour + 1] || 0);
      if (count > maxBookings) {
        maxBookings = count;
        peakStart = hour;
        peakEnd = hour + 2;
      }
    }

    let peakHoursFormatted = 'N/A';
    if (peakStart !== null) {
      const formatHour = (h) => {
        const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        const period = h >= 12 ? 'PM' : 'AM';
        return `${hour12}:00 ${period}`;
      };
      peakHoursFormatted = `${formatHour(peakStart)} – ${formatHour(peakEnd)}`;
    }

    // Other stats for complex dashboard
    const inQueue = await Booking.countDocuments({
      salonId,
      status: 'pending',
    });

    const inService = await Booking.countDocuments({
      salonId,
      status: 'in-progress',
    });

    // Total services completed
    let totalServicesToday = 0;
    todayBookings.forEach(booking => {
      totalServicesToday += booking.services.length;
    });

    // Walk-ins
    const walkInsToday = await Booking.countDocuments({
      salonId,
      joinedAt: { $gte: today, $lt: tomorrow },
      $or: [{ userId: null }, { 'services.0': { $exists: true } }]
    });

    // Scheduled bookings
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

    // Average wait time
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

    // Location
    const locationAddress = salon.location?.address || '';
    const locationCity = salon.location?.city || '';
    const locationState = salon.location?.state || '';
    
    let fullAddress = locationAddress;
    if (locationCity) {
      fullAddress = locationCity;
      if (locationState) {
        fullAddress = `${locationCity}, ${locationState.toUpperCase()}`;
      }
    }

    res.status(200).json({
      success: true,
      
      // NEW FIELDS for simplified dashboard
      customersServedYesterday: customersServedYesterday,
      percentageChange: percentageChange,
      waitAccuracy: waitAccuracyPercentage,
      noShowRate: noShowRate,
      peakHours: peakHoursFormatted,
      
      // EXISTING FIELDS for complex dashboard
      inQueue,
      inService,
      activeBarbers: salon.activeBarbers || salon.totalBarbers || 0,
      avgWait,
      customersServed: customersServedToday,
      completedServices: totalServicesToday,
      walkInsToday,
      peakHour: peakHoursFormatted,
      isOpen: salon.isOpen || false,
      salonName: salon.name,
      address: fullAddress,
      city: locationCity,
      state: locationState,
      scheduledToday,
      scheduledPending,
      scheduledArrived,
      scheduledNoShow,
      avgServiceTime: salon.avgServiceTime || 30,
      queueTrend: inQueue > 5 ? `+${inQueue - 5}` : null,
      todayRevenue: null,
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
