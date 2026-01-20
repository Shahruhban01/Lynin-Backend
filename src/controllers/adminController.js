const User = require('../models/User');
const Salon = require('../models/Salon');
const Booking = require('../models/Booking');
const AdminAuditLog = require('../models/AdminAuditLog');
const mongoose = require('mongoose');

// ================================
// PLATFORM STATISTICS
// ================================
exports.getPlatformStatistics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalSalons,
      totalBookings,
      activeSalons,
      activeUsers,
      revenueData,
      topCities,
      topSalons,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' }, isActive: true }),
      Salon.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Salon.countDocuments({ isActive: true, isOpen: true }),
      User.countDocuments({
        role: { $ne: 'admin' },
        isActive: true,
        lastLogin: { $gte: thirtyDaysAgo },
      }),
      
      Booking.aggregate([
        { $match: { status: 'completed', paymentStatus: 'paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$paidAmount' }, completedBookings: { $sum: 1 } } },
      ]),

      Booking.aggregate([
        { $lookup: { from: 'salons', localField: 'salonId', foreignField: '_id', as: 'salon' } },
        { $unwind: '$salon' },
        { $group: { _id: '$salon.location.city', bookingCount: { $sum: 1 } } },
        { $sort: { bookingCount: -1 } },
        { $limit: 5 },
        { $project: { city: '$_id', bookingCount: 1, _id: 0 } },
      ]),

      Booking.aggregate([
        { $match: { status: 'completed', paymentStatus: 'paid' } },
        { $group: { _id: '$salonId', totalRevenue: { $sum: '$paidAmount' }, bookingCount: { $sum: 1 } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'salons', localField: '_id', foreignField: '_id', as: 'salon' } },
        { $unwind: '$salon' },
        { $project: { salonId: '$_id', salonName: '$salon.name', city: '$salon.location.city', totalRevenue: 1, bookingCount: 1, _id: 0 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: { totalUsers, totalSalons, totalBookings, activeSalons, activeUsers },
        revenue: { total: revenueData[0]?.totalRevenue || 0, completedBookings: revenueData[0]?.completedBookings || 0 },
        topCities,
        topSalons,
      },
    });
  } catch (error) {
    console.error('❌ Get statistics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics', error: error.message });
  }
};

// ================================
// USER MANAGEMENT
// ================================
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', isActive = '' } = req.query;
    const filter = { role: { $ne: 'admin' } };

    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    if (role) filter.role = role;
    if (isActive !== '') filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, totalUsers] = await Promise.all([
      User.find(filter).select('-firebaseUid -fcmToken -__v').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalUsers / parseInt(limit)), totalUsers, limit: parseInt(limit) },
      },
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-firebaseUid -fcmToken -__v').lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found', code: 'RESOURCE_NOT_FOUND' });

    const bookingStats = await Booking.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalSpent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$paidAmount', 0] } },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: bookingStats[0] || { totalBookings: 0, completedBookings: 0, cancelledBookings: 0, totalSpent: 0 },
      },
    });
  } catch (error) {
    console.error('❌ Get user details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user details', error: error.message });
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ success: false, message: 'Deletion reason is required', code: 'VALIDATION_ERROR' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found', code: 'RESOURCE_NOT_FOUND' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot delete admin users', code: 'ACTION_NOT_ALLOWED' });
    if (!user.isActive) return res.status(400).json({ success: false, message: 'User is already deleted', code: 'ACTION_NOT_ALLOWED' });

    req.previousState = { isActive: user.isActive, name: user.name };

    const cancelledBookings = await Booking.updateMany(
      { userId: userId, status: { $in: ['pending', 'in-progress'] } },
      { $set: { status: 'cancelled', cancellationReason: 'User account deleted by admin' } }
    );

    user.isActive = false;
    user.name = `[Deleted User] ${user._id}`;
    user.email = null;
    user.fcmToken = null;
    await user.save();

    req.newState = { isActive: false };

    res.status(200).json({ success: true, message: 'User deleted successfully', data: { userId: user._id, cancelledBookings: cancelledBookings.modifiedCount } });
  } catch (error) {
    console.error('❌ Soft delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
};

exports.restoreUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ success: false, message: 'User not found', code: 'RESOURCE_NOT_FOUND' });
    if (user.isActive) return res.status(400).json({ success: false, message: 'User is not deleted', code: 'ACTION_NOT_ALLOWED' });

    req.previousState = { isActive: false };
    user.isActive = true;
    await user.save();
    req.newState = { isActive: true };

    res.status(200).json({ success: true, message: 'User restored successfully', data: { userId: user._id } });
  } catch (error) {
    console.error('❌ Restore user error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore user', error: error.message });
  }
};

