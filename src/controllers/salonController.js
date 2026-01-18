const Salon = require('../models/Salon');
const WaitTimeService = require('../services/waitTimeService');
const { attachWaitTimesToSalons } = require('../utils/waitTimeHelpers');
const Booking = require('../models/Booking');
const NotificationService = require('../services/notificationService');

// ✅ NEW: Close salon with reason and queue check
// @desc    Close salon with reason (checks queue status)
// @route   PUT /api/salons/:id/close-with-reason
// @access  Private (Owner)
exports.closeSalonWithReason = async (req, res) => {
  try {
    const { reason, customReason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Closure reason is required',
      });
    }

    const salon = await Salon.findById(req.params.id).populate('ownerId');

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Verify ownership
    if (salon.ownerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // ✅ Check current queue size
    const activeBookings = await Booking.countDocuments({
      salonId: salon._id,
      status: { $in: ['pending', 'in-progress'] },
    });

    console.log(`🔍 Queue check: ${activeBookings} active bookings`);

    // Get all customers in queue for notifications
    const queueCustomers = await Booking.find({
      salonId: salon._id,
      status: { $in: ['pending', 'in-progress'] },
    }).populate('userId', 'name phone fcmToken');

    // Update salon status
    salon.operatingMode = 'closed';
    salon.isOpen = false;
    salon.isActive = false;
    salon.lastClosureReason = reason === 'custom' ? customReason : reason;

    // Add to closure history
    if (!salon.closureHistory) {
      salon.closureHistory = [];
    }

    salon.closureHistory.push({
      closedAt: new Date(),
      reason: reason,
      customReason: reason === 'custom' ? customReason : null,
      queueSizeAtClosure: activeBookings,
    });

    await salon.save();

    console.log(`🔒 Salon closed: ${salon.name}`);
    console.log(`   Reason: ${salon.lastClosureReason}`);
    console.log(`   Queue size at closure: ${activeBookings}`);

    // ✅ Send notifications to all customers in queue
    if (queueCustomers.length > 0) {
      console.log(`📤 Notifying ${queueCustomers.length} customers about closure`);

      for (const booking of queueCustomers) {
        if (booking.userId && booking.userId.fcmToken) {
          try {
            await NotificationService.notifySalonClosed(
              booking.userId,
              salon,
              salon.lastClosureReason
            );
          } catch (notifError) {
            console.error(
              `❌ Failed to notify customer ${booking.userId.name}:`,
              notifError
            );
          }
        }
      }

      console.log(`✅ Closure notifications sent`);
    }

    // Emit socket event
    if (global.io) {
      global.io.to(`salon_${salon._id}`).emit('salon_closed', {
        salonId: salon._id.toString(),
        reason: salon.lastClosureReason,
        queueSize: activeBookings,
      });
    }

    // Emit wait time update
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(salon._id);

    res.status(200).json({
      success: true,
      message: 'Salon closed successfully',
      salon: {
        _id: salon._id,
        name: salon.name,
        operatingMode: salon.operatingMode,
        isOpen: salon.isOpen,
        lastClosureReason: salon.lastClosureReason,
        queueSizeAtClosure: activeBookings,
      },
      notificationsSent: queueCustomers.length,
    });
  } catch (error) {
    console.error('❌ Close salon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close salon',
      error: error.message,
    });
  }
};

// ✅ NEW: Check queue status before closing
// @desc    Get current queue status for closure check
// @route   GET /api/salons/:id/queue-status
// @access  Private (Owner)
exports.getQueueStatusForClosure = async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Verify ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Check active bookings
    const activeBookings = await Booking.find({
      salonId: salon._id,
      status: { $in: ['pending', 'in-progress'] },
    })
      .populate('userId', 'name phone')
      .select('queuePosition status userId services totalDuration');

    // Check if currently within working hours
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[now.getDay()];
    const todayHours = salon.hours?.[dayName];

    let isWithinWorkingHours = false;
    if (todayHours && !todayHours.closed) {
      const [openHour, openMin] = todayHours.open.split(':').map(Number);
      const [closeHour, closeMin] = todayHours.close.split(':').map(Number);

      const openTime = openHour * 60 + openMin;
      const closeTime = closeHour * 60 + closeMin;
      const currentTime = now.getHours() * 60 + now.getMinutes();

      isWithinWorkingHours = currentTime >= openTime && currentTime <= closeTime;
    }

    res.status(200).json({
      success: true,
      queueStatus: {
        hasActiveBookings: activeBookings.length > 0,
        activeBookingsCount: activeBookings.length,
        bookings: activeBookings,
        isWithinWorkingHours,
        currentDay: dayName,
        todayHours: todayHours || null,
      },
    });
  } catch (error) {
    console.error('❌ Get queue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue status',
      error: error.message,
    });
  }
};

