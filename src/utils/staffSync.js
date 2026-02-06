const Staff = require('../models/Staff');
const Salon = require('../models/Salon');

exports.syncStaffCounts = async (salonId) => {
  const total = await Staff.countDocuments({ salonId });

  const active = await Staff.countDocuments({
    salonId,
    isActive: true,
    isAvailable: true,
  });

  await Salon.findByIdAndUpdate(salonId, {
    totalBarbers: total || 1,
    activeBarbers: active || 1,
  });

  return { total, active };
};
