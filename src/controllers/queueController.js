const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');
const {
  addWalkInCustomer,
  startService,
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

    let booking;

    if (bookingId) {
      booking = await Booking.findOne({ _id: bookingId, salonId });
    } else if (phoneLastFour) {
      const users = await User.find({
        phone: { $regex: `${phoneLastFour}$` },
      });

      if (users.length > 0) {
        booking = await Booking.findOne({
          salonId,
          userId: { $in: users.map((u) => u._id) },
          status: 'pending',
          arrived: false,
        }).sort({ queuePosition: 1 });
      }
    }

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

    booking.arrived = true;
    booking.arrivedAt = new Date();
    await booking.save();

    console.log(`✅ Customer arrived: Booking ${booking._id}`);

    // Emit socket event
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
    res.status(500).json({
      success: false,
      message: 'Failed to mark arrival',
      error: error.message,
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

    const booking = await Booking.findOne({ _id: bookingId, salonId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Service not in progress',
      });
    }

    // Calculate loyalty points (1 point per ₹10 spent)
    const pointsEarned = Math.floor(booking.totalPrice / 10);

    // Update booking status AND payment status
    booking.status = 'completed';
    booking.completedAt = new Date();
    booking.loyaltyPointsEarned = pointsEarned;

    // AUTO-MARK PAYMENT AS PAID
    booking.paymentStatus = 'paid';
    booking.paidAmount = booking.totalPrice;
    booking.paymentDate = new Date();

    await booking.save();

    // ✅ Award loyalty points to user (only if user exists)
    if (booking.userId) {
      const User = require('../models/User');

      console.log('🔍 DEBUG: Before update:');
      console.log('   User ID:', booking.userId);
      console.log('   Points to award:', pointsEarned);

      // ✅ First, get current user state
      const userBefore = await User.findById(booking.userId).select('name loyaltyPoints totalBookings');
      console.log('   Current loyalty points:', userBefore?.loyaltyPoints);
      console.log('   Current total bookings:', userBefore?.totalBookings);

      // ✅ UPDATED: More explicit update with logging
      const updatedUser = await User.findByIdAndUpdate(
        booking.userId,
        {
          $inc: {
            totalBookings: 1,
            loyaltyPoints: pointsEarned
          },
        },
        {
          new: true,  // ✅ Return updated document
          runValidators: true  // ✅ Run schema validators
        }
      ).select('name loyaltyPoints totalBookings');

      console.log('🔍 DEBUG: After update:');
      console.log('   Updated user:', updatedUser);
      console.log('   New loyalty points:', updatedUser?.loyaltyPoints);
      console.log('   New total bookings:', updatedUser?.totalBookings);

      if (updatedUser) {
        console.log(`✅ Service completed. ${pointsEarned} loyalty points awarded to user ${booking.userId}`);
        console.log(`💰 Payment auto-marked as paid: ₹${booking.totalPrice}`);
      } else {
        console.error('❌ ERROR: User update returned null!');
      }
    } else {
      console.log(`✅ Service completed for walk-in (Token: ${booking.walkInToken || 'N/A'})`);
      console.log(`💰 Payment auto-marked as paid: ₹${booking.totalPrice}`);
    }

    // Reorder queue positions
    await _reorderQueuePositions(salonId);

    // Emit socket event
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
    res.status(500).json({
      success: false,
      message: 'Failed to complete service',
      error: error.message,
    });
  }
};


// controllers/queueController.js (or wherever your queue functions are)

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

    const booking = await Booking.findOne({ _id: bookingId, salonId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // ✅ Save original position before changing
    const originalPosition = booking.queuePosition;

    // ✅ Find highest position (including skipped items)
    const maxPosition = await Booking.findOne({
      salonId,
      status: { $in: ['pending', 'in-progress', 'skipped'] },
    })
      .sort({ queuePosition: -1 })
      .select('queuePosition');

    const newPosition = maxPosition ? maxPosition.queuePosition + 1 : 1;

    // ✅ Update booking with skip metadata
    booking.status = 'skipped';
    booking.queuePosition = newPosition; // Move to end
    booking.skippedAt = new Date();
    booking.originalPosition = originalPosition;
    booking.skipReason = reason;
    booking.notes = booking.notes ? `${booking.notes} | Skipped: ${reason}` : `Skipped: ${reason}`;
    await booking.save();

    console.log(`⏭️ Customer skipped: Booking ${bookingId}`);
    console.log(`   Original position: ${originalPosition} → New position: ${newPosition}`);
    console.log(`   Reason: ${reason}`);

    // ✅ Reorder active (non-skipped) bookings
    await _reorderActiveBookings(salonId);

    // Emit socket event
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('queue_updated', {
        action: 'customer_skipped',
        bookingId: booking._id.toString(),
        salonId: salonId.toString(),
      });
    }

    // Emit wait time update
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
        originalPosition: booking.originalPosition,
      },
    });
  } catch (error) {
    console.error('❌ Skip customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to skip customer',
      error: error.message,
    });
  }
};

