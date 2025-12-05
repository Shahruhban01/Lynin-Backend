const express = require('express');
const router = express.Router();
const {
  getSalons,
  getSalonById,
  getNearbySalons,
  createSalon,
  getMySalons,
  updateSalon,
} = require('../controllers/salonController');
const { protect } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/', getSalons);
router.get('/nearby', getNearbySalons);

// Protected routes (auth required)
// IMPORTANT: Specific routes MUST come before dynamic routes!
router.get('/my-salons', protect, getMySalons); // MUST BE BEFORE /:id
router.post('/', protect, createSalon);
router.put('/:id', protect, updateSalon);

// Dynamic route (MUST BE LAST)
router.get('/:id', getSalonById);

module.exports = router;
