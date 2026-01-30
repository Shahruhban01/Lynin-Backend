const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');
const {
  addWalkInCustomer,
  startService,
  completeService,
  markCustomerArrivedService,
  skipCustomerService,
  undoSkipService,
  startPriorityServiceService,
} = require('../services/queueService');


// @desc    Get live queue for salon
// @route   GET /api/queue/:salonId
// @access  Private (Owner/Manager/Staff)
exports.getQueueBySalon = async (req, res) => {
  try {
    const { salonId } = req.params;

    // Get all active bookings (pending + in-progress)
    const queue = await Booking.find({
      salonId,
      status: { $in: ['pending', 'in-progress'] },
    })
      .populate('userId', 'name phone')
      .sort({ queuePosition: 1 })
      .lean();

    console.log(`📋 Queue fetched for salon ${salonId}: ${queue.length} items`);

    res.status(200).json({
      success: true,
      count: queue.length,
      queue: queue.map((booking) => {
        // ✅ Debug log
        console.log(`Booking ${booking._id}: walkInToken = ${booking.walkInToken}`);

        return {
          _id: booking._id,
          customerName: booking.userId?.name || (booking.walkInToken ? `Token #${booking.walkInToken}` : 'Walk-in Customer'),
          customerPhone: booking.userId?.phone || 'N/A',
          walkInToken: booking.walkInToken || null, // ✅ Make sure this is here
          services: booking.services,
          totalPrice: booking.totalPrice,
          totalDuration: booking.totalDuration,
          queuePosition: booking.queuePosition,
          status: booking.status,
          arrived: booking.arrived || false,
          arrivedAt: booking.arrivedAt,
          joinedAt: booking.joinedAt,
          estimatedStartTime: booking.estimatedStartTime,
        };
      }),
    });

  } catch (error) {
    console.error('❌ Get queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue',
      error: error.message,
    });
  }
};


