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
      staffSystemEnabled,
    } = req.body;

    console.log('👤 Add staff request:');
    console.log('   Salon:', salonId);
    console.log('   Name:', name);
    console.log('   Role:', role);
    console.log('   Staff System Enabled:', staffSystemEnabled);

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
      // staffSystemEnabled: staffSystemEnabled || false,
      staffSystemEnabled: staffSystemEnabled ?? false,
    });

    // ✅ Update activeBarbers ONLY if role is barber
    if (staff.role === 'barber') {
      await Salon.findByIdAndUpdate(
        salonId,
        { $inc: { activeBarbers: 1, totalBarbers: 1 } },
        { new: true }
      );
    }

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

// ✅ UPDATED: Smart single delete (soft delete → permanent)
// @desc    Delete / deactivate staff member
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

    // ✅ Check if already inactive → permanent delete
    if (!staff.isActive) {
      console.log(`🔥 Staff ${staff.name} is already inactive, PERMANENTLY DELETING...`);

      // Optional: Delete their booking history
      // await Booking.deleteMany({ assignedStaffId: staff._id });

      await Staff.findByIdAndDelete(staff._id);

      console.log(`✅ Staff ${staff.name} PERMANENTLY DELETED`);

      return res.status(200).json({
        success: true,
        message: 'Staff member permanently deleted',
        permanent: true,
      });
    }

    // ✅ Active staff → soft delete
    const wasBarber = staff.role === 'barber';
    const wasAvailableBarber = wasBarber && staff.isAvailable === true;

    // Check for active bookings
    const activeBookingsCount = await Booking.countDocuments({
      assignedStaffId: staff._id,
      status: { $in: ['pending', 'in-progress'] },
    });

    if (activeBookingsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete staff with ${activeBookingsCount} active booking(s). Please complete or reassign them first.`,
      });
    }

    // Soft delete
    staff.isActive = false;
    staff.isAvailable = false;
    await staff.save();

    // Update salon counters
    if (wasBarber) {
      const update = {
        $inc: {
          totalBarbers: -1,
          activeBarbers: wasAvailableBarber ? -1 : 0,
        },
      };

      await Salon.findByIdAndUpdate(staff.salonId, update);
    }

    console.log(
      `✅ Staff ${staff.name} deactivated | barber=${wasBarber} | active=${wasAvailableBarber}`
    );

    res.status(200).json({
      success: true,
      message: 'Staff member deactivated successfully. Delete again to permanently remove.',
      permanent: false,
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



// @desc    Get individual staff performance
// @route   GET /api/staff/:id/performance
// @access  Private (Owner)
exports.getStaffPerformance = async (req, res) => {
  try {
    const staffId = req.params.id; // ✅ Changed from req.params.staffId
    const { startDate, endDate } = req.query;

    console.log(`📊 Getting performance for staff: ${staffId}`);

    // Validate staffId
    if (!staffId || staffId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff ID',
      });
    }

    // Get staff details
    const staff = await Staff.findById(staffId);
    if (!staff) {
      console.log(`❌ Staff not found: ${staffId}`);
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    console.log(`✅ Found staff: ${staff.name}`);

    // Verify ownership
    const salon = await Salon.findById(staff.salonId);
    if (!salon || salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Determine date range
    let dateFilter = { assignedStaffId: staffId };
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      dateFilter.completedAt = {
        $gte: start,
        $lte: end,
      };
      
      console.log(`📅 Date range: ${start.toDateString()} to ${end.toDateString()}`);
    }

    // Get all bookings for this staff (completed only)
    const allBookings = await Booking.find({
      ...dateFilter,
      status: 'completed',
    })
      .populate('userId', 'name phone')
      .sort({ completedAt: -1 })
      .limit(50);

    console.log(`✅ Found ${allBookings.length} completed bookings`);

    // Calculate metrics
    const totalBookings = allBookings.length;
    const totalRevenue = allBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    // Calculate commission based on staff commission type
    let totalCommission = 0;
    if (staff.commissionType === 'percentage') {
      totalCommission = (totalRevenue * staff.commissionRate) / 100;
    } else if (staff.commissionType === 'fixed') {
      totalCommission = totalBookings * staff.commissionRate;
    }

    // Calculate average rating
    const ratedBookings = allBookings.filter(b => b.rating);
    const averageRating = ratedBookings.length > 0
      ? ratedBookings.reduce((sum, b) => sum + b.rating, 0) / ratedBookings.length
      : 0;

    // Calculate average service time
    const avgServiceTime = allBookings.length > 0
      ? allBookings.reduce((sum, b) => {
          if (b.startedAt && b.completedAt) {
            return sum + (new Date(b.completedAt) - new Date(b.startedAt)) / 60000;
          }
          return sum;
        }, 0) / allBookings.length
      : 0;

    // Get cancelled bookings count
    const cancelledBookings = await Booking.countDocuments({
      assignedStaffId: staffId,
      status: 'cancelled',
      ...(startDate && endDate ? {
        createdAt: dateFilter.completedAt
      } : {}),
    });

    // Format bookings for response
    const formattedBookings = allBookings.map(booking => ({
      _id: booking._id,
      customer: booking.userId ? {
        name: booking.userId.name,
        phone: booking.userId.phone,
      } : { name: 'Walk-in Customer', phone: 'N/A' },
      services: booking.services.map(s => ({
        name: s.name,
        price: s.price,
        duration: s.duration,
      })),
      totalPrice: booking.totalPrice,
      totalDuration: booking.totalDuration,
      completedAt: booking.completedAt,
      startedAt: booking.startedAt,
      rating: booking.rating || null,
      review: booking.review || null,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
    }));

    // Service breakdown
    const serviceCount = {};
    allBookings.forEach(booking => {
      booking.services.forEach(service => {
        if (!serviceCount[service.name]) {
          serviceCount[service.name] = {
            count: 0,
            revenue: 0,
            totalDuration: 0,
          };
        }
        serviceCount[service.name].count++;
        serviceCount[service.name].revenue += service.price;
        serviceCount[service.name].totalDuration += service.duration;
      });
    });

    const topServices = Object.entries(serviceCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Response
    res.status(200).json({
      success: true,
      performance: {
        staff: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          role: staff.role,
          profileImage: staff.profileImage,
          commissionType: staff.commissionType,
          commissionRate: staff.commissionRate,
          salary: staff.salary,
        },
        metrics: {
          totalBookings,
          completedBookings: totalBookings,
          cancelledBookings,
          totalRevenue,
          totalCommission: Math.round(totalCommission),
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: ratedBookings.length,
          avgServiceTime: Math.round(avgServiceTime),
        },
        topServices,
        bookings: formattedBookings,
      },
    });

  } catch (error) {
    console.error('❌ Staff performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff performance',
      error: error.message,
    });
  }
};


// ✅ NEW: Check if staff is currently busy
// @desc    Check staff availability
// @route   GET /api/staff/:id/availability
// @access  Private (Owner)
exports.checkStaffAvailability = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      });
    }

    // Check for in-progress bookings
    const Booking = require('../models/Booking');
    const currentBooking = await Booking.findOne({
      assignedStaffId: staff._id,
      status: 'in-progress',
    }).populate('userId', 'name');

    const isBusy = !!currentBooking;

    res.status(200).json({
      success: true,
      staffId: staff._id,
      name: staff.name,
      isActive: staff.isActive,
      isAvailable: staff.isAvailable && !isBusy,
      isBusy: isBusy,
      currentBooking: currentBooking ? {
        bookingId: currentBooking._id,
        customerName: currentBooking.customerName || currentBooking.userId?.name || 'Walk-in',
        queuePosition: currentBooking.queuePosition,
        startedAt: currentBooking.startedAt,
      } : null,
    });
  } catch (error) {
    console.error('❌ Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
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

    const previousAvailability = staff.isAvailable;

    // Toggle availability
    staff.isAvailable = !staff.isAvailable;
    await staff.save();

    // ✅ Update salon activeBarbers ONLY for barbers
    if (staff.role === 'barber' && previousAvailability !== staff.isAvailable) {
      const increment = staff.isAvailable ? 1 : -1;

      await Salon.findByIdAndUpdate(
        staff.salonId,
        { $inc: { activeBarbers: increment } },
        { new: true }
      );
    }

    console.log(
      `✅ ${staff.name} availability changed: ${previousAvailability} → ${staff.isAvailable}`
    );

    res.status(200).json({
      success: true,
      message: `Staff ${staff.isAvailable ? 'available' : 'unavailable'
        }`,
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

// Bulk operations controller starts
// ✅ NEW: Bulk delete staff
// ✅ UPDATED: Smart bulk delete (soft delete → permanent)
// @desc    Delete multiple staff members (soft delete first, then permanent)
// @route   POST /api/staff/bulk-delete
// @access  Private (Owner)
exports.bulkDeleteStaff = async (req, res) => {
  try {
    const { staffIds } = req.body;

    if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Staff IDs array is required',
      });
    }

    console.log(`🗑️ Bulk delete request for ${staffIds.length} staff members`);

    // Get staff to verify ownership
    const staffMembers = await Staff.find({ _id: { $in: staffIds } });

    if (staffMembers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No staff found with provided IDs',
      });
    }

    // Verify all belong to owner's salon
    const salonIds = [...new Set(staffMembers.map(s => s.salonId.toString()))];
    if (salonIds.length > 1) {
      return res.status(403).json({
        success: false,
        message: 'Staff members belong to different salons',
      });
    }

    const salon = await Salon.findById(salonIds[0]);
    if (!salon || salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // ✅ Separate active and already-inactive staff
    const activeStaff = staffMembers.filter(s => s.isActive);
    const inactiveStaff = staffMembers.filter(s => !s.isActive);

    console.log(`   Active staff: ${activeStaff.length}`);
    console.log(`   Already inactive: ${inactiveStaff.length}`);

    // Check for active bookings (only for active staff)
    if (activeStaff.length > 0) {
      const activeStaffIds = activeStaff.map(s => s._id);
      const activeBookingsCount = await Booking.countDocuments({
        assignedStaffId: { $in: activeStaffIds },
        status: { $in: ['pending', 'in-progress'] },
      });

      if (activeBookingsCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete staff with ${activeBookingsCount} active booking(s). Please complete or reassign them first.`,
        });
      }
    }

    let barbersToRemove = 0;
    let activeBarbersToRemove = 0;
    let softDeletedCount = 0;
    let permanentDeletedCount = 0;

    // ✅ STEP 1: Soft delete active staff
    if (activeStaff.length > 0) {
      const activeStaffIds = activeStaff.map(s => s._id);

      // Count barbers for salon stats
      activeStaff.forEach(staff => {
        if (staff.role === 'barber') {
          barbersToRemove++;
          if (staff.isAvailable) {
            activeBarbersToRemove++;
          }
        }
      });

      await Staff.updateMany(
        { _id: { $in: activeStaffIds } },
        { 
          $set: { 
            isActive: false,
            isAvailable: false 
          } 
        }
      );

      softDeletedCount = activeStaff.length;
      console.log(`   ✅ Soft deleted: ${softDeletedCount}`);
    }

    // ✅ STEP 2: Permanently delete already-inactive staff
    if (inactiveStaff.length > 0) {
      const inactiveStaffIds = inactiveStaff.map(s => s._id);

      // Also delete their bookings history (optional - depends on your policy)
      // await Booking.deleteMany({ assignedStaffId: { $in: inactiveStaffIds } });

      const deleteResult = await Staff.deleteMany({ _id: { $in: inactiveStaffIds } });
      permanentDeletedCount = deleteResult.deletedCount;
      console.log(`   🔥 PERMANENTLY deleted: ${permanentDeletedCount}`);
    }

    // Update salon counters (only for active staff that were soft-deleted)
    if (barbersToRemove > 0) {
      await Salon.findByIdAndUpdate(
        salon._id,
        {
          $inc: {
            totalBarbers: -barbersToRemove,
            activeBarbers: -activeBarbersToRemove,
          },
        }
      );
      console.log(`   📊 Salon counters updated: -${barbersToRemove} total, -${activeBarbersToRemove} active`);
    }

    // Build response message
    let message = '';
    if (softDeletedCount > 0 && permanentDeletedCount > 0) {
      message = `Deactivated ${softDeletedCount} staff, permanently deleted ${permanentDeletedCount} inactive staff`;
    } else if (softDeletedCount > 0) {
      message = `Successfully deactivated ${softDeletedCount} staff member(s)`;
    } else if (permanentDeletedCount > 0) {
      message = `Permanently deleted ${permanentDeletedCount} inactive staff member(s)`;
    }

    res.status(200).json({
      success: true,
      message,
      softDeleted: softDeletedCount,
      permanentlyDeleted: permanentDeletedCount,
      totalProcessed: staffIds.length,
      barbersRemoved: barbersToRemove,
    });
  } catch (error) {
    console.error('❌ Bulk delete staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff members',
      error: error.message,
    });
  }
};


