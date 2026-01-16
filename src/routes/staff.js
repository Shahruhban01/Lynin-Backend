const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ✅ IMPORTANT: Bulk operations MUST come BEFORE :id routes
router.post('/bulk-delete', staffController.bulkDeleteStaff);
router.put('/bulk-status', staffController.bulkUpdateStatus);

// Staff Performance
router.get('/:id/performance', staffController.getStaffPerformance);

// Staff CRUD
router.get('/salon/:salonId', staffController.getStaffBySalon);
router.get('/:id', staffController.getStaffById);
router.post('/', staffController.addStaff);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);


// Staff Performance
// router.get('/:id/performance', staffController.getStaffPerformance);

// Staff Availability
router.put('/:id/availability', staffController.toggleAvailability);
router.get('/:id/availability', protect, staffController.checkStaffAvailability);



module.exports = router;
