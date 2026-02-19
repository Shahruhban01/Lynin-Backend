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

    // ✅ NEW: Weekly traffic data (last 7 days)
    const weeklyTraffic = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await Booking.countDocuments({
        salonId,
        status: 'completed',
        completedAt: { $gte: date, $lt: nextDate },
      });

      const dayName = dayNames[date.getDay()];
      weeklyTraffic[dayName] = count;
    }

    // Normalize weekly traffic to 0-1 scale for chart
    const maxTraffic = Math.max(...Object.values(weeklyTraffic), 1);
    const normalizedWeeklyTraffic = {};
    Object.keys(weeklyTraffic).forEach(day => {
      normalizedWeeklyTraffic[day] = weeklyTraffic[day] / maxTraffic;
    });

    // Other stats
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
      bookingType: 'immediate',
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
    const WaitTimeService = require('../services/waitTimeService');

    const waitInfo = await WaitTimeService.getWaitTimeForSalon(salon);

    const avgWait = waitInfo.waitMinutes || 0;


    // const completedBookings = await Booking.find({
    //   salonId,
    //   status: 'completed',
    //   completedAt: { $gte: today, $lt: tomorrow },
    //   startedAt: { $exists: true },
    //   joinedAt: { $exists: true },
    // });

    // let totalWaitTime = 0;
    // completedBookings.forEach(booking => {
    //   const waitTime = (new Date(booking.startedAt) - new Date(booking.joinedAt)) / 1000 / 60;
    //   totalWaitTime += waitTime;
    // });

    // const avgWait = completedBookings.length > 0 
    //   ? Math.round(totalWaitTime / completedBookings.length) 
    //   : 0;

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

      // Dashboard metrics
      customersServed: customersServedToday,
      customersServedYesterday: customersServedYesterday,
      percentageChange: percentageChange,
      waitAccuracy: waitAccuracyPercentage,
      noShowRate: noShowRate,
      peakHours: peakHoursFormatted,

      // Queue stats
      inQueue,
      inService,
      activeBarbers: salon.activeBarbers || salon.totalBarbers || 1,
      avgWait,

      // Service stats
      completedServices: totalServicesToday,
      walkInsToday,

      // Scheduled bookings
      scheduledToday,
      scheduledPending,
      scheduledArrived,
      scheduledNoShow,

      // Salon info
      isOpen: salon.isOpen || false,
      salonName: salon.name,
      address: fullAddress,
      city: locationCity,
      state: locationState,
      avgServiceTime: salon.avgServiceTime || 30,

      // ✅ NEW: Weekly traffic data
      weeklyTraffic: normalizedWeeklyTraffic,
      weeklyTrafficRaw: weeklyTraffic, // Include raw counts for reference
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