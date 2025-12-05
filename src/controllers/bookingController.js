const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');


// @desc    Join queue (create booking)
// @route   POST /api/bookings/join
// @access  Private
exports.joinQueue = async (req, res) => {
  try {
    // const { salonId, services, notes } = req.body;
    // const userId = req.user._id;
    const { salonId, services, notes, paymentMethod = 'cash' } = req.body;
    const userId = req.user._id;

    console.log('📥 Join queue request:');
    console.log('   User:', userId);
    console.log('   Salon:', salonId);
    console.log('   Services:', JSON.stringify(services));
    console.log('   Payment:', paymentMethod);

    // Validate request
    if (!salonId || !services || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Salon ID and services are required',
      });
    }


    // Check if salon exists and is open
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    if (!salon.isOpen) {
      return res.status(400).json({
        success: false,
        message: 'Salon is currently closed',
      });
    }

    // Check if user already has an active booking at this salon
    const existingBooking = await Booking.findOne({
      userId,
      salonId,
      status: { $in: ['pending', 'in-progress'] },
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active booking at this salon',
      });
    }

    // Calculate total price and duration
    let totalPrice = 0;
    let totalDuration = 0;
    const bookingServices = [];

    for (const service of services) {
      const salonService = salon.services.find(
        (s) => s._id.toString() === service.serviceId
      );

      if (!salonService) {
        return res.status(400).json({
          success: false,
          message: `Service ${service.serviceId} not found`,
        });
      }

      totalPrice += salonService.price;
      totalDuration += salonService.duration;

      bookingServices.push({
        serviceId: salonService._id,
        name: salonService.name,
        price: salonService.price,
        duration: salonService.duration,
      });
    }

    // Get current queue position
    const queueCount = await Booking.countDocuments({
      salonId,
      status: { $in: ['pending', 'in-progress'] },
    });

    const queuePosition = queueCount + 1;

    // Calculate estimated times
    const peopleAhead = queueCount;
    const estimatedWaitMinutes = peopleAhead * salon.avgServiceTime;
    const estimatedStartTime = new Date(
      Date.now() + estimatedWaitMinutes * 60000
    );
    const estimatedEndTime = new Date(
      estimatedStartTime.getTime() + totalDuration * 60000
    );

    // Create booking
    const booking = await Booking.create({
      userId,
      salonId,
      services: bookingServices,
      totalPrice,
      totalDuration,
      queuePosition,
      estimatedStartTime,
      estimatedEndTime,
      notes: notes || '',
      paymentMethod, // ADD THIS
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending', // Cash is paid at salon
    });

    // Populate references
    await booking.populate('salonId', 'name location phone');

    // Update user's total bookings count
    await User.findByIdAndUpdate(userId, {
      $inc: { totalBookings: 1 },
    });
    
    // Emit socket event to salon room
if (global.io) {
  global.io.to(`salon_${salonId}`).emit('queue_updated', {
    salonId: salon._id,
    queueSize: salon.currentQueueSize + 1,
  });
}

// Send notification to user
try {
  const user = await User.findById(userId);
  if (user && user.fcmToken) {
    await NotificationService.notifyQueueUpdate(user, booking, salon);
  }
} catch (notifError) {
  console.error('Notification error:', notifError);
}

console.log(`✅ Booking created: User ${userId} joined queue at ${salon.name}`);

res.status(201).json({
  success: true,
  message: 'Successfully joined the queue',
  booking,
});

    // console.log(`✅ Booking created: User ${userId} joined queue at ${salon.name}`);

    // res.status(201).json({
    //   success: true,
    //   message: 'Successfully joined the queue',
    //   booking,
    // });
  } catch (error) {
    console.error('❌ Join queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join queue',
      error: error.message,
    });
  }
};

// @desc    Get user's bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('salonId', 'name location phone images')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('❌ Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message,
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('salonId', 'name location phone images services')
      .populate('userId', 'name phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user owns this booking
    if (booking.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking',
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('❌ Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking',
      error: error.message,
    });
  }
};

