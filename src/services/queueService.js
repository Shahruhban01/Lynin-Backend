const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');

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

module.exports = {
  addWalkInCustomer,
};
