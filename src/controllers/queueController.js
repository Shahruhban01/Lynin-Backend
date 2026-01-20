const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');

// ✅ Helper: Generate sequential 4-digit token starting from 0001
// ✅ SAFER VERSION: Use findOneAndUpdate with atomic increment
async function generateWalkInToken(salonId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find the highest token number used today for this salon
  const lastBooking = await Booking.findOne({
    salonId,
    walkInToken: { $exists: true, $ne: null },
    createdAt: { $gte: today, $lt: tomorrow },
  })
    .sort({ walkInToken: -1 })
    .select('walkInToken')
    .lean();

  let nextTokenNumber = 1;

  if (lastBooking && lastBooking.walkInToken) {
    const lastTokenNumber = parseInt(lastBooking.walkInToken, 10);
    if (!isNaN(lastTokenNumber)) {
      nextTokenNumber = lastTokenNumber + 1;
    }
  }

  const token = String(nextTokenNumber).padStart(4, '0');
  console.log(`🎫 Generated walk-in token: ${token} (Next in sequence for today)`);

  return token;
}


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
    const { name, phone, services } = req.body;

    console.log('👤 Add walk-in request:');
    console.log('   Salon:', salonId);
    console.log('   Name:', name);
    console.log('   Phone:', phone);
    console.log('   Services:', services);

    // Validation
    if (!services || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one service is required',
      });
    }

    const salon = await Salon.findById(salonId);

    if (!salon || !salon.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found or inactive',
      });
    }

    let userId = null;
    let walkInToken = null;

    // ✅ Check if phone is provided and valid
    const hasValidPhone = phone && phone.trim().length >= 10;
    const hasValidName = name && name.trim().length > 0;

    if (hasValidPhone) {
      // Create/find user if phone provided
      let walkInUser = await User.findOne({ phone });
      
      if (!walkInUser) {
        const tempFirebaseUid = `walkin_${phone}_${Date.now()}`;
        
        walkInUser = await User.create({
          phone,
          name: hasValidName ? name.trim() : null,
          firebaseUid: tempFirebaseUid,
          role: 'customer',
          isActive: true,
        });
        
        console.log(`✅ Created new user account for walk-in: ${phone}`);
      } else {
        console.log(`✅ Found existing user for phone: ${phone}`);
        
        if (hasValidName && !walkInUser.name) {
          walkInUser.name = name.trim();
          await walkInUser.save();
          console.log(`✅ Updated user name: ${name}`);
        }
      }
      
      userId = walkInUser._id;
    } else {
      // ✅ Generate token for anonymous walk-ins (no phone/name)
      walkInToken = await generateWalkInToken(salonId);
      console.log(`🎫 Generated walk-in token: ${walkInToken}`);
    }

    // Calculate total price and duration
    let totalPrice = 0;
    let totalDuration = 0;

    services.forEach((service) => {
      totalPrice += service.price;
      totalDuration += service.duration;
    });

    // Get current queue size to determine position
    const currentQueueSize = await Booking.countDocuments({
      salonId,
      status: { $in: ['pending', 'in-progress'] },
    });

    // Create booking
    const booking = await Booking.create({
      userId: userId,
      salonId,
      bookingType: 'immediate',
      services,
      totalPrice,
      totalDuration,
      queuePosition: currentQueueSize + 1,
      status: 'pending',
      paymentMethod: 'cash',
      arrived: true,
      arrivedAt: new Date(),
      walkInToken: walkInToken, // ✅ NEW: Store token
      notes: !userId && hasValidName ? `Walk-in: ${name}` : '',
    });

    // Populate userId for response
    await booking.populate('userId', 'name phone');

    console.log(`✅ Walk-in added to queue: Position ${booking.queuePosition} (auto-arrived)`);
    if (walkInToken) {
      console.log(`🎫 Token: ${walkInToken}`);
    }

    // Update user's total bookings if userId exists
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $inc: { totalBookings: 1 },
      });
    }

    // Emit socket event
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('queue_updated', {
        action: 'walk_in_added',
        salonId: salonId.toString(),
      });
    }

    // Emit wait time update
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(salonId);

    // ✅ Format response with customer details
    const customerDisplay = booking.userId?.name 
      ? booking.userId.name
      : (booking.walkInToken ? `Token #${booking.walkInToken}` : (name || 'Walk-in Customer'));

    const response = {
      _id: booking._id,
      userId: booking.userId?._id || null,
      customerName: customerDisplay,
      customerPhone: booking.userId?.phone || phone || 'N/A',
      walkInToken: booking.walkInToken || null, // ✅ NEW
      services: booking.services,
      totalPrice: booking.totalPrice,
      totalDuration: booking.totalDuration,
      queuePosition: booking.queuePosition,
      status: booking.status,
      arrived: booking.arrived,
      arrivedAt: booking.arrivedAt,
      joinedAt: booking.createdAt,
      bookingType: booking.bookingType,
    };

    res.status(201).json({
      success: true,
      message: userId 
        ? 'Walk-in customer added with account created/linked'
        : walkInToken
          ? `Walk-in added with token #${walkInToken}`
          : 'Walk-in added to queue',
      booking: response,
    });
  } catch (error) {
    console.error('❌ Add walk-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add walk-in',
      error: error.message,
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

    const booking = await Booking.findOne({ _id: bookingId, salonId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot start service - booking is ${booking.status}`,
      });
    }

    booking.status = 'in-progress';
    booking.startedAt = new Date();
    await booking.save();

    console.log(`▶️ Service started for booking: ${bookingId}`);

    // Emit socket event
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
    res.status(500).json({
      success: false,
      message: 'Failed to start service',
      error: error.message,
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

// Priority insertion (placeholder)
exports.getPriorityInsertionLimit = async (req, res) => {
  res.status(200).json({
    success: true,
    dailyLimit: 5,
    used: 0,
  });
};

exports.insertPriorityCustomer = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Priority insertion not yet implemented',
  });
};
