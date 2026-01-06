const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    profileImage: {
      type: String,
      default: null, // URL to image
    },
    
    // Authentication
    firebaseUid: {
      type: String,
      default: null,
      sparse: true, // Allow null but enforce uniqueness for non-null
    },
    
    // Salon Association
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    
    // Role & Permissions
    role: {
      type: String,
      enum: ['barber', 'stylist', 'manager', 'receptionist'],
      default: 'barber',
    },
    specialization: {
      type: [String],
      default: [], // e.g., ['haircut', 'coloring', 'styling']
    },
    
    // Services
    assignedServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service', // References salon.services._id
      },
    ],
    
    // Schedule
    workingHours: {
      monday: {
        isWorking: { type: Boolean, default: true },
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
      tuesday: {
        isWorking: { type: Boolean, default: true },
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
      wednesday: {
        isWorking: { type: Boolean, default: true },
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
      thursday: {
        isWorking: { type: Boolean, default: true },
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
      friday: {
        isWorking: { type: Boolean, default: true },
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
      saturday: {
        isWorking: { type: Boolean, default: true },
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
      sunday: {
        isWorking: { type: Boolean, default: false },
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
    },
    
    // Financial
    commissionType: {
      type: String,
      enum: ['percentage', 'fixed', 'none'],
      default: 'percentage',
    },
    commissionRate: {
      type: Number,
      default: 0, // e.g., 40 for 40% or 100 for ₹100 per service
    },
    salary: {
      type: Number,
      default: 0, // Monthly salary if applicable
    },
    
    // Performance Stats
    stats: {
      totalBookings: {
        type: Number,
        default: 0,
      },
      completedBookings: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      totalCommission: {
        type: Number,
        default: 0,
      },
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
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true, // Currently available for bookings
    },
    
    // Additional Info
    joinDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for performance
staffSchema.index({ salonId: 1, isActive: 1 });
staffSchema.index({ salonId: 1, role: 1 });

// Virtual for current bookings
staffSchema.virtual('currentBookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'assignedStaffId',
  match: { status: { $in: ['pending', 'in-progress'] } },
});

module.exports = mongoose.model('Staff', staffSchema);
