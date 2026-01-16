const express = require('express');
const router = express.Router();
const appInfoController = require('../controllers/appInfoController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', appInfoController.getAppInfo);

// Admin routes (protected)
router.put('/', protect, appInfoController.updateAppInfo);
router.post('/clear-cache', protect, appInfoController.clearCache);

module.exports = router;
