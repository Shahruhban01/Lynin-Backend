const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const {
  getSetupStatus,
  saveProfileSetup,
  saveHoursSetup,
  saveServicesSetup,
  saveCapacitySetup,
  completeSetup,
} = require('../controllers/salonSetupController');

// All routes require authentication and owner role
router.use(protect);
router.use(requireRole(['owner']));

// Get current setup status
router.get('/status', getSetupStatus);

// Step 1: Profile setup
router.post('/profile', saveProfileSetup);

// Step 2: Hours setup
router.post('/hours', saveHoursSetup);

// Step 3: Services setup
router.post('/services', saveServicesSetup);

// Step 4: Capacity setup
router.post('/capacity', saveCapacitySetup);

// Complete setup and mark as done
router.post('/complete', completeSetup);

module.exports = router;
