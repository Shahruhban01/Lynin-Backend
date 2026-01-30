const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');
const Staff = require('../models/Staff');
const PriorityLog = require('../models/PriorityLog');
const NotificationService = require('./notificationService');


const { generateWalkInToken } = require('./tokenService');

/**
 * Add walk-in customer to queue
 */
async function addWalkInCustomer({
    salonId,
    name,
    phone,
    services,
}) {
    // 1️⃣ Validate salon
    const salon = await Salon.findById(salonId);

    if (!salon || !salon.isActive) {
        throw new Error('Salon not found or inactive');
    }

    // 2️⃣ Validate services
    if (!services || !services.length) {
        throw new Error('At least one service is required');
    }

    let userId = null;
    let walkInToken = null;

    const hasValidPhone = phone && phone.trim().length >= 10;
    const hasValidName = name && name.trim().length > 0;

    // 3️⃣ Handle user
    if (hasValidPhone) {
        let user = await User.findOne({ phone });

        if (!user) {
            user = await User.create({
                phone,
                name: hasValidName ? name.trim() : null,
                firebaseUid: `walkin_${phone}_${Date.now()}`,
                role: 'customer',
                isActive: true,
            });
        } else if (hasValidName && !user.name) {
            user.name = name.trim();
            await user.save();
        }

        userId = user._id;
    }
    // 4️⃣ Handle token
    else {
        walkInToken = await generateWalkInToken(salonId);
    }

    // 5️⃣ Calculate totals
    let totalPrice = 0;
    let totalDuration = 0;

    for (const s of services) {
        totalPrice += s.price;
        totalDuration += s.duration;
    }

    // 6️⃣ Queue position
    const queueSize = await Booking.countDocuments({
        salonId,
        status: { $in: ['pending', 'in-progress'] },
    });

    // 7️⃣ Create booking
    const booking = await Booking.create({
        userId,
        salonId,
        bookingType: 'immediate',
        services,
        totalPrice,
        totalDuration,
        queuePosition: queueSize + 1,
        status: 'pending',
        paymentMethod: 'cash',
        arrived: true,
        arrivedAt: new Date(),
        walkInToken,
        notes: !userId && hasValidName ? `Walk-in: ${name}` : '',
    });

    await booking.populate('userId', 'name phone');

    // 8️⃣ Update stats
    if (userId) {
        await User.findByIdAndUpdate(userId, {
            $inc: { totalBookings: 1 },
        });
    }

    return booking;
}

/**
 * Mark customer as arrived
 */
async function markCustomerArrivedService(salonId, bookingId, phoneLastFour) {
    let booking;

    // 1️⃣ Find by bookingId
    if (bookingId) {
        booking = await Booking.findOne({
            _id: bookingId,
            salonId,
        });
    }

    // 2️⃣ Find by phone last 4 digits
    if (!booking && phoneLastFour) {
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

    // 3️⃣ Validate booking
    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.arrived) {
        throw new Error('Customer already marked as arrived');
    }

    // 4️⃣ Mark arrived
    booking.arrived = true;
    booking.arrivedAt = new Date();

    await booking.save();

    return booking;
}


/**
 * Start service for a booking
 */
