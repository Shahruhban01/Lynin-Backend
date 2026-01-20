const jwt = require('jsonwebtoken');
const User = require('../models/User');

const AdminAuditLog = require('../models/AdminAuditLog');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Token decoded for user:', decoded.userId);

    // Get user from token
    const user = await User.findById(decoded.userId).select('-__v');

    if (!user) {
      console.error('❌ User not found:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('✅ User authenticated:', user._id);
    console.log('✅ Phone Number:', user.phone);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
      error: error.message,
    });
  }
};



// ADMIN ONLY MIDDLEWARE
// Admin-only middleware
exports.adminOnly = async (req, res, next) => {
  try {
    // Check if user exists (from protect middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      console.error('❌ Forbidden: User is not admin:', req.user._id);
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        code: 'ADMIN_ACCESS_REQUIRED',
      });
    }

    console.log('✅ Admin access granted:', req.user._id);
    next();
  } catch (error) {
    console.error('❌ Admin middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authorization failed',
      error: error.message,
    });
  }
};

// Admin activity logger middleware (use AFTER adminOnly)
exports.logAdminActivity = (actionType, entityType) => {
  return async (req, res, next) => {
    // Store original json function
    const originalJson = res.json.bind(res);

    // Override json function to log after successful response
    res.json = function (data) {
      // Only log if request was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Log asynchronously (don't block response)
        setImmediate(async () => {
          try {
            await AdminAuditLog.create({
              adminId: req.user._id,
              adminName: req.user.name || 'Admin',
              adminEmail: req.user.email,
              actionType,
              entityType,
              entityId: req.params.userId || req.params.salonId || req.params.bookingId || null,
              previousState: req.previousState || null,
              newState: req.newState || null,
              reason: req.body.reason || req.body.notes || null,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('user-agent'),
            });
          } catch (err) {
            console.error('❌ Failed to log admin activity:', err.message);
          }
        });
      }

      // Call original json function
      return originalJson(data);
    };

    next();
  };
};

// Prevent admin token on non-admin routes (ADD TO USER/SALON ROUTES)
exports.preventAdminAccess = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot access user/salon routes',
        code: 'ADMIN_TOKEN_NOT_ALLOWED',
      });
    }
    next();
  } catch (error) {
    next();
  }
};