// ✅ NEW: Bulk update staff status
// @desc    Update status for multiple staff members
// @route   PUT /api/staff/bulk-status
// @access  Private (Owner)
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { staffIds, isActive } = req.body;

    if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Staff IDs array is required',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value',
      });
    }

    console.log(`🔄 Bulk status update for ${staffIds.length} staff: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);

    // Get staff to verify ownership
    const staffMembers = await Staff.find({ _id: { $in: staffIds } });

    if (staffMembers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No staff found with provided IDs',
      });
    }

    // Verify ownership
    const salonIds = [...new Set(staffMembers.map(s => s.salonId.toString()))];
    if (salonIds.length > 1) {
      return res.status(403).json({
        success: false,
        message: 'Staff members belong to different salons',
      });
    }

    const salon = await Salon.findById(salonIds[0]);
    if (!salon || salon.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Calculate barber count changes
    let barberCountChange = 0;
    let activeBarberCountChange = 0;

    staffMembers.forEach(staff => {
      if (staff.role === 'barber') {
        const wasActive = staff.isActive;
        const wasAvailable = staff.isAvailable;

        if (isActive && !wasActive) {
          // Activating
          barberCountChange++;
          if (wasAvailable) activeBarberCountChange++;
        } else if (!isActive && wasActive) {
          // Deactivating
          barberCountChange--;
          if (wasAvailable) activeBarberCountChange--;
        }
      }
    });

    // Update status
    await Staff.updateMany(
      { _id: { $in: staffIds } },
      {
        $set: {
          isActive: isActive,
          isAvailable: isActive ? true : false, // Reset availability
        },
      }
    );

    // Update salon counters
    if (barberCountChange !== 0) {
      await Salon.findByIdAndUpdate(
        salon._id,
        {
          $inc: {
            totalBarbers: barberCountChange,
            activeBarbers: activeBarberCountChange,
          },
        }
      );
    }

    console.log(`✅ Bulk updated ${staffMembers.length} staff to ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`   Barber count change: ${barberCountChange}, Active: ${activeBarberCountChange}`);

    res.status(200).json({
      success: true,
      message: `Successfully ${isActive ? 'activated' : 'deactivated'} ${staffMembers.length} staff member(s)`,
      updatedCount: staffMembers.length,
    });
  } catch (error) {
    console.error('❌ Bulk update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff status',
      error: error.message,
    });
  }
};
// Bulk operations controller ends


module.exports = {
  getStaffBySalon: exports.getStaffBySalon,
  getStaffById: exports.getStaffById,
  addStaff: exports.addStaff,
  updateStaff: exports.updateStaff,
  deleteStaff: exports.deleteStaff,
  getStaffPerformance: exports.getStaffPerformance,
  checkStaffAvailability: exports.checkStaffAvailability,
  toggleAvailability: exports.toggleAvailability,
  bulkDeleteStaff: exports.bulkDeleteStaff,           // ✅ NEW
  bulkUpdateStatus: exports.bulkUpdateStatus,          // ✅ NEW
};
