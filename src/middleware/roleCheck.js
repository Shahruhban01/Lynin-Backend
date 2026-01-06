/**
 * Role-Based Access Control Middleware
 * Protects salon-side routes based on user roles and permissions
 */

// Check if user has required role
exports.requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(user.role)) {
        console.warn(`🚫 Access denied for user ${user._id} with role: ${user.role}`);
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: allowedRoles,
          current: user.role,
        });
      }

      console.log(`✅ Role check passed: ${user.role} accessing ${req.path}`);
      next();
    } catch (error) {
      console.error('❌ Role check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization failed',
        error: error.message,
      });
    }
  };
};

// Check if user has specific permissions
exports.requirePermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Owner role bypasses permission checks
      if (user.role === 'owner') {
        console.log(`✅ Owner bypass: ${user._id}`);
        return next();
      }

      // Check if user has all required permissions
      const hasPermissions = requiredPermissions.every(perm =>
        user.permissions.includes(perm)
      );

      if (!hasPermissions) {
        console.warn(`🚫 Permission denied for user ${user._id}`);
        return res.status(403).json({
          success: false,
          message: 'Missing required permissions',
          required: requiredPermissions,
          current: user.permissions,
        });
      }

      console.log(`✅ Permission check passed: ${user._id}`);
      next();
    } catch (error) {
      console.error('❌ Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization failed',
        error: error.message,
      });
    }
  };
};

// Check if user belongs to specific salon
exports.requireSalonAccess = (salonIdParam = 'salonId') => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const requestedSalonId = req.params[salonIdParam] || req.body.salonId;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Customers don't need salon access check
      if (user.role === 'customer') {
        return next();
      }

      // Check if user is assigned to this salon
      if (!user.salonId) {
        return res.status(403).json({
          success: false,
          message: 'No salon assigned to user',
        });
      }

      if (user.salonId.toString() !== requestedSalonId) {
        console.warn(`🚫 Salon access denied: User ${user._id} tried to access salon ${requestedSalonId}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied to this salon',
        });
      }

      console.log(`✅ Salon access granted: ${user._id} → ${requestedSalonId}`);
      next();
    } catch (error) {
      console.error('❌ Salon access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization failed',
        error: error.message,
      });
    }
  };
};

// Check if salon setup is completed (blocks dashboard access until setup done)
exports.requireSetupComplete = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Only check for salon roles
    if (['owner', 'manager', 'staff'].includes(user.role)) {
      if (!user.setupCompleted) {
        console.warn(`⚠️ Setup incomplete for user ${user._id}`);
        return res.status(403).json({
          success: false,
          message: 'Setup not completed',
          setupRequired: true,
          currentStep: user.setupStep || 'profile',
        });
      }
    }

    next();
  } catch (error) {
    console.error('❌ Setup check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization failed',
      error: error.message,
    });
  }
};