// @desc    Undo skip - restore customer to queue
// @route   POST /api/queue/:salonId/undo-skip/:bookingId
// @access  Private (Owner/Manager)
exports.undoSkip = async (req, res) => {
  try {
    const { salonId, bookingId } = req.params;
    const { returnToOriginal, originalPosition } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, salonId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.status !== 'skipped') {
      return res.status(400).json({
        success: false,
        message: 'Booking is not in skipped status',
      });
    }

    let newPosition;
    let message;

    if (returnToOriginal && originalPosition) {
      // ✅ Return to original position (within 5 minutes)
      newPosition = originalPosition;

      // Shift other active bookings down to make space
      await Booking.updateMany(
        {
          salonId,
          status: { $in: ['pending', 'in-progress'] },
          queuePosition: { $gte: originalPosition },
        },
        {
          $inc: { queuePosition: 1 },
        }
      );

      message = `Customer restored to original position ${originalPosition}`;
      console.log(`↩️ Undo skip: Restored to position ${originalPosition}`);
    } else {
      // ✅ Add to end of active queue (after 5 minutes)
      const lastActiveBooking = await Booking.findOne({
        salonId,
        status: { $in: ['pending', 'in-progress'] },
      })
        .sort({ queuePosition: -1 })
        .select('queuePosition');

      newPosition = lastActiveBooking ? lastActiveBooking.queuePosition + 1 : 1;
      message = `Customer added to end of queue at position ${newPosition}`;
      console.log(`↩️ Undo skip: Added to end at position ${newPosition}`);
    }

    // ✅ Update booking
    booking.status = 'pending';
    booking.queuePosition = newPosition;
    booking.skippedAt = null;
    booking.originalPosition = null;
    booking.skipReason = null;
    await booking.save();

    // Reorder queue
    await _reorderActiveBookings(salonId);

    // Emit socket event
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('queue_updated', {
        action: 'skip_undone',
        bookingId: booking._id.toString(),
        salonId: salonId.toString(),
      });
    }

    // Emit wait time update
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(salonId);

    res.status(200).json({
      success: true,
      message,
      booking: {
        _id: booking._id,
        status: booking.status,
        queuePosition: booking.queuePosition,
        returnedToOriginal: returnToOriginal || false,
      },
    });
  } catch (error) {
    console.error('❌ Undo skip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to undo skip',
      error: error.message,
    });
  }
};

// Helper: Reorder only active (non-skipped) bookings
async function _reorderActiveBookings(salonId) {
  // Get active bookings sorted by position
  const activeBookings = await Booking.find({
    salonId,
    status: { $in: ['pending', 'in-progress'] },
  }).sort({ queuePosition: 1 });

  // Reassign positions sequentially (A-1, A-2, A-3...)
  for (let i = 0; i < activeBookings.length; i++) {
    if (activeBookings[i].queuePosition !== i + 1) {
      activeBookings[i].queuePosition = i + 1;
      await activeBookings[i].save();
    }
  }

  console.log(`🔄 Active queue reordered for salon ${salonId}: ${activeBookings.length} positions`);
}


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

