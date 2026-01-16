const mongoose = require('mongoose');

const featureFlagSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed, // Can be boolean, string, number, object
      required: false, // Make it optional
    },
    // ✅ ADD THESE FIELDS FOR LIVE CHAT
    isLiveChatEnabled: {
      type: Boolean,
      default: false,
    },
    tawkToScript: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    environment: {
      type: String,
      enum: ['development', 'staging', 'production', 'all'],
      default: 'all',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);
