const User = require('../models/User');
const Salon = require('../models/Salon');

// @desc    Get user's favorite salons
// @route   GET /api/favorites
// @access  Private
exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'favoriteSalons',
        select: '-__v',
      });

    res.status(200).json({
      success: true,
      count: user.favoriteSalons.length,
      favorites: user.favoriteSalons,
    });
  } catch (error) {
    console.error('❌ Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorites',
      error: error.message,
    });
  }
};

// @desc    Add salon to favorites
// @route   POST /api/favorites/:salonId
// @access  Private
exports.addFavorite = async (req, res) => {
  try {
    const { salonId } = req.params;
    const userId = req.user._id;

    // Check if salon exists
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({
        success: false,
        message: 'Salon not found',
      });
    }

    // Check if already favorited
    const user = await User.findById(userId);
    if (user.favoriteSalons.includes(salonId)) {
      return res.status(400).json({
        success: false,
        message: 'Salon already in favorites',
      });
    }

    // Add to favorites
    user.favoriteSalons.push(salonId);
    await user.save();

    console.log(`✅ Salon ${salonId} added to favorites for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Added to favorites',
    });
  } catch (error) {
    console.error('❌ Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add favorite',
      error: error.message,
    });
  }
};

// @desc    Remove salon from favorites
// @route   DELETE /api/favorites/:salonId
// @access  Private
exports.removeFavorite = async (req, res) => {
  try {
    const { salonId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    
    // Remove from favorites
    user.favoriteSalons = user.favoriteSalons.filter(
      id => id.toString() !== salonId
    );
    await user.save();

    console.log(`✅ Salon ${salonId} removed from favorites for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Removed from favorites',
    });
  } catch (error) {
    console.error('❌ Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove favorite',
      error: error.message,
    });
  }
};

// @desc    Check if salon is favorited
// @route   GET /api/favorites/check/:salonId
// @access  Private
exports.checkFavorite = async (req, res) => {
  try {
    const { salonId } = req.params;
    const user = await User.findById(req.user._id);

    const isFavorite = user.favoriteSalons.includes(salonId);

    res.status(200).json({
      success: true,
      isFavorite,
    });
  } catch (error) {
    console.error('❌ Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check favorite',
      error: error.message,
    });
  }
};

// module.exports = {
//   getFavorites,
//   addFavorite,
//   removeFavorite,
//   checkFavorite,
// };