// @desc    Start service as priority
// @route   POST /api/queue/:salonId/start-priority/:bookingId
// @access  Private (Owner/Manager ONLY)
exports.startPriorityService = async (req, res) => {
  try {
    const { salonId, bookingId } = req.params;
    const { reason, assignedStaffId } = req.body;

    console.log('⚡ Priority start request:');
    console.log('   Salon:', salonId);
    console.log('   Booking:', bookingId);
    console.log('   Reason:', reason);
    console.log('   User:', req.user._id);
    console.log('   Role:', req.user.role);

    // ✅ VALIDATION 1: Check reason
    const validReasons = ['Senior citizen', 'Medical urgency', 'Child', 'System exception'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Valid reason is required',
        validReasons,
      });
    }

    // ✅ VALIDATION 2: Check role (STRICT)
    if (req.user.role !== 'owner' && req.userSalonRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only owners and managers can use priority service',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // ✅ VALIDATION 3: Get salon and check priority limit
    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Reset count if new day
    await salon.resetPriorityIfNeeded();

    if (salon.priorityUsedToday >= salon.priorityLimitPerDay) {
      return res.status(400).json({
        success: false,
        message: `Daily priority limit reached (${salon.priorityLimitPerDay}/${salon.priorityLimitPerDay})`,
        code: 'PRIORITY_LIMIT_REACHED',
      });
    }

    // ✅ VALIDATION 4: Check booking exists
    const booking = await Booking.findOne({ _id: bookingId, salonId })
      .populate('userId', 'name phone fcmToken');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot start priority - booking is ${booking.status}`,
      });
    }

    // ✅ VALIDATION 5: Check barber availability
    const inProgressCount = await Booking.countDocuments({
      salonId,
      status: 'in-progress',
    });

    const activeBarbers = salon.activeBarbers || 1;

    if (inProgressCount >= activeBarbers) {
      return res.status(400).json({
        success: false,
        message: 'No barbers available. All staff are currently busy.',
        code: 'NO_BARBERS_AVAILABLE',
        inProgress: inProgressCount,
        maxBarbers: activeBarbers,
      });
    }

    // ✅ VALIDATION 6: Validate staff if provided
    if (assignedStaffId) {
      const Staff = require('../models/Staff');
      const staff = await Staff.findOne({
        _id: assignedStaffId,
        salonId: salonId,
        isActive: true,
      });

      if (!staff) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive staff member',
        });
      }

      // Check if staff is busy
      const staffBusy = await Booking.findOne({
        assignedStaffId: assignedStaffId,
        status: 'in-progress',
      });

      if (staffBusy) {
        return res.status(400).json({
          success: false,
          message: `${staff.name} is currently busy`,
        });
      }

      booking.assignedStaffId = assignedStaffId;
    }

    // ✅ EXECUTE: Start service as priority
    const originalPosition = booking.queuePosition;

    booking.status = 'in-progress';
    booking.startedAt = new Date();
    booking.notes = booking.notes
      ? `${booking.notes} | Priority: ${reason}`
      : `Priority: ${reason}`;

    await booking.save();

    // ✅ INCREMENT: Priority usage count
    salon.priorityUsedToday += 1;
    await salon.save();

    // ✅ AUDIT LOG: Record priority action (IMMUTABLE)
    const PriorityLog = require('../models/PriorityLog');
    const Staff = require('../models/Staff');

    let assignedStaffName = null;
    if (assignedStaffId) {
      const staff = await Staff.findById(assignedStaffId);
      assignedStaffName = staff ? staff.name : null;
    }

    await PriorityLog.create({
      salonId: salonId,
      bookingId: bookingId,
      customerId: booking.userId?._id || null,
      customerName: booking.userId?.name || `Token #${booking.walkInToken}` || 'Walk-in',
      triggeredBy: req.user._id,
      triggeredByName: req.user.name || 'Manager',
      triggeredByRole: req.user.role === 'owner' ? 'owner' : 'manager',
      reason: reason,
      queuePositionBefore: originalPosition,
      assignedStaffId: assignedStaffId || null,
      assignedStaffName: assignedStaffName,
    });

    console.log(`⚡ Priority service started for booking ${bookingId}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Original position: ${originalPosition}`);
    console.log(`   Priority used: ${salon.priorityUsedToday}/${salon.priorityLimitPerDay}`);

    // ✅ SOCKET: Emit queue update
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('queue_updated', {
        action: 'priority_started',
        bookingId: booking._id.toString(),
        salonId: salonId.toString(),
      });

      // Notify customer
      if (booking.userId && booking.userId.fcmToken) {
        global.io.to(`user_${booking.userId._id}`).emit('service_started', {
          bookingId: booking._id.toString(),
          priority: true,
          reason: reason,
        });
      }

      // Notify assigned staff
      if (assignedStaffId) {
        global.io.to(`staff_${assignedStaffId}`).emit('booking_assigned', {
          bookingId: booking._id.toString(),
          priority: true,
        });
      }
    }

    // ✅ NOTIFICATION: Send to customer
    const NotificationService = require('../services/notificationService');
    if (booking.userId && booking.userId.fcmToken) {
      await NotificationService.notifyPriorityStarted(
        booking.userId,
        booking,
        salon,
        reason
      );
    }

    // Emit wait time update
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
        originalPosition: originalPosition,
      },
      priorityUsage: {
        used: salon.priorityUsedToday,
        limit: salon.priorityLimitPerDay,
        remaining: salon.priorityLimitPerDay - salon.priorityUsedToday,
      },
    });
  } catch (error) {
    console.error('❌ Start priority service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start priority service',
      error: error.message,
    });
  }
};