// ✅ NEW: Set salon to busy mode
// @desc    Set salon to busy mode (no new bookings)
// @route   PUT /api/salons/:id/set-busy-mode
// @access  Private (Owner)
exports.setBusyMode = async (req, res) => {
  try {
    const { enabled } = req.body;

    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Verify ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (enabled) {
      salon.operatingMode = 'busy';
      salon.busyMode = true;
      // Salon remains open, just no new bookings
      salon.isOpen = true;
      salon.isActive = true;
    } else {
      salon.operatingMode = 'normal';
      salon.busyMode = false;
      salon.isOpen = true;
      salon.isActive = true;
    }

    await salon.save();

    console.log(`${enabled ? '⏸️' : '▶️'} Busy mode ${enabled ? 'ENABLED' : 'DISABLED'} for: ${salon.name}`);

    // Emit socket event
    if (global.io) {
      global.io.to(`salon_${salon._id}`).emit('busy_mode_changed', {
        salonId: salon._id.toString(),
        busyMode: salon.busyMode,
      });
    }

    res.status(200).json({
      success: true,
      message: `Busy mode ${enabled ? 'enabled' : 'disabled'}`,
      salon: {
        _id: salon._id,
        operatingMode: salon.operatingMode,
        busyMode: salon.busyMode,
        isOpen: salon.isOpen,
      },
    });
  } catch (error) {
    console.error('❌ Set busy mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set busy mode',
      error: error.message,
    });
  }
};


// @desc    Get all salons with wait times
// @route   GET /api/salons
// @access  Public
exports.getSalons = async (req, res) => {
  try {
    const userId = req.user?._id || null; // ✅ Get user ID if authenticated

    const salons = await Salon.find({ isActive: true })
      .select('-__v')
      .lean();

    // ✅ Attach wait times with user context
    const salonsWithWaitTime = await attachWaitTimesToSalons(salons, userId);

    res.status(200).json({
      success: true,
      count: salonsWithWaitTime.length,
      salons: salonsWithWaitTime,
    });
  } catch (error) {
    console.error('❌ Get salons error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get salons',
      error: error.message,
    });
  }
};


// @desc    Get single salon by ID with wait time
// @route   GET /api/salons/:id
// @access  Public
exports.getSalonById = async (req, res) => {
  try {
    const userId = req.user?._id || null; // ✅ Get user ID if authenticated

    const salon = await Salon.findById(req.params.id)
      .select('-__v')
      .populate('ownerId', 'name phone email')
      .lean();

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // ✅ Calculate wait time with user context
    const WaitTimeService = require('../services/waitTimeService');
    const waitTime = await WaitTimeService.getWaitTimeForSalon(salon, userId);

    res.status(200).json({
      success: true,
      salon: {
        ...salon,
        waitTime,
      },
    });
  } catch (error) {
    console.error('❌ Get salon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salon',
      error: error.message,
    });
  }
};


