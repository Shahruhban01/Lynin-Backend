const FeatureFlag = require('../models/FeatureFlag');
const logger = require('../utils/logger');

// In-memory cache
let featureFlagCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// @desc    Get feature flags (live chat config)
// @route   GET /api/feature-flags
// @access  Public
exports.getFeatureFlags = async (req, res) => {
  try {
    // Check cache first
    if (
      featureFlagCache &&
      cacheTimestamp &&
      Date.now() - cacheTimestamp < CACHE_DURATION
    ) {
      logger.info('📦 Serving feature flags from cache');
      return res.status(200).json({
        success: true,
        cached: true,
        featureFlags: featureFlagCache,
      });
    }

    logger.info('🔍 Fetching feature flags from database');

    const featureFlag = await FeatureFlag.findOne({
      key: 'liveChatConfig',
      isActive: true,
    }).lean();

    logger.info('📦 Feature Flag found:', featureFlag ? 'Yes' : 'No');

    let response;
    
    if (!featureFlag) {
      logger.info('⚠️ No feature flag found, returning defaults');
      response = {
        isLiveChatEnabled: false,
        tawkToScript: '',
      };
    } else {
      response = {
        isLiveChatEnabled: featureFlag.isLiveChatEnabled || false,
        tawkToScript: featureFlag.tawkToScript || '',
      };
      logger.info('✅ Feature flags:', {
        isLiveChatEnabled: response.isLiveChatEnabled,
        hasScript: !!response.tawkToScript,
      });
    }

    // Cache the result
    featureFlagCache = response;
    cacheTimestamp = Date.now();

    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=86400', // 24 hours
      'ETag': `"feature-flags-${Date.now()}"`,
    });

    res.status(200).json({
      success: true,
      cached: false,
      featureFlags: response,
    });
  } catch (error) {
    logger.error('❌ Get feature flags error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feature flags',
      error: error.message,
    });
  }
};

// @desc    Update feature flags (Admin only)
// @route   PUT /api/feature-flags
// @access  Private (Admin)
exports.updateFeatureFlags = async (req, res) => {
  try {
    const { isLiveChatEnabled, tawkToScript } = req.body;

    const featureFlag = await FeatureFlag.findOneAndUpdate(
      { key: 'liveChatConfig' },
      {
        key: 'liveChatConfig',
        isLiveChatEnabled,
        tawkToScript,
        isActive: true,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Clear cache
    featureFlagCache = null;
    cacheTimestamp = null;

    res.status(200).json({
      success: true,
      featureFlag,
    });
  } catch (error) {
    logger.error('❌ Update feature flags error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feature flags',
      error: error.message,
    });
  }
};

// @desc    Clear cache (Admin only)
// @route   POST /api/feature-flags/clear-cache
// @access  Private (Admin)
exports.clearCache = async (req, res) => {
  try {
    featureFlagCache = null;
    cacheTimestamp = null;

    res.status(200).json({
      success: true,
      message: 'Feature flag cache cleared',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
    });
  }
};
