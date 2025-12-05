const express = require('express');
const router = express.Router();
const { getSalonAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.get('/salon/:salonId', protect, getSalonAnalytics);

module.exports = router;
