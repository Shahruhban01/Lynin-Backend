const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    // References
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
      default: null, // Allow null for anonymous walk-ins
    },
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },

    // SCHEDULING DETAILS START
    // ✅ NEW: Booking type and scheduling
    bookingType: {
      type: String,
      enum: ['immediate', 'scheduled'],
      default: 'immediate',
      index: true,
    },
    scheduledDate: {
      type: Date,
      default: null,
      index: true,
    },
    scheduledTime: {
      type: String, // Format: "14:30" (HH:mm)
      default: null,
    },

    // SCHEDULING DETAILS END

    // Service details
    services: [
      {
        serviceId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        duration: { type: Number, required: true }, // minutes
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    totalDuration: {
      type: Number,
      required: true,
    },
    // Payment information
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    transactionId: {
      type: String,
      default: null,
    },
    // Queue information
    queuePosition: {
      type: Number,
      required: true,
    },

    // Queue information
    queuePosition: {
      type: Number,
      required: true,
    },
    estimatedStartTime: {
      type: Date,
      default: null,
    },
    estimatedEndTime: {
      type: Date,
      default: null,
    },

    // FOR SALON CHECK-IN SYSTEM
    arrived: {
      type: Boolean,
      default: false,
    },
    arrivedAt: {
      type: Date,
      default: null,
    },

    walkInToken: {
      type: String,
      default: null,
      index: true,
    },
    // SALON CHECK-IN SYSTEM ENDS

    // Staff assignment

    // Add this field to your Booking schema
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
      index: true,
    },

    // Add this field for staff-specific notes
    staffNotes: {
      type: String,
      default: '',
    },

    // Staff assignment ends



    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled', 'no-show'],
      default: 'pending',
      index: true,
    },
    // Timestamps
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Additional info
    notes: {
      type: String,
      default: '',
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    // Rating (after completion)
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    review: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    // ADD LOYALTY POINTS
    loyaltyPointsEarned: {
      type: Number,
      default: 0,
    },
    // ADD REMINDER TRACKING
    reminderSent: {
      type: Boolean,
      default: false,
    },
    turnNotificationSent: {
      type: Boolean,
      default: false,
    },

  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ salonId: 1, status: 1 });
bookingSchema.index({ salonId: 1, queuePosition: 1 });
bookingSchema.index({ salonId: 1, bookingType: 1, scheduledDate: 1 }); // ✅ NEW

// Update salon queue size when booking status changes
bookingSchema.post('save', async function () {
  const Salon = mongoose.model('Salon');
  const salonId = this.salonId;

  // Count active bookings (pending + in-progress)
  const activeCount = await mongoose.model('Booking').countDocuments({
    salonId,
    status: { $in: ['pending', 'in-progress'] },
  });

  await Salon.findByIdAndUpdate(salonId, {
    currentQueueSize: activeCount,
  });
});

module.exports = mongoose.model('Booking', bookingSchema);
