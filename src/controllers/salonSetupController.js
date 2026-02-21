const User = require('../models/User');
const Salon = require('../models/Salon');
const logger = require('../utils/logger');

// @desc    Get current setup status
// @route   GET /api/salon-setup/status
// @access  Private (Owner only)
exports.getSetupStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('salonId');

    res.status(200).json({
      success: true,
      setupCompleted: user.setupCompleted || false,
      currentStep: user.setupStep || 'profile',
      salon: user.salonId || null,
    });
  } catch (error) {
    logger.error('❌ Get setup status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get setup status',
      error: error.message,
    });
  }
};

// @desc    Save profile setup (Step 1)
// @route   POST /api/salon-setup/profile
// @access  Private (Owner only)
exports.saveProfileSetup = async (req, res) => {
  try {
    const { name, address, city, state, pincode, phone, email, description, longitude, latitude, images } = req.body;

    // Validation
    if (!name || !address || !city || !state || !pincode || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['name', 'address', 'city', 'state', 'pincode', 'phone'],
      });
    }

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates required',
      });
    }

    const user = await User.findById(req.user._id);

    // Check if salon already exists for this user
    let salon;
    if (user.salonId) {
      // Update existing salon
      salon = await Salon.findById(user.salonId);
      salon.name = name;
      salon.description = description || '';
      salon.location.address = address;
      salon.location.city = city;
      salon.location.state = state;
      salon.location.pincode = pincode;
      salon.location.coordinates = [longitude, latitude];
      salon.phone = phone;
      salon.email = email || null;
      salon.images = images || []; // ✅ NEW: Save images
      await salon.save();

      logger.info(`✅ Updated existing salon: ${salon._id}`);
    } else {
      // Create new salon
      salon = await Salon.create({
        name,
        description: description || '',
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
          address,
          city,
          state,
          pincode,
        },
        phone,
        email: email || null,
        images: images || [], // ✅ NEW: Save images
        ownerId: user._id,
        isActive: false,
        isVerified: false,
      });

      // Link salon to user
      user.salonId = salon._id;
      logger.info(`✅ Created new salon: ${salon._id}`);
    }

    // Update user setup progress
    user.setupStep = 'hours';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile setup saved',
      nextStep: 'hours',
      salon: {
        _id: salon._id,
        name: salon.name,
        address: salon.location.address,
        images: salon.images,
      },
    });
  } catch (error) {
    logger.error('❌ Profile setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save profile',
      error: error.message,
    });
  }
};


// @desc    Save hours setup (Step 2)
// @route   POST /api/salon-setup/hours
// @access  Private (Owner only)
exports.saveHoursSetup = async (req, res) => {
  try {
    const { hours } = req.body;

    // Validation
    if (!hours || typeof hours !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Operating hours object required',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.salonId) {
      return res.status(400).json({
        success: false,
        message: 'Complete profile setup first',
      });
    }

    const salon = await Salon.findById(user.salonId);

    // Update hours
    salon.hours = hours;
    await salon.save();

    // Update user setup progress
    user.setupStep = 'services';
    await user.save();

    logger.info(`✅ Hours setup saved for salon: ${salon._id}`);

    res.status(200).json({
      success: true,
      message: 'Operating hours saved',
      nextStep: 'services',
    });
  } catch (error) {
    logger.error('❌ Hours setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save hours',
      error: error.message,
    });
  }
};

// @desc    Save services setup (Step 3)
// @route   POST /api/salon-setup/services
// @access  Private (Owner only)
exports.saveServicesSetup = async (req, res) => {
  try {
    const { services } = req.body;

    // Validation
    if (!services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one service is required',
      });
    }

    // ✅ NEW: Validate each service with new fields
    for (const service of services) {
      if (!service.name || !service.price || !service.duration || !service.category) {
        return res.status(400).json({
          success: false,
          message: 'Each service must have name, price, duration, and category',
        });
      }

      // Validate category
      const validCategories = ['Hair', 'Beard', 'Body', 'Add-on'];
      if (!validCategories.includes(service.category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        });
      }
    }

    const user = await User.findById(req.user._id);

    if (!user.salonId) {
      return res.status(400).json({
        success: false,
        message: 'Complete profile setup first',
      });
    }

    const salon = await Salon.findById(user.salonId);

    // ✅ NEW: Store services with all fields
    salon.services = services.map(service => ({
      name: service.name,
      price: service.price,
      duration: service.duration,
      description: service.description || '',
      category: service.category, // ✅ NEW
      isPrimary: service.isPrimary || false, // ✅ NEW
      isUpsell: service.isUpsell || false, // ✅ NEW
    }));
    
    await salon.save();

    // Update user setup progress
    user.setupStep = 'capacity';
    await user.save();

    logger.info(`✅ Services setup saved for salon: ${salon._id} (${services.length} services)`);

    res.status(200).json({
      success: true,
      message: 'Services saved',
      nextStep: 'capacity',
      servicesCount: services.length,
    });
  } catch (error) {
    logger.error('❌ Services setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save services',
      error: error.message,
    });
  }
};

