const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');

// @desc    Get today's scheduled bookings for salon
// @route   GET /api/scheduled-bookings/:salonId/today
// @access  Private (Owner/Manager/Staff)
exports.getTodayScheduledBookings = async (req, res) => {
  try {
    const { salonId } = req.params;

    const now = new Date();

    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    console.log('📅 Getting scheduled bookings for:', {
      salonId,
      startOfDay,
      endOfDay,
      serverTime: now,
    });

    const todayBookings = await Booking.find({
      salonId,
      bookingType: 'scheduled',
      status: { $in: ['pending', 'in-progress'] },
      arrived: false,
      scheduledDate: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    })
      .populate('userId', 'name phone')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    console.log(`✅ ${todayBookings.length} bookings for today (not yet arrived)`);

    res.status(200).json({
      success: true,
      count: todayBookings.length,
      bookings: todayBookings.map(booking => ({
        _id: booking._id,
        customerName: booking.userId?.name || 'Unknown',
        customerPhone: booking.userId?.phone || 'N/A',
        scheduledTime: booking.scheduledTime,
        scheduledDate: booking.scheduledDate,
        services: booking.services,
        totalPrice: booking.totalPrice,
        totalDuration: booking.totalDuration,
        status: booking.status,
        arrived: booking.arrived || false,
        arrivedAt: booking.arrivedAt,
        queuePosition: booking.queuePosition,
      })),
    });

  } catch (error) {
    console.error('❌ Get scheduled bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled bookings',
      error: error.message,
    });
  }
};



// @desc    Get tomorrow's scheduled bookings for salon
// @route   GET /api/scheduled-bookings/:salonId/tomorrow
// @access  Private (Owner/Manager/Staff)
exports.gettomorrowScheduledBookings = async (req, res) => {
  try {
    const { salonId } = req.params;

    const now = new Date();

    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const endOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2
    );

    console.log('📅 Getting tomorrow scheduled bookings for:', {
      salonId,
      startOfTomorrow,
      endOfTomorrow,
      serverTime: now,
    });

    const tomorrowBookings = await Booking.find({
      salonId,
      bookingType: 'scheduled',
      status: { $in: ['pending', 'in-progress'] },
      arrived: false,
      scheduledDate: {
        $gte: startOfTomorrow,
        $lt: endOfTomorrow,
      },
    })
      .populate('userId', 'name phone')
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    console.log(`✅ ${tomorrowBookings.length} bookings for tomorrow (not yet arrived)`);

    res.status(200).json({
      success: true,
      count: tomorrowBookings.length,
      bookings: tomorrowBookings.map(booking => ({
        _id: booking._id,
        customerName: booking.userId?.name || 'Unknown',
        customerPhone: booking.userId?.phone || 'N/A',
        scheduledTime: booking.scheduledTime,
        scheduledDate: booking.scheduledDate,
        services: booking.services,
        totalPrice: booking.totalPrice,
        totalDuration: booking.totalDuration,
        status: booking.status,
        arrived: booking.arrived || false,
        arrivedAt: booking.arrivedAt,
        queuePosition: booking.queuePosition,
      })),
    });

  } catch (error) {
    console.error('❌ Get tomorrow scheduled bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled bookings',
      error: error.message,
    });
  }
};


// @desc    Mark scheduled booking as no-show
// @route   PATCH /api/scheduled-bookings/:bookingId/no-show
// @access  Private (Owner/Manager)
exports.markNoShow = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name phone fcmToken')
      .populate('salonId', 'name');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.bookingType !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Only scheduled bookings can be marked as no-show',
      });
    }

    if (booking.status === 'no-show') {
      return res.status(400).json({
        success: false,
        message: 'Booking already marked as no-show',
      });
    }

    // Update booking
    booking.status = 'no-show';
    booking.cancellationReason = reason || 'Customer did not arrive';
    await booking.save();

    console.log(`✅ Booking marked as no-show: ${bookingId}`);

    // Emit socket event
    if (global.io) {
      global.io.to(`salon_${booking.salonId._id}`).emit('booking_no_show', {
        bookingId: booking._id.toString(),
      });

      // Notify customer
      if (booking.userId && booking.userId._id) {
        global.io.to(`user_${booking.userId._id}`).emit('booking_no_show', {
          bookingId: booking._id.toString(),
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking marked as no-show',
      booking: {
        _id: booking._id,
        status: booking.status,
      },
    });
  } catch (error) {
    console.error('❌ Mark no-show error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark no-show',
      error: error.message,
    });
  }
};

