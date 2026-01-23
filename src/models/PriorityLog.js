const mongoose = require('mongoose');

const priorityLogSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customerName: {
      type: String,
      required: true,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    triggeredByName: {
      type: String,
      required: true,
    },
    triggeredByRole: {
      type: String,
      enum: ['owner', 'manager'],
      required: true,
    },
    reason: {
      type: String,
      enum: ['Senior citizen', 'Medical urgency', 'Child', 'System exception'],
      required: true,
    },
    queuePositionBefore: {
      type: Number,
      required: true,
    },
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    assignedStaffName: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
priorityLogSchema.index({ salonId: 1, timestamp: -1 });
priorityLogSchema.index({ triggeredBy: 1 });
priorityLogSchema.index({ bookingId: 1 });

module.exports = mongoose.model('PriorityLog', priorityLogSchema);
