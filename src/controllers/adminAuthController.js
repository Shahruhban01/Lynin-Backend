const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminAuditLog = require('../models/AdminAuditLog');

// Generate JWT Token for Admin
const generateAdminToken = (userId) => {
  return jwt.sign(
    { userId, isAdmin: true }, // Add isAdmin flag
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Admin sessions: 7 days
  );
};

// @desc    Admin login with Firebase
// @route   POST /api/admin/auth/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, firebaseToken } = req.body;

    console.log('🔐 Admin Login Attempt:');
    console.log('  Email:', email);
    console.log('  Token:', firebaseToken ? `${firebaseToken.substring(0, 20)}...` : 'undefined');

    // Validation
    if (!email || !firebaseToken) {
      return res.status(400).json({
        success: false,
        message: 'Email and Firebase token are required',
      });
    }

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      console.log('✅ Firebase token verified for UID:', decodedToken.uid);
    } catch (error) {
      console.error('❌ Firebase verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token',
      });
    }

    const uid = decodedToken.uid;
    const tokenEmail = decodedToken.email;

    // Verify email matches token
    if (tokenEmail?.toLowerCase() !== email.toLowerCase()) {
      console.error('❌ Email mismatch');
      return res.status(401).json({
        success: false,
        message: 'Email does not match Firebase token',
      });
    }

    // Find admin user
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      role: 'admin',
      isActive: true,
    });

    if (!user) {
      console.error('❌ Admin login failed: User not found or not admin');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or insufficient permissions',
      });
    }

    // Update firebaseUid if not set or changed
    if (user.firebaseUid !== uid) {
      user.firebaseUid = uid;
    }

    // Generate JWT token with admin flag
    const token = generateAdminToken(user._id);

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Log admin login
    await AdminAuditLog.create({
      adminId: user._id,
      adminName: user.name || 'Admin',
      adminEmail: user.email,
      actionType: 'admin_login',
      entityType: 'system',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    console.log('✅ Admin logged in:', user.email);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: error.message,
    });
  }
};

// @desc    Validate token and get admin info
// @route   GET /api/admin/auth/me
// @access  Private (Admin)
exports.getAdminProfile = async (req, res) => {
  try {
    // User already attached by protect + adminOnly middleware
    const user = await User.findById(req.user._id).select('-firebaseUid -fcmToken -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        code: 'ADMIN_ACCESS_REQUIRED',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message,
    });
  }
};

// @desc    Admin logout
// @route   POST /api/admin/auth/logout
// @access  Private (Admin)
exports.adminLogout = async (req, res) => {
  try {
    // Log logout activity
    await AdminAuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email,
      actionType: 'admin_logout',
      entityType: 'system',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    console.log('✅ Admin logged out:', req.user.email);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('❌ Admin logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message,
    });
  }
};

// @desc    Update admin profile (name, profileImage)
// @route   PUT /api/admin/auth/profile
// @access  Private (Admin)
exports.updateAdminProfile = async (req, res) => {
  try {
    const { name, profileImage } = req.body;

    const user = await User.findById(req.user._id);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update allowed fields
    if (name !== undefined) user.name = name;
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();

    // Log profile update
    await AdminAuditLog.create({
      adminId: user._id,
      adminName: user.name,
      adminEmail: user.email,
      actionType: 'admin_profile_update',
      entityType: 'system',
      previousState: { name: req.user.name },
      newState: { name: user.name },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    console.log('✅ Admin profile updated:', user.email);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error('❌ Admin profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};