// @desc    Get salons near user location with wait times
// @route   GET /api/salons/nearby
// @access  Public
exports.getNearbySalons = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    const userId = req.user?._id || null; // ✅ Get user ID if authenticated

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const salons = await Salon.find({
      isActive: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseFloat(radius) * 1000,
        },
      },
    })
      .select('-__v')
      .lean();

    // Calculate distance
    const salonsWithDistance = salons.map((salon) => {
      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        salon.location.coordinates[1],
        salon.location.coordinates[0]
      );

      return {
        ...salon,
        distance: Math.round(distance * 10) / 10,
      };
    });

    // ✅ Attach wait times with user context
    const salonsWithWaitTime = await attachWaitTimesToSalons(salonsWithDistance, userId);

    res.status(200).json({
      success: true,
      count: salonsWithWaitTime.length,
      salons: salonsWithWaitTime,
    });
  } catch (error) {
    console.error('❌ Get nearby salons error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby salons',
      error: error.message,
    });
  }
};


// Helper: Calculate distance using Haversine
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}


// @desc    Create new salon (Admin/Owner only)
// @route   POST /api/salons
// @access  Private
exports.createSalon = async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      phone,
      email,
      hours,
      services,
      images,
      totalBarbers,
      activeBarbers,
      averageServiceDuration,
    } = req.body;

    if (!name || !location || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, location, and phone are required',
      });
    }

    // 1️⃣ Create salon
    const salon = await Salon.create({
      name,
      description,
      location,
      phone,
      email,
      hours,
      services,
      images,
      ownerId: req.user._id,
      totalBarbers: totalBarbers || 1,
      activeBarbers: activeBarbers || 1,
      averageServiceDuration: averageServiceDuration || 30,
    });

    // 2️⃣ ATTACH SALON TO USER (THIS WAS MISSING)
    const user = await User.findById(req.user._id);
    user.salonId = salon._id;
    user.role = 'owner'; // enforce
    await user.save();

    console.log(`✅ Salon created & linked: ${salon.name} → User ${user._id}`);

    // 3️⃣ Return salon explicitly
    res.status(201).json({
      success: true,
      message: 'Salon created successfully',
      salon: {
        _id: salon._id,
        name: salon.name,
      },
    });
  } catch (error) {
    console.error('❌ Create salon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create salon',
      error: error.message,
    });
  }
};

// exports.createSalon = async (req, res) => {
//   try {
//     const {
//       name,
//       description,
//       location,
//       phone,
//       email,
//       hours,
//       services,
//       images,
//       totalBarbers,
//       activeBarbers,
//       averageServiceDuration,
//     } = req.body;

//     // Validation
//     if (!name || !location || !phone) {
//       return res.status(400).json({
//         success: false,
//         message: 'Name, location, and phone are required',
//       });
//     }

//     const salon = await Salon.create({
//       name,
//       description,
//       location,
//       phone,
//       email,
//       hours,
//       services,
//       images,
//       ownerId: req.user._id,
//       totalBarbers: totalBarbers || 1,
//       activeBarbers: activeBarbers || 1,
//       averageServiceDuration: averageServiceDuration || 30,
//     });

//     console.log(`✅ Salon created: ${salon.name}`);

//     res.status(201).json({
//       success: true,
//       message: 'Salon created successfully',
//       salon,
//     });
//   } catch (error) {
//     console.error('❌ Create salon error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create salon',
//       error: error.message,
//     });
//   }
// };

// Helper function to calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// @desc    Get salons owned by current user
// @route   GET /api/salons/my-salons
// @access  Private
exports.getMySalons = async (req, res) => {
  try {
    console.log('📍 Fetching salons for user:', req.user._id);

    const salons = await Salon.find({
      ownerId: req.user._id,
      isActive: true,
    }).select('-__v');

    console.log(`✅ Found ${salons.length} salons for user`);

    res.status(200).json({
      success: true,
      count: salons.length,
      salons,
    });
  } catch (error) {
    console.error('❌ Get my salons error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salons',
      error: error.message,
    });
  }
};