// @desc    Mark booking as completed (Salon owner/admin)
// @route   PUT /api/bookings/:id/complete
// @access  Private
exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name phone fcmToken')
      .populate('salonId', 'name ownerId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Verify ownership
    if (booking.salonId.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Check if already completed
    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking already completed',
      });
    }

    // Update booking status
    booking.status = 'completed';
    booking.completedAt = Date.now();
    await booking.save();

    // Update queue positions
    await updateQueuePositions(booking.salonId._id);

    // Emit socket event to user
    if (global.io) {
      global.io.to(`user_${booking.userId._id}`).emit('booking_completed', {
        bookingId: booking._id.toString(),
        salonId: booking.salonId._id.toString(),
        salonName: booking.salonId.name,
      });

      // Update salon room
      global.io.to(`salon_${booking.salonId._id}`).emit('queue_updated', {
        salonId: booking.salonId._id.toString(),
        queueSize: await Booking.countDocuments({
          salonId: booking.salonId._id,
          status: { $in: ['pending', 'in-progress'] },
        }),
      });
    }

    // Send notification
    const NotificationService = require('../services/notificationService');
    if (booking.userId.fcmToken) {
      await NotificationService.notifyBookingCompleted(
        booking.userId,
        booking,
        booking.salonId
      );
    }

    console.log(`✅ Booking completed: ${booking._id}`);

    res.status(200).json({
      success: true,
      message: 'Booking marked as completed',
      booking,
    });
  } catch (error) {
    console.error('❌ Complete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete booking',
      error: error.message,
    });
  }
};


// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name phone fcmToken')
      .populate('salonId', 'name ownerId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check authorization: either the customer or the salon owner can cancel
    const isCustomer = booking.userId._id.toString() === req.user._id.toString();
    const isOwner = booking.salonId.ownerId.toString() === req.user._id.toString();

    if (!isCustomer && !isOwner) {
      console.error('❌ Cancel authorization failed:');
      console.error('   User ID:', req.user._id);
      console.error('   Customer ID:', booking.userId._id);
      console.error('   Owner ID:', booking.salonId.ownerId);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking',
      });
    }

    // Check if already cancelled or completed
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled',
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed booking',
      });
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.cancellationReason = reason || (isOwner ? 'Cancelled by salon' : 'User cancelled');
    await booking.save();

    // Update queue positions for remaining bookings
    await updateQueuePositions(booking.salonId._id);

    // Emit socket event
    if (global.io) {
      global.io.to(`salon_${booking.salonId._id}`).emit('queue_updated', {
        salonId: booking.salonId._id.toString(),
        queueSize: await Booking.countDocuments({
          salonId: booking.salonId._id,
          status: { $in: ['pending', 'in-progress'] },
        }),
      });

      // Notify user if cancelled by owner
      if (isOwner) {
        global.io.to(`user_${booking.userId._id}`).emit('booking_cancelled', {
          bookingId: booking._id.toString(),
        });
      }
    }

    // Send notification to customer
    const NotificationService = require('../services/notificationService');
    if (booking.userId.fcmToken) {
      await NotificationService.notifyBookingCancelled(
        booking.userId,
        booking,
        booking.salonId
      );
    }

    console.log(`✅ Booking cancelled: ${booking._id} by ${isOwner ? 'owner' : 'customer'}`);

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking,
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


// Helper function to update queue positions
async function updateQueuePositions(salonId) {
  const activeBookings = await Booking.find({
    salonId,
    status: { $in: ['pending', 'in-progress'] },
  }).sort('joinedAt');

  const salon = await Salon.findById(salonId);

  for (let i = 0; i < activeBookings.length; i++) {
    const booking = activeBookings[i];
    const newPosition = i + 1;

    if (booking.queuePosition !== newPosition) {
      booking.queuePosition = newPosition;

      // Recalculate estimated times
      const estimatedWaitMinutes = i * salon.avgServiceTime;
      booking.estimatedStartTime = new Date(
        Date.now() + estimatedWaitMinutes * 60000
      );
      booking.estimatedEndTime = new Date(
        booking.estimatedStartTime.getTime() + booking.totalDuration * 60000
      );

      await booking.save();
    }
  }
}