// ================================
// SALON MANAGEMENT
// ================================
exports.getCities = async (req, res) => {
  try {
    const cities = await Salon.distinct('location.city', { isActive: true });
    res.status(200).json({ success: true, cities: cities.filter(Boolean).sort() });
  } catch (error) {
    console.error('❌ Get cities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cities', error: error.message });
  }
};

exports.getSalons = async (req, res) => {
  try {
    const { page = 1, limit = 20, city = '', verified = '', status = '', search = '' } = req.query;
    const filter = {};

    if (city) filter['location.city'] = { $regex: city, $options: 'i' };
    if (verified !== '') filter.isVerified = verified === 'true';
    if (status === 'active') filter.isActive = true;
    else if (status === 'deleted') filter.isActive = false;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'location.city': { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [salons, totalSalons] = await Promise.all([
      Salon.find(filter).select('-__v').populate('ownerId', 'name phone email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Salon.countDocuments(filter),
    ]);

    const formattedSalons = salons.map(salon => ({
      _id: salon._id,
      name: salon.name,
      description: salon.description,
      city: salon.location?.city,
      address: salon.location?.address,
      phone: salon.phone,
      email: salon.email,
      logo: salon.profileImage || salon.images?.[0],
      isVerified: salon.isVerified,
      ownerName: salon.ownerId?.name,
      totalBookings: salon.totalBookings || 0,
      rating: salon.averageRating,
      staffCount: salon.totalBarbers || 1,
      createdAt: salon.createdAt,
      disabled: !salon.isActive,
      deletedAt: !salon.isActive ? salon.updatedAt : null,
    }));

    res.status(200).json({ success: true, salons: formattedSalons, totalPages: Math.ceil(totalSalons / parseInt(limit)), total: totalSalons, currentPage: parseInt(page) });
  } catch (error) {
    console.error('❌ Get salons error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch salons', error: error.message });
  }
};

exports.getSalonDetails = async (req, res) => {
  try {
    const { salonId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(salonId)) return res.status(400).json({ success: false, message: 'Invalid salon ID' });

    const salon = await Salon.findById(salonId).populate('ownerId', 'name phone email').lean();
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found', code: 'RESOURCE_NOT_FOUND' });

    const totalBookings = await Booking.countDocuments({ salonId: salonId });
    const completedBookings = await Booking.countDocuments({ salonId: salonId, status: 'completed' });
    const paidBookings = await Booking.find({ salonId: salonId, status: 'completed', paymentStatus: 'paid' }).select('paidAmount').lean();
    const totalRevenue = paidBookings.reduce((sum, booking) => sum + (booking.paidAmount || 0), 0);

    const formattedSalon = {
      _id: salon._id,
      name: salon.name,
      description: salon.description,
      city: salon.location?.city,
      address: salon.location?.address,
      phone: salon.phone,
      email: salon.email,
      logo: salon.profileImage || salon.images?.[0],
      isVerified: salon.isVerified,
      rating: salon.averageRating,
      totalBookings: totalBookings,
      staffCount: salon.totalBarbers || 1,
      createdAt: salon.createdAt,
    };

    res.status(200).json({ success: true, salon: formattedSalon, stats: { totalBookings, completedBookings, totalRevenue } });
  } catch (error) {
    console.error('❌ Get salon details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch salon details', error: error.message });
  }
};

exports.getSalonQueue = async (req, res) => {
  try {
    const { salonId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(salonId)) return res.status(400).json({ success: false, message: 'Invalid salon ID' });

    const queue = await Booking.find({ salonId: salonId, status: { $in: ['pending', 'in-progress'] } })
      .populate('userId', 'name phone')
      .sort({ queuePosition: 1 })
      .lean();

    const formattedQueue = queue.map(booking => ({
      _id: booking._id,
      customerName: booking.userId?.name || 'Walk-in Customer',
      serviceName: booking.services?.[0]?.name || '-',
      status: booking.status,
      createdAt: booking.joinedAt || booking.createdAt,
    }));

    res.status(200).json({ success: true, queue: formattedQueue });
  } catch (error) {
    console.error('❌ Get salon queue error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch queue', error: error.message });
  }
};

