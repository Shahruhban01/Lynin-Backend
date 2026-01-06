const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Staff CRUD
router.get('/salon/:salonId', staffController.getStaffBySalon);
router.get('/:id', staffController.getStaffById);
router.post('/', staffController.addStaff);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

// Staff Performance
router.get('/:id/performance', staffController.getStaffPerformance);

// Staff Availability
router.put('/:id/availability', staffController.toggleAvailability);

module.exports = router;
