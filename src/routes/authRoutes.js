const express = require('express');
const router = express.Router();
const {
  verifyToken,
  updateProfile,
  getMe,
  getProfile,
  updateUserProfile,
  updateFcmToken,
  deleteAccount,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/verify-token', verifyToken);

// Protected routes
router.get('/me', protect, getMe);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/update-profile', protect, updateProfile); // Legacy endpoint
router.put('/fcm-token', protect, updateFcmToken);
router.delete('/account', protect, deleteAccount);

module.exports = router;