exports.verifySalon = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { verified, notes } = req.body;

    if (typeof verified !== 'boolean') return res.status(400).json({ success: false, message: 'Verified status (true/false) is required', code: 'VALIDATION_ERROR' });

    const salon = await Salon.findById(salonId);
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found', code: 'RESOURCE_NOT_FOUND' });

    req.previousState = { isVerified: salon.isVerified };
    salon.isVerified = verified;
    
    if (!salon.verificationMeta) salon.verificationMeta = {};
    salon.verificationMeta.verifiedBy = req.user._id;
    salon.verificationMeta.verifiedAt = new Date();
    salon.verificationMeta.notes = notes || '';

    await salon.save();
    req.newState = { isVerified: verified };

    res.status(200).json({ success: true, message: `Salon ${verified ? 'verified' : 'unverified'} successfully`, data: { salonId: salon._id, isVerified: salon.isVerified } });
  } catch (error) {
    console.error('❌ Verify salon error:', error);
    res.status(500).json({ success: false, message: 'Failed to update salon verification', error: error.message });
  }
};

exports.disableSalon = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ success: false, message: 'Reason for disabling is required', code: 'VALIDATION_ERROR' });

    const salon = await Salon.findById(salonId);
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found', code: 'RESOURCE_NOT_FOUND' });
    if (!salon.isActive) return res.status(400).json({ success: false, message: 'Salon is already disabled', code: 'ACTION_NOT_ALLOWED' });

    req.previousState = { isActive: true, isOpen: salon.isOpen };
    salon.isActive = false;
    salon.isOpen = false;
    await salon.save();
    req.newState = { isActive: false, isOpen: false };

    res.status(200).json({ success: true, message: 'Salon disabled successfully', data: { salonId: salon._id, isActive: salon.isActive, currentQueueSize: salon.currentQueueSize } });
  } catch (error) {
    console.error('❌ Disable salon error:', error);
    res.status(500).json({ success: false, message: 'Failed to disable salon', error: error.message });
  }
};

exports.enableSalon = async (req, res) => {
  try {
    const { salonId } = req.params;
    const salon = await Salon.findById(salonId);

    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found', code: 'RESOURCE_NOT_FOUND' });
    if (salon.isActive) return res.status(400).json({ success: false, message: 'Salon is already active', code: 'ACTION_NOT_ALLOWED' });

    req.previousState = { isActive: false };
    salon.isActive = true;
    await salon.save();
    req.newState = { isActive: true };

    res.status(200).json({ success: true, message: 'Salon enabled successfully', data: { salonId: salon._id } });
  } catch (error) {
    console.error('❌ Enable salon error:', error);
    res.status(500).json({ success: false, message: 'Failed to enable salon', error: error.message });
  }
};

// ================================
// BOOKINGS MONITORING
// ================================
exports.getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', salonId = '', startDate = '', endDate = '' } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (salonId) filter.salonId = salonId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, totalBookings] = await Promise.all([
      Booking.find(filter).populate('userId', 'name phone').populate('salonId', 'name location.city location.address').select('-__v').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, data: { bookings, pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalBookings / parseInt(limit)), totalBookings, limit: parseInt(limit) } } });
  } catch (error) {
    console.error('❌ Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings', error: error.message });
  }
};

exports.getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate('userId', 'name phone email').populate('salonId', 'name location phone').populate('assignedStaffId', 'name phone').lean();

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found', code: 'RESOURCE_NOT_FOUND' });

    res.status(200).json({ success: true, data: { booking } });
  } catch (error) {
    console.error('❌ Get booking details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking details', error: error.message });
  }
};

// ================================
// AUDIT LOGS
// ================================
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, adminId = '', actionType = '', entityType = '', startDate = '', endDate = '' } = req.query;
    const filter = {};

    if (adminId) filter.adminId = adminId;
    if (actionType) filter.actionType = actionType;
    if (entityType) filter.entityType = entityType;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, totalLogs] = await Promise.all([
      AdminAuditLog.find(filter).populate('adminId', 'name email').sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AdminAuditLog.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, data: { logs, pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalLogs / parseInt(limit)), totalLogs, limit: parseInt(limit) } } });
  } catch (error) {
    console.error('❌ Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs', error: error.message });
  }
};