// @desc    Update salon details
// @route   PUT /api/salons/:id
// @access  Private (Owner only)
exports.updateSalon = async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Check ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this salon',
      });
    }

    // ✅ UPDATED: Conditionally allow location updates
    const allowedUpdates = [
      'name',
      'description',
      'phone',
      'email',
      'hours',
      'services',
      'images',
      'profileImage',
      'isOpen',
      'avgServiceTime',
      'totalBarbers',
      'activeBarbers',
      'averageServiceDuration',
      'busyMode',
      'maxQueueSize',
      'type', // ✅ NEW: Allow type updates
    ];

    // ✅ NEW: Only allow location update if admin enabled it
    if (salon.locationEditEnabled) {
      allowedUpdates.push('location');
      console.log('✅ Location edit enabled for this salon');
    } else if (req.body.location) {
      console.log('⚠️ Location edit attempted but not enabled');
      return res.status(403).json({
        success: false,
        message: 'Location editing is disabled. Please contact support to enable it.',
      });
    }

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        salon[field] = req.body[field];
      }
    });

    await salon.save();

    console.log(`✅ Salon updated: ${salon.name}`);
    if (req.body.type) {
      console.log(`   Type changed to: ${req.body.type || 'Not specified'}`);
    }

    // Emit wait time update
    const WaitTimeService = require('../services/waitTimeService');
    const waitTime = await WaitTimeService.calculateWaitTime(
      salon._id,
      salon.activeBarbers || 1,
      salon.averageServiceDuration || 30
    );

    if (global.io) {
      global.io.to(`salon_${salon._id}`).emit('wait_time_updated', {
        salonId: salon._id.toString(),
        waitTime,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Salon updated successfully',
      salon,
    });
  } catch (error) {
    console.error('❌ Update salon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update salon',
      error: error.message,
    });
  }
};

// ✅ NEW: Admin endpoint to enable location editing
// @desc    Enable/Disable location editing for a salon (Admin only)
// @route   PUT /api/salons/:id/toggle-location-edit
// @access  Private (Admin only)
exports.toggleLocationEdit = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
      });
    }

    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    salon.locationEditEnabled = !salon.locationEditEnabled;
    await salon.save();

    console.log(
      `✅ Location edit ${salon.locationEditEnabled ? 'ENABLED' : 'DISABLED'} for salon: ${salon.name}`
    );

    res.status(200).json({
      success: true,
      message: `Location editing ${salon.locationEditEnabled ? 'enabled' : 'disabled'}`,
      locationEditEnabled: salon.locationEditEnabled,
    });
  } catch (error) {
    console.error('❌ Toggle location edit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle location edit',
      error: error.message,
    });
  }
};


// @desc    Toggle busy mode
// @route   PUT /api/salons/:id/busy-mode
// @access  Private (Owner)
exports.toggleBusyMode = async (req, res) => {
  try {
    const { busyMode } = req.body;
    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Check ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    salon.busyMode = busyMode;
    await salon.save();

    // ✅ PRD TRIGGER: Busy mode toggled
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(salon._id);

    res.status(200).json({
      success: true,
      message: `Busy mode ${busyMode ? 'enabled' : 'disabled'}`,
      salon,
    });
  } catch (error) {
    console.error('❌ Toggle busy mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle busy mode',
      error: error.message,
    });
  }
};

// @desc    Update active barbers count
// @route   PUT /api/salons/:id/active-barbers
// @access  Private (Owner)
exports.updateActiveBarbers = async (req, res) => {
  try {
    const { activeBarbers } = req.body;
    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Check ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Validate
    if (activeBarbers > salon.totalBarbers) {
      return res.status(400).json({
        success: false,
        message: 'Active barbers cannot exceed total barbers',
      });
    }

    salon.activeBarbers = activeBarbers;
    await salon.save();

    // ✅ PRD TRIGGER: Active barbers changed
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(salon._id);

    res.status(200).json({
      success: true,
      message: 'Active barbers updated',
      salon,
    });
  } catch (error) {
    console.error('❌ Update active barbers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update active barbers',
      error: error.message,
    });
  }
};


// @desc    Toggle salon open/close status
// @route   PATCH /api/salons/:salonId/toggle-status
// @access  Private (Owner/Manager)
exports.toggleSalonStatus = async (req, res) => {
  try {
    const { salonId } = req.params;

    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Toggle status
    salon.isActive = !salon.isActive;
    await salon.save();

    console.log(`✅ Salon status toggled: ${salon.name} - ${salon.isActive ? 'OPEN' : 'CLOSED'}`);

    res.status(200).json({
      success: true,
      message: `Salon is now ${salon.isActive ? 'OPEN' : 'CLOSED'}`,
      isActive: salon.isActive,
    });
  } catch (error) {
    console.error('❌ Toggle salon status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle salon status',
      error: error.message,
    });
  }
};


