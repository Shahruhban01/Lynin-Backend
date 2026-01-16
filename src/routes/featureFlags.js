const express = require('express');
const router = express.Router();
const featureFlagController = require('../controllers/featureFlagController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', featureFlagController.getFeatureFlags);

// Admin routes (protected)
router.put('/', protect, featureFlagController.updateFeatureFlags);
router.post('/clear-cache', protect, featureFlagController.clearCache);

module.exports = router;
