const express = require('express');
const router = express.Router();
const {
  verifyToken,
  updateProfile,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/verify-token', verifyToken);

// Protected routes
router.put('/update-profile', protect, updateProfile);
router.get('/me', protect, getMe);

module.exports = router;
