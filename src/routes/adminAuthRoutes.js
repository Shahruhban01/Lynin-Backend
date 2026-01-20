const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { protect, adminOnly, logAdminActivity } = require('../middleware/auth');

// ================================
// PUBLIC ROUTES
// ================================
router.post('/login', adminAuthController.adminLogin);

// ================================
// PROTECTED ADMIN ROUTES
// ================================
router.use(protect); // Verify JWT
router.use(adminOnly); // Verify admin role

router.get('/me', adminAuthController.getAdminProfile);
router.post('/logout', adminAuthController.adminLogout);
router.put(
  '/profile',
  logAdminActivity('admin_profile_update', 'system'),
  adminAuthController.updateAdminProfile
);

module.exports = router;
