const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      index: true,
    },
    answer: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'general',
        'bookings',
        'payments',
        'account',
        'services',
        'staff',
        'technical',
      ],
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tags: [{
      type: String,
      lowercase: true,
    }],
    views: {
      type: Number,
      default: 0,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search
faqSchema.index({ question: 'text', answer: 'text', tags: 'text' });

// Compound index for efficient queries
faqSchema.index({ category: 1, isActive: 1, order: 1 });

module.exports = mongoose.model('FAQ', faqSchema);
