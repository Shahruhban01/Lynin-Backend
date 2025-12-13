const Salon = require('../models/Salon');
const WaitTimeService = require('../services/waitTimeService');
const { attachWaitTimesToSalons } = require('../utils/waitTimeHelpers');

// @desc    Get all salons with wait times
// @route   GET /api/salons
// @access  Public
exports.getSalons = async (req, res) => {
  try {
    const salons = await Salon.find({ isActive: true })
      .select('-__v')
      .lean();

    // Attach wait times to all salons
    const salonsWithWaitTime = await attachWaitTimesToSalons(salons);

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

    // Attach wait time
    const WaitTimeService = require('../services/waitTimeService');
    const waitTime = await WaitTimeService.getWaitTimeForSalon(salon);

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

    // Attach wait times
    const salonsWithWaitTime = await attachWaitTimesToSalons(salonsWithDistance);

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

    // Validation
    if (!name || !location || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, location, and phone are required',
      });
    }

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

    console.log(`✅ Salon created: ${salon.name}`);

    res.status(201).json({
      success: true,
      message: 'Salon created successfully',
      salon,
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

    // Update allowed fields
    const allowedUpdates = [
      'name',
      'description',
      'location',
      'phone',
      'email',
      'hours',
      'services',
      'images',
      'isOpen',
      'avgServiceTime',
      'totalBarbers',
      'activeBarbers',
      'averageServiceDuration',
      'busyMode',
      'maxQueueSize',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        salon[field] = req.body[field];
      }
    });

    await salon.save();

    console.log(`✅ Salon updated: ${salon.name}`);

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
