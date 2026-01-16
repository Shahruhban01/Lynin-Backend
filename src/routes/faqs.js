const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/', faqController.getAllFAQs);
router.post('/:id/view', faqController.incrementView);
router.post('/:id/feedback', faqController.submitFeedback);

// Admin routes (protected)
router.post('/', protect, faqController.createFAQ);
router.put('/:id', protect, faqController.updateFAQ);
router.delete('/:id', protect, faqController.deleteFAQ);
router.post('/clear-cache', protect, faqController.clearCache);

module.exports = router;
