const express = require('express');
const router = express.Router();
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
} = require('../controllers/favoriteController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getFavorites);
router.get('/check/:salonId', protect, checkFavorite);
router.post('/:salonId', protect, addFavorite);
router.delete('/:salonId', protect, removeFavorite);

module.exports = router;
