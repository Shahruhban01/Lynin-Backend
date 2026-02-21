const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyFirebaseToken } = require('../config/firebase');
const generateToken = require('../utils/generateToken');
const logger = require('../utils/logger');

// // @desc    Verify Firebase token and create/update user
// // @route   POST /api/auth/verify-token
// // @access  Public
// exports.verifyToken = async (req, res) => {
//   try {
//     // Accept both 'idToken' (owner app) and 'firebaseToken' (customer app)
//     const { idToken, firebaseToken, phone } = req.body;
//     const token = idToken || firebaseToken;

//     logger.info('📥 Verify Token Request:');
//     logger.info('  Phone:', phone);
//     logger.info('  Token:', token ? `${token.substring(0, 20)}...` : 'undefined');

//     // Validate token
//     if (!token) {
//       logger.error('❌ No token provided');
//       return res.status(400).json({
//         success: false,
//         message: 'Firebase token is required',
//       });
//     }

//     // Verify Firebase token
//     let decodedToken;
//     try {
//       decodedToken = await admin.auth().verifyIdToken(token);
//       logger.info('✅ Firebase token verified for UID:', decodedToken.uid);
//     } catch (error) {
//       logger.error('❌ Firebase verification failed:', error.message);
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid Firebase token',
//       });
//     }

//     const uid = decodedToken.uid;
//     // Use phone from request body OR from Firebase token
//     const userPhone = phone || decodedToken.phone_number;

//     logger.info('📱 Using phone:', userPhone);

//     if (!userPhone) {
//       logger.error('❌ No phone number available');
//       return res.status(400).json({
//         success: false,
//         message: 'Phone number is required',
//       });
//     }

//     // Find or create user
//     let user = await User.findOne({ firebaseUid: uid });

//     if (!user) {
//       logger.info('📝 Creating new user...');
//       user = await User.create({
//         phone: userPhone,
//         firebaseUid: uid,
//       });
//       logger.info('✅ New user created:', user._id);
//     } else {
//       logger.info('✅ Existing user found:', user._id);
//       user.lastLogin = Date.now();
//       await user.save();
//     }

//     // Generate JWT
//     const token_jwt = jwt.sign(
//       { userId: user._id, phone: user.phone },
//       process.env.JWT_SECRET,
//       { expiresIn: '30d' }
//     );

//     logger.info('✅ JWT generated for user:', user._id);

//     res.status(200).json({
//       success: true,
//       message: 'Authentication successful',
//       token: token_jwt,
//       user: {
//         _id: user._id,
//         phone: user.phone,
//         name: user.name,
//         email: user.email,
//       },
//     });
//   } catch (error) {
//     logger.error('❌ Verify token error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Authentication failed',
//       error: error.message,
//     });
//   }
// };

