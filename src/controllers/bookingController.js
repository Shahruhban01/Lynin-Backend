const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
// const WaitTimeService = require('../services/waitTimeService');
const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');


// Helper to emit wait time update
// async function emitWaitTimeUpdate(salonId) {
//   try {
//     const salon = await Salon.findById(salonId);
//     if (!salon) return;

//     const waitTime = await WaitTimeService.calculateWaitTime(
//       salonId,
//       salon.activeBarbers || 1,
//       salon.averageServiceDuration || 30
//     );

//     if (global.io) {
//       global.io.to(`salon_${salonId}`).emit('wait_time_updated', {
//         salonId: salonId.toString(),
//         waitTime,
//       });
//     }
//   } catch (error) {
//     console.error('Error emitting wait time update:', error);
//   }
// }




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
    await emitWaitTimeUpdate(salonId);

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

// @desc    Schedule booking for later
// @route   POST /api/bookings/schedule
// @access  Private
exports.scheduleBooking = async (req, res) => {
  try {
    const { salonId, services, notes, scheduledDate, scheduledTime, paymentMethod = 'cash' } = req.body;
    const userId = req.user._id;

    console.log('📅 Schedule booking request:');
    console.log('   User:', userId);
    console.log('   Salon:', salonId);
    console.log('   Date:', scheduledDate);
    console.log('   Time:', scheduledTime);
    console.log('   Services:', JSON.stringify(services));

    // Validation
    if (!salonId || !services || services.length === 0 || !scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Salon ID, services, date and time are required',
      });
    }

    // Validate date is not in the past
    const bookingDate = new Date(scheduledDate);
    bookingDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot schedule booking in the past',
      });
    }

    // Check if salon exists
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Check if user already has a scheduled booking for same day at same salon
    const existingScheduled = await Booking.findOne({
      userId,
      salonId,
      bookingType: 'scheduled',
      scheduledDate: {
        $gte: bookingDate,
        $lt: new Date(bookingDate.getTime() + 24 * 60 * 60 * 1000),
      },
      status: { $in: ['pending', 'in-progress'] },
    });

    if (existingScheduled) {
      return res.status(400).json({
        success: false,
        message: 'You already have a scheduled booking for this day at this salon',
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

    // Create scheduled booking (not in queue yet)
    const booking = await Booking.create({
      userId,
      salonId,
      bookingType: 'scheduled',
      scheduledDate: bookingDate,
      scheduledTime,
      services: bookingServices,
      totalPrice,
      totalDuration,
      queuePosition: 0, // Not in queue until arrived
      status: 'pending',
      notes: notes || '',
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending',
    });

    // Populate references
    await booking.populate('salonId', 'name location phone');

    console.log(`✅ Scheduled booking created: User ${userId} scheduled for ${scheduledDate} ${scheduledTime} at ${salon.name}`);

    // Emit socket event to salon room
    if (global.io) {
      global.io.to(`salon_${salonId}`).emit('booking_scheduled', {
        salonId: salon._id,
        bookingId: booking._id,
        scheduledDate,
        scheduledTime,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Booking scheduled successfully',
      booking,
    });
  } catch (error) {
    console.error('❌ Schedule booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule booking',
      error: error.message,
    });
  }
};

// @desc    Get available time slots for a date
// @route   GET /api/bookings/available-slots/:salonId?date=YYYY-MM-DD
// @access  Private
exports.getAvailableTimeSlots = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required',
      });
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Get day of week
    const bookingDate = new Date(date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[bookingDate.getDay()];

    const dayHours = salon.hours?.[dayName];

    if (!dayHours || dayHours.closed) {
      return res.status(200).json({
        success: true,
        slots: [],
        message: 'Salon is closed on this day',
      });
    }

    // Generate time slots (30-minute intervals)
    const slots = [];
    const [openHour, openMinute] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);

    let currentHour = openHour;
    let currentMinute = openMinute;

    while (
      currentHour < closeHour ||
      (currentHour === closeHour && currentMinute < closeMinute)
    ) {
      const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      slots.push(timeString);

      // Increment by 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }

    // Get existing scheduled bookings for this date
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const existingBookings = await Booking.find({
      salonId,
      bookingType: 'scheduled',
      scheduledDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ['pending', 'in-progress'] },
    });

    // Mark booked slots
    const bookedTimes = existingBookings.map(b => b.scheduledTime);

    const availableSlots = slots.map(slot => ({
      time: slot,
      available: !bookedTimes.includes(slot),
    }));

    res.status(200).json({
      success: true,
      slots: availableSlots,
      dayHours: {
        open: dayHours.open,
        close: dayHours.close,
      },
    });
  } catch (error) {
    console.error('❌ Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available slots',
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
      .populate('userId', 'name phone fcmToken loyaltyPoints')
      .populate('salonId', 'name ownerId')
      .populate('assignedStaffId', 'name commissionType commissionRate'); // ADD THIS

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

    // Calculate loyalty points (1 point per ₹10 spent)
    const pointsEarned = Math.floor(booking.totalPrice / 10);

    // ✅ Calculate staff commission
    let staffCommission = 0;
    if (booking.assignedStaffId) {
      const staff = booking.assignedStaffId;
      if (staff.commissionType === 'percentage') {
        staffCommission = (booking.totalPrice * staff.commissionRate) / 100;
      } else if (staff.commissionType === 'fixed') {
        staffCommission = staff.commissionRate;
      }
    }

    // Update booking status AND payment status
    booking.status = 'completed';
    booking.completedAt = Date.now();
    booking.loyaltyPointsEarned = pointsEarned;

    // AUTO-MARK PAYMENT AS PAID
    booking.paymentStatus = 'paid';
    booking.paidAmount = booking.totalPrice;
    booking.paymentDate = Date.now();

    await booking.save();

    // Award loyalty points to user (only if user exists)
    if (booking.userId) {
      await User.findByIdAndUpdate(
        booking.userId._id,
        {
          $inc: {
            loyaltyPoints: pointsEarned,
            totalBookings: 1
          }
        }
      );
      console.log(`✅ Booking completed. ${pointsEarned} loyalty points awarded to user ${booking.userId._id}`);
    }

    // ✅ Update staff stats
    if (booking.assignedStaffId) {
      const Staff = require('../models/Staff');
      await Staff.findByIdAndUpdate(booking.assignedStaffId._id, {
        $inc: {
          'stats.completedBookings': 1,
          'stats.totalRevenue': booking.totalPrice,
          'stats.totalCommission': staffCommission,
        },
      });
      console.log(`💰 Staff commission: ₹${staffCommission.toFixed(2)}`);
    }

    console.log(`💰 Payment auto-marked as paid: ₹${booking.totalPrice}`);

    // Update queue positions
    await updateQueuePositions(booking.salonId._id);

    // Emit socket events
    if (global.io) {
      if (booking.userId) {
        global.io.to(`user_${booking.userId._id}`).emit('booking_completed', {
          bookingId: booking._id.toString(),
          salonId: booking.salonId._id.toString(),
          salonName: booking.salonId.name,
          pointsEarned,
        });
      }

      if (booking.assignedStaffId) {
        global.io.to(`staff_${booking.assignedStaffId._id}`).emit('booking_completed', {
          bookingId: booking._id.toString(),
          commission: staffCommission,
        });
      }

      global.io.to(`salon_${booking.salonId._id}`).emit('queue_updated', {
        salonId: booking.salonId._id.toString(),
        queueSize: await Booking.countDocuments({
          salonId: booking.salonId._id,
          status: { $in: ['pending', 'in-progress'] },
        }),
      });
    }

    // Send notification
    if (booking.userId && booking.userId.fcmToken) {
      await NotificationService.notifyBookingCompleted(
        booking.userId,
        booking,
        booking.salonId
      );
    }

    await emitWaitTimeUpdate(booking.salonId._id);

    res.status(200).json({
      success: true,
      message: 'Booking marked as completed and payment recorded',
      booking,
      pointsEarned,
      paymentStatus: 'paid',
      staffCommission: staffCommission.toFixed(2), // ✅ Return commission info
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

    await emitWaitTimeUpdate(booking.salonId._id);


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

// @desc    Get salon's bookings
// @route   GET /api/bookings/salon/:salonId
// @access  Private (Owner/Manager/Staff)
exports.getSalonBookings = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { status, bookingType, startDate, endDate } = req.query;

    console.log('📊 Get salon bookings request:');
    console.log('   Salon ID:', salonId);
    console.log('   Status filter:', status);
    console.log('   Booking type filter:', bookingType);

    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Check authorization
    if (salon.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these bookings',
      });
    }

    // Build query
    const query = { salonId };

    if (status) {
      const statusArray = status.split(',');
      query.status = { $in: statusArray };
    }

    if (bookingType) {
      query.bookingType = bookingType;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Fetch bookings
    const bookings = await Booking.find(query)
      .populate('userId', 'name phone email')
      .populate('assignedStaffId', 'name role') // ✅ ADD THIS
      .sort({ queuePosition: 1, createdAt: -1 })
      .lean();

    console.log(`✅ Found ${bookings.length} bookings`);
    
    // ✅ Log first booking with staff info
    if (bookings.length > 0) {
      console.log('   First booking:', {
        id: bookings[0]._id,
        status: bookings[0].status,
        assignedStaffId: bookings[0].assignedStaffId, // ✅ CHECK THIS
        customerName: bookings[0].userId?.name || bookings[0].customerName,
      });
    }

    // Format response
    const formattedBookings = bookings.map((booking) => ({
      _id: booking._id,
      customer: {
        _id: booking.userId?._id || null,
        name: booking.userId?.name || (booking.walkInToken ? `Token #${booking.walkInToken}` : 'Walk-in Customer'),
        phone: booking.userId?.phone || 'N/A',
        email: booking.userId?.email || null,
      },
      customerName: booking.userId?.name || (booking.walkInToken ? `Token #${booking.walkInToken}` : 'Walk-in Customer'), // ✅ ADD THIS
      customerPhone: booking.userId?.phone || 'N/A', // ✅ ADD THIS
      walkInToken: booking.walkInToken || null,
      assignedStaffId: booking.assignedStaffId?._id || booking.assignedStaffId || null, // ✅ CRITICAL
      assignedStaffName: booking.assignedStaffId?.name || null, // ✅ BONUS
      services: booking.services,
      totalPrice: booking.totalPrice,
      totalDuration: booking.totalDuration,
      queuePosition: booking.queuePosition,
      status: booking.status,
      bookingType: booking.bookingType,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      arrived: booking.arrived || false,
      arrivedAt: booking.arrivedAt,
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      joinedAt: booking.joinedAt || booking.createdAt,
      startedAt: booking.startedAt,
      completedAt: booking.completedAt,
      estimatedStartTime: booking.estimatedStartTime,
      notes: booking.notes,
      createdAt: booking.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedBookings.length,
      bookings: formattedBookings,
      activeBarbers: salon.activeBarbers || 1,
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




// Add this to your existing startBooking function
// ✅ UPDATED: Start booking with busy check
// @desc    Start booking service (Owner) - WITH STAFF ASSIGNMENT
// @route   PUT /api/bookings/:id/start
// @access  Private (Owner)
exports.startBooking = async (req, res) => {
  try {
    const { assignedStaffId } = req.body;

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

    // ✅ Validate staff if provided
    if (assignedStaffId) {
      const Staff = require('../models/Staff');
      const staff = await Staff.findOne({
        _id: assignedStaffId,
        salonId: booking.salonId._id,
        isActive: true,
      });

      if (!staff) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive staff member',
        });
      }

      // ✅ NEW: Check if staff is already busy with another booking
      const staffCurrentBooking = await Booking.findOne({
        assignedStaffId: assignedStaffId,
        status: 'in-progress',
        _id: { $ne: req.params.id },
      });

      if (staffCurrentBooking) {
        return res.status(400).json({
          success: false,
          message: `${staff.name} is currently busy with another customer. Please assign a different staff member.`,
          busyWith: {
            bookingId: staffCurrentBooking._id,
            customerName: staffCurrentBooking.customerName || 'Customer',
            queuePosition: staffCurrentBooking.queuePosition,
          },
        });
      }

      booking.assignedStaffId = assignedStaffId;
      console.log(`👤 Assigned staff: ${staff.name} to booking ${booking._id}`);
    }

    booking.status = 'in-progress';
    booking.startedAt = Date.now();
    await booking.save();

    // ✅ Update staff stats if assigned
    if (assignedStaffId) {
      const Staff = require('../models/Staff');
      await Staff.findByIdAndUpdate(assignedStaffId, {
        $inc: { 'stats.totalBookings': 1 },
      });
    }

    // Emit socket event
    if (global.io) {
      if (booking.userId) {
        global.io.to(`user_${booking.userId._id}`).emit('booking_updated', {
          bookingId: booking._id.toString(),
          status: 'in-progress',
        });
      }

      if (assignedStaffId) {
        global.io.to(`staff_${assignedStaffId}`).emit('booking_assigned', {
          bookingId: booking._id.toString(),
          customer: booking.userId?.name || 'Walk-in',
        });
        
        // ✅ Update workload
        global.io.to(`salon_${booking.salonId._id}`).emit('staff_workload_updated', {
          staffId: assignedStaffId,
          isBusy: true,
        });
      }
    }

    // Send notification
    const NotificationService = require('../services/notificationService');
    if (booking.userId && booking.userId.fcmToken) {
      await NotificationService.notifyBookingStarted(
        booking.userId,
        booking,
        booking.salonId
      );
    }

    console.log(`✅ Booking started: ${booking._id}`);
    await emitWaitTimeUpdate(booking.salonId._id);

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


// ✅ NEW: Assign/Reassign staff to booking
// ✅ UPDATED: Assign/Reassign staff to booking with busy check
// @desc    Assign staff to booking
// @route   PUT /api/bookings/:id/assign-staff
// @access  Private (Owner/Manager)
exports.assignStaff = async (req, res) => {
  try {
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required',
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('salonId', 'ownerId');

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

    // Validate staff
    const Staff = require('../models/Staff');
    const staff = await Staff.findOne({
      _id: staffId,
      salonId: booking.salonId._id,
      isActive: true,
    });

    if (!staff) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive staff member',
      });
    }

    // ✅ NEW: Check if staff is already serving another customer
    const staffCurrentBooking = await Booking.findOne({
      assignedStaffId: staffId,
      status: 'in-progress',
      _id: { $ne: req.params.id }, // Exclude current booking
    });

    if (staffCurrentBooking) {
      return res.status(400).json({
        success: false,
        message: `${staff.name} is already serving another customer. Please wait until they finish.`,
        busyWith: {
          bookingId: staffCurrentBooking._id,
          customerName: staffCurrentBooking.customerName || 'Customer',
          startedAt: staffCurrentBooking.startedAt,
        },
      });
    }

    // Update booking
    const previousStaffId = booking.assignedStaffId;
    booking.assignedStaffId = staffId;
    await booking.save();

    // Update stats
    if (previousStaffId && previousStaffId.toString() !== staffId) {
      // Decrease previous staff's count
      await Staff.findByIdAndUpdate(previousStaffId, {
        $inc: { 'stats.totalBookings': -1 },
      });
    }

    if (!previousStaffId || previousStaffId.toString() !== staffId) {
      // Increase new staff's count
      await Staff.findByIdAndUpdate(staffId, {
        $inc: { 'stats.totalBookings': 1 },
      });
    }

    console.log(`✅ Staff ${staff.name} assigned to booking ${booking._id}`);

    // Emit socket event
    if (global.io) {
      global.io.to(`staff_${staffId}`).emit('booking_assigned', {
        bookingId: booking._id.toString(),
      });
      
      // ✅ Emit to salon room to update workload
      global.io.to(`salon_${booking.salonId._id}`).emit('staff_workload_updated', {
        staffId: staffId,
        isBusy: true,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Staff assigned successfully',
      booking,
    });
  } catch (error) {
    console.error('❌ Assign staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign staff',
      error: error.message,
    });
  }
};


// ✅ NEW: Get bookings for specific staff
// @desc    Get staff's assigned bookings
// @route   GET /api/bookings/staff/:staffId
// @access  Private
exports.getStaffBookings = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { status } = req.query;

    const query = { assignedStaffId: staffId };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'name phone')
      .populate('salonId', 'name location')
      .sort({ queuePosition: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('❌ Get staff bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
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
  scheduleBooking: exports.scheduleBooking,
  getAvailableTimeSlots: exports.getAvailableTimeSlots,
  assignStaff: exports.assignStaff, // ✅ ADD THIS
  getStaffBookings: exports.getStaffBookings, // ✅ ADD THIS

};


// at the end of these functions:

// In joinQueue - add before final res.status(201)


// In startBooking - add before final res.status(200)

// In completeBooking - add before final res.status(200)

// In cancelBooking - add before final res.status(200)