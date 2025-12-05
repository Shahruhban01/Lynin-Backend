const Salon = require('../models/Salon');

// @desc    Get all salons with optional filters
// @route   GET /api/salons
// @access  Public
exports.getSalons = async (req, res) => {
  try {
    const {
      city,
      search,
      lat,
      lng,
      radius = 10, // km
      page = 1,
      limit = 20,
    } = req.query;

    const query = { isActive: true };

    // City filter
    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Geolocation filter (nearby salons)
    if (lat && lng) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: radius * 1000, // Convert km to meters
        },
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const salons = await Salon.find(query)
      .select('-__v')
      .skip(skip)
      .limit(parseInt(limit))
      .sort('-createdAt');

    const total = await Salon.countDocuments(query);

    res.status(200).json({
      success: true,
      count: salons.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      salons,
    });
  } catch (error) {
    console.error('❌ Get salons error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salons',
      error: error.message,
    });
  }
};

// @desc    Get single salon by ID
// @route   GET /api/salons/:id
// @access  Public
exports.getSalonById = async (req, res) => {
  try {
    const salon = await Salon.findById(req.params.id)
      .select('-__v')
      .populate('ownerId', 'name phone email');

    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    res.status(200).json({
      success: true,
      salon,
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

// @desc    Get salons near user location
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
    }).select('-__v');

    // Calculate distance for each salon
    const salonsWithDistance = salons.map((salon) => {
      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        salon.location.coordinates[1],
        salon.location.coordinates[0]
      );

      return {
        ...salon.toObject(),
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      };
    });

    res.status(200).json({
      success: true,
      count: salonsWithDistance.length,
      salons: salonsWithDistance,
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

// @desc    Create new salon (Admin/Owner only - for testing now)
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
      ownerId: req.user._id, // Current authenticated user
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


// Salon Owner/Admin specific controllers would go here (update, delete, manage services, etc.)
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
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        salon[field] = req.body[field];
      }
    });

    await salon.save();

    console.log(`✅ Salon updated: ${salon.name}`);

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


// module.exports = {
//   // getSalons: exports.getSalons,
//   // getSalonById: exports.getSalonById,
//   // getNearbySalons: exports.getNearbySalons,
//   // createSalon: exports.createSalon,
//   getMySalons: exports.getMySalons, // ADD
//   updateSalon: exports.updateSalon, // ADD
// };

