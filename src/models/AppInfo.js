const mongoose = require('mongoose');

const appInfoSchema = new mongoose.Schema(
  {
    // App Details
    appName: {
      type: String,
      required: true,
      default: 'Lynin',
    },
    appDescription: {
      type: String,
      required: true,
    },
    appLogo: {
      type: String,
      default: '',
    },
    
    // Company Details
    companyName: {
      type: String,
      required: true,
    },
    yearOfLaunch: {
      type: Number,
      required: true,
    },
    websiteUrl: {
      type: String,
      default: '',
    },
    
    // Legal Links
    privacyPolicyUrl: {
      type: String,
      required: true,
    },
    termsAndConditionsUrl: {
      type: String,
      required: true,
    },
    refundPolicyUrl: {
      type: String,
      default: '',
    },
    
    // Contact Information
    supportEmail: {
      type: String,
      required: true,
    },
    supportPhone: {
      type: String,
      default: '',
    },
    
    // Social Media
    socialMedia: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
    
    // Open Source Licenses
    openSourceLicenses: [{
      name: String,
      license: String,
      url: String,
      version: String,
    }],
    
    // Metadata
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ FIXED: Ensure only one active app info document (no next callback)
appInfoSchema.pre('save', async function() {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
});

module.exports = mongoose.model('AppInfo', appInfoSchema);
