const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    // Location
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
    },
    // Contact
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: null,
    },
    // Business hours
    hours: {
      monday: { open: String, close: String, closed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
      friday: { open: String, close: String, closed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, closed: { type: Boolean, default: false } },
    },
    // Images
    images: [
      {
        type: String, // URLs
      },
    ],

    // ✅ NEW: Profile image
    profileImage: {
      type: String,
      default: null, // Firebase Storage URL
    },

    // Services offered
    // services: [
    //   {
    //     name: { type: String, required: true },
    //     price: { type: Number, required: true },
    //     duration: { type: Number, required: true }, // in minutes
    //     description: { type: String, default: '' },
    //   },
    // ],
    services: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        duration: { type: Number, required: true },
        description: { type: String, default: '' },
        category: {
          type: String,
          enum: ['Hair', 'Beard', 'Body', 'Add-on'],
          required: true
        }, // ✅ NEW
        isPrimary: { type: Boolean, default: false }, // ✅ NEW
        isUpsell: { type: Boolean, default: false }, // ✅ NEW
      },
    ],

    // Ratings
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    // Queue management
    isOpen: {
      type: Boolean,
      default: true,
    },
    currentQueueSize: {
      type: Number,
      default: 0,
    },
    avgServiceTime: {
      type: Number,
      default: 30, // minutes
    },
    // type: {
    //   type: String,
    //   default: null,
    // },
    // ✅ NEW: Salon type
    type: {
      type: String,
      enum: ['men', 'women', 'unisex', null],
      default: null,
    },

    // Owner
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // WAIT TIME RELATED FIELDS - ADD THESE
    totalBarbers: {
      type: Number,
      default: 1,
      min: 1,
      required: true,
    },
    activeBarbers: {
      type: Number,
      default: 1,
      min: 0,
      validate: {
        validator: function (v) {
          return v <= this.totalBarbers;
        },
        message: 'Active barbers cannot exceed total barbers',
      },
    },
    averageServiceDuration: {
      type: Number,
      default: 30, // minutes
      min: 5,
      max: 180,
    },
    busyMode: {
      type: Boolean,
      default: false,
    },
    maxQueueSize: {
      type: Number,
      default: 20,
      min: 1,
    },

    // ✅ NEW: Account Settings
    operatingMode: {
      type: String,
      enum: ['normal', 'busy', 'closed'],
      default: 'normal',
    },
    autoAcceptBookings: {
      type: Boolean,
      default: true,
    },
    notificationPreferences: {
      newBookings: { type: Boolean, default: true },
      queueUpdates: { type: Boolean, default: true },
      customerMessages: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      pushEnabled: { type: Boolean, default: true },
    },

    // ADMIN SIDE ONLY FIELDS
verificationMeta: {
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: '',
  },
},
// ADMIN SIDE ONLY FIELDS


    // Add these fields to salonSchema
    closureHistory: [
      {
        closedAt: { type: Date, default: Date.now },
        reason: { type: String, required: true },
        customReason: { type: String, default: null },
        queueSizeAtClosure: { type: Number, default: 0 },
        reopenedAt: { type: Date, default: null },
      }
    ],
    lastClosureReason: { type: String, default: null },
    phoneChangeEnabled: { type: Boolean, default: false }, // Admin controlled


    staffSystemEnabled: { type: Boolean, default: false },
    // ✅ NEW: Location edit permission
    locationEditEnabled: { type: Boolean, default: false }, // Admin can enable this


  },
  {
    timestamps: true,
  }
);

// Geospatial index for location queries
salonSchema.index({ 'location.coordinates': '2dsphere' });
salonSchema.index({ name: 'text', 'location.city': 'text' });

// Add index for geospatial queries
// salonSchema.index({ 'location.coordinates': '2dsphere' });

// Add index for active salons
salonSchema.index({ isActive: 1, isOpen: 1 });

// module.exports = mongoose.model('Salon', salonSchema);

module.exports = mongoose.model('Salon', salonSchema);