// @desc    Mark payment as complete
// @route   PUT /api/bookings/:id/complete-payment
// @access  Private
exports.completePayment = async (req, res) => {
  try {
    const { paymentMethod, transactionId } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Update payment details
    booking.paymentStatus = 'paid';
    booking.paidAmount = booking.totalPrice;
    booking.paymentDate = Date.now();
    booking.paymentMethod = paymentMethod || booking.paymentMethod;
    
    if (transactionId) {
      booking.transactionId = transactionId;
    }

    await booking.save();

    console.log(`✅ Payment completed for booking: ${booking._id}`);

    res.status(200).json({
      success: true,
      message: 'Payment marked as complete',
      booking,
    });
  } catch (error) {
    console.error('❌ Complete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete payment',
      error: error.message,
    });
  }
};


// Note: Additional booking-related controller functions are here for salons to manage bookings.

// @desc    Get all bookings for a salon (Owner)
// @route   GET /api/bookings/salon/:salonId
// @access  Private (Owner)
exports.getSalonBookings = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { status } = req.query;

    console.log('📊 Get salon bookings request:');
    console.log('   Salon ID:', salonId);
    console.log('   Status filter:', status);
    console.log('   User ID:', req.user._id);

    // Verify ownership
    const Salon = require('../models/Salon');
    const salon = await Salon.findById(salonId);

    if (!salon) {
      console.error('❌ Salon not found:', salonId);
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    console.log('   Salon owner:', salon.ownerId);
    console.log('   Current user:', req.user._id);

    if (salon.ownerId.toString() !== req.user._id.toString()) {
      console.error('❌ Not authorized - ownership mismatch');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these bookings',
      });
    }

    console.log('✅ Authorization passed');

    const query = { salonId };
    
    // Handle comma-separated statuses
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      console.log('   Status array:', statuses);
      query.status = { $in: statuses };
    }

    console.log('   Query:', JSON.stringify(query));

    const bookings = await Booking.find(query)
      .populate('userId', 'name phone')
      .sort('queuePosition');

    console.log(`✅ Found ${bookings.length} bookings`);
    if (bookings.length > 0) {
      console.log('   First booking:', {
        id: bookings[0]._id,
        status: bookings[0].status,
        position: bookings[0].queuePosition,
      });
    }

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('❌ Get salon bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message,
    });
  }
};


// @desc    Start booking service (Owner)
// @route   PUT /api/bookings/:id/start
// @access  Private (Owner)
exports.startBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name phone fcmToken')
      .populate('salonId', 'name ownerId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Verify ownership
    if (booking.salonId.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    booking.status = 'in-progress';
    booking.startedAt = Date.now();
    await booking.save();

    // Emit socket event
    if (global.io) {
      global.io.to(`user_${booking.userId._id}`).emit('booking_updated', {
        bookingId: booking._id.toString(),
        status: 'in-progress',
      });
    }

    // Send notification
    const NotificationService = require('../services/notificationService');
    if (booking.userId.fcmToken) {
      await NotificationService.notifyBookingStarted(
        booking.userId,
        booking,
        booking.salonId
      );
    }

    console.log(`✅ Booking started: ${booking._id}`);

    res.status(200).json({
      success: true,
      message: 'Booking started',
      booking,
    });
  } catch (error) {
    console.error('❌ Start booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start booking',
      error: error.message,
    });
  }
};

module.exports = {
  joinQueue: exports.joinQueue,
  getMyBookings: exports.getMyBookings,
  getBookingById: exports.getBookingById,
  cancelBooking: exports.cancelBooking,
  completePayment: exports.completePayment,
  completeBooking: exports.completeBooking,
  getSalonBookings: exports.getSalonBookings, // ADD
  startBooking: exports.startBooking, // ADD
};