// ✅ NEW: Toggle staff system
// @desc    Enable/Disable staff management system
// @route   PUT /api/salons/:id/toggle-staff-system
// @access  Private (Owner)
exports.toggleStaffSystem = async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Verify ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Toggle the system
    salon.staffSystemEnabled = !salon.staffSystemEnabled;
    await salon.save();

    console.log(
      `✅ Staff system ${salon.staffSystemEnabled ? 'ENABLED' : 'DISABLED'} for salon: ${salon.name}`
    );

    res.status(200).json({
      success: true,
      message: `Staff system ${salon.staffSystemEnabled ? 'enabled' : 'disabled'}`,
      staffSystemEnabled: salon.staffSystemEnabled,
    });
  } catch (error) {
    console.error('❌ Toggle staff system error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle staff system',
      error: error.message,
    });
  }
};

// ✅ NEW: Update staff system status
// @desc    Set staff system enabled/disabled state
// @route   PUT /api/salons/:id/staff-system
// @access  Private (Owner)
exports.updateStaffSystemStatus = async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enabled field must be a boolean',
      });
    }

    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Verify ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    salon.staffSystemEnabled = enabled;
    await salon.save();

    console.log(
      `✅ Staff system set to ${enabled ? 'ENABLED' : 'DISABLED'} for salon: ${salon.name}`
    );

    res.status(200).json({
      success: true,
      message: `Staff system ${enabled ? 'enabled' : 'disabled'}`,
      staffSystemEnabled: salon.staffSystemEnabled,
    });
  } catch (error) {
    console.error('❌ Update staff system error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff system',
      error: error.message,
    });
  }
};


// ✅ NEW: Update salon settings (operating mode, notifications, etc.)
// ✅ UPDATED: Update salon account settings (with isOpen and isActive control)
// @desc    Update salon account settings
// @route   PUT /api/salons/:id/settings
// @access  Private (Owner)
exports.updateSalonSettings = async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Verify ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const {
      operatingMode,
      isOpen,
      isActive,
      autoAcceptBookings,
      notificationPreferences,
      maxQueueSize,
    } = req.body;

    // Update fields if provided
    if (operatingMode) salon.operatingMode = operatingMode;
    if (typeof isOpen === 'boolean') salon.isOpen = isOpen;
    if (typeof isActive === 'boolean') salon.isActive = isActive;
    if (typeof autoAcceptBookings === 'boolean') salon.autoAcceptBookings = autoAcceptBookings;
    if (typeof maxQueueSize === 'number') salon.maxQueueSize = maxQueueSize;
    
    if (notificationPreferences) {
      salon.notificationPreferences = {
        ...salon.notificationPreferences,
        ...notificationPreferences,
      };
    }

    await salon.save();

    console.log(`✅ Settings updated for salon: ${salon.name}`);
    console.log(`   Operating mode: ${salon.operatingMode}`);
    console.log(`   isOpen: ${salon.isOpen}, isActive: ${salon.isActive}`);
    console.log(`   Auto-accept: ${salon.autoAcceptBookings}`);

    // Emit wait time update
    const { emitWaitTimeUpdate } = require('../utils/waitTimeHelpers');
    await emitWaitTimeUpdate(salon._id);

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      salon,
    });
  } catch (error) {
    console.error('❌ Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
    });
  }
};


