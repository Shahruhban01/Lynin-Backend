// If you don't have this file, create it. Otherwise add this function:

// ✅ Require specific role(s)
exports.requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

// ✅ Require salon access (owner/manager/staff of specific salon)
exports.requireSalonAccess = (salonIdParam = 'salonId') => {
  return async (req, res, next) => {
    try {
      const salonId = req.params[salonIdParam];
      
      if (!salonId) {
        return res.status(400).json({
          success: false,
          message: 'Salon ID is required',
        });
      }

      const Salon = require('../models/Salon');
      const Staff = require('../models/Staff');

      // Check if user is owner
      const salon = await Salon.findById(salonId);
      
      if (!salon) {
        return res.status(404).json({
          success: false,
          message: 'Salon not found',
        });
      }

      // Owner has access
      if (salon.ownerId.toString() === req.user._id.toString()) {
        req.userSalonRole = 'owner';
        return next();
      }

      // Check if user is staff/manager
      const staffMember = await Staff.findOne({
        userId: req.user._id,
        salonId: salonId,
        isActive: true,
      });

      if (staffMember) {
        req.userSalonRole = staffMember.role;
        return next();
      }

      // No access
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this salon',
      });
    } catch (error) {
      console.error('❌ Salon access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Access verification failed',
      });
    }
  };
};
