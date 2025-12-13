const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      sparse: true, // Allow multiple null values but enforce uniqueness for non-null
    },
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    profileImage: {
      type: String,
      default: null, // URL or base64 string
    },
    fcmToken: {
      type: String,
      default: null,
    },
    // ADD FAVORITES
    favoriteSalons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
    }],
    // ADD LOYALTY POINTS
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    // User preferences
    preferredSalons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
      },
    ],
    // Statistics
    totalBookings: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Virtual for booking history (will be populated later)
userSchema.virtual('bookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'userId',
});

module.exports = mongoose.model('User', userSchema);