// @desc    Mark scheduled booking as arrived (joins queue)
// @route   PATCH /api/scheduled-bookings/:bookingId/mark-arrived
// @access  Private (Owner/Manager/Staff)
exports.markScheduledArrived = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name phone fcmToken')
      .populate('salonId', 'name');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.arrived) {
      return res.status(400).json({
        success: false,
        message: 'Customer already marked as arrived',
      });
    }

    // ✅ FIXED: Count ALL active bookings (not just arrived)
    // This ensures position is never 0
    const currentQueueSize = await Booking.countDocuments({
      salonId: booking.salonId._id,
      status: { $in: ['pending', 'in-progress'] },
    });

    //     booking.arrived = true;
    // booking.arrivedAt = new Date();
    // booking.joinedAt = new Date();
    // booking.queuePosition = calculatedPosition;
    // booking.status = 'pending';


    // Mark as arrived and assign queue position
    booking.arrived = true;
    booking.arrivedAt = new Date();
    booking.queuePosition = currentQueueSize + 1; // ✅ Always at least 1

    await booking.save();

    console.log(`✅ Scheduled booking marked as arrived: ${bookingId}, Queue position: ${booking.queuePosition}`);

    // Reorder queue to ensure no gaps
    await _reorderQueuePositions(booking.salonId._id);

    // Emit socket events
    if (global.io) {
      global.io.to(`salon_${booking.salonId._id}`).emit('queue_updated', {
        action: 'scheduled_arrived',
        bookingId: booking._id.toString(),
      });

      // Notify customer
      if (booking.userId && booking.userId._id) {
        global.io.to(`user_${booking.userId._id}`).emit('arrival_confirmed', {
          bookingId: booking._id.toString(),
          queuePosition: booking.queuePosition,
        });
      }
    }

    // Emit wait time update
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(booking.salonId._id);

    res.status(200).json({
      success: true,
      message: 'Scheduled booking marked as arrived and added to queue',
      booking: {
        _id: booking._id,
        arrived: booking.arrived,
        arrivedAt: booking.arrivedAt,
        queuePosition: booking.queuePosition,
      },
    });
  } catch (error) {
    console.error('❌ Mark scheduled arrived error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark arrival',
      error: error.message,
    });
  }
};



// ✅ NEW: Helper function to reorder queue positions
async function _reorderQueuePositions(salonId) {
  try {
    const activeBookings = await Booking.find({
      salonId,
      status: { $in: ['pending', 'in-progress'] },
    }).sort({ queuePosition: 1, createdAt: 1 });

    for (let i = 0; i < activeBookings.length; i++) {
      if (activeBookings[i].queuePosition !== i + 1) {
        activeBookings[i].queuePosition = i + 1;
        await activeBookings[i].save();
      }
    }

    console.log(`🔄 Queue reordered for salon ${salonId}: ${activeBookings.length} positions`);
  } catch (error) {
    console.error('❌ Reorder queue error:', error);
  }
}

// Add this to your scheduledBookingController.js (temporary for debugging)
exports.debugScheduledBookings = async (req, res) => {
  try {
    const { salonId } = req.params;

    // Get ALL bookings for this salon (no date filter)
    const allBookings = await Booking.find({
      salonId,
      bookingType: 'scheduled',
    })
      .populate('userId', 'name phone')
      .sort({ scheduledDate: -1 })
      .limit(10);

    console.log('🔍 DEBUG: All scheduled bookings:', allBookings.length);

    allBookings.forEach(b => {
      console.log(`  - ID: ${b._id}`);
      console.log(`    Date: ${b.scheduledDate}`);
      console.log(`    Time: ${b.scheduledTime}`);
      console.log(`    Status: ${b.status}`);
      console.log(`    Arrived: ${b.arrived}`);
      console.log('---');
    });

    // Check what "today" means on server
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('🕐 Server timezone info:');
    console.log('  Now:', now);
    console.log('  Today start:', today);
    console.log('  Tomorrow start:', tomorrow);
    console.log('  Timezone offset:', now.getTimezoneOffset(), 'minutes');

    res.json({
      success: true,
      serverTime: now,
      todayStart: today,
      tomorrowStart: tomorrow,
      timezoneOffset: now.getTimezoneOffset(),
      allBookings: allBookings.map(b => ({
        _id: b._id,
        scheduledDate: b.scheduledDate,
        scheduledTime: b.scheduledTime,
        status: b.status,
        arrived: b.arrived,
        customerName: b.userId?.name || 'Unknown',
      })),
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  getTodayScheduledBookings: exports.getTodayScheduledBookings,
  markNoShow: exports.markNoShow,
  markScheduledArrived: exports.markScheduledArrived,
  debugScheduledBookings: exports.debugScheduledBookings,
  gettomorrowScheduledBookings: exports.gettomorrowScheduledBookings,
};