// @desc    Add walk-in customer to queue
// @route   POST /api/queue/:salonId/walk-in
// @access  Private (Owner/Manager/Staff)
exports.addWalkInToQueue = async (req, res) => {
  try {
    const { salonId } = req.params;

    const booking = await addWalkInCustomer({
      salonId,
      name: req.body.name,
      phone: req.body.phone,
      services: req.body.services,
    });

    // Emit socket
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('queue_updated', {
        action: 'walk_in_added',
        salonId: salonId.toString(),
      });
    }

    // Wait time
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(salonId);

    const customerName = booking.userId?.name
      || (booking.walkInToken ? `Token #${booking.walkInToken}` : 'Walk-in');

    res.status(201).json({
      success: true,
      message: 'Walk-in added successfully',
      booking: {
        _id: booking._id,
        customerName,
        customerPhone: booking.userId?.phone || 'N/A',
        walkInToken: booking.walkInToken,
        queuePosition: booking.queuePosition,
        status: booking.status,
      },
    });

  } catch (error) {
    console.error('❌ Add walk-in error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc    Mark customer as arrived
// @route   POST /api/queue/:salonId/arrived
// @access  Private (Owner/Manager/Staff)
exports.markCustomerArrived = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { bookingId, phoneLastFour } = req.body;

    // Call service
    const booking = await markCustomerArrivedService(
      salonId,
      bookingId,
      phoneLastFour
    );

    console.log(`✅ Customer arrived: Booking ${booking._id}`);

    // Emit socket
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('customer_arrived', {
        bookingId: booking._id,
      });

      if (booking.userId) {
        global.io.to(`user_${booking.userId}`).emit('arrival_confirmed', {
          bookingId: booking._id,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Customer marked as arrived',
      booking: {
        _id: booking._id,
        queuePosition: booking.queuePosition,
        arrived: booking.arrived,
        arrivedAt: booking.arrivedAt,
      },
    });

  } catch (error) {
    console.error('❌ Mark arrived error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc    Start service for booking
// @route   POST /api/queue/:salonId/start/:bookingId
// @access  Private (Owner/Manager/Staff)
exports.startService = async (req, res) => {
  try {
    const { salonId, bookingId } = req.params;

    // Call service
    const booking = await startService(salonId, bookingId);

    // Emit socket
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('service_started', {
        bookingId: booking._id,
      });

      if (booking.userId) {
        global.io.to(`user_${booking.userId}`).emit('service_started', {
          bookingId: booking._id,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Service started',
      booking: {
        _id: booking._id,
        status: booking.status,
        startedAt: booking.startedAt,
      },
    });

  } catch (error) {
    console.error('❌ Start service error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc Complete service
// @route POST /api/queue/:salonId/complete/:bookingId
// @access Private (Owner/Manager/Staff)
exports.completeService = async (req, res) => {
  try {
    const { salonId, bookingId } = req.params;

    // Call service
    const { booking, pointsEarned } =
      await completeService(salonId, bookingId);

    // Reorder queue
    await _reorderQueuePositions(salonId);

    // Emit socket
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('service_completed', {
        bookingId: booking._id,
      });

      if (booking.userId) {
        global.io.to(`user_${booking.userId}`).emit('service_completed', {
          bookingId: booking._id,
          pointsEarned,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Service completed and payment recorded',
      booking: {
        _id: booking._id,
        status: booking.status,
        completedAt: booking.completedAt,
        paymentStatus: booking.paymentStatus,
        paidAmount: booking.paidAmount,
      },
      pointsEarned,
    });

  } catch (error) {
    console.error('❌ Complete service error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



// @desc    Skip customer
// @route   POST /api/queue/:salonId/skip/:bookingId
// @access  Private (Owner/Manager)
exports.skipCustomer = async (req, res) => {
  try {
    const { salonId, bookingId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Skip reason is required',
      });
    }

    // Call service
    const {
      booking,
      originalPosition,
      newPosition,
    } = await skipCustomerService(
      salonId,
      bookingId,
      reason
    );

    console.log(`⏭️ Customer skipped: ${bookingId}`);
    console.log(`   ${originalPosition} → ${newPosition}`);
    console.log(`   Reason: ${reason}`);

    // Emit socket
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('queue_updated', {
        action: 'customer_skipped',
        bookingId: booking._id.toString(),
        salonId: salonId.toString(),
      });
    }

    // Wait time update
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(salonId);

    res.status(200).json({
      success: true,
      message: 'Customer skipped',
      booking: {
        _id: booking._id,
        status: booking.status,
        queuePosition: booking.queuePosition,
        skippedAt: booking.skippedAt,
        originalPosition,
      },
    });

  } catch (error) {
    console.error('❌ Skip customer error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc    Undo skip
// @route   POST /api/queue/:salonId/undo-skip/:bookingId
// @access  Private (Owner/Manager)
exports.undoSkip = async (req, res) => {
  try {
    const { salonId, bookingId } = req.params;
    const { returnToOriginal, originalPosition } = req.body;

    // Call service
    const { booking, message } = await undoSkipService(
      salonId,
      bookingId,
      returnToOriginal,
      originalPosition
    );

    console.log(`↩️ Undo skip: ${booking._id}`);

    // Socket
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('queue_updated', {
        action: 'skip_undone',
        bookingId: booking._id.toString(),
        salonId: salonId.toString(),
      });
    }

    // Wait time
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(salonId);

    res.status(200).json({
      success: true,
      message,
      booking: {
        _id: booking._id,
        status: booking.status,
        queuePosition: booking.queuePosition,
        returnedToOriginal: !!returnToOriginal,
      },
    });

  } catch (error) {
    console.error('❌ Undo skip error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



// @desc    Cancel booking
// @route   POST /api/queue/:salonId/cancel/:bookingId
// @access  Private (Owner/Manager)
exports.cancelBooking = async (req, res) => {
  try {
    const { salonId, bookingId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required',
      });
    }

    const booking = await Booking.findOne({ _id: bookingId, salonId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    await booking.save();

    console.log(`❌ Booking cancelled: ${bookingId} - Reason: ${reason}`);

    await _reorderQueuePositions(salonId);

    // Emit socket event
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('booking_cancelled', {
        bookingId: booking._id,
      });

      if (booking.userId) {
        global.io.to(`user_${booking.userId}`).emit('booking_cancelled', {
          bookingId: booking._id,
          reason,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled',
    });
  } catch (error) {
    console.error('❌ Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message,
    });
  }
};

// Helper: Reorder queue positions after changes
async function _reorderQueuePositions(salonId) {
  const activeBookings = await Booking.find({
    salonId,
    status: { $in: ['pending', 'in-progress'] },
  }).sort({ queuePosition: 1 });

  for (let i = 0; i < activeBookings.length; i++) {
    activeBookings[i].queuePosition = i + 1;
    await activeBookings[i].save();
  }

  console.log(`🔄 Queue reordered for salon ${salonId}: ${activeBookings.length} positions`);
}

// ✅ REPLACE THE PLACEHOLDER FUNCTIONS WITH THESE:

// @desc    Get today's priority usage count
// @route   GET /api/salons/:salonId/priority-count-today
// @access  Private (Owner/Manager)
exports.getPriorityCount = async (req, res) => {
  try {
    const { salonId } = req.params;

    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Reset if needed
    await salon.resetPriorityIfNeeded();

    res.status(200).json({
      success: true,
      usedToday: salon.priorityUsedToday,
      dailyLimit: salon.priorityLimitPerDay,
      remaining: salon.priorityLimitPerDay - salon.priorityUsedToday,
      canUse: salon.priorityUsedToday < salon.priorityLimitPerDay,
    });
  } catch (error) {
    console.error('❌ Get priority count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch priority count',
      error: error.message,
    });
  }
};

// @desc    Start priority service
// @route   POST /api/queue/:salonId/start-priority/:bookingId
// @access  Private (Owner/Manager ONLY)
exports.startPriorityService = async (req, res) => {
  try {
    const { salonId, bookingId } = req.params;
    const { reason, assignedStaffId } = req.body;

    // Call service
    const {
      booking,
      salon,
      originalPosition,
    } = await startPriorityServiceService({
      salonId,
      bookingId,
      reason,
      assignedStaffId,
      user: req.user,
      userSalonRole: req.userSalonRole,
    });

    console.log(`⚡ Priority started: ${booking._id}`);

    // Socket
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('queue_updated', {
        action: 'priority_started',
        bookingId: booking._id.toString(),
        salonId: salonId.toString(),
      });

      if (booking.userId) {
        global.io.to(`user_${booking.userId._id}`).emit('service_started', {
          bookingId: booking._id.toString(),
          priority: true,
          reason,
        });
      }

      if (assignedStaffId) {
        global.io.to(`staff_${assignedStaffId}`).emit('booking_assigned', {
          bookingId: booking._id.toString(),
          priority: true,
        });
      }
    }

    // Wait time
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(salonId);

    res.status(200).json({
      success: true,
      message: 'Priority service started successfully',

      booking: {
        _id: booking._id,
        status: booking.status,
        startedAt: booking.startedAt,
        priorityReason: reason,
        originalPosition,
      },

      priorityUsage: {
        used: salon.priorityUsedToday,
        limit: salon.priorityLimitPerDay,
        remaining:
          salon.priorityLimitPerDay - salon.priorityUsedToday,
      },
    });

  } catch (error) {
    console.error('❌ Priority start error:', error);

    res.status(400).json({
      success: false,
      message: error.message,
      code: error.code || null,
    });
  }
};