// @desc    Verify Firebase token and create/update user
// @route   POST /api/auth/verify-token
// @access  Public
exports.verifyToken = async (req, res) => {
  try {
    const { idToken, firebaseToken, phone, appType } = req.body;
    const token = idToken || firebaseToken;

    logger.info('📥 Verify Token Request:');
    logger.info('  Phone:', phone);
    logger.info('  AppType:', appType); // 'customer' or 'salon'
    logger.info('  Token:', token ? `${token.substring(0, 20)}...` : 'undefined');

    


    if (!token) {
      logger.error('❌ No token provided');
      return res.status(400).json({
        success: false,
        message: 'Firebase token is required',
      });
    }

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      logger.info('✅ Firebase token verified for UID:', decodedToken.uid);
    } catch (error) {
      logger.error('❌ Firebase verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token',
      });
    }

    const uid = decodedToken.uid;
    const userPhone = phone || decodedToken.phone_number;

    logger.info('📱 Using phone:', userPhone);

    if (!userPhone) {
      logger.error('❌ No phone number available');
      return res.status(400).json({
        success: false,
        message: 'Phone number is required',
      });
    }

    // Find or create user
    // Find or create user
    let user = await User.findOne({ firebaseUid: uid }).populate('salonId', 'name isActive');

    if (!user) {
      logger.info('📝 Creating new user...');

      // ✅ NEW: Check if a walk-in user exists with this phone
      if (userPhone) {
        const walkInUser = await User.findOne({
          phone: userPhone,
          firebaseUid: { $regex: /^walkin_/ } // Temporary walk-in UID
        });

        if (walkInUser) {
          // Link walk-in account to real Firebase UID
          walkInUser.firebaseUid = uid;
          walkInUser.lastLogin = Date.now();

          // Update role if not set (walk-ins should be customers)
          if (!walkInUser.role || walkInUser.role === 'customer') {
            walkInUser.role = appType === 'salon' ? 'owner' : 'customer';
          }

          await walkInUser.save();
          user = walkInUser;

          logger.info(`✅ Linked walk-in account to Firebase user: ${userPhone}`);
        }
      }

      // If still no user, create new
      if (!user) {
        const defaultRole = appType === 'salon' ? 'owner' : 'customer';

        user = await User.create({
          phone: userPhone,
          firebaseUid: uid,
          role: defaultRole,
        });

        logger.info(`✅ New user created with role: ${defaultRole}`);
      }
    } else {
      logger.info('✅ Existing user found:', user._id, 'Role:', user.role);
      user.lastLogin = Date.now();
      await user.save();
    }


    // Check if salon role user but no salon assigned
    const isSalonRole = ['owner', 'manager', 'staff'].includes(user.role);

    // Generate JWT with role information
    const token_jwt = jwt.sign(
      {
        userId: user._id,
        phone: user.phone,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    logger.info('✅ JWT generated for user:', user._id, 'Role:', user.role);

    // Prepare response
    const response = {
      success: true,
      message: 'Authentication successful',
      token: token_jwt,
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints || 0,
        salonId: user.salonId?._id || null,
        salonName: user.salonId?.name || null,
      },
    };

    // Add setup status for salon roles
    if (isSalonRole) {
      response.setupCompleted = user.setupCompleted || false;
      response.setupStep = user.setupStep || 'profile';

      // If no salon assigned and role is owner, they need to complete setup
      if (user.role === 'owner' && !user.salonId) {
        response.setupRequired = true;
      }
    }

    res.status(200).json(response);
  } catch (error) {
    logger.error('❌ Verify token error:', error);
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
    logger.error('❌ Profile update error:', error);
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
        loyaltyPoints: user.loyaltyPoints || 0,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    logger.error('❌ Get user error:', error);
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
        loyaltyPoints: user.loyaltyPoints || 0,
        totalBookings: user.totalBookings,
        preferredSalons: user.preferredSalons,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    logger.error('❌ Get profile error:', error);
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

    logger.info (`✅ Profile updated for user: ${user.phone}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        loyaltyPoints: user.loyaltyPoints || 0,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    logger.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};



// @desc    Update FCM token
// @route   PUT /api/auth/fcm-token OR /api/auth/update-fcm-token
// @access  Private
exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    logger.info('📲 FCM Token Update Request:');
    logger.info('   User ID:', req.user._id);
    logger.info('   User Role:', req.user.role);
    logger.info('   FCM Token:', fcmToken ? `${fcmToken.substring(0, 20)}...` : 'null');

    if (!fcmToken) {
      logger.error('❌ No FCM token provided');
      return res.status(400).json({
        success: false,
        message: 'FCM token is required',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      logger.error('❌ User not found:', req.user._id);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if token changed
    const tokenChanged = user.fcmToken !== fcmToken;
    
    user.fcmToken = fcmToken;
    await user.save();

    logger.info(`✅ FCM token ${tokenChanged ? 'updated' : 'saved'} for user: ${user.phone} (${user.role})`);
    logger.info(`   User name: ${user.name || 'Not set'}`);
    

    res.status(200).json({
      success: true,
      message: 'FCM token updated successfully',
    });
  } catch (error) {
    logger.error('❌ FCM token update error:', error);
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

    logger.info(`✅ Account deactivated: ${user.phone}`);

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully',
    });
  } catch (error) {
    logger.error('❌ Account deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message,
    });
  }
};