// ✅ NEW: Toggle phone change permission (Admin only)
// @desc    Enable/Disable phone number change for a salon
// @route   PUT /api/salons/:id/toggle-phone-change
// @access  Private (Admin only)
exports.togglePhoneChangePermission = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
      });
    }

    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    salon.phoneChangeEnabled = !salon.phoneChangeEnabled;
    await salon.save();

    console.log(
      `✅ Phone change ${salon.phoneChangeEnabled ? 'ENABLED' : 'DISABLED'} for salon: ${salon.name}`
    );

    res.status(200).json({
      success: true,
      message: `Phone change ${salon.phoneChangeEnabled ? 'enabled' : 'disabled'}`,
      phoneChangeEnabled: salon.phoneChangeEnabled,
    });
  } catch (error) {
    console.error('❌ Toggle phone change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle phone change permission',
      error: error.message,
    });
  }
};


// Service Controller Starts
// ✅ NEW: Add service to salon
// @desc    Add a new service to salon
// @route   POST /api/salons/:id/services
// @access  Private (Owner)
exports.addService = async (req, res) => {
  try {
    const { name, price, duration, description, category, isPrimary, isUpsell } = req.body;

    // Validation
    if (!name || !price || !duration || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, duration, and category are required',
      });
    }

    if (price < 10 || price > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Price must be between ₹10 and ₹10,000',
      });
    }

    if (duration < 5 || duration > 300) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 5 and 300 minutes',
      });
    }

    if (!['Hair', 'Beard', 'Body', 'Add-on'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
      });
    }

    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Verify ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Check for duplicate service name
    const duplicate = salon.services.find(
      (s) => s.name.toLowerCase() === name.toLowerCase().trim()
    );

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'A service with this name already exists',
      });
    }

    const newService = {
      name: name.trim(),
      price,
      duration,
      description: description?.trim() || '',
      category,
      isPrimary: isPrimary || false,
      isUpsell: isUpsell || false,
    };

    salon.services.push(newService);
    await salon.save();

    console.log(`✅ Service added: ${name} to ${salon.name}`);

    res.status(201).json({
      success: true,
      message: 'Service added successfully',
      service: salon.services[salon.services.length - 1],
      salon,
    });
  } catch (error) {
    console.error('❌ Add service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add service',
      error: error.message,
    });
  }
};

// ✅ NEW: Update service
// @desc    Update an existing service
// @route   PUT /api/salons/:id/services/:serviceId
// @access  Private (Owner)
exports.updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { name, price, duration, description, category, isPrimary, isUpsell } = req.body;

    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Verify ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const service = salon.services.id(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    // Validation
    if (price && (price < 10 || price > 10000)) {
      return res.status(400).json({
        success: false,
        message: 'Price must be between ₹10 and ₹10,000',
      });
    }

    if (duration && (duration < 5 || duration > 300)) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 5 and 300 minutes',
      });
    }

    if (category && !['Hair', 'Beard', 'Body', 'Add-on'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
      });
    }

    // Check for duplicate name (excluding current service)
    if (name) {
      const duplicate = salon.services.find(
        (s) =>
          s._id.toString() !== serviceId &&
          s.name.toLowerCase() === name.toLowerCase().trim()
      );

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'A service with this name already exists',
        });
      }
    }

    // Update fields
    if (name) service.name = name.trim();
    if (price !== undefined) service.price = price;
    if (duration !== undefined) service.duration = duration;
    if (description !== undefined) service.description = description.trim();
    if (category) service.category = category;
    if (typeof isPrimary === 'boolean') service.isPrimary = isPrimary;
    if (typeof isUpsell === 'boolean') service.isUpsell = isUpsell;

    await salon.save();

    console.log(`✅ Service updated: ${service.name} in ${salon.name}`);

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service,
      salon,
    });
  } catch (error) {
    console.error('❌ Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      error: error.message,
    });
  }
};

// ✅ NEW: Delete service
// @desc    Delete a service
// @route   DELETE /api/salons/:id/services/:serviceId
// @access  Private (Owner)
exports.deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const salon = await Salon.findById(req.params.id);

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Verify ownership
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const service = salon.services.id(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    const serviceName = service.name;
    service.deleteOne();
    await salon.save();

    console.log(`✅ Service deleted: ${serviceName} from ${salon.name}`);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
      salon,
    });
  } catch (error) {
    console.error('❌ Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service',
      error: error.message,
    });
  }
};

// Service Controller Ends