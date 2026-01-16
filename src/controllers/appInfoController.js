const AppInfo = require('../models/AppInfo');

// In-memory cache
let appInfoCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// @desc    Get app info (cached)
// @route   GET /api/app-info
// @access  Public
exports.getAppInfo = async (req, res) => {
  try {
    // Check cache first
    if (
      appInfoCache &&
      cacheTimestamp &&
      Date.now() - cacheTimestamp < CACHE_DURATION
    ) {
      console.log('📦 Serving app info from cache');
      return res.status(200).json({
        success: true,
        cached: true,
        appInfo: appInfoCache,
      });
    }

    console.log('🔍 Fetching app info from database');

    const appInfo = await AppInfo.findOne({ isActive: true })
      .select('-__v -createdAt -updatedAt')
      .lean();

    if (!appInfo) {
      return res.status(404).json({
        success: false,
        message: 'App info not found',
      });
    }

    // Cache the result
    appInfoCache = appInfo;
    cacheTimestamp = Date.now();
    console.log('💾 App info cached successfully');

    // Set cache headers for CDN
    res.set({
      'Cache-Control': 'public, max-age=86400', // 24 hours
      'ETag': `"appinfo-${Date.now()}"`,
    });

    res.status(200).json({
      success: true,
      cached: false,
      appInfo,
    });
  } catch (error) {
    console.error('❌ Get app info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch app info',
      error: error.message,
    });
  }
};

// @desc    Update app info (Admin only)
// @route   PUT /api/app-info
// @access  Private (Admin)
exports.updateAppInfo = async (req, res) => {
  try {
    let appInfo = await AppInfo.findOne({ isActive: true });

    if (!appInfo) {
      appInfo = await AppInfo.create(req.body);
    } else {
      appInfo = await AppInfo.findByIdAndUpdate(
        appInfo._id,
        req.body,
        { new: true, runValidators: true }
      );
    }

    // Clear cache
    appInfoCache = null;
    cacheTimestamp = null;

    res.status(200).json({
      success: true,
      appInfo,
    });
  } catch (error) {
    console.error('❌ Update app info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update app info',
      error: error.message,
    });
  }
};

// @desc    Clear app info cache (Admin only)
// @route   POST /api/app-info/clear-cache
// @access  Private (Admin)
exports.clearCache = async (req, res) => {
  try {
    appInfoCache = null;
    cacheTimestamp = null;

    res.status(200).json({
      success: true,
      message: 'App info cache cleared',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
    });
  }
};