async function startService(salonId, bookingId) {
    // 1️⃣ Find booking
    const booking = await Booking.findOne({
        _id: bookingId,
        salonId,
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    // 2️⃣ Validate status
    if (booking.status !== 'pending') {
        throw new Error(`Cannot start service - booking is ${booking.status}`);
    }

    // 3️⃣ Update booking
    booking.status = 'in-progress';
    booking.startedAt = new Date();

    await booking.save();

    console.log(`▶️ Service started: ${bookingId}`);

    return booking;
}

/**
 * Complete service for a booking
 */
async function completeService(salonId, bookingId) {
    // 1️⃣ Find booking
    const booking = await Booking.findOne({
        _id: bookingId,
        salonId,
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    // 2️⃣ Validate status
    if (booking.status !== 'in-progress') {
        throw new Error('Service not in progress');
    }

    // 3️⃣ Calculate loyalty points (₹10 = 1 point)
    const pointsEarned = Math.floor(booking.totalPrice / 10);

    // 4️⃣ Update booking
    booking.status = 'completed';
    booking.completedAt = new Date();
    booking.loyaltyPointsEarned = pointsEarned;

    // Auto payment
    booking.paymentStatus = 'paid';
    booking.paidAmount = booking.totalPrice;
    booking.paymentDate = new Date();

    await booking.save();

    // 5️⃣ Update user (if exists)
    if (booking.userId) {
        await User.findByIdAndUpdate(
            booking.userId,
            {
                $inc: {
                    totalBookings: 1,
                    loyaltyPoints: pointsEarned,
                },
            },
            { new: true }
        );
    }

    return {
        booking,
        pointsEarned,
    };
}

/**
 * Skip customer and move to end
 */
async function skipCustomerService(salonId, bookingId, reason) {

    // 1️⃣ Find booking
    const booking = await Booking.findOne({
        _id: bookingId,
        salonId,
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.status === 'skipped') {
        throw new Error('Customer already skipped');
    }

    // 2️⃣ Save original position
    const originalPosition = booking.queuePosition;

    // 3️⃣ Find last position (including skipped)
    const lastBooking = await Booking.findOne({
        salonId,
        status: { $in: ['pending', 'in-progress', 'skipped'] },
    })
        .sort({ queuePosition: -1 })
        .select('queuePosition');

    const newPosition = lastBooking
        ? lastBooking.queuePosition + 1
        : 1;

    // 4️⃣ Update booking
    booking.status = 'skipped';
    booking.queuePosition = newPosition;
    booking.skippedAt = new Date();
    booking.originalPosition = originalPosition;
    booking.skipReason = reason;
    booking.notes = booking.notes
        ? `${booking.notes} | Skipped: ${reason}`
        : `Skipped: ${reason}`;

    await booking.save();

    // 5️⃣ Reorder active queue
    await reorderActiveQueue(salonId);

    return {
        booking,
        originalPosition,
        newPosition,
    };
}

/**
 * Reorder only active bookings
 */
async function reorderActiveQueue(salonId) {
    const activeBookings = await Booking.find({
        salonId,
        status: { $in: ['pending', 'in-progress'] },
    }).sort({ queuePosition: 1 });

    for (let i = 0; i < activeBookings.length; i++) {
        if (activeBookings[i].queuePosition !== i + 1) {
            activeBookings[i].queuePosition = i + 1;
            await activeBookings[i].save();
        }
    }
}

/**
 * Undo skipped booking
 */
async function undoSkipService(
    salonId,
    bookingId,
    returnToOriginal,
    originalPosition
) {
    const booking = await Booking.findOne({
        _id: bookingId,
        salonId,
    });

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.status !== 'skipped') {
        throw new Error('Booking is not skipped');
    }

    let newPosition;
    let message;

    // 1️⃣ Return to original
    if (returnToOriginal && originalPosition) {

        newPosition = originalPosition;

        // Shift others
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

        message = `Customer restored to position ${originalPosition}`;

    }
    // 2️⃣ Add to end
    else {

        const lastActive = await Booking.findOne({
            salonId,
            status: { $in: ['pending', 'in-progress'] },
        })
            .sort({ queuePosition: -1 })
            .select('queuePosition');

        newPosition = lastActive
            ? lastActive.queuePosition + 1
            : 1;

        message = `Customer added to end at position ${newPosition}`;
    }

    // 3️⃣ Restore booking
    booking.status = 'pending';
    booking.queuePosition = newPosition;
    booking.skippedAt = null;
    booking.originalPosition = null;
    booking.skipReason = null;

    await booking.save();

    // 4️⃣ Reorder
    await reorderActiveQueue(salonId);

    return {
        booking,
        message,
        newPosition,
    };
}

/**
 * Start priority service
 */
async function startPriorityServiceService({
  salonId,
  bookingId,
  reason,
  assignedStaffId,
  user,
  userSalonRole,
}) {

  const validReasons = [
    'Senior citizen',
    'Medical urgency',
    'Child',
    'System exception',
  ];

  // 1️⃣ Validate reason
  if (!reason || !validReasons.includes(reason)) {
    throw new Error('Invalid priority reason');
  }

  // 2️⃣ Validate role
  if (user.role !== 'owner' && userSalonRole !== 'manager') {
    const err = new Error('Insufficient permissions');
    err.code = 'INSUFFICIENT_PERMISSIONS';
    throw err;
  }

  // 3️⃣ Get salon
  const salon = await Salon.findById(salonId);

  if (!salon) {
    throw new Error('Salon not found');
  }

  await salon.resetPriorityIfNeeded();

  // 4️⃣ Check limit
  if (salon.priorityUsedToday >= salon.priorityLimitPerDay) {
    const err = new Error('Priority limit reached');
    err.code = 'PRIORITY_LIMIT_REACHED';
    throw err;
  }

  // 5️⃣ Get booking
  const booking = await Booking.findOne({
    _id: bookingId,
    salonId,
  }).populate('userId', 'name phone fcmToken');

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status !== 'pending') {
    throw new Error(`Booking is ${booking.status}`);
  }

  // 6️⃣ Check barber availability
  const inProgressCount = await Booking.countDocuments({
    salonId,
    status: 'in-progress',
  });

  const activeBarbers = salon.activeBarbers || 1;

  if (inProgressCount >= activeBarbers) {
    const err = new Error('No barbers available');
    err.code = 'NO_BARBERS_AVAILABLE';
    throw err;
  }

  // 7️⃣ Validate staff
  let assignedStaffName = null;

  if (assignedStaffId) {

    const staff = await Staff.findOne({
      _id: assignedStaffId,
      salonId,
      isActive: true,
    });

    if (!staff) {
      throw new Error('Invalid staff');
    }

    const staffBusy = await Booking.findOne({
      assignedStaffId,
      status: 'in-progress',
    });

    if (staffBusy) {
      throw new Error(`${staff.name} is busy`);
    }

    booking.assignedStaffId = assignedStaffId;
    assignedStaffName = staff.name;
  }

  // 8️⃣ Start service
  const originalPosition = booking.queuePosition;

  booking.status = 'in-progress';
  booking.startedAt = new Date();
  booking.notes = booking.notes
    ? `${booking.notes} | Priority: ${reason}`
    : `Priority: ${reason}`;

  await booking.save();

  // 9️⃣ Increment limit
  salon.priorityUsedToday += 1;
  await salon.save();

  // 🔟 Audit log
  await PriorityLog.create({
    salonId,
    bookingId,
    customerId: booking.userId?._id || null,
    customerName:
      booking.userId?.name ||
      (booking.walkInToken ? `Token #${booking.walkInToken}` : 'Walk-in'),

    triggeredBy: user._id,
    triggeredByName: user.name || 'Manager',
    triggeredByRole: user.role === 'owner' ? 'owner' : 'manager',

    reason,
    queuePositionBefore: originalPosition,
    assignedStaffId: assignedStaffId || null,
    assignedStaffName,
  });

  // 1️⃣1️⃣ Notify customer
  if (booking.userId?.fcmToken) {
    await NotificationService.notifyPriorityStarted(
      booking.userId,
      booking,
      salon,
      reason
    );
  }

  return {
    booking,
    salon,
    originalPosition,
  };
}



module.exports = {
    addWalkInCustomer,
    startService,
    completeService,
    markCustomerArrivedService,
    skipCustomerService,
    undoSkipService,
    startPriorityServiceService,
    reorderActiveQueue,
};
