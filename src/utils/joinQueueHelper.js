const Booking = require('../models/Booking');
const { emitWaitTimeUpdate } = require('./waitTimeHelpers');

// DO NOT import Salon or User here unless you actually use them

async function joinQueueInternal({ booking, salon }) {
  if (!booking || !salon) {
    throw new Error('joinQueueInternal requires booking and salon');
  }

  // Count active queue
  const activeCount = await Booking.countDocuments({
    salonId: salon._id,
    status: { $in: ['pending', 'in-progress'] },
  });

  booking.status = 'pending';
  booking.arrived = true;
  booking.arrivedAt = new Date();
  booking.joinedAt = new Date();
  booking.queuePosition = activeCount + 1;
  booking.bookingType = 'immediate';

  // Recalculate timing
  const waitMinutes =
    activeCount * (salon.avgServiceTime || 30);

  booking.estimatedStartTime = new Date(
    Date.now() + waitMinutes * 60000
  );

  booking.estimatedEndTime = new Date(
    booking.estimatedStartTime.getTime() +
    booking.totalDuration * 60000
  );

  await booking.save();

  await emitWaitTimeUpdate(salon._id);

  return booking;
}

module.exports = { joinQueueInternal };
