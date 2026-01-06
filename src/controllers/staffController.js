const Staff = require('../models/Staff');
const Salon = require('../models/Salon');
const Booking = require('../models/Booking');

// @desc    Get all staff for a salon
// @route   GET /api/staff/salon/:salonId
// @access  Private (Owner/Manager)
exports.getStaffBySalon = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { status } = req.query; // 'active', 'inactive', or 'all'

    // Verify salon ownership
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Build query
    const query = { salonId };
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const staff = await Staff.find(query).sort('-createdAt');

    console.log(`📊 Fetched ${staff.length} staff members for salon ${salonId}`);

    res.status(200).json({
      success: true,
      count: staff.length,
      staff,
    });
  } catch (error) {
    console.error('❌ Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff',
      error: error.message,
    });
  }
};

// @desc    Get staff by ID
// @route   GET /api/staff/:id
// @access  Private
exports.getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).populate(
      'salonId',
      'name location'
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    res.status(200).json({
      success: true,
      staff,
    });
  } catch (error) {
    console.error('❌ Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff',
      error: error.message,
    });
  }
};

// @desc    Add new staff member
// @route   POST /api/staff
// @access  Private (Owner/Manager)
exports.addStaff = async (req, res) => {
  try {
    const {
      salonId,
      name,
      email,
      phone,
      role,
      specialization,
      commissionType,
      commissionRate,
      salary,
      workingHours,
      profileImage,
    } = req.body;

    console.log('👤 Add staff request:');
    console.log('   Salon:', salonId);
    console.log('   Name:', name);
    console.log('   Role:', role);

    // Validation
    if (!salonId || !name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Salon ID, name, email, and phone are required',
      });
    }

    // Verify salon ownership
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Check if email already exists for this salon
    const existingStaff = await Staff.findOne({ salonId, email });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: 'Staff member with this email already exists',
      });
    }

    // Create staff
    const staff = await Staff.create({
      salonId,
      name,
      email,
      phone,
      role: role || 'barber',
      specialization: specialization || [],
      commissionType: commissionType || 'percentage',
      commissionRate: commissionRate || 0,
      salary: salary || 0,
      workingHours: workingHours || undefined, // Use default from schema
      profileImage: profileImage || null,
    });

    console.log(`✅ Staff member added: ${staff.name} (${staff.role})`);

    res.status(201).json({
      success: true,
      message: 'Staff member added successfully',
      staff,
    });
  } catch (error) {
    console.error('❌ Add staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add staff',
      error: error.message,
    });
  }
};

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private (Owner/Manager)
exports.updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    // Verify salon ownership
    const salon = await Salon.findById(staff.salonId);
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Update fields
    const allowedUpdates = [
      'name',
      'email',
      'phone',
      'role',
      'specialization',
      'commissionType',
      'commissionRate',
      'salary',
      'workingHours',
      'profileImage',
      'isActive',
      'isAvailable',
      'notes',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        staff[field] = req.body[field];
      }
    });

    await staff.save();

    console.log(`✅ Staff updated: ${staff.name}`);

    res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
      staff,
    });
  } catch (error) {
    console.error('❌ Update staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff',
      error: error.message,
    });
  }
};

// @desc    Delete/deactivate staff member
// @route   DELETE /api/staff/:id
// @access  Private (Owner)
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    // Verify salon ownership
    const salon = await Salon.findById(staff.salonId);
    if (salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Soft delete (deactivate instead of removing)
    staff.isActive = false;
    await staff.save();

    console.log(`✅ Staff deactivated: ${staff.name}`);

    res.status(200).json({
      success: true,
      message: 'Staff member deactivated',
    });
  } catch (error) {
    console.error('❌ Delete staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff',
      error: error.message,
    });
  }
};

// @desc    Get staff performance/analytics
// @route   GET /api/staff/:id/performance
// @access  Private (Owner/Manager)
exports.getStaffPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.completedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get completed bookings for this staff
    const bookings = await Booking.find({
      assignedStaffId: id,
      status: 'completed',
      ...dateFilter,
    });

    // Calculate metrics
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    
    let totalCommission = 0;
    if (staff.commissionType === 'percentage') {
      totalCommission = (totalRevenue * staff.commissionRate) / 100;
    } else if (staff.commissionType === 'fixed') {
      totalCommission = totalBookings * staff.commissionRate;
    }

    // Get rating average
    const ratings = bookings
      .filter((b) => b.staffRating)
      .map((b) => b.staffRating);
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    res.status(200).json({
      success: true,
      performance: {
        staff: {
          _id: staff._id,
          name: staff.name,
          role: staff.role,
          profileImage: staff.profileImage,
        },
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now',
        },
        metrics: {
          totalBookings,
          totalRevenue,
          totalCommission,
          averageRating: parseFloat(averageRating.toFixed(2)),
          totalReviews: ratings.length,
        },
        bookings,
      },
    });
  } catch (error) {
    console.error('❌ Get performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance',
      error: error.message,
    });
  }
};

// @desc    Toggle staff availability
// @route   PUT /api/staff/:id/availability
// @access  Private (Owner/Manager/Staff)
exports.toggleAvailability = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    staff.isAvailable = !staff.isAvailable;
    await staff.save();

    console.log(`✅ ${staff.name} availability: ${staff.isAvailable}`);

    res.status(200).json({
      success: true,
      message: `Staff ${staff.isAvailable ? 'available' : 'unavailable'}`,
      isAvailable: staff.isAvailable,
    });
  } catch (error) {
    console.error('❌ Toggle availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle availability',
      error: error.message,
    });
  }
};

module.exports = {
  getStaffBySalon: exports.getStaffBySalon,
  getStaffById: exports.getStaffById,
  addStaff: exports.addStaff,
  updateStaff: exports.updateStaff,
  deleteStaff: exports.deleteStaff,
  getStaffPerformance: exports.getStaffPerformance,
  toggleAvailability: exports.toggleAvailability,
};
