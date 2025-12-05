const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyFirebaseToken } = require('../config/firebase');
const generateToken = require('../utils/generateToken');

// @desc    Verify Firebase token and create/update user
// @route   POST /api/auth/verify-token
// @access  Public
exports.verifyToken = async (req, res) => {
  try {
    // Accept both 'idToken' (owner app) and 'firebaseToken' (customer app)
    const { idToken, firebaseToken, phone } = req.body;
    const token = idToken || firebaseToken;

    console.log('📥 Verify Token Request:');
    console.log('  Phone:', phone);
    console.log('  Token:', token ? `${token.substring(0, 20)}...` : 'undefined');

    // Validate token
    if (!token) {
      console.error('❌ No token provided');
      return res.status(400).json({
        success: false,
        message: 'Firebase token is required',
      });
    }

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log('✅ Firebase token verified for UID:', decodedToken.uid);
    } catch (error) {
      console.error('❌ Firebase verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token',
      });
    }

    const uid = decodedToken.uid;
    // Use phone from request body OR from Firebase token
    const userPhone = phone || decodedToken.phone_number;

    console.log('📱 Using phone:', userPhone);

    if (!userPhone) {
      console.error('❌ No phone number available');
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Find or create user
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      console.log('📝 Creating new user...');
      user = await User.create({
        phone: userPhone,
        firebaseUid: uid,
      });
      console.log('✅ New user created:', user._id);
    } else {
      console.log('✅ Existing user found:', user._id);
      user.lastLogin = Date.now();
      await user.save();
    }

    // Generate JWT
    const token_jwt = jwt.sign(
      { userId: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('✅ JWT generated for user:', user._id);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token: token_jwt,
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('❌ Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
    });
  }
};



// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, fcmToken } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (fcmToken) user.fcmToken = fcmToken;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-firebaseUid -__v');

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message,
    });
  }
};

// @desc    Get user profile with statistics
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-firebaseUid -__v')
      .populate('preferredSalons', 'name location');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        totalBookings: user.totalBookings,
        preferredSalons: user.preferredSalons,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message,
    });
  }
};

// @desc    Update user profile (name, email, profileImage)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, email, profileImage } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
      }

      // Check if email already exists for another user
      const existingEmail = await User.findOne({ 
        email, 
        _id: { $ne: user._id } 
      });
      
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
      }
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();

    console.log(`✅ Profile updated for user: ${user.phone}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

// @desc    Update FCM token
// @route   PUT /api/auth/fcm-token
// @access  Private
exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.fcmToken = fcmToken;
    await user.save();

    console.log(`✅ FCM token updated for user: ${user.phone}`);

    res.status(200).json({
      success: true,
      message: 'FCM token updated successfully',
    });
  } catch (error) {
    console.error('❌ FCM token update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FCM token',
      error: error.message,
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/account
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Soft delete - just mark as inactive
    user.isActive = false;
    await user.save();

    console.log(`✅ Account deactivated: ${user.phone}`);

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully',
    });
  } catch (error) {
    console.error('❌ Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message,
    });
  }
};
