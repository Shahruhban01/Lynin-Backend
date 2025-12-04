const User = require('../models/User');
const { verifyFirebaseToken } = require('../config/firebase');
const generateToken = require('../utils/generateToken');

// @desc    Verify Firebase token and create/update user
// @route   POST /api/auth/verify-token
// @access  Public
exports.verifyToken = async (req, res) => {
  try {
    const { firebaseToken, fcmToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase token is required',
      });
    }

    // Verify Firebase ID token
    const decodedToken = await verifyFirebaseToken(firebaseToken);
    const { uid, phone_number } = decodedToken;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Phone number not found in Firebase token',
      });
    }

    // Check if user exists
    let user = await User.findOne({ firebaseUid: uid });

    if (user) {
      // Update existing user
      user.lastLogin = Date.now();
      if (fcmToken) user.fcmToken = fcmToken;
      await user.save();

      console.log(`✅ User logged in: ${user.phone}`);
    } else {
      // Create new user
      user = await User.create({
        phone: phone_number,
        firebaseUid: uid,
        fcmToken: fcmToken || null,
        lastLogin: Date.now(),
      });

      console.log(`✅ New user created: ${user.phone}`);
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
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
    console.error('❌ Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired Firebase token',
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