// // @desc    Save services setup (Step 3)
// // @route   POST /api/salon-setup/services
// // @access  Private (Owner only)
// exports.saveServicesSetup = async (req, res) => {
//   try {
//     const { services } = req.body;

//     // Validation
//     if (!services || !Array.isArray(services) || services.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'At least one service is required',
//       });
//     }

//     // Validate each service
//     for (const service of services) {
//       if (!service.name || !service.price || !service.duration) {
//         return res.status(400).json({
//           success: false,
//           message: 'Each service must have name, price, and duration',
//         });
//       }
//     }

//     const user = await User.findById(req.user._id);

//     if (!user.salonId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Complete profile setup first',
//       });
//     }

//     const salon = await Salon.findById(user.salonId);

//     // Update services
//     salon.services = services;
//     await salon.save();

//     // Update user setup progress
//     user.setupStep = 'capacity';
//     await user.save();

//     logger.info(`✅ Services setup saved for salon: ${salon._id} (${services.length} services)`);

//     res.status(200).json({
//       success: true,
//       message: 'Services saved',
//       nextStep: 'capacity',
//       servicesCount: services.length,
//     });
//   } catch (error) {
//     logger.error('❌ Services setup error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to save services',
//       error: error.message,
//     });
//   }
// };

// @desc    Save capacity setup (Step 4)
// @route   POST /api/salon-setup/capacity
// @access  Private (Owner only)
exports.saveCapacitySetup = async (req, res) => {
  try {
    const { totalBarbers, activeBarbers, averageServiceDuration } = req.body;

    // Validation
    if (!totalBarbers || totalBarbers < 1) {
      return res.status(400).json({
        success: false,
        message: 'Total barbers must be at least 1',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.salonId) {
      return res.status(400).json({
        success: false,
        message: 'Complete profile setup first',
      });
    }

    const salon = await Salon.findById(user.salonId);

    // Update capacity
    salon.totalBarbers = totalBarbers;
    salon.activeBarbers = activeBarbers || totalBarbers;
    salon.averageServiceDuration = averageServiceDuration || 30;
    await salon.save();

    // Update user setup progress
    user.setupStep = 'completed';
    await user.save();

    logger.info(`✅ Capacity setup saved for salon: ${salon._id}`);

    res.status(200).json({
      success: true,
      message: 'Capacity setup saved',
      nextStep: 'complete',
    });
  } catch (error) {
    logger.error('❌ Capacity setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save capacity',
      error: error.message,
    });
  }
};

// @desc    Complete setup and activate salon
// @route   POST /api/salon-setup/complete
// @access  Private (Owner only)
exports.completeSetup = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('salonId');

    if (!user.salonId) {
      return res.status(400).json({
        success: false,
        message: 'No salon found',
      });
    }

    const salon = user.salonId;

    // Validate all setup steps are complete
    if (!salon.name || !salon.location.address || !salon.services.length || !salon.totalBarbers) {
      return res.status(400).json({
        success: false,
        message: 'Incomplete setup - all steps must be completed',
        missing: {
          profile: !salon.name || !salon.location.address,
          hours: !salon.hours,
          services: salon.services.length === 0,
          capacity: !salon.totalBarbers,
        },
      });
    }

    // Mark setup as complete
    user.setupCompleted = true;
    user.setupStep = 'completed';
    await user.save();

    // Activate salon
    salon.isActive = true;
    await salon.save();

    logger.info(`✅ Setup completed for salon: ${salon._id}`);

    res.status(200).json({
      success: true,
      message: 'Setup completed successfully',
      salon: {
        _id: salon._id,
        name: salon.name,
        isActive: salon.isActive,
      },
    });
  } catch (error) {
    logger.error('❌ Complete setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete setup',
      error: error.message,
    });
  }
};
