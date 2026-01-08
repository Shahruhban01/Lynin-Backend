const express = require('express');
const router = express.Router();
const { requireRole, requireSalonAccess } = require('../middleware/roleCheck');
const {
  getSalons,
  getSalonById,
  getNearbySalons,
  createSalon,
  getMySalons,
  updateSalon,
  toggleStaffSystem,        // ✅ ADD
  updateStaffSystemStatus,  // ✅ ADD
} = require('../controllers/salonController');
const { getDashboardStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/', getSalons);
router.get('/nearby', getNearbySalons);

// Protected routes (auth required)
// IMPORTANT: Specific routes MUST come before dynamic routes!
router.get('/my-salons', protect, getMySalons); // MUST BE BEFORE /:id
router.post('/', protect, createSalon);
router.put('/:id', protect, updateSalon);
// router.put('/:id/toggle-staff-system', protect, requireRole(['owner']), toggleStaffSystem);
// router.put('/:id/staff-system', protect, requireRole(['owner']), updateStaffSystemStatus);

// ✅ NEW: Staff system toggle routes
router.put('/:id/toggle-staff-system', protect, toggleStaffSystem);
router.put('/:id/staff-system', protect, updateStaffSystemStatus);


router.get('/:salonId/dashboard', protect, getDashboardStats);


// Add this route in salonRoutes.js
const { toggleSalonStatus } = require('../controllers/salonController');

router.patch(
  '/:salonId/toggle-status',
  protect,
  requireRole(['owner', 'manager']),
  requireSalonAccess('salonId'),
  toggleSalonStatus
);


// Dynamic route (MUST BE LAST)
router.get('/:id', getSalonById);



module.exports = router;
