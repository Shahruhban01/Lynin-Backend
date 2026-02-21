const FAQ = require('../models/FAQ');
const logger = require('../utils/logger');

// In-memory cache
let faqCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// @desc    Get all FAQs (cached)
// @route   GET /api/faqs
// @access  Public
exports.getAllFAQs = async (req, res) => {
  try {
    const { category, search } = req.query;

    // Check cache first
    if (
      faqCache &&
      cacheTimestamp &&
      Date.now() - cacheTimestamp < CACHE_DURATION &&
      !category &&
      !search
    ) {
      logger.info('📦 Serving FAQs from cache');
      return res.status(200).json({
        success: true,
        cached: true,
        faqs: faqCache,
      });
    }

    logger.info('🔍 Fetching FAQs from database');

    // Build query
    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    // Handle search
    let faqs;
    if (search) {
      faqs = await FAQ.find({
        ...query,
        $text: { $search: search },
      })
        .select('-__v')
        .sort({ score: { $meta: 'textScore' }, order: 1 })
        .lean();
    } else {
      faqs = await FAQ.find(query)
        .select('-__v')
        .sort({ order: 1, createdAt: -1 })
        .lean();
    }

    // Group by category
    const categorizedFAQs = faqs.reduce((acc, faq) => {
      if (!acc[faq.category]) {
        acc[faq.category] = [];
      }
      acc[faq.category].push(faq);
      return acc;
    }, {});

    // Cache if no filters
    if (!category && !search) {
      faqCache = categorizedFAQs;
      cacheTimestamp = Date.now();
      logger.info('💾 FAQs cached successfully');
    }

    // Set cache headers for CDN
    res.set({
      'Cache-Control': 'public, max-age=86400', // 24 hours
      'ETag': `"faqs-${Date.now()}"`,
    });

    res.status(200).json({
      success: true,
      cached: false,
      faqs: categorizedFAQs,
    });
  } catch (error) {
    logger.error('❌ Get FAQs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs',
      error: error.message,
    });
  }
};

// @desc    Increment FAQ view count
// @route   POST /api/faqs/:id/view
// @access  Public
exports.incrementView = async (req, res) => {
  try {
    const { id } = req.params;

    await FAQ.findByIdAndUpdate(id, { $inc: { views: 1 } });

    res.status(200).json({
      success: true,
      message: 'View counted',
    });
  } catch (error) {
    logger.error('❌ Increment view error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increment view',
    });
  }
};

// @desc    Mark FAQ as helpful/not helpful
// @route   POST /api/faqs/:id/feedback
// @access  Public
exports.submitFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;

    const update = helpful
      ? { $inc: { helpful: 1 } }
      : { $inc: { notHelpful: 1 } };

    await FAQ.findByIdAndUpdate(id, update);

    res.status(200).json({
      success: true,
      message: 'Feedback recorded',
    });
  } catch (error) {
    logger.error('❌ Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
    });
  }
};

// @desc    Create FAQ (Admin only)
// @route   POST /api/faqs
// @access  Private (Admin)
exports.createFAQ = async (req, res) => {
  try {
    const faq = await FAQ.create(req.body);

    // Clear cache
    faqCache = null;
    cacheTimestamp = null;

    res.status(201).json({
      success: true,
      faq,
    });
  } catch (error) {
    logger.error('❌ Create FAQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ',
      error: error.message,
    });
  }
};

// @desc    Update FAQ (Admin only)
// @route   PUT /api/faqs/:id
// @access  Private (Admin)
exports.updateFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
      });
    }

    // Clear cache
    faqCache = null;
    cacheTimestamp = null;

    res.status(200).json({
      success: true,
      faq,
    });
  } catch (error) {
    logger.error('❌ Update FAQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FAQ',
      error: error.message,
    });
  }
};

// @desc    Delete FAQ (Admin only)
// @route   DELETE /api/faqs/:id
// @access  Private (Admin)
exports.deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
      });
    }

    // Clear cache
    faqCache = null;
    cacheTimestamp = null;

    res.status(200).json({
      success: true,
      message: 'FAQ deleted',
    });
  } catch (error) {
    logger.error('❌ Delete FAQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ',
      error: error.message,
    });
  }
};

// @desc    Clear FAQ cache (Admin only)
// @route   POST /api/faqs/clear-cache
// @access  Private (Admin)
exports.clearCache = async (req, res) => {
  try {
    faqCache = null;
    cacheTimestamp = null;

    res.status(200).json({
      success: true,
      message: 'FAQ cache cleared',
    });
  } catch (error) {
    logger.error('❌ Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
    });
  }
};
